import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const USER_HOME_DIR = os.homedir()

export interface LocalFleetSessionRecord {
  session_name: string
  vessel: string
  status: string
  command: string
  path: string
  repo_name: string
  branch: string
  is_worktree: boolean
  tokens_used: number
  tokens_limit: number
  context_pct: number
  tier: 'normal' | 'warning' | 'critical'
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

function loadCustomProjectMapFromEnv(): Record<string, number> {
  const raw = process.env.AIM_PROJECT_MAP_JSON
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const clean: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && v > 0) {
        clean[k.trim().toLowerCase()] = v
      }
    }
    return clean
  } catch {
    return {}
  }
}

export const SESSION_PROJECT_MAP: Record<string, number> = {
  'aim-office': 14,
  'aim-agy': 11,
  'aim-dash': 10,
  'aim-tmux-dashboard': 10,
  'aim-tmux': 10,
  'aim-skill-library': 9,
  'aim-flight-recorder': 8,
  'aim-joshua': 7,
  'aim-connect': 6,
  'aim-connect-workspace': 6,
  backend: 6,
  'aim-scout': 5,
  'aim-content': 5,
  'aim-recon': 4,
  'aim-claude': 3,
  'aim-browser': 2,
  'aim-ops': 15,
  'aim-media': 15,
  'aim-ai-book': 16,
  'aim-lore': 17,
  'aim-design': 17,
  'aim-gbp': 18,
  'aim-calendar': 19,
  'aim-cron-dashboard': 20,
  'aim-cron': 20,
  'aim-youtube': 21,
  'aim-auditor': 22,
  ...loadCustomProjectMapFromEnv(),
}

const kanbanSessionCache = new Map<
  string,
  {
    ts: number
    data: {
      session: string
      projectNumber: number
      repo: string
      tickets: LocalKanbanTicket[]
    }
  }
>()
const KANBAN_CACHE_TTL_MS = 60_000

export function resolveMappedProjectNumber(
  sessionName: string,
  cwdPath: string,
  configuredNumber: number | null,
  configuredRepo = ''
): number {
  const cleanSession = (sessionName || '').trim().toLowerCase()
  const mainRoot = resolveMainRepoRoot(cwdPath)
  const repoBase = path.basename(mainRoot || cwdPath).toLowerCase()
  const parentBase = path.basename(path.dirname(mainRoot || cwdPath)).toLowerCase()

  const envMap = loadCustomProjectMapFromEnv()
  if (envMap[cleanSession]) {
    return envMap[cleanSession]
  }
  if (envMap[repoBase]) {
    return envMap[repoBase]
  }

  const cleanConfiguredRepo = (configuredRepo || '').trim().toLowerCase()
  const configuredRepoBase = cleanConfiguredRepo.includes('/')
    ? cleanConfiguredRepo.split('/').pop() || ''
    : cleanConfiguredRepo
  const hasExplicitMatchingRepo =
    Boolean(configuredRepoBase) &&
    (configuredRepoBase === repoBase || configuredRepoBase === cleanSession)

  if (
    typeof configuredNumber === 'number' &&
    configuredNumber > 0 &&
    (hasExplicitMatchingRepo || cleanSession === 'aim-joshua')
  ) {
    return configuredNumber
  }

  if (SESSION_PROJECT_MAP[cleanSession]) {
    return SESSION_PROJECT_MAP[cleanSession]
  }
  if (SESSION_PROJECT_MAP[repoBase]) {
    return SESSION_PROJECT_MAP[repoBase]
  }
  if (SESSION_PROJECT_MAP[parentBase]) {
    return SESSION_PROJECT_MAP[parentBase]
  }

  // Only honor unverified configuredNumber when it is not the default template #7 with empty repo (#27)
  if (
    typeof configuredNumber === 'number' &&
    configuredNumber > 0 &&
    (configuredNumber !== 7 || Boolean(cleanConfiguredRepo))
  ) {
    return configuredNumber
  }

  if (cleanSession.includes('connect') || cleanSession.startsWith('agent-op_')) {
    return 6
  }
  return 14
}

const repoProjectConfigCache = new Map<
  string,
  { projectNumber: number | null; owner: string; repo: string }
>()

export function readRepoProjectConfig(cwdPath: string, sessionName = ''): {
  projectNumber: number | null
  owner: string
  repo: string
} {
  const mainRoot = resolveMainRepoRoot(cwdPath)
  const cacheKey = `${mainRoot}::${sessionName}`
  const cached = repoProjectConfigCache.get(cacheKey)
  if (cached) {
    return cached
  }
  const candidates = [
    path.join(mainRoot, 'joshua_os', '.aim_core', 'CONFIG.json'),
    path.join(cwdPath, 'joshua_os', '.aim_core', 'CONFIG.json'),
    path.join(path.dirname(mainRoot), 'joshua_os', '.aim_core', 'CONFIG.json'),
  ]
  for (const cfgPath of candidates) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
        const gp = raw?.settings?.github_projects
        if (gp && typeof gp === 'object') {
          const cfgNum = typeof gp.number === 'number' ? gp.number : null
          const cfgRepo = typeof gp.repo === 'string' ? gp.repo : ''
          const resolved = {
            projectNumber: resolveMappedProjectNumber(sessionName, cwdPath, cfgNum, cfgRepo),
            owner: typeof gp.owner === 'string' ? gp.owner : 'BrianV1981',
            repo: cfgRepo,
          }
          repoProjectConfigCache.set(cacheKey, resolved)
          return resolved
        }
      }
    } catch {
      // Ignore malformed config
    }
  }
  const fallback = {
    projectNumber: resolveMappedProjectNumber(sessionName, cwdPath, null),
    owner: 'BrianV1981',
    repo: '',
  }
  repoProjectConfigCache.set(cacheKey, fallback)
  return fallback
}

export function readGitBranchFast(cwdPath: string): string {
  if (!cwdPath) return 'main'
  const branchOut = runCmd('git', ['-C', cwdPath, 'rev-parse', '--abbrev-ref', 'HEAD'], 1500).trim()
  return branchOut || 'main'
}

const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[a-zA-Z]/g
const AGY_TOKENS_RE =
  /(\d+(?:\.\d+)?)\s*([kKmM]?)\s*in\s*\|\s*(\d+(?:\.\d+)?)\s*([kKmM]?)\s*out/g
const SLASH_TOKENS_RE =
  /(\d+(?:\.\d+)?)\s*([kKmM])\s*\/\s*(\d+(?:\.\d+)?)\s*([kKmM])/g
const GENERIC_TOKENS_RE =
  /(\d+(?:,\d{3})+|\d+(?:\.\d+)?\s*[kKmM])\s*(?:tokens|tok|ctx)\b/gi
const EXPLICIT_PCT_RE = /(\d{1,2}(?:\.\d+)?)\s*%\s*(?:context|ctx)\b/gi

export function parseTokenNumber(numStr: string, suffix = ''): number {
  let cleaned = (numStr || '').replace(/,/g, '').trim()
  if (!cleaned) return 0
  let s = (suffix || '').toLowerCase()
  const lastChar = cleaned[cleaned.length - 1]?.toLowerCase()
  if ((lastChar === 'k' || lastChar === 'm') && !s) {
    s = lastChar
    cleaned = cleaned.slice(0, -1).trim()
  }
  const val = Number.parseFloat(cleaned)
  if (!Number.isFinite(val)) return 0
  if (s === 'k') return Math.round(val * 1_000)
  if (s === 'm') return Math.round(val * 1_000_000)
  return Math.round(val)
}

export function compute30PctRuleTier(
  contextPct: number
): 'normal' | 'warning' | 'critical' {
  if (contextPct >= 30) return 'critical'
  if (contextPct >= 20) return 'warning'
  return 'normal'
}

export interface BrainTokenSnapshot {
  tokens_used: number
  tokens_limit: number
  context_pct: number
  tier: 'normal' | 'warning' | 'critical'
  conversation_id: string
}

let brainTokenCache: {
  ts: number
  byPath: Map<string, BrainTokenSnapshot>
  byAlias: Map<string, BrainTokenSnapshot>
} | null = null
const BRAIN_TOKEN_CACHE_TTL_MS = 3_000

const REPO_TO_SESSION_ALIASES: Record<string, string[]> = {
  'aim-tmux-dashboard': ['aim-dash', 'aim-tmux', 'aim-tmux-dashboard'],
  'aim-cron-dashboard': ['aim-cron', 'aim-cron-dashboard'],
  'aim-ai-book': ['aim-ai-book'],
  'aim-media': ['aim-media'],
  'aim-design': ['aim-design'],
  'aim-content': ['aim-content'],
  'aim-auditor': ['aim-auditor', 'grok-audit'],
}

export function resolveAgyBrainContextMap(): {
  byPath: Map<string, BrainTokenSnapshot>
  byAlias: Map<string, BrainTokenSnapshot>
} {
  const now = Date.now()
  if (brainTokenCache && now - brainTokenCache.ts < BRAIN_TOKEN_CACHE_TTL_MS) {
    return brainTokenCache
  }

  const byPath = new Map<string, BrainTokenSnapshot>()
  const byAlias = new Map<string, BrainTokenSnapshot>()

  const pyScript = `
import sqlite3, json, os, re
agy_root = os.path.expanduser("~/.gemini/antigravity-cli")
db = os.path.join(agy_root, "conversation_summaries.db")
if not os.path.isfile(db):
    print("{}")
    raise SystemExit(0)
conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=2.0)
rows = conn.execute("""
    SELECT conversation_id, workspace_uris
    FROM conversation_summaries
    WHERE nesting_depth = 0 AND workspace_uris != "" AND workspace_uris != "[]"
      AND workspace_uris NOT LIKE "%/scripts%"
    ORDER BY last_modified_time DESC
    LIMIT 250
""").fetchall()
out = {}
for cid, ws_raw in rows:
    try:
        uris = json.loads(ws_raw) if ws_raw.startswith("[") else [ws_raw]
    except Exception:
        uris = [ws_raw]
    for u in uris:
        p = re.sub(r"/workspace/issue-[^/]+.*$", "", u.replace("file://", "").rstrip("/"))
        if not p or p in out:
            continue
        tpath = os.path.join(agy_root, "brain", cid, ".system_generated", "logs", "transcript.jsonl")
        if not os.path.isfile(tpath):
            continue
        try:
            sz = os.path.getsize(tpath)
            with open(tpath, "rb") as fp:
                fp.seek(max(0, sz - 65536))
                tail = fp.read().decode("utf-8", errors="ignore")
            for ln in reversed(tail.splitlines()):
                if '"input_tokens"' in ln:
                    obj = json.loads(ln)
                    inp = int(obj.get("input_tokens") or 0)
                    cr = int(obj.get("cache_read_tokens") or 0)
                    if inp + cr > 0:
                        out[p] = {"cid": cid, "tokens_used": inp + cr}
                        break
        except Exception:
            pass
print(json.dumps(out))
`

  const rawJson = runCmd('python3', ['-c', pyScript], 2500).trim()
  if (rawJson.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawJson) as Record<
        string,
        { cid: string; tokens_used: number }
      >
      for (const [wsPath, info] of Object.entries(parsed)) {
        const tokensUsed = Number(info.tokens_used || 0)
        if (tokensUsed <= 0) continue
        const tokensLimit = 1_000_000
        const contextPct = Math.min(
          100,
          Math.round((tokensUsed / tokensLimit) * 1000) / 10
        )
        const snap: BrainTokenSnapshot = {
          tokens_used: tokensUsed,
          tokens_limit: tokensLimit,
          context_pct: contextPct,
          tier: compute30PctRuleTier(contextPct),
          conversation_id: String(info.cid || ''),
        }
        byPath.set(wsPath, snap)
        const base = path.basename(wsPath).toLowerCase()
        if (!byAlias.has(base)) {
          byAlias.set(base, snap)
        }
        const aliases = REPO_TO_SESSION_ALIASES[base] || []
        for (const a of aliases) {
          if (!byAlias.has(a)) {
            byAlias.set(a, snap)
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  brainTokenCache = { ts: now, byPath, byAlias }
  return brainTokenCache
}

export function parsePaneScrollbackTelemetry(
  scrollback: string,
  command = '',
  sessionName = ''
): {
  vessel: string
  status: string
  tokens_used: number
  tokens_limit: number
  context_pct: number
  tier: 'normal' | 'warning' | 'critical'
  preview: string
} {
  const cleanText = (scrollback || '').replace(ANSI_ESCAPE_RE, '')
  const cmdLower = (command || '').toLowerCase()
  const sessLower = (sessionName || '').toLowerCase()

  const agyMatches = Array.from(cleanText.matchAll(AGY_TOKENS_RE))
  const slashMatches = Array.from(cleanText.matchAll(SLASH_TOKENS_RE))
  const genericMatches = Array.from(cleanText.matchAll(GENERIC_TOKENS_RE))
  const explicitPctMatches = Array.from(cleanText.matchAll(EXPLICIT_PCT_RE))

  let vessel = 'shell'
  if (sessLower.includes('audit')) {
    vessel = 'auditor'
  } else if (
    cmdLower.includes('agy') ||
    cmdLower.includes('antigravity') ||
    cleanText.includes('Gemini ') ||
    cleanText.includes('Ctrl+P commands') ||
    agyMatches.length > 0 ||
    sessLower.startsWith('aim-') ||
    sessLower.startsWith('agy')
  ) {
    vessel = 'agy'
  }
  if (cmdLower.includes('grok') || sessLower.includes('grok') || cleanText.includes('Grok CLI')) {
    vessel = 'grok'
  }
  if (
    cmdLower.includes('opencode') ||
    sessLower.includes('opencode') ||
    cleanText.includes('OpenCode')
  ) {
    vessel = 'opencode'
  }
  if (cmdLower.includes('codex') || sessLower.includes('codex')) {
    vessel = 'codex'
  }

  let tokensUsed = 0
  let tokensLimit = vessel === 'agy' || vessel === 'auditor' ? 1_000_000 : 200_000

  if (agyMatches.length > 0) {
    const last = agyMatches[agyMatches.length - 1]
    tokensUsed = parseTokenNumber(last[1], last[2])
    tokensLimit = 1_000_000
  } else if (slashMatches.length > 0) {
    const last = slashMatches[slashMatches.length - 1]
    tokensUsed = parseTokenNumber(last[1], last[2])
    const parsedLimit = parseTokenNumber(last[3], last[4])
    if (parsedLimit > 0) tokensLimit = parsedLimit
  } else if (genericMatches.length > 0) {
    const last = genericMatches[genericMatches.length - 1]
    tokensUsed = parseTokenNumber(last[1])
  } else if (explicitPctMatches.length > 0) {
    const last = explicitPctMatches[explicitPctMatches.length - 1]
    const pctVal = Number.parseFloat(last[1])
    if (Number.isFinite(pctVal) && pctVal > 0 && pctVal <= 100) {
      tokensUsed = Math.round((pctVal / 100) * tokensLimit)
    }
  }

  const contextPct =
    tokensUsed > 0 && tokensLimit > 0
      ? Math.min(100, Math.round((tokensUsed / tokensLimit) * 1000) / 10)
      : 0.0
  const tier = compute30PctRuleTier(contextPct)

  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[─━═]+$/.test(l))

  const footerText = lines.slice(-4).join('\n')
  const lastLine = lines[lines.length - 1] || ''
  const isIdleAtAgyPrompt = lastLine.startsWith('? for shortcuts')

  let status = 'IDLE'
  if (contextPct >= 30) {
    status = 'AMNESIA'
  } else if (!isIdleAtAgyPrompt) {
    if (
      /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢿⣻⣽⣾⣷⣯⣟]/.test(footerText) ||
      /Running command\.{2,}|Executing\.{2,}|○\s+\w+\(/i.test(footerText)
    ) {
      status = 'TOOL_EXEC'
    } else if (/\(yes\/no\)|\[y\/n\]|\[Y\/n\]/i.test(footerText)) {
      status = 'WAITING'
    } else if (
      /esc to cancel|ctrl\+c to interrupt|Working\.{2,}|Thinking\.{2,}|Generating\.{2,}/i.test(
        footerText
      )
    ) {
      status = 'THINKING'
    }
  }

  const meaningfulLines = lines.filter(
    (l) => !l.startsWith('? for shortcuts') && !l.startsWith('esc to cancel') && l !== '>'
  )
  const preview = meaningfulLines[meaningfulLines.length - 1]?.slice(0, 90) || 'Ready at prompt'

  return {
    vessel,
    status,
    tokens_used: tokensUsed,
    tokens_limit: tokensLimit,
    context_pct: contextPct,
    tier,
    preview,
  }
}

let localTmuxFleetCache: { ts: number; data: LocalFleetSessionRecord[] } | null = null
const LOCAL_TMUX_FLEET_CACHE_TTL_MS = 3_000

let aimConnectFleetCache: { ts: number; data: LocalFleetSessionRecord[] } | null = null
const AIM_CONNECT_FLEET_CACHE_TTL_MS = 2_500

export function collectLocalTmuxFleet(bypassCache = false): LocalFleetSessionRecord[] {
  const now = Date.now()
  if (
    !bypassCache &&
    localTmuxFleetCache &&
    now - localTmuxFleetCache.ts < LOCAL_TMUX_FLEET_CACHE_TTL_MS
  ) {
    return localTmuxFleetCache.data
  }
  const fmt =
    '#{session_name}@@@#{window_index}@@@#{pane_index}@@@#{pane_current_command}@@@#{pane_current_path}@@@#{session_attached}'
  const raw = runCmd('tmux', ['list-panes', '-a', '-F', fmt], 3000)
  if (!raw.trim()) return []

  const brainMap = resolveAgyBrainContextMap()

  interface RawPaneCandidate {
    sessionName: string
    target: string
    cmd: string
    panePath: string
    attached: boolean
    isAiCmd: boolean
  }

  const bySession = new Map<string, RawPaneCandidate[]>()
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [sessionName, winIdx, paneIdx, cmd, panePath, attachedStr] = line.split('@@@')
    if (
      !sessionName ||
      sessionName.startsWith('aim-client-') ||
      sessionName.startsWith('agent-')
    ) {
      continue
    }
    const cmdLower = (cmd || '').toLowerCase()
    const isAiCmd =
      cmdLower.includes('agy') ||
      cmdLower.includes('grok') ||
      cmdLower.includes('opencode') ||
      cmdLower.includes('codex')
    const list = bySession.get(sessionName) ?? []
    list.push({
      sessionName,
      target: `${sessionName}:${winIdx || '0'}.${paneIdx || '0'}`,
      cmd: cmd || 'bash',
      panePath: panePath || '',
      attached: attachedStr === '1',
      isAiCmd,
    })
    bySession.set(sessionName, list)
  }

  const fleet: LocalFleetSessionRecord[] = []

  for (const [sessionName, candidates] of bySession.entries()) {
    // Prefer the pane running an AI vessel CLI over auxiliary dev-server/shell windows
    const primary = candidates.find((c) => c.isAiCmd) ?? candidates[0]
    const cap = runCmd(
      'tmux',
      ['capture-pane', '-t', primary.target, '-p', '-J', '-S', '-80'],
      1500
    )
    const telemetry = parsePaneScrollbackTelemetry(cap, primary.cmd, sessionName)
    const mainRoot = resolveMainRepoRoot(primary.panePath)
    const repoName = path.basename(mainRoot || primary.panePath || sessionName)
    const branch = readGitBranchFast(primary.panePath)
    const { projectNumber, repo } = readRepoProjectConfig(primary.panePath, sessionName)

    // Enrich with exact API-reported brain transcript tokens (input_tokens + cache_read_tokens)
    const brainSnap =
      brainMap.byPath.get(mainRoot) ??
      brainMap.byAlias.get(sessionName.toLowerCase()) ??
      brainMap.byAlias.get(repoName.toLowerCase())

    const tokensUsed =
      brainSnap && brainSnap.tokens_used > 0 ? brainSnap.tokens_used : telemetry.tokens_used
    const tokensLimit =
      brainSnap && brainSnap.tokens_limit > 0 ? brainSnap.tokens_limit : telemetry.tokens_limit
    const contextPct =
      brainSnap && brainSnap.tokens_used > 0 ? brainSnap.context_pct : telemetry.context_pct
    const tier = compute30PctRuleTier(contextPct)
    const finalStatus = contextPct >= 30 ? 'AMNESIA' : telemetry.status

    fleet.push({
      session_name: sessionName,
      vessel: telemetry.vessel,
      status: finalStatus,
      command: primary.cmd,
      path: primary.panePath,
      repo_name: repoName,
      branch,
      is_worktree: primary.panePath.includes('/workspace/issue-'),
      tokens_used: tokensUsed,
      tokens_limit: tokensLimit,
      context_pct: contextPct,
      tier,
      preview: telemetry.preview,
      attached: candidates.some((c) => c.attached),
      project_number: projectNumber,
      project_repo: repo || `BrianV1981/${repoName}`,
    })
  }

  localTmuxFleetCache = { ts: now, data: fleet }
  return fleet
}

export interface LocalSwarmDispatchRecord {
  id: string
  filename: string
  sender: string
  recipient: string
  reply_to: string
  mtime: number
  preview: string
  thread_id?: string
  subject?: string
}

let loopbackTokenCache: { ts: number; path: string; token: string } | null = null
const LOOPBACK_TOKEN_CACHE_TTL_MS = 5_000

let aimConnectSwarmCache: { ts: number; data: LocalSwarmDispatchRecord[] } | null = null
const AIM_CONNECT_SWARM_CACHE_TTL_MS = 2_500

/**
 * Resolve host-only `X-AIM-Loopback-Token` (#30 / `aim-connect#236`) from `AIM_LOOPBACK_TOKEN`
 * or `~/aim-connect/backend/loopback.token` (`0600` host file) with 5s stat-friendly caching.
 */
export function resolveAimLoopbackToken(options?: {
  tokenPath?: string
  envToken?: string
  bypassCache?: boolean
}): string {
  const explicitEnv = (options?.envToken ?? process.env.AIM_LOOPBACK_TOKEN ?? '').trim()
  if (explicitEnv) {
    return explicitEnv
  }

  const candidatePath =
    options?.tokenPath ||
    (process.env.AIM_LOOPBACK_TOKEN_PATH || '').trim() ||
    path.join(USER_HOME_DIR, 'aim-connect', 'backend', 'loopback.token')

  const now = Date.now()
  if (
    !options?.bypassCache &&
    loopbackTokenCache &&
    loopbackTokenCache.path === candidatePath &&
    now - loopbackTokenCache.ts < LOOPBACK_TOKEN_CACHE_TTL_MS
  ) {
    return loopbackTokenCache.token
  }

  let token = ''
  try {
    if (fs.existsSync(candidatePath)) {
      token = fs.readFileSync(candidatePath, 'utf-8').trim()
    }
  } catch {
    token = ''
  }

  loopbackTokenCache = { ts: now, path: candidatePath, token }
  return token
}

export function buildAimConnectLoopbackHeaders(loopbackToken?: string): Record<string, string> {
  const token = (loopbackToken ?? resolveAimLoopbackToken()).trim()
  return token
    ? { Accept: 'application/json', 'X-AIM-Loopback-Token': token }
    : { Accept: 'application/json' }
}

/**
 * Primary Fleet Telemetry Bridge (#20, #30):
 * Queries `aim-connect` (`http://127.0.0.1:8000/api/fleet/panes`) with host-only `X-AIM-Loopback-Token`,
 * using activity-delta pane caching and 2.5s snapshot caching. Falls back to `collectLocalTmuxFleet()`
 * only if `:8000` is unreachable or unauthenticated.
 */
export async function fetchFleetFromAimConnect(
  baseUrl = process.env.VITE_AIM_CONNECT_URL || 'http://127.0.0.1:8000',
  bypassCache = false,
  loopbackToken?: string
): Promise<LocalFleetSessionRecord[]> {
  const now = Date.now()
  if (
    !bypassCache &&
    aimConnectFleetCache &&
    now - aimConnectFleetCache.ts < AIM_CONNECT_FLEET_CACHE_TTL_MS
  ) {
    return aimConnectFleetCache.data
  }

  try {
    const cleanBase = baseUrl.replace(/\/$/, '')
    const resp = await fetch(`${cleanBase}/api/fleet/panes`, {
      headers: buildAimConnectLoopbackHeaders(loopbackToken),
      signal: AbortSignal.timeout(1500),
    })
    if (resp.ok) {
      const json = (await resp.json()) as { fleet?: Array<Record<string, unknown>> }
      const rawFleet = Array.isArray(json?.fleet) ? json.fleet : []
      const mapped: LocalFleetSessionRecord[] = []

      for (const item of rawFleet) {
        if (!item || typeof item !== 'object') continue
        const sessionName = String(item.session_name ?? '').trim()
        if (
          !sessionName ||
          sessionName.startsWith('aim-client-') ||
          sessionName.startsWith('agent-')
        ) {
          continue
        }
        const panePath = String(item.path ?? '')
        const mainRoot = resolveMainRepoRoot(panePath)
        const repoName = String(
          item.repo_name ?? path.basename(mainRoot || panePath || sessionName)
        )
        const { projectNumber, repo } = readRepoProjectConfig(panePath, sessionName)
        const contextPct = Number(item.context_pct ?? 0)
        const tier = compute30PctRuleTier(contextPct)
        const rawStatus = String(item.status ?? 'IDLE').toUpperCase()
        const finalStatus = contextPct >= 30 ? 'AMNESIA' : rawStatus

        mapped.push({
          session_name: sessionName,
          vessel: String(item.vessel ?? 'agy'),
          status: finalStatus,
          command: String(item.command ?? 'agy'),
          path: panePath,
          repo_name: repoName,
          branch: String(item.branch ?? 'main') || 'main',
          is_worktree: Boolean(item.is_worktree ?? panePath.includes('/workspace/issue-')),
          tokens_used: Number(item.tokens_used ?? 0),
          tokens_limit: Number(item.tokens_limit ?? 1_000_000),
          context_pct: contextPct,
          tier,
          preview: String(item.preview ?? ''),
          attached: Boolean(item.attached),
          project_number: projectNumber,
          project_repo: repo || `BrianV1981/${repoName}`,
        })
      }

      if (mapped.length > 0) {
        aimConnectFleetCache = { ts: now, data: mapped }
        return mapped
      }
    }
  } catch {
    // Fall back to cached local tmux fleet below
  }

  return collectLocalTmuxFleet(bypassCache)
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
  const candidates = [
    path.join(USER_HOME_DIR, sessionName),
    path.join(USER_HOME_DIR, 'aim-agents', sessionName),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return process.cwd()
}

function cleanMarkdownText(raw: string): string {
  return raw
    .replace(/\*\*|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

const HANDOFF_METADATA_PREFIX_RE =
  /^(?:status|action|key\s*files?|files?|problem|fix|context|root\s*cause|verification|evidence|impact|owner|updated(?:\s+by)?|branch|commit)\s*:/i

export function parseHandoffKanbanForSession(
  sessionPath: string,
  sessionName: string
): LocalKanbanTicket[] {
  const mainRoot = resolveMainRepoRoot(sessionPath)
  const candidates = [
    path.join(sessionPath, 'HANDOFF.md'),
    path.join(mainRoot, 'HANDOFF.md'),
    path.join(path.dirname(mainRoot), 'HANDOFF.md'),
  ]
  const handoffPath = candidates.find((p) => fs.existsSync(p))
  if (!handoffPath) return []

  let text = ''
  try {
    text = fs.readFileSync(handoffPath, 'utf-8')
  } catch {
    return []
  }

  const inProgress: LocalKanbanTicket[] = []
  const todos: LocalKanbanTicket[] = []
  const done: LocalKanbanTicket[] = []

  const missionMatch = text.match(/>\s*\*\*Priority Mission:\*\*\s*(.+)/i)
  if (missionMatch?.[1]) {
    const cleaned = cleanMarkdownText(missionMatch[1]).slice(0, 110)
    if (cleaned) {
      const numMatch = cleaned.match(/#(\d+)/)
      const num = numMatch ? Number(numMatch[1]) : 901
      inProgress.push({
        id: `${sessionName}-mission`,
        number: num,
        title: `Mission: ${cleaned}`,
        status: 'In Progress',
        assignee: sessionName,
      })
    }
  }

  let currentSection = ''
  let seqNum = 100
  for (const rawLine of text.split('\n')) {
    const isIndented = /^[ \t]{2,}/.test(rawLine)
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('## ')) {
      currentSection = line.toLowerCase()
      if (
        (currentSection.includes('your mission') || currentSection.includes('campaign state')) &&
        inProgress.length === 0
      ) {
        const headerMission = cleanMarkdownText(line.replace(/^##\s*\d*\.?\s*/i, '')).slice(0, 110)
        if (headerMission) {
          inProgress.push({
            id: `${sessionName}-sec-mission`,
            number: 902,
            title: headerMission,
            status: 'In Progress',
            assignee: sessionName,
          })
        }
      }
      continue
    }

    // Completed table rows (`| session | work | status |`)
    if (
      (currentSection.includes('completed') || currentSection.includes('0.')) &&
      line.startsWith('|') &&
      !line.startsWith('|---') &&
      !line.startsWith('|:---') &&
      !/\|\s*session\s*\|/i.test(line)
    ) {
      const cols = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
      if (cols.length >= 2) {
        const workText = cleanMarkdownText(cols[1])
        if (workText && !/^:?-+:?$/.test(workText) && done.length < 10) {
          const numMatch = workText.match(/#(\d+)/)
          const num = numMatch ? Number(numMatch[1]) : ++seqNum
          done.push({
            id: `${sessionName}-done-${done.length + 1}`,
            number: num,
            title: workText.slice(0, 110),
            status: 'Done',
            assignee: sessionName,
          })
        }
      }
      continue
    }

    // Top-level bullet/numbered items only (skip indented metadata sub-bullets, #27)
    const bulletMatch = !isIndented ? line.match(/^(?:-\s+|\*\s+|\d+\.\s+)(.+)/) : null
    if (bulletMatch?.[1]) {
      const itemText = cleanMarkdownText(bulletMatch[1])
      if (!itemText || HANDOFF_METADATA_PREFIX_RE.test(itemText)) continue
      const numMatch = itemText.match(/#(\d+)/)
      const num = numMatch ? Number(numMatch[1]) : ++seqNum

      if (
        currentSection.includes('next step') ||
        currentSection.includes('next execution') ||
        currentSection.includes('discrepanc') ||
        currentSection.includes('verification')
      ) {
        if (todos.length < 6) {
          todos.push({
            id: `${sessionName}-todo-${todos.length + 1}`,
            number: num,
            title: itemText.slice(0, 110),
            status: 'Todo',
            assignee: sessionName,
          })
        }
      } else if (
        currentSection.includes('campaign state') ||
        currentSection.includes('active queue') ||
        currentSection.includes('your mission')
      ) {
        if (inProgress.length < 4) {
          inProgress.push({
            id: `${sessionName}-active-${inProgress.length + 1}`,
            number: num,
            title: itemText.slice(0, 110),
            status: 'In Progress',
            assignee: sessionName,
          })
        }
      } else if (
        (currentSection.includes('tactical summary') ||
          currentSection.includes('milestone') ||
          currentSection.includes('completed')) &&
        (itemText.startsWith('#') || currentSection.includes('milestone'))
      ) {
        if (done.length < 10) {
          done.push({
            id: `${sessionName}-done-bullet-${done.length + 1}`,
            number: num,
            title: itemText.slice(0, 110),
            status: 'Done',
            assignee: sessionName,
          })
        }
      }
    }
  }

  return [...inProgress, ...todos, ...done]
}

export function fetchProjectKanbanForSession(sessionName: string): {
  session: string
  projectNumber: number
  repo: string
  tickets: LocalKanbanTicket[]
} {
  const targetSession = (sessionName || 'aim-office').trim()
  const now = Date.now()
  const cached = kanbanSessionCache.get(targetSession)
  if (cached && now - cached.ts < KANBAN_CACHE_TTL_MS) {
    return cached.data
  }

  const sessionPath = resolveSessionPath(targetSession)
  const { projectNumber, owner, repo } = readRepoProjectConfig(sessionPath, targetSession)
  const effectiveNumber = projectNumber ?? 14
  const mainRoot = resolveMainRepoRoot(sessionPath)
  const effectiveRepo = repo || `BrianV1981/${path.basename(mainRoot || sessionPath)}`

  const handoffTickets = parseHandoffKanbanForSession(sessionPath, targetSession)
  let ghTickets: LocalKanbanTicket[] = []

  // Query `gh project item-list` across all GitHub Project V2 boards (#27: removed <=14 cap)
  if (effectiveNumber >= 1) {
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
        '35',
      ],
      2800
    )

    if (ghJson.trim()) {
      try {
        const parsed = JSON.parse(ghJson) as { items?: Array<Record<string, unknown>> }
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          ghTickets = parsed.items.map((item, idx) => {
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
              id: String(item.id ?? `${targetSession}-gh-${number}`),
              number,
              title: String(item.title ?? content.title ?? `Ticket #${number}`),
              status,
              assignee: targetSession,
            }
          })
        }
      } catch {
        // Ignore parse error and fall back to handoffTickets
      }
    }
  }

  // Merge ghTickets + handoffTickets so every session has rich Todo, In Progress, and Done items
  const combined: LocalKanbanTicket[] = [...ghTickets]
  const hasInProgress = combined.some((t) => t.status === 'In Progress')
  const hasTodo = combined.some((t) => t.status === 'Todo')
  const hasDone = combined.some((t) => t.status === 'Done')

  for (const ht of handoffTickets) {
    if (ht.status === 'In Progress' && (!hasInProgress || combined.length === 0)) {
      combined.unshift(ht)
    } else if (ht.status === 'Todo' && (!hasTodo || combined.length === 0)) {
      combined.push(ht)
    } else if (ht.status === 'Done' && (!hasDone || combined.length === 0)) {
      combined.push(ht)
    }
  }

  // Ensure every session has at least 1 In Progress and 1 Todo item reflecting live session telemetry
  if (!combined.some((t) => t.status === 'In Progress')) {
    const branch = readGitBranchFast(sessionPath)
    combined.unshift({
      id: `${targetSession}-live-active`,
      number: effectiveNumber * 10 + 1,
      title: `Active Session (${targetSession} on branch ${branch}) — Live Fleet Operations`,
      status: 'In Progress',
      assignee: targetSession,
    })
  }
  if (!combined.some((t) => t.status === 'Todo')) {
    combined.push({
      id: `${targetSession}-live-todo`,
      number: effectiveNumber * 10 + 2,
      title: `Next Queue (${targetSession}): Memory Wiki Sync & 30%-Rule Handoff Verification`,
      status: 'Todo',
      assignee: targetSession,
    })
  }
  if (!combined.some((t) => t.status === 'Done')) {
    combined.push({
      id: `${targetSession}-live-done`,
      number: effectiveNumber * 10,
      title: `Completed (${targetSession}): J.O.S.H.U.A. Exoskeleton & Baseline TDD Guardrails`,
      status: 'Done',
      assignee: targetSession,
    })
  }

  const result = {
    session: targetSession,
    projectNumber: effectiveNumber,
    repo: effectiveRepo,
    tickets: combined,
  }
  kanbanSessionCache.set(targetSession, { ts: now, data: result })
  return result
}

export function normalizeSwarmActivityPayload(
  raw: unknown,
  nowMs = Date.now()
): LocalSwarmDispatchRecord[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const rawList = Array.isArray(obj.dispatches)
    ? obj.dispatches
    : Array.isArray(obj.messages)
      ? obj.messages
      : Array.isArray(obj.envelopes)
        ? obj.envelopes
        : Array.isArray(obj.activity)
          ? obj.activity
          : []

  const fallbackSec = Math.floor(nowMs / 1000)
  return rawList
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .slice(0, 30)
    .map((d, idx) => {
      const id = String(d.id ?? d.message_id ?? d.filename ?? `dispatch-${idx}`)
      const sender = String(d.sender ?? d.from ?? 'aim-joshua')
      const recipient = String(d.recipient ?? d.to ?? 'aim-office')
      const replyTo = String(d.reply_to ?? d.replyTo ?? sender)
      const filename = String(
        d.filename ?? (typeof d.id === 'string' && d.id ? `${d.id}.json` : 'DISPATCH.md')
      )

      let mtime = fallbackSec
      if (typeof d.mtime === 'number' && Number.isFinite(d.mtime)) {
        mtime = d.mtime
      } else {
        const tsCandidate = d.created_at ?? d.createdAt ?? d.timestamp
        if (typeof tsCandidate === 'string' && tsCandidate.trim()) {
          const parsedMs = Date.parse(tsCandidate)
          if (Number.isFinite(parsedMs)) {
            mtime = Math.floor(parsedMs / 1000)
          }
        } else if (typeof tsCandidate === 'number' && Number.isFinite(tsCandidate)) {
          mtime = tsCandidate > 1e12 ? Math.floor(tsCandidate / 1000) : tsCandidate
        }
      }

      const subject = typeof d.subject === 'string' ? d.subject.trim() : ''
      const rawBody =
        typeof d.body === 'string'
          ? d.body
          : typeof d.summary === 'string'
            ? d.summary
            : typeof d.content === 'string'
              ? d.content
              : ''
      const firstBodyLine =
        rawBody
          .split('\n')
          .map((ln) => ln.trim())
          .find(Boolean) || ''
      const resolvedPreview =
        typeof d.preview === 'string' && d.preview.trim()
          ? d.preview.trim()
          : subject && firstBodyLine
            ? firstBodyLine.startsWith(subject)
              ? firstBodyLine
              : `${subject} — ${firstBodyLine}`
            : subject || firstBodyLine || 'A-Mail inter-agent dispatch'

      const threadId =
        typeof d.thread_id === 'string'
          ? d.thread_id
          : typeof d.threadId === 'string'
            ? d.threadId
            : undefined

      return {
        id,
        filename,
        sender,
        recipient,
        reply_to: replyTo,
        mtime,
        preview: resolvedPreview.slice(0, 140),
        ...(threadId !== undefined ? { thread_id: threadId } : {}),
        ...(subject ? { subject } : {}),
      }
    })
}

export async function fetchSwarmActivityFromAimConnect(
  baseUrl = process.env.VITE_AIM_CONNECT_URL || 'http://127.0.0.1:8000',
  bypassCache = false,
  loopbackToken?: string
): Promise<LocalSwarmDispatchRecord[]> {
  const now = Date.now()
  if (
    !bypassCache &&
    aimConnectSwarmCache &&
    now - aimConnectSwarmCache.ts < AIM_CONNECT_SWARM_CACHE_TTL_MS
  ) {
    return aimConnectSwarmCache.data
  }

  try {
    const cleanBase = baseUrl.replace(/\/$/, '')
    const resp = await fetch(`${cleanBase}/api/swarm/activity`, {
      headers: buildAimConnectLoopbackHeaders(loopbackToken),
      signal: AbortSignal.timeout(1500),
    })
    if (resp.ok) {
      const json: unknown = await resp.json()
      const mapped = normalizeSwarmActivityPayload(json, now)
      aimConnectSwarmCache = { ts: now, data: mapped }
      return mapped
    }
  } catch {
    // Return empty list when upstream swarm activity is unreachable
  }

  return []
}

export interface LocalForensicsPill {
  name: string
  summary: string
  timestamp?: string
}

export interface LocalSessionForensicsResult {
  session: string
  pane_path: string
  source: string
  tool_call_count: number
  recent_tool_pills: LocalForensicsPill[]
}

export interface LocalWorkspaceContextResult {
  session: string
  pane_path: string
  repo_root: string
  main_repo_root: string
  branch: string
  wiki_log_delta: string[]
  brain_files: Array<{
    label: string
    category: string
    path: string
    exists: boolean
    mtime: number | null
  }>
  worktrees: Array<{
    name: string
    path: string
    branch: string
  }>
}

const forensicsSessionCache = new Map<string, { ts: number; data: LocalSessionForensicsResult }>()
const workspaceContextCache = new Map<string, { ts: number; data: LocalWorkspaceContextResult }>()
const INSPECTOR_LOCAL_CACHE_TTL_MS = 4_000

function stripSurroundingQuotes(val: string): string {
  const trimmed = (val || '').trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function summarizeTranscriptToolCall(tcObj: Record<string, unknown>): LocalForensicsPill {
  const rawName = String(tcObj.name ?? 'Tool').trim() || 'Tool'
  const args =
    tcObj.args && typeof tcObj.args === 'object' ? (tcObj.args as Record<string, unknown>) : {}

  const explicitSummary = stripSurroundingQuotes(
    String(args.toolSummary ?? tcObj.summary ?? '').trim()
  )
  if (explicitSummary) {
    return { name: rawName, summary: explicitSummary.slice(0, 76) }
  }

  const filePathArg = stripSurroundingQuotes(String(args.Path ?? args.path ?? '').trim())
  if (filePathArg) {
    return { name: rawName, summary: path.basename(filePathArg).slice(0, 76) }
  }

  return { name: rawName, summary: rawName }
}

/**
 * Read-only local transcript tool-call metadata (#24):
 * Extracts recent tool call names and safe summaries from structured AGY `transcript.jsonl`
 * without ever capturing or exposing raw terminal scrollback or command arguments.
 */
export function fetchSessionForensicsLocal(
  sessionName: string,
  options?: { sessionPathOverride?: string; transcriptPathOverride?: string; bypassCache?: boolean }
): LocalSessionForensicsResult {
  const targetSession = (sessionName || 'aim-office').trim()
  const now = Date.now()
  if (!options?.bypassCache && !options?.transcriptPathOverride) {
    const cached = forensicsSessionCache.get(targetSession)
    if (cached && now - cached.ts < INSPECTOR_LOCAL_CACHE_TTL_MS) {
      return cached.data
    }
  }

  const sessionPath = options?.sessionPathOverride || resolveSessionPath(targetSession)
  const mainRoot = resolveMainRepoRoot(sessionPath)
  const repoName = path.basename(mainRoot || sessionPath)

  let transcriptPath = options?.transcriptPathOverride || ''
  let sourceLabel = `local:${targetSession}`

  if (!transcriptPath) {
    const brainMap = resolveAgyBrainContextMap()
    const snap =
      brainMap.byPath.get(mainRoot) ??
      brainMap.byAlias.get(targetSession.toLowerCase()) ??
      brainMap.byAlias.get(repoName.toLowerCase())

    if (snap?.conversation_id) {
      sourceLabel = `transcript:${snap.conversation_id.slice(0, 8)}`
      transcriptPath = path.join(
        USER_HOME_DIR,
        '.gemini',
        'antigravity-cli',
        'brain',
        snap.conversation_id,
        '.system_generated',
        'logs',
        'transcript.jsonl'
      )
    }
  }

  const pills: LocalForensicsPill[] = []
  let totalCount = 0

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    try {
      const stat = fs.statSync(transcriptPath)
      const fd = fs.openSync(transcriptPath, 'r')
      try {
        const readSize = Math.min(stat.size, 131_072)
        const buf = Buffer.alloc(readSize)
        fs.readSync(fd, buf, 0, readSize, Math.max(0, stat.size - readSize))
        const tailText = buf.toString('utf-8')
        for (const line of tailText.split('\n')) {
          if (!line.includes('"tool_calls"')) continue
          try {
            const parsed = JSON.parse(line) as Record<string, unknown>
            const tcs = Array.isArray(parsed.tool_calls) ? parsed.tool_calls : []
            const ts = typeof parsed.created_at === 'string' ? parsed.created_at : undefined
            for (const tc of tcs) {
              if (!tc || typeof tc !== 'object') continue
              totalCount += 1
              const pill = summarizeTranscriptToolCall(tc as Record<string, unknown>)
              pills.push(ts ? { ...pill, timestamp: ts } : pill)
            }
          } catch {
            // Ignore partial head line on byte-seek boundary
          }
        }
      } finally {
        fs.closeSync(fd)
      }
    } catch {
      // Ignore unreadable transcript
    }
  }

  const result: LocalSessionForensicsResult = {
    session: targetSession,
    pane_path: sessionPath,
    source: sourceLabel,
    tool_call_count: totalCount,
    recent_tool_pills: pills.slice(-8).reverse(),
  }

  if (!options?.transcriptPathOverride) {
    forensicsSessionCache.set(targetSession, { ts: now, data: result })
  }
  return result
}

export function extractWikiLogDeltaFromMarkdown(markdown: string, limit = 4): string[] {
  const entries: string[] = []
  for (const rawLine of (markdown || '').split('\n')) {
    const trimmed = rawLine.trim()
    if (trimmed.startsWith('## ')) {
      const heading = cleanMarkdownText(trimmed.replace(/^##\s+/, '')).slice(0, 110)
      if (heading) entries.push(heading)
    } else if (trimmed.startsWith('- **Ticket') || trimmed.startsWith('- **Workspace')) {
      const bullet = cleanMarkdownText(trimmed.replace(/^-\s+/, '')).slice(0, 110)
      if (bullet) entries.push(bullet)
    }
  }
  return entries.slice(-limit).reverse()
}

/**
 * Read-only local workspace context & Memory Wiki delta (#24):
 * Resolves active Git branch, worktrees, Brain file presence, and real `memory-wiki/log.md` entries.
 */
export function fetchWorkspaceContextLocal(
  sessionName: string,
  options?: { sessionPathOverride?: string; bypassCache?: boolean }
): LocalWorkspaceContextResult {
  const targetSession = (sessionName || 'aim-office').trim()
  const now = Date.now()
  if (!options?.bypassCache && !options?.sessionPathOverride) {
    const cached = workspaceContextCache.get(targetSession)
    if (cached && now - cached.ts < INSPECTOR_LOCAL_CACHE_TTL_MS) {
      return cached.data
    }
  }

  const sessionPath = options?.sessionPathOverride || resolveSessionPath(targetSession)
  const mainRoot = resolveMainRepoRoot(sessionPath)
  const branch = readGitBranchFast(sessionPath)

  const brainSpecs = [
    { label: 'AGENTS.md', category: 'agents', rel: 'AGENTS.md' },
    { label: 'HANDOFF.md', category: 'handoff', rel: 'HANDOFF.md' },
    { label: 'wiki/index.md', category: 'wiki', rel: path.join('memory-wiki', 'index.md') },
    { label: 'wiki/log.md', category: 'wiki', rel: path.join('memory-wiki', 'log.md') },
  ]
  const brainFiles = brainSpecs.map((spec) => {
    const full = path.join(mainRoot, spec.rel)
    try {
      if (fs.existsSync(full)) {
        const st = fs.statSync(full)
        return {
          label: spec.label,
          category: spec.category,
          path: full,
          exists: true,
          mtime: Math.floor(st.mtimeMs / 1000),
        }
      }
    } catch {
      // Ignore stat error
    }
    return {
      label: spec.label,
      category: spec.category,
      path: full,
      exists: false,
      mtime: null,
    }
  })

  let wikiLogDelta: string[] = []
  const wikiLogPath = path.join(mainRoot, 'memory-wiki', 'log.md')
  if (fs.existsSync(wikiLogPath)) {
    try {
      const rawWiki = fs.readFileSync(wikiLogPath, 'utf-8')
      wikiLogDelta = extractWikiLogDeltaFromMarkdown(rawWiki, 4)
    } catch {
      wikiLogDelta = []
    }
  }

  const worktrees: Array<{ name: string; path: string; branch: string }> = []
  const wtRaw = runCmd('git', ['-C', mainRoot, 'worktree', 'list', '--porcelain'], 1500)
  if (wtRaw.trim()) {
    let curPath = ''
    let curBranch = ''
    for (const ln of `${wtRaw}\n`.split('\n')) {
      if (ln.startsWith('worktree ')) {
        curPath = ln.slice('worktree '.length).trim()
        curBranch = 'HEAD'
      } else if (ln.startsWith('branch ')) {
        curBranch = ln.slice('branch '.length).replace(/^refs\/heads\//, '').trim()
      } else if (!ln.trim() && curPath) {
        if (curPath !== mainRoot && curPath.includes(`${path.sep}workspace${path.sep}`)) {
          worktrees.push({
            name: path.basename(curPath),
            path: curPath,
            branch: curBranch,
          })
        }
        curPath = ''
        curBranch = ''
      }
    }
  }

  const result: LocalWorkspaceContextResult = {
    session: targetSession,
    pane_path: sessionPath,
    repo_root: sessionPath,
    main_repo_root: mainRoot,
    branch,
    wiki_log_delta: wikiLogDelta,
    brain_files: brainFiles,
    worktrees,
  }

  if (!options?.sessionPathOverride) {
    workspaceContextCache.set(targetSession, { ts: now, data: result })
  }
  return result
}

const LOOPBACK_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i

/**
 * Option A Read-Only Security Boundary (#21, #23):
 * Blocks cross-site browser requests (`Sec-Fetch-Site: cross-site` or non-loopback `Origin`).
 */
export function isAllowedLocalReadRequest(req: IncomingMessage): boolean {
  const secFetchSite = String(req.headers?.['sec-fetch-site'] ?? '')
    .trim()
    .toLowerCase()
  if (secFetchSite === 'cross-site') {
    return false
  }
  const origin = String(req.headers?.origin ?? '').trim()
  if (origin && !LOOPBACK_ORIGIN_RE.test(origin)) {
    return false
  }
  return true
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Handles all `/api/*` requests under Option A (Pure Read-Only Visual Command Center, #21, #23, #25, #30).
 * Enforces `isAllowedLocalReadRequest()` (`403 CROSS_ORIGIN_BLOCKED`) and `GET`-only `READ_ONLY_MODE` (`403`)
 * across both `/api/office/*` and legacy `/api/fleet/*`, `/api/swarm/*`, `/api/forensics/*`, `/api/workspace/*`
 * paths—never emitting `Access-Control-Allow-Origin: *`.
 */
export async function handleOfficeBridgeRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || ''
  if (rawUrl !== '/api' && !rawUrl.startsWith('/api/')) {
    return false
  }

  if (!isAllowedLocalReadRequest(req)) {
    sendJson(res, 403, {
      error: 'Cross-origin access to AIM-Office local telemetry is forbidden.',
      code: 'CROSS_ORIGIN_BLOCKED',
    })
    return true
  }

  const method = (req.method || 'GET').toUpperCase()
  const parsedUrl = new URL(rawUrl, 'http://127.0.0.1:5175')
  const pathname = parsedUrl.pathname

  if (
    method !== 'GET' ||
    pathname.startsWith('/api/office/session/') ||
    pathname === '/api/office/communicate'
  ) {
    sendJson(res, 403, {
      error:
        'Read-only visualizer boundary (#21): tmux command injection and raw terminal scrollback are disabled in AIM-Office. Open AIM-Connect (:8000) for authenticated E2EE & biometric control.',
      code: 'READ_ONLY_MODE',
    })
    return true
  }

  if (pathname === '/api/office/fleet' || pathname === '/api/fleet/panes') {
    const fleet = await fetchFleetFromAimConnect()
    sendJson(res, 200, {
      fleet,
      dispatches: [],
      mode: 'read-only',
    })
    return true
  }

  if (pathname === '/api/office/swarm' || pathname === '/api/swarm/activity') {
    const dispatches = await fetchSwarmActivityFromAimConnect()
    sendJson(res, 200, {
      dispatches,
      mode: 'read-only',
    })
    return true
  }

  if (pathname === '/api/office/kanban') {
    const session = parsedUrl.searchParams.get('session') || 'aim-office'
    const data = fetchProjectKanbanForSession(session)
    sendJson(res, 200, data)
    return true
  }

  const legacyForensicsMatch = pathname.match(/^\/api\/forensics\/([^/]+)$/)
  if (pathname === '/api/office/forensics' || legacyForensicsMatch) {
    const session = legacyForensicsMatch
      ? decodeURIComponent(legacyForensicsMatch[1])
      : parsedUrl.searchParams.get('session') || 'aim-office'
    const data = fetchSessionForensicsLocal(session)
    sendJson(res, 200, data)
    return true
  }

  if (pathname === '/api/office/workspace' || pathname === '/api/workspace/context') {
    const session = parsedUrl.searchParams.get('session') || 'aim-office'
    const data = fetchWorkspaceContextLocal(session)
    sendJson(res, 200, data)
    return true
  }

  sendJson(res, 404, {
    error: `Read-only telemetry endpoint not found: ${pathname}`,
    code: 'NOT_FOUND',
  })
  return true
}

function attachOfficeBridgeMiddleware(middlewares: {
  use: (
    fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>
  ) => unknown
}): void {
  middlewares.use(async (req, res, next) => {
    const handled = await handleOfficeBridgeRequest(req, res)
    if (!handled) {
      next()
    }
  })
}

export function createOfficeBridgePlugin(): Plugin {
  return {
    name: 'aim-office-readonly-telemetry-bridge',
    configureServer(server) {
      attachOfficeBridgeMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachOfficeBridgeMiddleware(server.middlewares)
    },
  }
}
