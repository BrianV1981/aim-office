import React, { useEffect, useState } from 'react'
import { OfficeCharacter } from '../office/types'
import {
  AimConnectClient,
  defaultAimConnectClient,
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

  if (!character) return null

  const terminalHref = `${aimConnectBaseUrl.replace(/\/$/, '')}/?session=${encodeURIComponent(
    character.sessionName
  )}`
  const isAmnesia = character.context.pct >= 30 || character.status === 'AMNESIA'

  return (
    <aside
      className="agent-inspector-drawer"
      data-testid="agent-inspector-drawer"
      aria-label={`Agent Inspector for ${character.sessionName}`}
    >
      <div className="drawer-header">
        <div className="drawer-identity">
          <div className="drawer-avatar-box">
            <img
              src={`/sprites/characters/${character.archetype}-front-left.png`}
              alt={character.displayName}
              width={40}
              height={52}
              style={{ imageRendering: 'pixelated' }}
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
            </div>
            <p className="drawer-role-subtitle">
              {character.roleTitle} · Desk <code>{character.deskSpotId}</code>
            </p>
          </div>
        </div>
        <button
          type="button"
          className="drawer-close-btn"
          data-testid="btn-close-inspector"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* 30%-Rule Context Window Gauge */}
      <section className="drawer-section">
        <div className="section-label-row">
          <span>30%-Rule Context Window Telemetry</span>
          <strong
            className={`pct-readout severity-${character.context.severity}`}
            data-testid="inspector-context-pct"
          >
            {character.context.pct}% {isAmnesia ? '🔥 AMNESIA ALERT' : ''}
          </strong>
        </div>
        <div className="inspector-context-bar-track">
          <div
            className={`inspector-context-bar-fill severity-${character.context.severity}`}
            style={{ width: `${Math.min(100, Math.max(4, character.context.pct))}%` }}
          />
        </div>
        <p className="context-hint">
          {isAmnesia
            ? 'Threshold >= 30% crossed: execute /aim-memory-wiki and /aim-handoff.'
            : 'Operating within sovereign < 30% recall precision envelope.'}
        </p>
      </section>

      {/* Forensic Tool Call Pills (/api/forensics/{session}) */}
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

      {/* Workspace Git Branch, Worktrees & Memory Wiki Delta (/api/workspace/context) */}
      <section className="drawer-section">
        <div className="section-label-row">
          <span>GitOps Worktree & Memory Wiki Context</span>
          <code className="branch-chip" data-testid="inspector-git-branch">
            🌿 {workspaceCtx?.branch || character.gitBranch || 'main'}
          </code>
        </div>
        <div className="workspace-meta-grid">
          <div>
            <span className="meta-key">Active Path:</span>{' '}
            <code>{workspaceCtx?.panePath || character.worktreePath || `/home/kingb/${character.sessionName}`}</code>
          </div>
          {workspaceCtx?.worktrees && workspaceCtx.worktrees.length > 0 && (
            <div>
              <span className="meta-key">Isolated Worktrees:</span>{' '}
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

      {/* Actions Footer */}
      <div className="drawer-footer">
        <a
          href={terminalHref}
          target="_blank"
          rel="noreferrer"
          className="btn-open-aim-connect"
          data-testid="link-open-aim-connect"
        >
          🖥️ Open Terminal in AIM-Connect
        </a>
        {onDispatchCourierFromAgent && (
          <button
            type="button"
            className="btn-secondary-courier"
            onClick={() => onDispatchCourierFromAgent(character)}
          >
            📨 Walk Report to J.O.S.H.U.A.
          </button>
        )}
      </div>
    </aside>
  )
}
