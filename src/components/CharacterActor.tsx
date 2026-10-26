import React, { useState, useEffect } from 'react'
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
 * Determine the primary status emoji badge per ticket #1 specification:
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
      label: character.speechBubble || `Dispatch -> ${character.courierTargetSession ?? 'peer'}`,
      tone: 'courier',
    }
  }
  if (character.context.pct >= 30 || character.status === 'AMNESIA') {
    return {
      emoji: '🔥',
      label: `AMNESIA RISK (${character.context.pct}%)`,
      tone: 'danger',
    }
  }
  if (character.status === 'WAITING') {
    return {
      emoji: '✋',
      label: 'Awaiting Operator',
      tone: 'warning',
    }
  }
  if (character.status === 'THINKING' || character.status === 'TOOL_EXEC') {
    return {
      emoji: '⌨️',
      label: character.activeToolPill || 'Executing',
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
      width="44"
      height="58"
      viewBox="0 0 44 58"
      className="fallback-pixel-avatar"
      aria-hidden="true"
    >
      {/* Floor shadow */}
      <ellipse cx="22" cy="53" rx="13" ry="4" fill="rgba(0,0,0,0.45)" />
      {/* Pixel boots */}
      <rect x="14" y="42" width="6" height="9" fill="#0f172a" />
      <rect x="24" y="42" width="6" height="9" fill="#0f172a" />
      {/* Isometric torso / jacket */}
      <rect x="11" y="24" width="22" height="19" rx="3" fill={palette.primary} stroke={palette.trim} strokeWidth="2" />
      {/* Collar / tie detail */}
      <rect x="19" y="25" width="6" height="12" fill={palette.trim} />
      {/* Pixel head */}
      <rect x="12" y="8" width="20" height="16" rx="3" fill="#f8fafc" stroke={palette.trim} strokeWidth="2" />
      {/* Cybernetic visor / glasses */}
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

  // Reset image error flag if archetype or facing changes
  useEffect(() => {
    setImgError(false)
  }, [spriteSrc])

  const isWalking = character.targetWaypoints.length > 0
  const isAmnesia = character.context.pct >= 30 || character.status === 'AMNESIA'
  const badge = resolveOverheadStatusBadge(character)
  const zIndex = computeDepthZIndex(character.position.y) + 2

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
        transform: 'translate(-50%, -92%)',
        zIndex,
        cursor: 'pointer',
      }}
      onClick={() => onSelect?.(character)}
    >
      {/* Overhead Status Pill + Speech Bubble */}
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

      {/* Character Sprite or Isometric Pixel SVG Fallback */}
      <div className={`character-sprite-frame${isWalking ? ' walk-bob' : ''}`}>
        {!imgError ? (
          <img
            src={spriteSrc}
            alt={`${character.displayName} (${character.facing})`}
            width={48}
            height={64}
            style={{
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

      {/* Footplate with Vessel Badge + 30%-Rule Context Meter */}
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
