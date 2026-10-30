import React, { useEffect, useMemo, useRef, useState } from 'react'
import { resolveOverheadStatusBadge } from './CharacterActor'
import { formatTokenCountCompact } from '../services/aimConnectClient'
import {
  ArchetypeSlug,
  IsometricRoom,
  OfficeCharacter,
  VesselType,
} from '../office/types'

export interface SovereignStaffPersona {
  archetype: ArchetypeSlug
  sessionName: string
  displayName: string
  roleTitle: string
  vessel: VesselType
  projectNumber: number
}

export const SOVEREIGN_STAFF_DIRECTORY: ReadonlyArray<SovereignStaffPersona> = [
  {
    archetype: 'boss-joshua',
    sessionName: 'aim-joshua',
    displayName: 'J.O.S.H.U.A.',
    roleTitle: 'Sovereign Orchestrator',
    vessel: 'AGY',
    projectNumber: 14,
  },
  {
    archetype: 'vessel-agy',
    sessionName: 'aim-office',
    displayName: 'AGY Engineer',
    roleTitle: 'Isometric Command Architect',
    vessel: 'AGY',
    projectNumber: 14,
  },
  {
    archetype: 'vessel-grok',
    sessionName: 'aim-grok',
    displayName: 'Grok Specialist',
    roleTitle: 'Fast-Inference Systems Hacker',
    vessel: 'Grok',
    projectNumber: 14,
  },
  {
    archetype: 'vessel-auditor',
    sessionName: 'aim-auditor',
    displayName: 'The Gatekeeper',
    roleTitle: 'TDD & Security Compliance Auditor',
    vessel: 'Auditor',
    projectNumber: 14,
  },
  {
    archetype: 'vessel-opencode',
    sessionName: 'aim-opencode',
    displayName: 'OpenCode Dev',
    roleTitle: 'Polyglot Refactoring Specialist',
    vessel: 'OpenCode',
    projectNumber: 14,
  },
  {
    archetype: 'vessel-codex',
    sessionName: 'aim-codex',
    displayName: 'Codex Architect',
    roleTitle: 'Deep Systems & Schema Architect',
    vessel: 'Codex',
    projectNumber: 14,
  },
  {
    archetype: 'agent-data-scout',
    sessionName: 'aim-scout',
    displayName: 'Data Scout',
    roleTitle: 'Market & Public-Record Intelligence Analyst',
    vessel: 'AGY',
    projectNumber: 5,
  },
  {
    archetype: 'agent-content-director',
    sessionName: 'aim-content',
    displayName: 'Content Director',
    roleTitle: 'B2B Authority Content Strategist',
    vessel: 'AGY',
    projectNumber: 5,
  },
  {
    archetype: 'agent-field-ops',
    sessionName: 'aim-ops',
    displayName: 'Field Ops Agent',
    roleTitle: 'Field Operations & Dispatch Engine',
    vessel: 'AGY',
    projectNumber: 15,
  },
  {
    archetype: 'agent-media-producer',
    sessionName: 'aim-media',
    displayName: 'Media Producer',
    roleTitle: 'Digital Media & Local Authority Producer',
    vessel: 'AGY',
    projectNumber: 15,
  },
  {
    archetype: 'agent-ai-book',
    sessionName: 'aim-ai-book',
    displayName: 'AI Book Author',
    roleTitle: 'Long-Form Technical Book Researcher',
    vessel: 'AGY',
    projectNumber: 16,
  },
  {
    archetype: 'agent-lore-strategist',
    sessionName: 'aim-lore',
    displayName: 'Lore Strategist',
    roleTitle: 'Narrative & Worldbuilding Strategist',
    vessel: 'AGY',
    projectNumber: 17,
  },
  {
    archetype: 'agent-visual-designer',
    sessionName: 'aim-design',
    displayName: 'Visual Designer',
    roleTitle: 'Neon Media & Visual Asset Designer',
    vessel: 'AGY',
    projectNumber: 17,
  },
  {
    archetype: 'agent-youtube',
    sessionName: 'aim-youtube',
    displayName: 'YouTube Director',
    roleTitle: 'Video Transcript & Pipeline Director',
    vessel: 'Grok',
    projectNumber: 21,
  },
  {
    archetype: 'agent-gbp',
    sessionName: 'aim-gbp',
    displayName: 'GBP Growth Agent',
    roleTitle: 'Local SEO & Google Business Specialist',
    vessel: 'AGY',
    projectNumber: 18,
  },
  {
    archetype: 'agent-calendar',
    sessionName: 'aim-calendar',
    displayName: 'Chrono Coordinator',
    roleTitle: 'Temporal & Executive Schedule Agent',
    vessel: 'AGY',
    projectNumber: 19,
  },
  {
    archetype: 'agent-web-recon',
    sessionName: 'aim-recon',
    displayName: 'Web Recon Operative',
    roleTitle: 'OSINT & Web Recon Operative',
    vessel: 'AGY',
    projectNumber: 4,
  },
  {
    archetype: 'agent-cron',
    sessionName: 'aim-cron',
    displayName: 'Cron Daemon',
    roleTitle: 'Autonomous Heartbeat & Job Runner',
    vessel: 'OpenCode',
    projectNumber: 14,
  },
  {
    archetype: 'agent-tmux',
    sessionName: 'aim-tmux',
    displayName: 'Tmux Multiplexer',
    roleTitle: 'Session Multiplexer & Pane Operator',
    vessel: 'Codex',
    projectNumber: 14,
  },
  {
    archetype: 'agent-connect',
    sessionName: 'aim-connect',
    displayName: 'Connect Bridge',
    roleTitle: 'Mobile Cockpit & Telemetry Engineer',
    vessel: 'AGY',
    projectNumber: 14,
  },
]

/**
 * Merge live fleet characters with any remaining personas from the 20-Character Sovereign Roster
 * so the Operator can see and select the full 20-agent staff both in the roster column and on the floor.
 */
export function buildFullStaffRosterCharacters(
  liveCharacters: OfficeCharacter[],
  room: IsometricRoom,
  includeStandbyPersonas: boolean
): OfficeCharacter[] {
  // Enrich live characters with human-friendly roleTitles from SOVEREIGN_STAFF_DIRECTORY when matched
  const enrichedLive = liveCharacters.map((char) => {
    const persona =
      SOVEREIGN_STAFF_DIRECTORY.find((p) => p.sessionName === char.sessionName) ??
      SOVEREIGN_STAFF_DIRECTORY.find((p) => p.archetype === char.archetype)
    if (!persona) return char
    return {
      ...char,
      displayName: char.sessionName === 'aim-joshua' ? 'J.O.S.H.U.A.' : persona.displayName,
      roleTitle: persona.roleTitle,
      projectNumber: char.projectNumber ?? persona.projectNumber,
    }
  })

  if (!includeStandbyPersonas) {
    return enrichedLive
  }

  const existingSessions = new Set(enrichedLive.map((c) => c.sessionName))
  const existingArchetypes = new Set(enrichedLive.map((c) => c.archetype))
  const usedSpots = new Set(enrichedLive.map((c) => c.deskSpotId))

  const availableSpots = room.workstations.filter((w) => !usedSpots.has(w.id))
  let spotCursor = 0

  const combined = [...enrichedLive]

  for (const persona of SOVEREIGN_STAFF_DIRECTORY) {
    if (existingSessions.has(persona.sessionName) || existingArchetypes.has(persona.archetype)) {
      continue
    }
    const spot =
      availableSpots[spotCursor++] ??
      room.workstations[combined.length % room.workstations.length]
    if (!spot) continue

    combined.push({
      id: `char-${persona.sessionName}`,
      sessionName: persona.sessionName,
      displayName: persona.displayName,
      roleTitle: persona.roleTitle,
      vessel: persona.vessel,
      archetype: persona.archetype,
      status: 'IDLE',
      context: {
        pct: 0,
        severity: 'green',
        tokensUsed: 0,
        tokenBudget: persona.vessel === 'AGY' || persona.vessel === 'Auditor' ? 1_000_000 : 200_000,
      },
      deskSpotId: spot.id,
      currentWaypointId: spot.waypointId,
      position: { x: spot.x, y: spot.y },
      targetWaypoints: [],
      facing: spot.defaultFacing,
      zIndexOverride: spot.zIndexOverride,
      activeToolPill: 'Standby Roster Ready',
      gitBranch: 'main',
      worktreePath: `~/${persona.sessionName}`,
      projectNumber: persona.projectNumber,
    })
  }

  return combined
}

export type StaffStatusFilter = 'ALL' | 'ACTIVE' | 'AMNESIA' | 'IDLE'

export interface AgentStaffRosterProps {
  isOpen: boolean
  characters: OfficeCharacter[]
  liveAgentCount: number
  selectedSession: string | null
  showFullRoster: boolean
  onToggleFullRoster: () => void
  onSelectCharacter: (character: OfficeCharacter) => void
  onClose: () => void
}

export const AgentStaffRoster: React.FC<AgentStaffRosterProps> = ({
  isOpen,
  characters,
  liveAgentCount,
  selectedSession,
  showFullRoster,
  onToggleFullRoster,
  onSelectCharacter,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('ALL')

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  )

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setDragOffset({
        x: Math.round(dragRef.current.origX + (e.clientX - dragRef.current.startX)),
        y: Math.round(dragRef.current.origY + (e.clientY - dragRef.current.startY)),
      })
    }
    const handleUp = () => {
      setIsDragging(false)
      dragRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  const counts = useMemo(() => {
    let active = 0
    let amnesia = 0
    let idle = 0
    for (const c of characters) {
      if (c.context.pct >= 30 || c.status === 'AMNESIA') {
        amnesia++
      }
      if (c.status === 'THINKING' || c.status === 'TOOL_EXEC' || c.status === 'COURIER') {
        active++
      } else if (c.status === 'IDLE' || c.status === 'WAITING') {
        idle++
      }
    }
    return { all: characters.length, active, amnesia, idle }
  }, [characters])

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return characters.filter((c) => {
      if (statusFilter === 'ACTIVE') {
        if (c.status !== 'THINKING' && c.status !== 'TOOL_EXEC' && c.status !== 'COURIER') {
          return false
        }
      } else if (statusFilter === 'AMNESIA') {
        if (c.context.pct < 30 && c.status !== 'AMNESIA') {
          return false
        }
      } else if (statusFilter === 'IDLE') {
        if (c.status !== 'IDLE' && c.status !== 'WAITING') {
          return false
        }
      }

      if (!q) return true
      return (
        c.sessionName.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.roleTitle.toLowerCase().includes(q) ||
        c.vessel.toLowerCase().includes(q) ||
        c.archetype.toLowerCase().includes(q) ||
        (c.gitBranch ?? '').toLowerCase().includes(q)
      )
    })
  }, [characters, searchQuery, statusFilter])

  if (!isOpen) return null

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: dragOffset.x,
      origY: dragOffset.y,
    }
  }

  return (
    <aside
      className={`agent-staff-roster${isDragging ? ' is-dragging-card' : ''}`}
      data-testid="agent-staff-roster"
      aria-label="Office Staff & Agent Fleet Roster"
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        zIndex: isDragging ? 3250 : 3000,
      }}
    >
      {/* Draggable Header */}
      <div
        className="staff-roster-header"
        data-testid="staff-roster-drag-handle"
        onMouseDown={handleHeaderMouseDown}
        title="Drag to reposition Staff Roster column"
      >
        <div>
          <div className="staff-roster-title-row">
            <h2 className="staff-roster-title">👥 Office Staff Roster</h2>
            <span className="staff-count-pill" data-testid="staff-roster-count">
              {characters.length} Agents
            </span>
          </div>
          <p className="staff-roster-subtitle">
            Click any agent to open Cockpit & switch Kanban
          </p>
        </div>
        <button
          type="button"
          className="drawer-close-btn"
          data-testid="btn-close-staff-roster"
          onClick={onClose}
          title="Collapse Staff Roster"
        >
          ✕
        </button>
      </div>

      {/* Mode Toggle: Full 20-Persona Staff vs Live Tmux Fleet Only */}
      <div className="staff-roster-mode-bar">
        <button
          type="button"
          className={`staff-mode-btn${showFullRoster ? ' is-active' : ''}`}
          data-testid="btn-toggle-full-roster"
          onClick={onToggleFullRoster}
          title="Toggle between showing all 20 Sovereign Staff personas or only live tmux panes"
        >
          {showFullRoster
            ? `🌟 Full 20-Staff Roster (${characters.length})`
            : `⚡ Live Tmux Fleet Only (${liveAgentCount})`}
        </button>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="staff-roster-controls">
        <input
          type="text"
          className="input-staff-search"
          data-testid="input-staff-search"
          placeholder="Search session, role, vessel, branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="staff-filter-pills" role="tablist" aria-label="Filter agents by status">
          <button
            type="button"
            className={`staff-filter-pill${statusFilter === 'ALL' ? ' is-active' : ''}`}
            data-testid="staff-filter-all"
            onClick={() => setStatusFilter('ALL')}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`staff-filter-pill${statusFilter === 'ACTIVE' ? ' is-active' : ''}`}
            data-testid="staff-filter-active"
            onClick={() => setStatusFilter('ACTIVE')}
          >
            ⌨️ Active ({counts.active})
          </button>
          <button
            type="button"
            className={`staff-filter-pill${statusFilter === 'AMNESIA' ? ' is-active' : ''}`}
            data-testid="staff-filter-amnesia"
            onClick={() => setStatusFilter('AMNESIA')}
          >
            🔥 {counts.amnesia}
          </button>
          <button
            type="button"
            className={`staff-filter-pill${statusFilter === 'IDLE' ? ' is-active' : ''}`}
            data-testid="staff-filter-idle"
            onClick={() => setStatusFilter('IDLE')}
          >
            ☕ Idle ({counts.idle})
          </button>
        </div>
      </div>

      {/* Scrollable Agent Fleet List */}
      <div className="staff-roster-list" data-testid="staff-roster-list">
        {filteredCharacters.map((char) => {
          const isSelected = selectedSession === char.sessionName
          const isAmnesia = char.context.pct >= 30 || char.status === 'AMNESIA'
          const badge = resolveOverheadStatusBadge(char)

          return (
            <button
              key={char.id}
              type="button"
              className={`staff-roster-row${isSelected ? ' is-selected' : ''}${
                isAmnesia ? ' is-amnesia' : ''
              }`}
              data-testid={`staff-row-${char.sessionName}`}
              onClick={() => onSelectCharacter(char)}
            >
              <div className="staff-row-avatar">
                <img
                  src={`/sprites/characters/${char.archetype}-front-left.png`}
                  alt={char.displayName}
                  height={42}
                  className="staff-avatar-img"
                  style={{
                    height: '42px',
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    display: 'block',
                  }}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>

              <div className="staff-row-main">
                <div className="staff-row-top">
                  <span className="staff-row-session" title={char.sessionName}>
                    {char.sessionName}
                  </span>
                  <div className="staff-row-badges">
                    <span className={`vessel-chip vessel-${char.vessel.toLowerCase()}`}>
                      {char.vessel}
                    </span>
                    <span className={`staff-status-chip tone-${badge.tone}`}>
                      {badge.emoji} {badge.label}
                    </span>
                  </div>
                </div>

                <div className="staff-row-role">
                  <span>{char.roleTitle}</span>
                  <code className="staff-desk-code">{char.deskSpotId}</code>
                </div>

                <div className="staff-row-context">
                  <div
                    className="staff-context-track"
                    title={`Context: ${char.context.pct}% (${formatTokenCountCompact(char.context.tokensUsed, char.context.tokenBudget)}) — 30% Amnesia Threshold`}
                  >
                    <div
                      className={`staff-context-fill severity-${char.context.severity}`}
                      style={{
                        width: `${
                          char.context.pct > 0 ? Math.min(100, Math.max(2, char.context.pct)) : 0
                        }%`,
                      }}
                    />
                    <span className="context-threshold-tick" style={{ left: '30%' }} />
                  </div>
                  <span className={`staff-context-pct severity-${char.context.severity}`}>
                    {char.context.pct}% ·{' '}
                    {formatTokenCountCompact(char.context.tokensUsed, char.context.tokenBudget)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}

        {filteredCharacters.length === 0 && (
          <div className="staff-roster-empty" data-testid="staff-roster-empty">
            No agents match filter "{searchQuery || statusFilter}".
          </div>
        )}
      </div>
    </aside>
  )
}
