import React, { useEffect, useRef, useState } from 'react'
import { OfficeCharacter } from '../office/types'
import {
  AimConnectClient,
  defaultAimConnectClient,
  formatTokenCountCompact,
  SessionForensicsPayload,
  WorkspaceContextPayload,
} from '../services/aimConnectClient'

export interface AgentInspectorDrawerProps {
  character: OfficeCharacter | null
  client?: AimConnectClient
  demoMode?: boolean
  aimConnectBaseUrl?: string
  onClose: () => void
  onDispatchCourierFromAgent?: (character: OfficeCharacter) => void
}

export const AgentInspectorDrawer: React.FC<AgentInspectorDrawerProps> = ({
  character,
  client = defaultAimConnectClient,
  demoMode = false,
  aimConnectBaseUrl = 'http://localhost:8000',
  onClose,
  onDispatchCourierFromAgent,
}) => {
  const [forensics, setForensics] = useState<SessionForensicsPayload | null>(null)
  const [workspaceCtx, setWorkspaceCtx] = useState<WorkspaceContextPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Floating overlay drag state so the user can move the card anywhere over the fullscreen office
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  )

  useEffect(() => {
    if (!character) {
      setForensics(null)
      setWorkspaceCtx(null)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([
      client.fetchSessionForensics(character.sessionName, demoMode),
      client.fetchWorkspaceContext(character.sessionName, demoMode),
    ])
      .then(([forensicsData, wsData]) => {
        if (cancelled) return
        setForensics(forensicsData)
        setWorkspaceCtx(wsData)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [character, client, demoMode])

  useEffect(() => {
    if (!isDraggingCard) return
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setDragOffset({
        x: Math.round(dragRef.current.origX + dx),
        y: Math.round(dragRef.current.origY + dy),
      })
    }
    const handleWindowMouseUp = () => {
      setIsDraggingCard(false)
      dragRef.current = null
    }
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [isDraggingCard])

  if (!character) return null

  const terminalHref = `${aimConnectBaseUrl.replace(/\/$/, '')}/?session=${encodeURIComponent(
    character.sessionName
  )}`
  const isAmnesia = character.context.pct >= 30 || character.status === 'AMNESIA'

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    setIsDraggingCard(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: dragOffset.x,
      origY: dragOffset.y,
    }
  }

  return (
    <aside
      className={`agent-inspector-drawer is-floating-overlay${
        isDraggingCard ? ' is-dragging-card' : ''
      }`}
      data-testid="agent-inspector-drawer"
      data-floating="true"
      data-readonly="true"
      data-drag-offset={`${dragOffset.x},${dragOffset.y}`}
      aria-label={`Agent Inspector for ${character.sessionName}`}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        zIndex: isDraggingCard ? 3250 : 3100,
      }}
    >
      {/* Draggable Header Bar */}
      <div
        className="drawer-header is-draggable-handle"
        data-testid="inspector-drag-handle"
        onMouseDown={handleHeaderMouseDown}
        title="Drag to move Agent Cockpit anywhere over the fullscreen office"
      >
        <div className="drawer-identity">
          <div className="drawer-avatar-box">
            <img
              src={`/sprites/characters/${character.archetype}-front-left.png`}
              alt={character.displayName}
              height={56}
              className="inspector-avatar-img"
              style={{
                height: '56px',
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
            <span className="drawer-archetype-slug">{character.archetype}</span>
          </div>
          <div>
            <div className="drawer-title-row">
              <h2 className="drawer-session-name" data-testid="inspector-session-name">
                {character.sessionName}
              </h2>
              <span className={`vessel-chip vessel-${character.vessel.toLowerCase()}`}>
                {character.vessel}
              </span>
              <span className="drag-hint-pill">✥ Drag Card</span>
            </div>
            <p className="drawer-role-subtitle">
              {character.roleTitle} · Desk <code>{character.deskSpotId}</code>
            </p>
          </div>
        </div>
        <div className="drawer-header-actions">
          {(dragOffset.x !== 0 || dragOffset.y !== 0) && (
            <button
              type="button"
              className="drawer-reset-pos-btn"
              data-testid="btn-reset-inspector-pos"
              onClick={() => setDragOffset({ x: 0, y: 0 })}
              title="Reset Card Position"
            >
              Reset Pos
            </button>
          )}
          <button
            type="button"
            className="drawer-close-btn"
            data-testid="btn-close-inspector"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable Wide Cockpit Body */}
      <div className="drawer-scrollable-body">
        {/* Gamified Unit Tactical Stat Strip */}
        <div className="dossier-stat-strip" data-testid="dossier-stat-strip">
          <div className="dossier-stat-cell">
            <span className="dossier-stat-label">UNIT STATE</span>
            <strong className={`dossier-stat-val status-${character.status.toLowerCase()}`}>
              {character.status}
            </strong>
          </div>
          <div className="dossier-stat-cell">
            <span className="dossier-stat-label">RECALL HEALTH</span>
            <strong className={`dossier-stat-val severity-${character.context.severity}`}>
              {Math.max(0, 100 - character.context.pct)}% OPTIMAL
            </strong>
          </div>
          <div className="dossier-stat-cell">
            <span className="dossier-stat-label">TOOL OPS</span>
            <strong className="dossier-stat-val">
              {forensics ? `${forensics.toolCallCount} EXEC` : 'SYNCING'}
            </strong>
          </div>
          <div className="dossier-stat-cell">
            <span className="dossier-stat-label">STATION</span>
            <strong className="dossier-stat-val">{character.deskSpotId.toUpperCase()}</strong>
          </div>
        </div>

        {/* 30%-Rule Context Window Gauge */}
        <section className="drawer-section">
          <div className="section-label-row">
            <span>30%-Rule Context Window Telemetry</span>
            <strong
              className={`pct-readout severity-${character.context.severity}`}
              data-testid="inspector-context-pct"
            >
              {character.context.pct}% (
              {formatTokenCountCompact(character.context.tokensUsed, character.context.tokenBudget)}
              ) {isAmnesia ? '🔥 AMNESIA ALERT' : ''}
            </strong>
          </div>
          <div
            className="inspector-context-bar-track"
            title="30%-Rule Recall Envelope: green < 22%, amber 22-29%, red >= 30%"
          >
            <div
              className={`inspector-context-bar-fill severity-${character.context.severity}`}
              style={{
                width: `${
                  character.context.pct > 0 ? Math.min(100, Math.max(2, character.context.pct)) : 0
                }%`,
              }}
            />
            <span className="context-threshold-tick" style={{ left: '30%' }} />
          </div>
          <p className="context-hint">
            {isAmnesia
              ? 'Threshold >= 30% crossed: open AIM-Connect to execute /aim-memory-wiki and /aim-handoff.'
              : 'Operating within sovereign < 30% recall precision envelope.'}
          </p>
        </section>

        {/* Option A (#21): Read-Only Visualizer Boundary & Hardened AIM-Connect Deep-Link Gateway */}
        <section
          className="drawer-section readonly-gateway-card"
          data-testid="inspector-readonly-gateway"
        >
          <div className="section-label-row">
            <span>🔒 Sovereign Security Boundary (Read-Only Visualizer)</span>
            <span className="readonly-shield-badge" data-testid="inspector-readonly-badge">
              ZERO-EXECUTION MODE
            </span>
          </div>
          <p className="readonly-gateway-copy">
            Direct <code>tmux</code> prompt injection and raw terminal scrollback scraping are
            disabled in AIM-Office. All interactive agent commands, WebAuthn biometrics, TOTP, E2EE
            encryption, and <code>🔊</code> spoken-summary audio run exclusively through{' '}
            <strong>AIM-Connect</strong>.
          </p>
          <div className="readonly-status-preview" data-testid="inspector-telemetry-preview">
            <span className="meta-key">Telemetry Pulse:</span>{' '}
            <code>
              {character.activeToolPill ||
                `[${character.sessionName}] ${character.status} on ${
                  workspaceCtx?.branch || character.gitBranch || 'main'
                }`}
            </code>
          </div>
        </section>

        {/* 2-Column Wide Grid: Forensic Tool Call Pills (Left) + GitOps Worktree & Wiki Delta (Right) */}
        <div className="inspector-two-col-grid">
          <section className="drawer-section">
            <div className="section-label-row">
              <span>Live Forensic Tool Call Stream</span>
              <span className="muted-count">
                {forensics ? `${forensics.toolCallCount} calls` : loading ? 'Loading...' : '0 calls'}
              </span>
            </div>
            <div className="forensic-pills-list" data-testid="inspector-forensic-pills">
              {forensics?.recentToolPills && forensics.recentToolPills.length > 0 ? (
                forensics.recentToolPills.map((pill, idx) => (
                  <div key={`${pill.name}-${idx}`} className="forensic-pill-item">
                    <span className="pill-tool-name">[{pill.name}]</span>
                    <code className="pill-tool-summary">{pill.summary}</code>
                  </div>
                ))
              ) : (
                <div className="forensic-empty">No recent tool invocations recorded.</div>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <div className="section-label-row">
              <span>GitOps Worktree & Memory Wiki</span>
              <code className="branch-chip" data-testid="inspector-git-branch">
                🌿 {workspaceCtx?.branch || character.gitBranch || 'main'}
              </code>
            </div>
            <div className="workspace-meta-grid">
              <div>
                <span className="meta-key">Active Path:</span>{' '}
                <code>
                  {workspaceCtx?.panePath ||
                    character.worktreePath ||
                    `~/${character.sessionName}`}
                </code>
              </div>
              {workspaceCtx?.worktrees && workspaceCtx.worktrees.length > 0 && (
                <div>
                  <span className="meta-key">Worktrees:</span>{' '}
                  {workspaceCtx.worktrees.map((wt) => (
                    <code key={wt.name} className="worktree-badge">
                      workspace/{wt.name} ({wt.branch})
                    </code>
                  ))}
                </div>
              )}
            </div>

            <div className="wiki-delta-box" data-testid="inspector-wiki-delta">
              <div className="meta-key">Recent memory-wiki/log.md Delta:</div>
              <ul>
                {(workspaceCtx?.wikiLogDelta ?? [
                  `[2026-10-26] Active telemetry sync for ${character.sessionName}`,
                ]).map((entry, idx) => (
                  <li key={idx}>{entry}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="drawer-footer">
        <a
          href={terminalHref}
          target="_blank"
          rel="noreferrer"
          className="btn-open-aim-connect"
          data-testid="link-open-aim-connect"
        >
          🔒 Command {character.sessionName} in AIM-Connect (E2EE + Bio)
        </a>
        {onDispatchCourierFromAgent && (
          <button
            type="button"
            className="btn-secondary-courier"
            data-testid="btn-preview-courier-walk"
            onClick={() => onDispatchCourierFromAgent(character)}
          >
            📨 Preview Visual Walk to J.O.S.H.U.A.
          </button>
        )}
      </div>
    </aside>
  )
}
