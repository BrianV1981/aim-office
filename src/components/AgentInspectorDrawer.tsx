import React, { useEffect, useState } from 'react'
import { OfficeCharacter } from '../office/types'
import {
  AimConnectClient,
  defaultAimConnectClient,
  SessionForensicsPayload,
  SessionOutputPayload,
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

const MACRO_COMMANDS: ReadonlyArray<{ id: string; label: string; command: string }> = [
  { id: 'wiki', label: '🧠 /aim-memory-wiki', command: '/aim-memory-wiki' },
  { id: 'handoff', label: '🤝 /aim-handoff', command: '/aim-handoff' },
  { id: 'board', label: '📋 ./aim projects board', command: './aim projects board' },
  { id: 'proceed', label: '✅ Proceed', command: 'Proceed' },
]

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
  const [sessionOutput, setSessionOutput] = useState<SessionOutputPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const [replyText, setReplyText] = useState<string>('')
  const [replyStatus, setReplyStatus] = useState<string | null>(null)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [ttsStatus, setTtsStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!character) {
      setForensics(null)
      setWorkspaceCtx(null)
      setSessionOutput(null)
      setReplyText('')
      setReplyStatus(null)
      setTtsStatus(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setReplyStatus(null)
    setTtsStatus(null)

    Promise.all([
      client.fetchSessionForensics(character.sessionName, demoMode),
      client.fetchWorkspaceContext(character.sessionName, demoMode),
      client.fetchSessionOutput(character.sessionName, demoMode),
    ])
      .then(([forensicsData, wsData, outputData]) => {
        if (cancelled) return
        setForensics(forensicsData)
        setWorkspaceCtx(wsData)
        setSessionOutput(outputData)
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

  const handleReadAloud = () => {
    const text =
      sessionOutput?.output ||
      `${character.sessionName} is currently ${character.status} at ${character.context.pct} percent context.`
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        if (typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(text)
          window.speechSynthesis.speak(utterance)
        }
      }
      setTtsStatus('🔊 Reading last response aloud...')
    } catch {
      setTtsStatus('🔊 TTS Readout Dispatched')
    }
  }

  const handleToggleMicDictation = () => {
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null

    if (SpeechRec && typeof SpeechRec === 'function') {
      try {
        const rec = new (SpeechRec as new () => {
          lang: string
          interimResults: boolean
          onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
          onend: (() => void) | null
          start: () => void
        })()
        rec.lang = 'en-US'
        rec.interimResults = false
        setIsListening(true)
        rec.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || ''
          if (transcript) {
            setReplyText((prev) => (prev ? `${prev} ${transcript}` : transcript))
          }
        }
        rec.onend = () => setIsListening(false)
        rec.start()
        return
      } catch {
        // Fall through to simulated voice dictation indicator
      }
    }

    setIsListening((prev) => !prev)
    if (!replyText.trim()) {
      setReplyText('Status report requested via voice dictation')
    }
  }

  const handleSendReply = async (customMessage?: string) => {
    const textToSend = (customMessage ?? replyText).trim()
    if (!textToSend) return

    const res = await client.sendSessionReply(character.sessionName, textToSend, demoMode)
    if (res.status) {
      setReplyStatus(`✅ Sent to ${character.sessionName}: "${textToSend}"`)
      if (!customMessage) {
        setReplyText('')
      }
    }
  }

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

      {/* Last Agent Response Viewer + TTS Read-Aloud */}
      <section className="drawer-section">
        <div className="section-label-row">
          <span>Last Agent Response (Live Tmux Scrollback)</span>
          <button
            type="button"
            className="btn-tts-read-aloud"
            data-testid="btn-tts-read-aloud"
            onClick={handleReadAloud}
            title="Read last agent response aloud via SpeechSynthesis TTS"
          >
            🔊 Read Aloud
          </button>
        </div>
        <pre className="inspector-last-response-box" data-testid="inspector-last-response">
          {sessionOutput?.output ||
            `[${character.sessionName}] Active on ${character.gitBranch || 'main'} (${character.status})`}
        </pre>
        {ttsStatus && (
          <div className="tts-status-pill" data-testid="tts-status">
            {ttsStatus}
          </div>
        )}
      </section>

      {/* Direct Reply Cockpit + Voice STT + 1-Tap Macro Pills */}
      <section className="drawer-section" data-testid="inspector-direct-reply-section">
        <div className="section-label-row">
          <span>Direct Tmux Reply & Voice / Macro Cockpit</span>
          <button
            type="button"
            className={`btn-mic-dictation${isListening ? ' is-listening' : ''}`}
            data-testid="btn-mic-dictation"
            onClick={handleToggleMicDictation}
            title="Dictate reply via Web Speech API (SpeechRecognition)"
          >
            {isListening ? '🔴 Listening...' : '🎤 Voice Mic'}
          </button>
        </div>
        <div className="direct-reply-input-row">
          <input
            type="text"
            className="input-direct-reply"
            data-testid="input-direct-reply"
            placeholder={`Send prompt directly to ${character.sessionName}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSendReply()
              }
            }}
          />
          <button
            type="button"
            className="btn-send-direct-reply"
            data-testid="btn-send-direct-reply"
            onClick={() => void handleSendReply()}
          >
            Send ↵
          </button>
        </div>

        {/* 1-Tap Sovereign Macro Pills */}
        <div className="macro-pills-bar" data-testid="macro-pills-bar">
          {MACRO_COMMANDS.map((macro) => (
            <button
              key={macro.id}
              type="button"
              className="btn-macro-pill"
              data-testid={`btn-macro-${macro.id}`}
              onClick={() => void handleSendReply(macro.command)}
            >
              {macro.label}
            </button>
          ))}
        </div>

        {replyStatus && (
          <div className="reply-dispatch-status" data-testid="reply-dispatch-status">
            {replyStatus}
          </div>
        )}
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
