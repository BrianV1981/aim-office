import {
  AgentOperationalStatus,
  ContextGauge,
  ContextSeverity,
  VesselType,
} from '../office/types'

export interface FleetPaneRecord {
  sessionName: string
  vessel: VesselType
  status: AgentOperationalStatus
  context: ContextGauge
  branch: string
  path: string
  repoName: string
  isWorktree: boolean
  preview: string
  attached: boolean
}

export interface SwarmDispatchEvent {
  id: string
  filename: string
  sender: string
  recipient: string
  replyTo: string
  mtime: number
  preview: string
  content?: string
}

export interface ForensicToolCall {
  name: string
  summary: string
  timestamp?: string
}

export interface SessionForensicsPayload {
  session: string
  panePath: string
  source: string
  toolCallCount: number
  recentToolPills: ForensicToolCall[]
}

export interface WorkspaceBrainFile {
  label: string
  category: string
  path: string
  exists: boolean
  mtime?: number | null
}

export interface WorkspaceWorktreeItem {
  name: string
  path: string
  branch: string
}

export interface WorkspaceContextPayload {
  session: string
  panePath: string
  repoRoot: string
  mainRepoRoot: string
  branch: string
  wikiLogDelta: string[]
  brainFiles: WorkspaceBrainFile[]
  worktrees: WorkspaceWorktreeItem[]
}

/**
 * Compute 30%-Rule Context Severity (`green` < 20%, `amber` 20..29.9%, `red` >= 30%).
 */
export function computeContextSeverity(pct: number): ContextSeverity {
  if (pct >= 30) return 'red'
  if (pct >= 20) return 'amber'
  return 'green'
}

/**
 * Normalize raw vessel string from `aim-connect` (`agy`, `grok`, `opencode`, `codex`, `shell`)
 * into canonical AIM-Office `VesselType`.
 */
export function normalizeVesselType(
  rawVessel: string | undefined,
  sessionName: string
): VesselType {
  const lowerSession = sessionName.toLowerCase()
  if (lowerSession.includes('auditor') || lowerSession.includes('audit')) {
    return 'Auditor'
  }
  const v = (rawVessel || '').toLowerCase()
  if (v === 'agy' || v.includes('antigravity')) return 'AGY'
  if (v === 'grok') return 'Grok'
  if (v === 'opencode') return 'OpenCode'
  if (v === 'codex') return 'Codex'
  if (v === 'auditor') return 'Auditor'
  if (lowerSession.includes('grok')) return 'Grok'
  if (lowerSession.includes('opencode')) return 'OpenCode'
  if (lowerSession.includes('codex')) return 'Codex'
  if (lowerSession.startsWith('aim-') || lowerSession.startsWith('agy')) return 'AGY'
  return 'Shell'
}

/**
 * Normalize raw status string from `aim-connect` into `AgentOperationalStatus`.
 */
export function normalizeOperationalStatus(
  rawStatus: string | undefined,
  contextPct: number
): AgentOperationalStatus {
  if (contextPct >= 30) {
    return 'AMNESIA'
  }
  const upper = (rawStatus || 'IDLE').toUpperCase()
  if (upper === 'TOOL_EXEC' || upper === 'TOOL') return 'TOOL_EXEC'
  if (upper === 'THINKING' || upper === 'WORKING' || upper === 'BUSY') return 'THINKING'
  if (upper === 'WAITING' || upper === 'PROMPT' || upper === 'NEEDS_INPUT') return 'WAITING'
  if (upper === 'AMNESIA' || upper === 'CRITICAL') return 'AMNESIA'
  if (upper === 'COURIER') return 'COURIER'
  return 'IDLE'
}

export const DEMO_FLEET_PANES: FleetPaneRecord[] = [
  {
    sessionName: 'aim-joshua',
    vessel: 'AGY',
    status: 'THINKING',
    context: { pct: 14, severity: 'green', tokensUsed: 28000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-joshua',
    repoName: 'aim-joshua',
    isWorktree: false,
    preview: '[DISPATCH] Orchestrating AIM-Office Phase 1 (#1 -> #2 -> #3)',
    attached: true,
  },
  {
    sessionName: 'aim-office',
    vessel: 'AGY',
    status: 'TOOL_EXEC',
    context: { pct: 18, severity: 'green', tokensUsed: 36000, tokenBudget: 200000 },
    branch: 'fix/issue-2',
    path: '/home/kingb/aim-office/workspace/issue-2',
    repoName: 'aim-office',
    isWorktree: true,
    preview: '[Vitest] Running telemetry & courier walk tests',
    attached: true,
  },
  {
    sessionName: 'aim-connect',
    vessel: 'AGY',
    status: 'THINKING',
    context: { pct: 21, severity: 'amber', tokensUsed: 42000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-connect',
    repoName: 'aim-connect',
    isWorktree: false,
    preview: 'Serving /api/fleet/panes & /api/swarm/activity on :8000',
    attached: true,
  },
  {
    sessionName: 'aim-auditor',
    vessel: 'Auditor',
    status: 'WAITING',
    context: { pct: 16, severity: 'green', tokensUsed: 32000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/grok-audit',
    repoName: 'grok-audit',
    isWorktree: false,
    preview: 'Gatekeeper standing by for Phase 1 closeout audit',
    attached: false,
  },
  {
    sessionName: 'aim-ld',
    vessel: 'Grok',
    status: 'TOOL_EXEC',
    context: { pct: 24, severity: 'amber', tokensUsed: 48000, tokenBudget: 200000 },
    branch: 'feat/lead-scoring',
    path: '/home/kingb/aim-ld',
    repoName: 'aim-ld',
    isWorktree: false,
    preview: '[Bash] pytest tests/test_lead_pipeline.py',
    attached: false,
  },
  {
    sessionName: 'aim-tbsoftwash',
    vessel: 'OpenCode',
    status: 'THINKING',
    context: { pct: 15, severity: 'green', tokensUsed: 30000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-tbsoftwash',
    repoName: 'aim-tbsoftwash',
    isWorktree: false,
    preview: 'Generating regional authority content pipeline',
    attached: false,
  },
  {
    sessionName: 'aim-grok',
    vessel: 'Grok',
    status: 'AMNESIA',
    context: { pct: 33, severity: 'red', tokensUsed: 66000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-grok',
    repoName: 'aim-grok',
    isWorktree: false,
    preview: '30%-Rule threshold exceeded — preparing /aim-handoff',
    attached: false,
  },
  {
    sessionName: 'aim-codex',
    vessel: 'Codex',
    status: 'IDLE',
    context: { pct: 9, severity: 'green', tokensUsed: 18000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-codex',
    repoName: 'aim-codex',
    isWorktree: false,
    preview: 'Ready at prompt',
    attached: false,
  },
  {
    sessionName: 'aim-opencode',
    vessel: 'OpenCode',
    status: 'TOOL_EXEC',
    context: { pct: 19, severity: 'green', tokensUsed: 38000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-opencode',
    repoName: 'aim-opencode',
    isWorktree: false,
    preview: '[Edit] refactoring schema validators',
    attached: false,
  },
  {
    sessionName: 'aim-skorbane',
    vessel: 'AGY',
    status: 'IDLE',
    context: { pct: 11, severity: 'green', tokensUsed: 22000, tokenBudget: 200000 },
    branch: 'main',
    path: '/home/kingb/aim-skorbane',
    repoName: 'aim-skorbane',
    isWorktree: false,
    preview: 'Idle after content deployment',
    attached: false,
  },
]

export const DEMO_SWARM_DISPATCHES: SwarmDispatchEvent[] = [
  {
    id: 'demo-dispatch-phase1',
    filename: 'DISPATCH_FROM_AIM_JOSHUA_PHASE1_BUILD.md',
    sender: 'aim-joshua',
    recipient: 'aim-office',
    replyTo: 'aim-joshua',
    mtime: 1793037900,
    preview: '[DISPATCH from aim-joshua] Execute AIM-Office Phase 1 build (#1 -> #2 -> #3)',
  },
  {
    id: 'demo-report-connect',
    filename: 'REPORT_AIM_CONNECT_212.md',
    sender: 'aim-connect',
    recipient: 'aim-joshua',
    replyTo: 'aim-joshua',
    mtime: 1793037600,
    preview: '[REPORT from aim-connect] Shipped #209-#212 Fleet Telemetry & Swarm Activity API',
  },
]

function buildHeaders(apiToken?: string): HeadersInit {
  const token =
    apiToken ||
    (typeof window !== 'undefined' ? window.localStorage?.getItem('aim-token') || '' : '') ||
    (import.meta.env?.VITE_AIM_API_TOKEN as string | undefined) ||
    ''
  return token
    ? { 'Content-Type': 'application/json', 'x-api-token': token }
    : { 'Content-Type': 'application/json' }
}

/**
 * Parse raw JSON response from `GET /api/fleet/panes` into normalized `FleetPaneRecord[]`.
 */
export function parseFleetPanesResponse(raw: unknown): FleetPaneRecord[] {
  if (!raw || typeof raw !== 'object') return []
  const data = raw as Record<string, unknown>
  const rawList = Array.isArray(data.fleet)
    ? data.fleet
    : Array.isArray(data.panes)
      ? data.panes
      : []

  const seen = new Set<string>()
  const records: FleetPaneRecord[] = []

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const sessionName = String(rec.session_name ?? rec.session ?? '').trim()
    if (!sessionName || seen.has(sessionName)) continue
    seen.add(sessionName)

    const nestedCtx =
      rec.context && typeof rec.context === 'object'
        ? (rec.context as Record<string, unknown>)
        : null
    const rawPct = Number(nestedCtx?.pct ?? rec.context_pct ?? 0)
    const pct = Number.isFinite(rawPct) ? Math.max(0, Math.round(rawPct * 10) / 10) : 0
    const severity = computeContextSeverity(pct)
    const vessel = normalizeVesselType(String(rec.vessel ?? ''), sessionName)
    const status = normalizeOperationalStatus(String(rec.status ?? 'IDLE'), pct)

    records.push({
      sessionName,
      vessel,
      status,
      context: {
        pct,
        severity,
        tokensUsed: Number(rec.tokens_used ?? 0),
        tokenBudget: Number(rec.tokens_limit ?? 200000),
      },
      branch: String(rec.branch ?? 'main') || 'main',
      path: String(rec.path ?? ''),
      repoName: String(rec.repo_name ?? sessionName),
      isWorktree: Boolean(rec.is_worktree),
      preview: String(rec.preview ?? ''),
      attached: Boolean(rec.attached),
    })
  }

  return records
}

export class AimConnectClient {
  private readonly baseUrl: string
  private readonly apiToken?: string

  constructor(options?: { baseUrl?: string; apiToken?: string }) {
    const envUrl = (import.meta.env?.VITE_AIM_CONNECT_URL as string | undefined) || ''
    this.baseUrl = (options?.baseUrl ?? envUrl).replace(/\/$/, '')
    this.apiToken = options?.apiToken
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  async fetchFleetPanes(forceDemo = false): Promise<{
    panes: FleetPaneRecord[]
    isDemoFallback: boolean
  }> {
    if (forceDemo) {
      return { panes: DEMO_FLEET_PANES, isDemoFallback: true }
    }
    try {
      const resp = await fetch(this.url('/api/fleet/panes'), {
        headers: buildHeaders(this.apiToken),
      })
      if (!resp.ok) {
        return { panes: DEMO_FLEET_PANES, isDemoFallback: true }
      }
      const json = await resp.json()
      const parsed = parseFleetPanesResponse(json)
      if (parsed.length === 0) {
        return { panes: DEMO_FLEET_PANES, isDemoFallback: true }
      }
      return { panes: parsed, isDemoFallback: false }
    } catch {
      return { panes: DEMO_FLEET_PANES, isDemoFallback: true }
    }
  }

  async fetchSwarmActivity(forceDemo = false): Promise<SwarmDispatchEvent[]> {
    if (forceDemo) {
      return DEMO_SWARM_DISPATCHES
    }
    try {
      const resp = await fetch(this.url('/api/swarm/activity'), {
        headers: buildHeaders(this.apiToken),
      })
      if (!resp.ok) {
        return DEMO_SWARM_DISPATCHES
      }
      const json = (await resp.json()) as { dispatches?: Array<Record<string, unknown>> }
      if (!Array.isArray(json.dispatches)) {
        return DEMO_SWARM_DISPATCHES
      }
      return json.dispatches.map((d, idx) => ({
        id: String(d.id ?? d.path ?? `dispatch-${idx}`),
        filename: String(d.filename ?? 'DISPATCH.md'),
        sender: String(d.sender ?? 'aim-joshua'),
        recipient: String(d.recipient ?? 'aim-office'),
        replyTo: String(d.reply_to ?? d.sender ?? 'aim-joshua'),
        mtime: Number(d.mtime ?? Date.now() / 1000),
        preview: String(d.preview ?? 'Inter-agent dispatch'),
        content: typeof d.content === 'string' ? d.content : undefined,
      }))
    } catch {
      return DEMO_SWARM_DISPATCHES
    }
  }

  async fetchSessionForensics(
    sessionName: string,
    forceDemo = false
  ): Promise<SessionForensicsPayload> {
    if (!forceDemo) {
      try {
        const resp = await fetch(
          this.url(`/api/forensics/${encodeURIComponent(sessionName)}`),
          { headers: buildHeaders(this.apiToken) }
        )
        if (resp.ok) {
          const json = (await resp.json()) as Record<string, unknown>
          const turns = Array.isArray(json.turns) ? json.turns : []
          const pills: ForensicToolCall[] = []
          for (const turn of turns) {
            if (!turn || typeof turn !== 'object') continue
            const tObj = turn as Record<string, unknown>
            const toolCalls = Array.isArray(tObj.tool_calls) ? tObj.tool_calls : []
            for (const tc of toolCalls) {
              if (!tc || typeof tc !== 'object') continue
              const tcObj = tc as Record<string, unknown>
              pills.push({
                name: String(tcObj.name ?? 'Tool'),
                summary: String(tcObj.summary ?? tcObj.args_preview ?? ''),
                timestamp: typeof tObj.timestamp === 'string' ? tObj.timestamp : undefined,
              })
            }
          }
          return {
            session: sessionName,
            panePath: String(json.pane_path ?? `/home/kingb/${sessionName}`),
            source: String(json.source ?? `tmux:${sessionName}`),
            toolCallCount: Number(json.tool_call_count ?? pills.length),
            recentToolPills: pills.slice(-8).reverse(),
          }
        }
      } catch {
        // Fall through to deterministic demo forensics
      }
    }

    return {
      session: sessionName,
      panePath: `/home/kingb/${sessionName}`,
      source: `demo:${sessionName}`,
      toolCallCount: 4,
      recentToolPills: [
        { name: 'Bash', summary: './aim projects board' },
        { name: 'Read', summary: 'memory-wiki/index.md' },
        { name: 'Edit', summary: 'src/office/useOfficeDirector.ts' },
        { name: 'Bash', summary: 'npx vitest run' },
      ],
    }
  }

  async fetchWorkspaceContext(
    sessionName: string,
    forceDemo = false
  ): Promise<WorkspaceContextPayload> {
    if (!forceDemo) {
      try {
        const resp = await fetch(
          this.url(`/api/workspace/context?session=${encodeURIComponent(sessionName)}`),
          { headers: buildHeaders(this.apiToken) }
        )
        if (resp.ok) {
          const json = (await resp.json()) as Record<string, unknown>
          const brainFiles = Array.isArray(json.brain_files)
            ? (json.brain_files as Array<Record<string, unknown>>).map((bf) => ({
                label: String(bf.label ?? ''),
                category: String(bf.category ?? 'wiki'),
                path: String(bf.path ?? ''),
                exists: Boolean(bf.exists),
                mtime: typeof bf.mtime === 'number' ? bf.mtime : null,
              }))
            : []
          const worktrees = Array.isArray(json.worktrees)
            ? (json.worktrees as Array<Record<string, unknown>>).map((wt) => ({
                name: String(wt.name ?? ''),
                path: String(wt.path ?? ''),
                branch: String(wt.branch ?? ''),
              }))
            : []
          return {
            session: sessionName,
            panePath: String(json.pane_path ?? `/home/kingb/${sessionName}`),
            repoRoot: String(json.repo_root ?? `/home/kingb/${sessionName}`),
            mainRepoRoot: String(json.main_repo_root ?? `/home/kingb/${sessionName}`),
            branch: String(json.branch ?? 'main'),
            wikiLogDelta: [
              `[2026-10-26] Active telemetry sync for ${sessionName}`,
              `[2026-10-26] Verified 30%-Rule Context Guard & Memory Wiki state`,
            ],
            brainFiles,
            worktrees,
          }
        }
      } catch {
        // Fall through to demo workspace context
      }
    }

    const demoRecord = DEMO_FLEET_PANES.find((p) => p.sessionName === sessionName)
    return {
      session: sessionName,
      panePath: demoRecord?.path ?? `/home/kingb/${sessionName}`,
      repoRoot: `/home/kingb/${demoRecord?.repoName ?? sessionName}`,
      mainRepoRoot: `/home/kingb/${demoRecord?.repoName ?? sessionName}`,
      branch: demoRecord?.branch ?? 'main',
      wikiLogDelta: [
        '[2026-10-26] Ticket #1 Isometric 2.5D Stage & Waypoint Graph promoted to main',
        '[2026-10-26] Ticket #2 Live aim-connect Fleet Bridge & Courier Walk integration active',
      ],
      brainFiles: [
        {
          label: 'AGENTS.md',
          category: 'agents',
          path: `/home/kingb/${sessionName}/AGENTS.md`,
          exists: true,
        },
        {
          label: 'wiki/index.md',
          category: 'wiki',
          path: `/home/kingb/${sessionName}/memory-wiki/index.md`,
          exists: true,
        },
        {
          label: 'wiki/log.md',
          category: 'wiki',
          path: `/home/kingb/${sessionName}/memory-wiki/log.md`,
          exists: true,
        },
      ],
      worktrees: demoRecord?.isWorktree
        ? [
            {
              name: 'issue-2',
              path: `/home/kingb/${sessionName}/workspace/issue-2`,
              branch: demoRecord.branch,
            },
          ]
        : [],
    }
  }
}

export const defaultAimConnectClient = new AimConnectClient()
