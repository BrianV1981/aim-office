import React, { useState, useEffect } from 'react'
import { COMMAND_OFFICE_ROOM } from '../office/rooms'
import {
  ArchetypeSlug,
  AgentOperationalStatus,
  IdleActivityEmote,
  OfficeCharacter,
} from '../office/types'
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
  const idleEmojiMap: Record<IdleActivityEmote, string> = {
    coffee: '☕',
    smoke: '🚬',
    vape: '💨',
    lounge: '🛋️',
    water: '💧',
    arcade: '🕹️',
  }
  const idleEmoji = character.idleEmote ? idleEmojiMap[character.idleEmote] : '☕'
  return {
    emoji: idleEmoji,
    label: character.isSeated ? 'Seated' : 'Idle',
    tone: 'idle',
  }
}

const IdleEmotePropOverlay: React.FC<{
  emote: IdleActivityEmote
  sessionName: string
}> = ({ emote, sessionName }) => {
  return (
    <div
      className={`character-idle-prop-overlay emote-${emote}`}
      data-testid={`emote-prop-${sessionName}`}
      data-emote={emote}
      aria-hidden="true"
    >
      {emote === 'smoke' && (
        <svg width="34" height="36" viewBox="0 0 34 36" className="emote-prop-svg">
          {/* Cigar / Cigarette with glowing ember */}
          <rect x="6" y="24" width="12" height="3.2" rx="1" fill="#b45309" stroke="#451a03" strokeWidth="0.7" />
          <rect x="17" y="24" width="3" height="3.2" fill="#ef4444" />
          {/* Rising grey smoke rings */}
          <circle cx="20" cy="18" r="2.6" fill="rgba(226,232,240,0.75)" className="fx-smoke-puff puff-1" />
          <circle cx="23" cy="11" r="3.6" fill="rgba(203,213,225,0.55)" className="fx-smoke-puff puff-2" />
          <circle cx="18" cy="4" r="4.5" fill="rgba(148,163,184,0.38)" className="fx-smoke-puff puff-3" />
        </svg>
      )}
      {emote === 'vape' && (
        <svg width="36" height="38" viewBox="0 0 36 38" className="emote-prop-svg">
          {/* Sci-Fi LED Cyber-Vape device */}
          <rect x="6" y="24" width="11" height="3.6" rx="1.2" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="0.9" />
          <circle cx="17.5" cy="25.8" r="2" fill="#06b6d4" />
          {/* Rising neon cyan & violet vapor plumes */}
          <circle cx="21" cy="18" r="3.2" fill="rgba(56,189,248,0.78)" className="fx-vapor-puff puff-1" />
          <circle cx="25" cy="11" r="4.4" fill="rgba(168,85,247,0.6)" className="fx-vapor-puff puff-2" />
          <circle cx="19" cy="4" r="5.4" fill="rgba(56,189,248,0.42)" className="fx-vapor-puff puff-3" />
        </svg>
      )}
      {(emote === 'coffee' || emote === 'lounge') && (
        <svg width="28" height="32" viewBox="0 0 28 32" className="emote-prop-svg">
          {/* Steaming Ceramic Coffee Mug */}
          <rect x="8" y="19" width="9" height="10" rx="2" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
          <path d="M 17 21 C 20 21, 20 27, 17 27" fill="none" stroke="#f8fafc" strokeWidth="1.4" />
          <circle cx="12" cy="13" r="2.2" fill="rgba(248,250,252,0.7)" className="fx-smoke-puff puff-1" />
          <circle cx="15" cy="7" r="3" fill="rgba(248,250,252,0.45)" className="fx-smoke-puff puff-2" />
        </svg>
      )}
      {emote === 'water' && (
        <svg width="24" height="28" viewBox="0 0 24 28" className="emote-prop-svg">
          <rect x="7" y="15" width="8" height="10" rx="1.5" fill="rgba(56,189,248,0.8)" stroke="#e0f2fe" strokeWidth="1" />
        </svg>
      )}
      {emote === 'arcade' && (
        <svg width="26" height="28" viewBox="0 0 26 28" className="emote-prop-svg">
          <polygon points="13,4 16,11 23,11 17,15 19,22 13,18 7,22 9,15 3,11 10,11" fill="#fbbf24" />
        </svg>
      )}
    </div>
  )
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
  const isSeated = Boolean(character.isSeated && !isWalking)
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
      data-seated={isSeated ? 'true' : 'false'}
      data-emote={character.idleEmote ?? ''}
      className={`office-character-actor${isWalking ? ' is-walking' : ''}${
        isSelected ? ' is-selected' : ''
      }${isAmnesia ? ' is-amnesia' : ''}${isSeated ? ' is-seated' : ''}`}
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

      {/* Character Sprite + Seated Posture Mask + Layered Hand/Mouth Idle Prop */}
      <div
        className={`character-sprite-frame${isWalking ? ' walk-bob' : ''}${
          isSeated ? ' is-seated-frame' : ''
        }`}
      >
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
        {!isWalking && character.status === 'IDLE' && character.idleEmote && (
          <IdleEmotePropOverlay
            emote={character.idleEmote}
            sessionName={character.sessionName}
          />
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
