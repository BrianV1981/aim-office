import React, { useEffect, useMemo, useState } from 'react'
import { COMMAND_OFFICE_ROOM } from '../office/rooms'
import { FurnitureAsset, IsometricRoom, OfficeCharacter } from '../office/types'
import { stepAlongWaypoints } from '../office/waypointGraph'
import { CharacterActor } from './CharacterActor'
import { FurnitureLayer } from './FurnitureLayer'
import { WallTaskBoard } from './WallTaskBoard'
import { KanbanTicketItem } from './WhiteboardModal'

export interface OfficeStageProps {
  room?: IsometricRoom
  characters: OfficeCharacter[]
  tickets?: KanbanTicketItem[]
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
  lightingMode = 'day',
  selectedSession = null,
  onSelectCharacter,
  onSelectFurniture,
  onOpenWhiteboard,
  onCharactersTick,
  walkSpeedPctPerSec = 22,
}) => {
  const [bgFailed, setBgFailed] = useState(false)
  const bgUrl = lightingMode === 'night' ? room.backgrounds.night : room.backgrounds.day

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
        const spot = room.workstations.find((w) => w.id === char.deskSpotId)
        if (spot) {
          set.add(spot.deskId)
        }
      }
    }
    return set
  }, [characters, room.workstations])

  const handleActivateWallBoard = () => {
    if (onOpenWhiteboard) {
      onOpenWhiteboard()
      return
    }
    const wbAsset = room.furniture.find((f) => f.category === 'whiteboard')
    if (wbAsset && onSelectFurniture) {
      onSelectFurniture(wbAsset)
    }
  }

  return (
    <div
      className={`office-stage-viewport office-stage-canvas lighting-${lightingMode}`}
      data-testid="office-stage"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${room.logicalWidth}px`,
        aspectRatio: `${room.logicalWidth} / ${room.logicalHeight}`,
        backgroundImage: !bgFailed ? `url(${bgUrl})` : undefined,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* Layer 1: Isometric Room Shell (1376x768 1:1 uncropped background + SVG fallback) */}
      <div className="office-room-shell" data-testid="office-room-shell">
        {!bgFailed && (
          <img
            src={bgUrl}
            alt={room.name}
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
        lightingMode={lightingMode}
        onActivate={handleActivateWallBoard}
      />

      {/* Layer 2: Depth-Sorted 4-Way Standing Desk Quad Pods & Invisible Wall Hotspots */}
      <FurnitureLayer
        items={room.furniture}
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
  )
}
