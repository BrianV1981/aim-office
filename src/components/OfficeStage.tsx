import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COMMAND_OFFICE_ROOM, filterRoomForAgentCount } from '../office/rooms'
import {
  FurnitureAsset,
  IsometricRoom,
  OfficeCharacter,
  WallBoardRectConfig,
} from '../office/types'
import { stepAlongWaypoints } from '../office/waypointGraph'
import { ARCHETYPE_PALETTES, CharacterActor } from './CharacterActor'
import { FurnitureLayer } from './FurnitureLayer'
import { WallTaskBoard } from './WallTaskBoard'
import { KanbanTicketItem } from './WhiteboardModal'

export const MIN_CAMERA_ZOOM = 0.75
export const MAX_CAMERA_ZOOM = 1.8

export function clampCameraZoom(zoom: number): number {
  return Number(Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, zoom)).toFixed(2))
}

export interface OfficeStageProps {
  room?: IsometricRoom
  characters: OfficeCharacter[]
  tickets?: KanbanTicketItem[]
  boardLabel?: string
  wallBoardRect?: WallBoardRectConfig | null
  lightingMode?: 'day' | 'night'
  selectedSession?: string | null
  selectedFurnitureId?: string | null
  isBuildMode?: boolean
  onSelectCharacter?: (character: OfficeCharacter) => void
  onSelectFurniture?: (furniture: FurnitureAsset) => void
  onMoveFurniture?: (furnitureId: string, x: number, y: number) => void
  onOpenWhiteboard?: () => void
  onCharactersTick?: (updated: OfficeCharacter[]) => void
  walkSpeedPctPerSec?: number
}

export const OfficeStage: React.FC<OfficeStageProps> = ({
  room = COMMAND_OFFICE_ROOM,
  characters,
  tickets,
  boardLabel,
  wallBoardRect,
  lightingMode = 'day',
  selectedSession = null,
  selectedFurnitureId = null,
  isBuildMode = false,
  onSelectCharacter,
  onSelectFurniture,
  onMoveFurniture,
  onOpenWhiteboard,
  onCharactersTick,
  walkSpeedPctPerSec = 22,
}) => {
  const [bgFailed, setBgFailed] = useState(false)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const cameraPlaneRef = useRef<HTMLDivElement | null>(null)
  const dragOriginRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  )
  const furnitureDragRef = useRef<{
    id: string
    startClientX: number
    startClientY: number
    origX: number
    origY: number
  } | null>(null)

  useEffect(() => {
    if (!isBuildMode) {
      furnitureDragRef.current = null
      return
    }
    const handleWinMove = (e: MouseEvent) => {
      const drag = furnitureDragRef.current
      if (!drag || !onMoveFurniture) return
      const rect = cameraPlaneRef.current?.getBoundingClientRect()
      const planeW = rect && rect.width > 10 ? rect.width : 1376
      const planeH = rect && rect.height > 10 ? rect.height : 768
      const dxPct = ((e.clientX - drag.startClientX) / planeW) * 100
      const dyPct = ((e.clientY - drag.startClientY) / planeH) * 100
      const nextX = Math.round(Math.min(94, Math.max(6, drag.origX + dxPct)) * 10) / 10
      const nextY = Math.round(Math.min(94, Math.max(12, drag.origY + dyPct)) * 10) / 10
      onMoveFurniture(drag.id, nextX, nextY)
    }
    const handleWinUp = () => {
      furnitureDragRef.current = null
    }
    window.addEventListener('mousemove', handleWinMove)
    window.addEventListener('mouseup', handleWinUp)
    return () => {
      window.removeEventListener('mousemove', handleWinMove)
      window.removeEventListener('mouseup', handleWinUp)
    }
  }, [isBuildMode, onMoveFurniture])

  const elasticRoom = useMemo(
    () => filterRoomForAgentCount(room, characters.length),
    [room, characters.length]
  )

  const bgUrl = lightingMode === 'night' ? elasticRoom.backgrounds.night : elasticRoom.backgrounds.day

  useEffect(() => {
    setBgFailed(false)
  }, [bgUrl])

  // Smooth waypoint interpolation tick (runs at ~30 FPS when any character has queued waypoints)
  useEffect(() => {
    if (!onCharactersTick) return
    const hasMovingCharacter = characters.some((c) => c.targetWaypoints.length > 0)
    if (!hasMovingCharacter) return

    const intervalMs = 33
    const stepDistance = (walkSpeedPctPerSec * intervalMs) / 1000

    const timer = window.setInterval(() => {
      let anyMoved = false
      const next = characters.map((char) => {
        if (char.targetWaypoints.length === 0) return char
        const stepped = stepAlongWaypoints(
          char.position,
          char.targetWaypoints,
          stepDistance,
          char.facing
        )
        if (!stepped.moved && stepped.remainingWaypoints.length === char.targetWaypoints.length) {
          return char
        }
        anyMoved = true
        return {
          ...char,
          position: stepped.position,
          targetWaypoints: stepped.remainingWaypoints,
          facing: stepped.facing,
        }
      })
      if (anyMoved) {
        onCharactersTick(next)
      }
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [characters, onCharactersTick, walkSpeedPctPerSec])

  // Highlight desks whose assigned agent is >= 30% context (Amnesia Alert)
  const amnesiaDeskIds = useMemo(() => {
    const set = new Set<string>()
    for (const char of characters) {
      if (char.context.pct >= 30 || char.status === 'AMNESIA') {
        const spot = elasticRoom.workstations.find((w) => w.id === char.deskSpotId)
        if (spot) {
          set.add(spot.deskId)
        }
      }
    }
    return set
  }, [characters, elasticRoom.workstations])

  // Featured 8 quick-slot agents for RTS bottom hotbar
  const quickbarUnits = useMemo(() => {
    return characters.slice(0, 8)
  }, [characters])

  // Live telemetry ticker focal agent
  const tickerAgent = useMemo(() => {
    if (selectedSession) {
      const found = characters.find((c) => c.sessionName === selectedSession)
      if (found) return found
    }
    return (
      characters.find((c) => c.status === 'COURIER') ||
      characters.find((c) => c.status === 'TOOL_EXEC' || c.status === 'THINKING') ||
      characters[0] ||
      null
    )
  }, [characters, selectedSession])

  // Keyboard 1..8 unit hotkeys when not typing in an input
  useEffect(() => {
    if (!onSelectCharacter || quickbarUnits.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return
      }
      const num = Number(e.key)
      if (num >= 1 && num <= 8 && quickbarUnits[num - 1]) {
        onSelectCharacter(quickbarUnits[num - 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSelectCharacter, quickbarUnits])

  const handleActivateWallBoard = () => {
    if (onOpenWhiteboard) {
      onOpenWhiteboard()
      return
    }
    const wbAsset = elasticRoom.furniture.find((f) => f.category === 'whiteboard')
    if (wbAsset && onSelectFurniture) {
      onSelectFurniture(wbAsset)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom((prev) => clampCameraZoom(prev + delta))
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('.wall-task-board') ||
      target.closest('.tactical-bottom-dock')
    ) {
      return
    }
    setIsDragging(true)
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragOriginRef.current) return
    const dx = e.clientX - dragOriginRef.current.startX
    const dy = e.clientY - dragOriginRef.current.startY
    setPan({
      x: Math.round(dragOriginRef.current.panX + dx),
      y: Math.round(dragOriginRef.current.panY + dy),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    dragOriginRef.current = null
  }

  const handleResetCamera = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div
      className={`office-stage-viewport office-stage-canvas lighting-${lightingMode}${
        isDragging ? ' is-dragging' : ''
      }`}
      data-testid="office-stage"
      data-zoom={zoom}
      data-pan={`${pan.x},${pan.y}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Ambient Tactical Grid & Scanline Backdrop */}
      <div className="tactical-viewport-grid-backdrop" aria-hidden="true" />

      {/* Pan & Zoom Camera Transform Plane (Edge-to-Edge Responsive 16:9 Stage) */}
      <div
        ref={cameraPlaneRef}
        className="office-camera-plane"
        data-testid="office-camera-plane"
        style={{
          backgroundImage: !bgFailed ? `url(${bgUrl})` : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* Layer 1: Isometric Room Shell (1376x768 1:1 uncropped background + SVG fallback) */}
        <div className="office-room-shell" data-testid="office-room-shell">
          {!bgFailed && (
            <img
              src={bgUrl}
              alt={elasticRoom.name}
              className="office-room-bg-img"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                imageRendering: 'pixelated',
              }}
              onError={() => setBgFailed(true)}
              draggable={false}
            />
          )}
          <svg
            viewBox="0 0 1376 768"
            className="office-isometric-grid-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              opacity: bgFailed ? 1 : 0,
            }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="isoFloorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={lightingMode === 'night' ? '#090d16' : '#1e293b'} />
                <stop offset="100%" stopColor={lightingMode === 'night' ? '#020617' : '#0f172a'} />
              </linearGradient>
              <pattern id="isoTilePattern" width="60" height="30" patternUnits="userSpaceOnUse">
                <path
                  d="M 30 0 L 60 15 L 30 30 L 0 15 Z"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.14)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="1376" height="768" fill="url(#isoFloorGrad)" />
            <polygon
              points="688,318 1052,495 688,676 323,495"
              fill="url(#isoTilePattern)"
              stroke="rgba(56, 189, 248, 0.35)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Layer 1.5: Perspective-Skewed Wall TaskBoard */}
        {wallBoardRect !== null && (
          <WallTaskBoard
            tickets={tickets}
            boardLabel={boardLabel}
            rect={wallBoardRect}
            lightingMode={lightingMode}
            onActivate={handleActivateWallBoard}
          />
        )}

        {/* Layer 2: Depth-Sorted Elastic 4-Way Standing Desk Quad Pods, Smart Props & Wall Hotspots */}
        <FurnitureLayer
          items={elasticRoom.furniture}
          amnesiaDeskIds={amnesiaDeskIds}
          selectedDeskId={selectedFurnitureId}
          isBuildMode={isBuildMode}
          onFurnitureClick={onSelectFurniture}
          onFurnitureDragStart={(item, clientX, clientY) => {
            furnitureDragRef.current = {
              id: item.id,
              startClientX: clientX,
              startClientY: clientY,
              origX: item.x,
              origY: item.y,
            }
          }}
        />

        {/* Layer 3: Depth-Sorted 4-Direction Isometric Characters */}
        <div className="office-characters-layer" data-testid="characters-layer">
          {characters.map((character) => (
            <CharacterActor
              key={character.id}
              character={character}
              isSelected={selectedSession === character.sessionName}
              onSelect={onSelectCharacter}
            />
          ))}
        </div>

        {/* Layer 4: Theme-Reactive Atmospheric Smoke / Cyber-Vapor Haze Overlay (#19) */}
        <div
          className="office-atmosphere-fx"
          data-testid="office-atmosphere-fx"
          aria-hidden="true"
        />
      </div>

      {/* Bottom Tactical HUD Dock: Live Telemetry Feed + RTS Squad Quick-Select Hotbar + Camera Gimbal */}
      <div className="tactical-bottom-dock" data-testid="tactical-bottom-dock">
        {/* Bottom-Left Live Ops Telemetry Ticker */}
        <div className="live-telemetry-ticker" data-testid="live-telemetry-ticker">
          <span className="ticker-pulse-dot" />
          <span className="ticker-tag">OPS FEED</span>
          {tickerAgent ? (
            <span className="ticker-message">
              <strong>{tickerAgent.sessionName}</strong> ·{' '}
              {tickerAgent.activeToolPill || tickerAgent.status} · {tickerAgent.context.pct}% CTX
            </span>
          ) : (
            <span className="ticker-message">All sectors nominal</span>
          )}
        </div>

        {/* Bottom-Center RTS Quick-Select Squad Hotbar (1-8) */}
        {quickbarUnits.length > 0 && (
          <div className="squad-quick-hotbar" data-testid="squad-quick-hotbar">
            {quickbarUnits.map((unit, idx) => {
              const isSelected = selectedSession === unit.sessionName
              const isAmnesia = unit.context.pct >= 30 || unit.status === 'AMNESIA'
              const palette = ARCHETYPE_PALETTES[unit.archetype] ?? ARCHETYPE_PALETTES['vessel-agy']
              return (
                <button
                  key={unit.id}
                  type="button"
                  className={`hotbar-unit-slot${isSelected ? ' is-selected' : ''}${
                    isAmnesia ? ' is-amnesia' : ''
                  }`}
                  data-testid={`hotbar-slot-${unit.sessionName}`}
                  onClick={() => onSelectCharacter?.(unit)}
                  title={`[${idx + 1}] ${unit.sessionName} — ${unit.roleTitle} (${unit.context.pct}% context)`}
                >
                  <span className="hotbar-keybind">{idx + 1}</span>
                  <span className="hotbar-rank-badge">{palette.rank}</span>
                  <div className="hotbar-portrait-frame">
                    <img
                      src={`/sprites/characters/${unit.archetype}-front-left.png`}
                      alt={unit.displayName}
                      className="hotbar-portrait-img"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <span className="hotbar-unit-name">{unit.sessionName.replace(/^aim-/, '')}</span>
                  <div className="hotbar-mini-bar">
                    <div
                      className={`hotbar-mini-fill severity-${unit.context.severity}`}
                      style={{ width: `${Math.min(100, Math.max(8, unit.context.pct))}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Bottom-Right Camera Zoom / Pan HUD Overlay */}
        <div className="office-camera-controls" data-testid="office-camera-controls">
          <button
            type="button"
            className="camera-ctrl-btn"
            data-testid="btn-zoom-out"
            title="Zoom Out"
            onClick={() => setZoom((z) => clampCameraZoom(z - 0.15))}
          >
            −
          </button>
          <span className="camera-zoom-readout" data-testid="camera-zoom-readout">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="camera-ctrl-btn"
            data-testid="btn-zoom-in"
            title="Zoom In"
            onClick={() => setZoom((z) => clampCameraZoom(z + 0.15))}
          >
            +
          </button>
          <button
            type="button"
            className="camera-ctrl-btn btn-reset"
            data-testid="btn-reset-camera"
            title="Reset Camera Zoom & Pan"
            onClick={handleResetCamera}
          >
            Reset Camera
          </button>
        </div>
      </div>
    </div>
  )
}
