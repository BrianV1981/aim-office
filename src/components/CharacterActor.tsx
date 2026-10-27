import React, { useState, useEffect } from 'react'
import { COMMAND_OFFICE_ROOM } from '../office/rooms'
import { ArchetypeSlug, AgentOperationalStatus, OfficeCharacter } from '../office/types'
import { resolveSovereignArchetype } from '../office/useOfficeDirector'
import { computeDepthZIndex } from '../office/waypointGraph'

export interface CharacterActorProps {
  character: OfficeCharacter
  isSelected?: boolean
  onSelect?: (character: OfficeCharacter) => void
}

export const ARCHETYPE_PALETTES: Record<
  string,
  { primary: string; trim: string; visor: string; badge: string; rank: string }
> = {
  'boss-joshua': { primary: '#fbbf24', trim: '#1e293b', visor: '#38bdf8', badge: '👑', rank: 'CMD' },
  'vessel-agy': { primary: '#06b6d4', trim: '#312e81', visor: '#67e8f9', badge: '⚡', rank: 'ENG' },
  'vessel-grok': { primary: '#e11d48', trim: '#18181b', visor: '#fda4af', badge: '🚀', rank: 'OPS' },
  'vessel-opencode': { primary: '#10b981', trim: '#064e3b', visor: '#6ee7b7', badge: '🧩', rank: 'SYS' },
  'vessel-codex': { primary: '#f59e0b', trim: '#451a03', visor: '#fde68a', badge: '📐', rank: 'ARC' },
  'vessel-auditor': { primary: '#eab308', trim: '#422006', visor: '#fef08a', badge: '🛡️', rank: 'SEC' },
  'agent-leaddeeds': { primary: '#2563eb', trim: '#1e3a8a', visor: '#93c5fd', badge: '🏠', rank: 'ACQ' },
  'agent-ld-content': { primary: '#9f1239', trim: '#4c0519', visor: '#fda4af', badge: '✍️', rank: 'PUB' },
  'agent-tbsoftwash': { primary: '#0d9488', trim: '#134e4a', visor: '#5eead4', badge: '💦', rank: 'OPS' },
  'agent-tb-content': { primary: '#f97316', trim: '#7c2d12', visor: '#fdba74', badge: '🎬', rank: 'MED' },
  'agent-ai-book': { primary: '#15803d', trim: '#14532d', visor: '#86efac', badge: '📚', rank: 'PUB' },
  'agent-skorbane': { primary: '#7e22ce', trim: '#3b0764', visor: '#d8b4fe', badge: '⚔️', rank: 'LORE' },
  'agent-skorbane-media': { primary: '#a855f7', trim: '#581c87', visor: '#e9d5ff', badge: '🔮', rank: 'VFX' },
  'agent-youtube': { primary: '#dc2626', trim: '#7f1d1d', visor: '#fca5a5', badge: '▶️', rank: 'VID' },
  'agent-gbp': { primary: '#34d399', trim: '#065f46', visor: '#a7f3d0', badge: '📍', rank: 'GEO' },
  'agent-calendar': { primary: '#64748b', trim: '#1e293b', visor: '#bae6fd', badge: '⏱️', rank: 'SYNC' },
  'agent-ayrianna': { primary: '#0ea5e9', trim: '#0f172a', visor: '#38bdf8', badge: '🛰️', rank: 'R&D' },
  'agent-cron': { primary: '#d97706', trim: '#451a03', visor: '#fcd34d', badge: '🤖', rank: 'AUTO' },
  'agent-tmux': { primary: '#475569', trim: '#0f172a', visor: '#94a3b8', badge: '🖥️', rank: 'MUX' },
  'agent-connect': { primary: '#3b82f6', trim: '#172554', visor: '#bfdbfe', badge: '📡', rank: 'BUS' },
}

export function resolveOverheadStatusBadge(character: OfficeCharacter): {
  emoji: string
  label: string
  tone: 'info' | 'warning' | 'danger' | 'courier' | 'idle'
} {
  if (character.status === 'COURIER' || character.courierTargetSession) {
    return {
      emoji: '📨',
      label: `-> ${character.courierTargetSession ?? 'peer'}`,
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
      label: 'Active',
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
  const [fallbackTier, setFallbackTier] = useState<0 | 1 | 2>(0)
  const primarySrc = `/sprites/characters/${character.archetype}-${character.facing}.png`
  const vesselSlug = resolveSovereignArchetype(character.sessionName, character.vessel)
  const secondarySrc = `/sprites/characters/${vesselSlug}-${character.facing}.png`

  useEffect(() => {
    setFallbackTier(0)
  }, [primarySrc, secondarySrc])

  const isWalking = character.targetWaypoints.length > 0
  const isAmnesia = character.context.pct >= 30 || character.status === 'AMNESIA'
  const badge = resolveOverheadStatusBadge(character)
  const palette = ARCHETYPE_PALETTES[character.archetype] ?? ARCHETYPE_PALETTES['vessel-agy']

  const workstationSpot = COMMAND_OFFICE_ROOM.workstations.find(
    (w) => w.id === character.deskSpotId
  )
  const stationaryZIndex =
    character.zIndexOverride ??
    workstationSpot?.zIndexOverride ??
    computeDepthZIndex(character.position.y) + 2
  const zIndex = isWalking ? computeDepthZIndex(character.position.y) + 2 : stationaryZIndex

  const activeImgSrc = fallbackTier === 0 ? primarySrc : secondarySrc

  return (
    <div
      data-testid={`character-${character.sessionName}`}
      data-archetype={character.archetype}
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
        height: '9.6%',
        transform: 'translate(-50%, -100%)',
        zIndex,
        cursor: 'pointer',
      }}
      onClick={() => onSelect?.(character)}
    >
      {/* Selected Unit Overhead Target Chevron */}
      {isSelected && (
        <div className="character-target-chevron" aria-hidden="true">
          ▼
        </div>
      )}

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

      {/* Isometric Ground Target Pedestal Ring */}
      <div
        className={`character-ground-ring tone-${badge.tone}${isSelected ? ' is-locked' : ''}`}
        aria-hidden="true"
      />

      {/* Character Sprite */}
      <div className={`character-sprite-frame${isWalking ? ' walk-bob' : ''}`}>
        {fallbackTier < 2 ? (
          <img
            src={activeImgSrc}
            alt={`${character.displayName} (${character.facing})`}
            height={72}
            style={{
              height: '100%',
              width: 'auto',
              imageRendering: 'pixelated',
              display: 'block',
            }}
            onError={() =>
              setFallbackTier((prev) =>
                prev === 0 && primarySrc !== secondarySrc ? 1 : 2
              )
            }
            draggable={false}
          />
        ) : (
          <FallbackPixelAvatar archetype={character.archetype} status={character.status} />
        )}
      </div>

      {/* Gamified RPG/RTS Unit Footplate with Rank Badge + Vessel Chip + Context Stability Bar */}
      <div className="character-footplate">
        <div className="character-name-row">
          <span className="unit-rank-icon" aria-hidden="true">
            {palette.badge}
          </span>
          <span className={`vessel-chip vessel-${character.vessel.toLowerCase()}`}>
            {character.vessel}
          </span>
          <span className="session-label">{character.sessionName}</span>
        </div>
        <div
          className="context-bar-track"
          title={`30%-Rule Context Stability: ${character.context.pct}%`}
        >
          <div
            className={`context-bar-fill severity-${character.context.severity}`}
            style={{
              width: `${
                character.context.pct > 0 ? Math.min(100, Math.max(3, character.context.pct)) : 0
              }%`,
            }}
          />
          <span className="context-threshold-tick" style={{ left: '30%' }} />
        </div>
      </div>
    </div>
  )
}
