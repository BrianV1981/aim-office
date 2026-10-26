import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export interface LocalFleetSessionRecord {
  session_name: string
  vessel: string
  status: string
  command: string
  path: string
  repo_name: string
  branch: string
  is_worktree: boolean
  context_pct: number
  preview: string
  attached: boolean
  project_number: number | null
  project_repo: string
}

export interface LocalKanbanTicket {
  id: string
  number: number
  title: string
  status: 'Todo' | 'In Progress' | 'Done'
  assignee: string
}

export interface RecordedCommunicateDispatch {
  id: string
  filename: string
  sender: string
  recipient: string
  reply_to: string
  mtime: number
  preview: string
}

const recentCommunicateDispatches: RecordedCommunicateDispatch[] = []

const SAFE_SESSION_RE = /^[a-zA-Z0-9_.-]+$/

function runCmd(cmd: string, args: string[], timeoutMs = 4500): string {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return ''
  }
}

export function resolveMainRepoRoot(cwdPath: string): string {
  if (!cwdPath) return ''
  const parts = cwdPath.split(path.sep)
  const wsIdx = parts.lastIndexOf('workspace')
  if (wsIdx > 1 && parts[wsIdx + 1]?.startsWith('issue-')) {
    return parts.slice(0, wsIdx).join(path.sep) || path.sep
  }
  return cwdPath
}

export function readRepoProjectConfig(cwdPath: string): {
  projectNumber: number | null
  owner: string
  repo: string
} {
  const mainRoot = resolveMainRepoRoot(cwdPath)
  const candidates = [
    path.join(mainRoot, 'joshua_os', '.aim_core', 'CONFIG.json'),
    path.join(cwdPath, 'joshua_os', '.aim_core', 'CONFIG.json'),
  ]
  for (const cfgPath of candidates) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
        const gp = raw?.settings?.github_projects
        if (gp && typeof gp === 'object') {
          return {
            projectNumber: typeof gp.number === 'number' ? gp.number : null,
            owner: typeof gp.owner === 'string' ? gp.owner : 'BrianV1981',
            repo: typeof gp.repo === 'string' ? gp.repo : '',
          }
        }
      }
    } catch {
      // Ignore malformed config
    }
  }
  return { projectNumber: null, owner: 'BrianV1981', repo: '' }
}

export function readGitBranchFast(cwdPath: string): string {
  if (!cwdPath) return 'main'
  const branchOut = runCmd('git', ['-C', cwdPath, 'rev-parse', '--abbrev-ref', 'HEAD'], 1500).trim()
  return branchOut || 'main'
}

export function parsePaneScrollbackTelemetry(
  scrollback: string,
  command: string,
  sessionName: string
): {
  vessel: string
  status: string
  context_pct: number
  preview: string
} {
  const cmdLower = (command || '').toLowerCase()
  const sessLower = sessionName.toLowerCase()
  let vessel = 'shell'
  if (cmdLower.includes('agy') || sessLower.startsWith('aim-') || sessLower.startsWith('agy')) {
    vessel = 'agy'
  }
  if (cmdLower.includes('grok') || sessLower.includes('grok')) {
    vessel = 'grok'
  }
  if (cmdLower.includes('opencode') || sessLower.includes('opencode')) {
    vessel = 'opencode'
  }
  if (cmdLower.includes('codex') || sessLower.includes('codex')) {
    vessel = 'codex'
  }
  if (sessLower.includes('audit')) {
    vessel = 'auditor'
  }

  const lines = scrollback
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[─━═]+$/.test(l))

  let contextPct = 12
  const pctMatch = scrollback.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:context|ctx|used)?/i)
  const tokenInMatch = scrollback.match(/(\d+(?:\.\d+)?)k\s+in\b/i)
  if (tokenInMatch) {
    const kTokens = parseFloat(tokenInMatch[1])
    contextPct = Math.min(99, Math.round((kTokens / 200) * 1000) / 10)
  } else if (pctMatch) {
    const val = parseFloat(pctMatch[1])
    if (val > 0 && val <= 100) contextPct = val
  }

  const tailText = lines.slice(-8).join('\n')
  let status = 'IDLE'
  if (contextPct >= 30) {
    status = 'AMNESIA'
  } else if (/Generating|Working|Thinking|Running|●\s+\w+\(/i.test(tailText)) {
    status = 'TOOL_EXEC'
  } else if (/yes\/no|\?\s*$|Proceed|confirm/i.test(tailText)) {
    status = 'WAITING'
  } else if (lines.length > 0) {
    status = 'THINKING'
  }

  const meaningfulLines = lines.filter(
    (l) => !l.startsWith('? for shortcuts') && !l.startsWith('esc to cancel') && l !== '>'
  )
  const preview = meaningfulLines[meaningfulLines.length - 1]?.slice(0, 90) || 'Ready at prompt'

  return {
    vessel,
    status,
    context_pct: contextPct,
    preview,
  }
}

export function collectLocalTmuxFleet(): LocalFleetSessionRecord[] {
  const fmt =
    '#{session_name}@@@#{pane_current_command}@@@#{pane_current_path}@@@#{session_attached}'
  const raw = runCmd('tmux', ['list-panes', '-a', '-F', fmt], 3000)
  if (!raw.trim()) return []

  const seen = new Set<string>()
  const fleet: LocalFleetSessionRecord[] = []

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [sessionName, cmd, panePath, attachedStr] = line.split('@@@')
    if (!sessionName || seen.has(sessionName) || sessionName.startsWith('aim-client-')) {
      continue
    }
    seen.add(sessionName)

    const cap = runCmd('tmux', ['capture-pane', '-t', sessionName, '-p', '-J', '-S', '-25'], 1500)
    const telemetry = parsePaneScrollbackTelemetry(cap, cmd || '', sessionName)
    const mainRoot = resolveMainRepoRoot(panePath || '')
    const repoName = path.basename(mainRoot || panePath || sessionName)
    const branch = readGitBranchFast(panePath || '')
    const { projectNumber, repo } = readRepoProjectConfig(panePath || '')

    fleet.push({
      session_name: sessionName,
      vessel: telemetry.vessel,
      status: telemetry.status,
      command: cmd || 'bash',
      path: panePath || '',
      repo_name: repoName,
      branch,
      is_worktree: (panePath || '').includes('/workspace/issue-'),
      context_pct: telemetry.context_pct,
      preview: telemetry.preview,
      attached: attachedStr === '1',
      project_number: projectNumber,
      project_repo: repo || `BrianV1981/${repoName}`,
    })
  }

  return fleet
}

export function resolveSessionPath(sessionName: string): string {
  if (SAFE_SESSION_RE.test(sessionName)) {
    const out = runCmd(
      'tmux',
      ['display-message', '-p', '-t', sessionName, '#{pane_current_path}'],
      1500
    ).trim()
    if (out && fs.existsSync(out)) return out
  }
  const fallback = path.join('/home/kingb', sessionName)
  if (fs.existsSync(fallback)) return fallback
  return '/home/kingb/aim-office'
}

export function fetchProjectKanbanForSession(sessionName: string): {
  session: string
  projectNumber: number
  repo: string
  tickets: LocalKanbanTicket[]
} {
  const sessionPath = resolveSessionPath(sessionName || 'aim-office')
  const { projectNumber, owner, repo } = readRepoProjectConfig(sessionPath)
  const effectiveNumber = projectNumber ?? 14
  const effectiveRepo = repo || `BrianV1981/${path.basename(resolveMainRepoRoot(sessionPath))}`

  const ghJson = runCmd(
    'gh',
    [
      'project',
      'item-list',
      String(effectiveNumber),
      '--owner',
      owner || 'BrianV1981',
      '--format',
      'json',
      '-L',
      '40',
    ],
    5000
  )

  if (ghJson.trim()) {
    try {
      const parsed = JSON.parse(ghJson) as { items?: Array<Record<string, unknown>> }
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const tickets: LocalKanbanTicket[] = parsed.items.map((item, idx) => {
          const content =
            item.content && typeof item.content === 'object'
              ? (item.content as Record<string, unknown>)
              : {}
          const rawStatus = String(item.status ?? 'Todo').toLowerCase()
          const status: LocalKanbanTicket['status'] = rawStatus.includes('done')
            ? 'Done'
            : rawStatus.includes('progress')
              ? 'In Progress'
              : 'Todo'
          const number = Number(content.number ?? idx + 1)
          return {
            id: String(item.id ?? `ticket-${number}`),
            number,
            title: String(item.title ?? content.title ?? `Ticket #${number}`),
            status,
            assignee: sessionName || 'aim-office',
          }
        })
        return {
          session: sessionName || 'aim-office',
          projectNumber: effectiveNumber,
          repo: effectiveRepo,
          tickets,
        }
      }
    } catch {
      // Fall through to deterministic fallback tickets
    }
  }

  return {
    session: sessionName || 'aim-office',
    projectNumber: effectiveNumber,
    repo: effectiveRepo,
    tickets: [
      {
        id: 'ticket-1',
        number: 1,
        title: 'feat(engine): scaffold React 19 + TS isometric 2.5D stage & Python 2x2 sprite slicer',
        status: 'Done',
        assignee: sessionName || 'aim-office',
      },
      {
        id: 'ticket-4',
        number: 4,
        title: 'fix(layout): 1376x768 4-way standing desk quad pods & skewY wall TaskBoard',
        status: 'Done',
        assignee: sessionName || 'aim-office',
      },
      {
        id: 'ticket-5',
        number: 5,
        title: 'feat(floor): elastic 11-to-32 agent dynamic pod layout, pan/zoom camera & 20-character roster',
        status: 'Done',
        assignee: sessionName || 'aim-office',
      },
      {
        id: 'ticket-6',
        number: 6,
        title: 'feat(cockpit): live local tmux & per-project GitHub Kanban bridge + last response, direct reply, Mic STT & TTS',
        status: 'In Progress',
        assignee: sessionName || 'aim-office',
      },
      {
        id: 'ticket-7',
        number: 7,
        title: 'feat(communicate): 1-click aim-communicate broker dropdown on agent cards with physical courier walks',
        status: 'Todo',
        assignee: sessionName || 'aim-office',
      },
    ],
  }
}

export function captureCleanSessionOutput(sessionName: string): {
  session: string
  output: string
  lines: string[]
} {
  if (!SAFE_SESSION_RE.test(sessionName)) {
    return { session: sessionName, output: '', lines: [] }
  }
  const raw = runCmd(
    'tmux',
    ['capture-pane', '-t', sessionName, '-p', '-J', '-S', '-60'],
    2000
  )
  const cleanedLines = raw
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter(
      (l) =>
        l.trim().length > 0 &&
        !/^[─━═]+$/.test(l.trim()) &&
        !l.includes('? for shortcuts') &&
        !l.includes('esc to cancel')
    )
  const tail = cleanedLines.slice(-18)
  return {
    session: sessionName,
    output: tail.join('\n') || `[${sessionName}] Active tmux session ready at prompt.`,
    lines: tail,
  }
}

/**
 * Inject text into a target tmux session using the 3-step tmux clipboard buffer protocol:
 *   1. `tmux set-buffer -- <text>`
 *   2. `tmux paste-buffer -t <session>`
 *   3. Separate `tmux send-keys -t <session> Enter` (with Escape before Enter on AGY vessels)
 */
export function injectTmuxSessionMessage(sessionName: string, text: string): boolean {
  if (!SAFE_SESSION_RE.test(sessionName) || !text.trim()) {
    return false
  }
  const singleLine = text.replace(/\r?\n+/g, ' ').trim()
  try {
    execFileSync('tmux', ['set-buffer', '--', singleLine], { timeout: 2000 })
    execFileSync('tmux', ['paste-buffer', '-t', sessionName], { timeout: 2000 })
    const paneCmd = runCmd(
      'tmux',
      ['display-message', '-p', '-t', sessionName, '#{pane_current_command}'],
      1500
    ).toLowerCase()
    if (paneCmd.includes('agy')) {
      execFileSync('tmux', ['send-keys', '-t', sessionName, 'Escape'], { timeout: 1500 })
    }
    execFileSync('tmux', ['send-keys', '-t', sessionName, 'Enter'], { timeout: 1500 })
    return true
  } catch {
    return false
  }
}

export function buildCommunicateBrokerPrompt(
  fromSession: string,
  toSession: string,
  instruction: string
): string {
  return `Please use your aim-communicate skill to send a message to tmux session ${toSession} (declare FROM: ${fromSession} and REPLY_TO: ${fromSession}) with this directive/question: ${instruction.trim()}`
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += String(chunk)
    })
    req.on('end', () => {
      try {
        resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function createOfficeBridgePlugin(): Plugin {
  return {
    name: 'aim-office-local-tmux-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || ''
        if (!rawUrl.startsWith('/api/office/')) {
          return next()
        }

        const parsedUrl = new URL(rawUrl, 'http://localhost:5175')
        const pathname = parsedUrl.pathname

        if (req.method === 'GET' && pathname === '/api/office/fleet') {
          const fleet = collectLocalTmuxFleet()
          return sendJson(res, 200, {
            fleet,
            dispatches: recentCommunicateDispatches,
          })
        }

        if (req.method === 'GET' && pathname === '/api/office/kanban') {
          const session = parsedUrl.searchParams.get('session') || 'aim-office'
          const data = fetchProjectKanbanForSession(session)
          return sendJson(res, 200, data)
        }

        const outputMatch = pathname.match(/^\/api\/office\/session\/([^/]+)\/output$/)
        if (req.method === 'GET' && outputMatch) {
          const session = decodeURIComponent(outputMatch[1])
          const data = captureCleanSessionOutput(session)
          return sendJson(res, 200, data)
        }

        const replyMatch = pathname.match(/^\/api\/office\/session\/([^/]+)\/reply$/)
        if (req.method === 'POST' && replyMatch) {
          const session = decodeURIComponent(replyMatch[1])
          const body = await readJsonBody(req)
          const message = String(body.message ?? body.command ?? '').trim()
          if (!message) {
            return sendJson(res, 400, { error: 'Message cannot be empty' })
          }
          const ok = injectTmuxSessionMessage(session, message)
          return sendJson(res, ok ? 200 : 500, {
            status: ok ? 'sent' : 'failed',
            session,
            message,
          })
        }

        if (req.method === 'POST' && pathname === '/api/office/communicate') {
          const body = await readJsonBody(req)
          const fromSession = String(body.fromSession ?? '').trim()
          const toSession = String(body.toSession ?? '').trim()
          const instruction = String(body.instruction ?? '').trim()
          if (!fromSession || !toSession || !instruction) {
            return sendJson(res, 400, {
              error: 'fromSession, toSession, and instruction are required',
            })
          }
          const prompt = buildCommunicateBrokerPrompt(fromSession, toSession, instruction)
          const injected = injectTmuxSessionMessage(fromSession, prompt)
          const dispatchEvent: RecordedCommunicateDispatch = {
            id: `broker-${Date.now()}`,
            filename: 'AIM_COMMUNICATE_BROKER.md',
            sender: fromSession,
            recipient: toSession,
            reply_to: fromSession,
            mtime: Math.floor(Date.now() / 1000),
            preview: `[${fromSession} -> ${toSession}] ${instruction}`,
          }
          recentCommunicateDispatches.unshift(dispatchEvent)
          if (recentCommunicateDispatches.length > 25) {
            recentCommunicateDispatches.pop()
          }
          return sendJson(res, 200, {
            status: injected ? 'dispatched' : 'simulated',
            injected,
            prompt,
            dispatch: dispatchEvent,
          })
        }

        return next()
      })
    },
  }
}
