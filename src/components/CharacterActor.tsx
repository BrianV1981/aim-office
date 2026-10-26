import React, { useState, useEffect } from 'react'
import { COMMAND_OFFICE_ROOM } from '../office/rooms'
import { ArchetypeSlug, AgentOperationalStatus, OfficeCharacter } from '../office/types'
import { computeDepthZIndex } from '../office/waypointGraph'

export interface CharacterActorProps {
  character: OfficeCharacter
  isSelected?: boolean
  onSelect?: (character: OfficeCharacter) => void
}

const ARCHETYPE_PALETTES: Record<
  ArchetypeSlug,
  { primary: string; trim: string; visor: string; badge: string }
> = {
  'boss-joshua': {
    primary: '#fbbf24',
    trim: '#1e293b',
    visor: '#38bdf8',
    badge: '👑',
  },
  'vessel-agy': {
    primary: '#06b6d4',
    trim: '#312e81',
    visor: '#67e8f9',
    badge: '⚡',
  },
  'vessel-grok': {
    primary: '#e11d48',
    trim: '#18181b',
    visor: '#fda4af',
    badge: '🚀',
  },
  'vessel-opencode': {
    primary: '#10b981',
    trim: '#064e3b',
    visor: '#6ee7b7',
    badge: '🧩',
  },
  'vessel-codex': {
    primary: '#f59e0b',
    trim: '#451a03',
    visor: '#fde68a',
    badge: '📐',
  },
  'vessel-auditor': {
    primary: '#eab308',
    trim: '#422006',
    visor: '#fef08a',
    badge: '🛡️',
  },
}

/**
 * Determine the primary status emoji badge:
 * - `⌨️` typing/tool call (`THINKING` or `TOOL_EXEC`)
 * - `✋` waiting on prompt (`WAITING`)
 * - `🔥` >=30% context amnesia alert (`AMNESIA` or `context.pct >= 30`)
 * - `📨` `aim-communicate` courier dispatch (`COURIER` or `courierTargetSession`)
 * - `☕` idle (`IDLE`)
 */
export function resolveOverheadStatusBadge(character: OfficeCharacter): {
  emoji: string
  label: string
  tone: 'info' | 'warning' | 'danger' | 'courier' | 'idle'
} {
  if (character.status === 'COURIER' || character.courierTargetSession) {
    return {
      emoji: '📨',
      label: character.speechBubble || `-> ${character.courierTargetSession ?? 'peer'}`,
      tone: 'courier',
    }
  }
  if (character.context.pct >= 30 || character.status === 'AMNESIA') {
    return {
      emoji: '🔥',
      label: `${character.context.pct}%`,
      tone: 'danger',
    }
  }
  if (character.status === 'WAITING') {
    return {
      emoji: '✋',
      label: 'Wait',
      tone: 'warning',
    }
  }
  if (character.status === 'THINKING' || character.status === 'TOOL_EXEC') {
    return {
      emoji: '⌨️',
      label: character.activeToolPill || 'Working',
      tone: 'info',
    }
  }
  return {
    emoji: '☕',
    label: 'Idle',
    tone: 'idle',
  }
}

const FallbackPixelAvatar: React.FC<{
  archetype: ArchetypeSlug
  status: AgentOperationalStatus
}> = ({ archetype }) => {
  const palette = ARCHETYPE_PALETTES[archetype] ?? ARCHETYPE_PALETTES['vessel-agy']
  return (
    <svg
      width="56"
      height="86"
      viewBox="0 0 44 58"
      className="fallback-pixel-avatar"
      aria-hidden="true"
      style={{ height: '100%', width: 'auto', display: 'block' }}
    >
      <ellipse cx="22" cy="53" rx="13" ry="4" fill="rgba(0,0,0,0.45)" />
      <rect x="14" y="42" width="6" height="9" fill="#0f172a" />
      <rect x="24" y="42" width="6" height="9" fill="#0f172a" />
      <rect
        x="11"
        y="24"
        width="22"
        height="19"
        rx="3"
        fill={palette.primary}
        stroke={palette.trim}
        strokeWidth="2"
      />
      <rect x="19" y="25" width="6" height="12" fill={palette.trim} />
      <rect x="12" y="8" width="20" height="16" rx="3" fill="#f8fafc" stroke={palette.trim} strokeWidth="2" />
      <rect x="15" y="13" width="14" height="5" rx="1" fill={palette.visor} />
    </svg>
  )
}

export const CharacterActor: React.FC<CharacterActorProps> = ({
  character,
  isSelected = false,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false)
  const spriteSrc = `/sprites/characters/${character.archetype}-${character.facing}.png`

  useEffect(() => {
    setImgError(false)
  }, [spriteSrc])

  const isWalking = character.targetWaypoints.length > 0
  const isAmnesia = character.context.pct >= 30 || character.status === 'AMNESIA'
  const badge = resolveOverheadStatusBadge(character)

  // Stationary agents at a 4-way quad pod use their workstation's zIndexOverride
  // (NW & NE stand behind rear desks at deskZIndex - 5; SW & SE stand in front at deskZIndex + 5).
  // Walking agents use dynamic depth sorting: computeDepthZIndex(y) + 2.
  const workstationSpot = COMMAND_OFFICE_ROOM.workstations.find(
    (w) => w.id === character.deskSpotId
  )
  const stationaryZIndex =
    character.zIndexOverride ??
    workstationSpot?.zIndexOverride ??
    computeDepthZIndex(character.position.y) + 2
  const zIndex = isWalking ? computeDepthZIndex(character.position.y) + 2 : stationaryZIndex

  return (
    <div
      data-testid={`character-${character.sessionName}`}
      data-facing={character.facing}
      data-zindex={zIndex}
      data-status={character.status}
      className={`office-character-actor${isWalking ? ' is-walking' : ''}${
        isSelected ? ' is-selected' : ''
      }${isAmnesia ? ' is-amnesia' : ''}`}
      style={{
        position: 'absolute',
        left: `${character.position.x}%`,
        top: `${character.position.y}%`,
        height: '11.2%',
        transform: 'translate(-50%, -100%)',
        zIndex,
        cursor: 'pointer',
      }}
      onClick={() => onSelect?.(character)}
    >
      {/* Compact Overhead Status Pill */}
      <div
        className={`character-overhead-badge tone-${badge.tone}`}
        data-testid={`badge-${character.sessionName}`}
      >
        <span className="badge-emoji" aria-hidden="true">
          {badge.emoji}
        </span>
        <span className="badge-text">{badge.label}</span>
      </div>

      {character.speechBubble && (
        <div
          className="character-speech-bubble"
          data-testid={`speech-${character.sessionName}`}
        >
          📨 {character.speechBubble}
        </div>
      )}

      {/* Character Sprite (height: 86px / 11.2% of stage height, bottom-center anchored) */}
      <div className={`character-sprite-frame${isWalking ? ' walk-bob' : ''}`}>
        {!imgError ? (
          <img
            src={spriteSrc}
            alt={`${character.displayName} (${character.facing})`}
            height={86}
            style={{
              height: '100%',
              width: 'auto',
              imageRendering: 'pixelated',
              display: 'block',
            }}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <FallbackPixelAvatar archetype={character.archetype} status={character.status} />
        )}
      </div>

      {/* Compact Footplate with Vessel Chip + 30%-Rule Context Meter */}
      <div className="character-footplate">
        <div className="character-name-row">
          <span className={`vessel-chip vessel-${character.vessel.toLowerCase()}`}>
            {character.vessel}
          </span>
          <span className="session-label">{character.sessionName}</span>
        </div>
        <div
          className="context-bar-track"
          title={`30%-Rule Context Gauge: ${character.context.pct}%`}
        >
          <div
            className={`context-bar-fill severity-${character.context.severity}`}
            style={{ width: `${Math.min(100, Math.max(4, character.context.pct))}%` }}
          />
        </div>
      </div>
    </div>
  )
}
