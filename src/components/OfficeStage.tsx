import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COMMAND_OFFICE_ROOM, filterRoomForAgentCount } from '../office/rooms'
import {
  FurnitureAsset,
  IsometricRoom,
  OfficeCharacter,
  WallBoardRectConfig,
} from '../office/types'
import { stepAlongWaypoints } from '../office/waypointGraph'
import { CharacterActor } from './CharacterActor'
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
  wallBoardRect?: WallBoardRectConfig
  lightingMode?: 'day' | 'night'
  selectedSession?: string | null
  onSelectCharacter?: (character: OfficeCharacter) => void
  onSelectFurniture?: (furniture: FurnitureAsset) => void
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
  onSelectCharacter,
  onSelectFurniture,
  onOpenWhiteboard,
  onCharactersTick,
  walkSpeedPctPerSec = 22,
}) => {
  const [bgFailed, setBgFailed] = useState(false)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragOriginRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  )

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
    if (target.closest('button') || target.closest('.wall-task-board')) return
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
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${elasticRoom.logicalWidth}px`,
        aspectRatio: `${elasticRoom.logicalWidth} / ${elasticRoom.logicalHeight}`,
        margin: '0 auto',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Pan & Zoom Camera Transform Plane */}
      <div
        className="office-camera-plane"
        data-testid="office-camera-plane"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
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

        {/* Layer 1.5: Perspective-Skewed Wall TaskBoard on the painted Whiteboard */}
        <WallTaskBoard
          tickets={tickets}
          boardLabel={boardLabel}
          rect={wallBoardRect}
          lightingMode={lightingMode}
          onActivate={handleActivateWallBoard}
        />

        {/* Layer 2: Depth-Sorted Elastic 4-Way Standing Desk Quad Pods & Invisible Wall Hotspots */}
        <FurnitureLayer
          items={elasticRoom.furniture}
          amnesiaDeskIds={amnesiaDeskIds}
          onFurnitureClick={onSelectFurniture}
        />

        {/* Layer 3: Depth-Sorted 4-Direction Isometric Characters (with Front/Rear Pod Occlusion) */}
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
      </div>

      {/* Camera Zoom / Pan HUD Overlay */}
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
  )
}
