import { describe, expect, it, vi } from 'vitest'
import {
  AimConnectClient,
  DEMO_FLEET_PANES,
  formatTokenCountCompact,
  parseFleetPanesResponse,
} from '../src/services/aimConnectClient'
import {
  fetchFleetFromAimConnect,
  handleOfficeBridgeRequest,
  isAllowedLocalReadRequest,
  parsePaneScrollbackTelemetry,
} from '../src/server/officeBridge'
import {
  applyCourierDispatchToCharacters,
  mapFleetToOfficeCharacters,
  resolveRosterCharacterArchetype,
  resolveSovereignArchetype,
} from '../src/office/useOfficeDirector'
import { resolveOverheadStatusBadge } from '../src/components/CharacterActor'

describe('AIM-Connect Fleet Telemetry Bridge & Office Director (#2 & #5)', () => {
  it('maps sovereign vessel archetypes and deterministically assigns unique 20-character roster avatars', () => {
    expect(resolveSovereignArchetype('aim-joshua', 'AGY')).toBe('boss-joshua')
    expect(resolveSovereignArchetype('aim-auditor', 'Auditor')).toBe('vessel-auditor')
    expect(resolveSovereignArchetype('grok-audit', 'Grok')).toBe('vessel-auditor')
    expect(resolveSovereignArchetype('aim-office', 'AGY')).toBe('vessel-agy')
    expect(resolveSovereignArchetype('aim-ld', 'Grok')).toBe('vessel-grok')
    expect(resolveSovereignArchetype('aim-tbsoftwash', 'OpenCode')).toBe('vessel-opencode')
    expect(resolveSovereignArchetype('aim-codex', 'Codex')).toBe('vessel-codex')

    const used = new Set<any>()
    expect(resolveRosterCharacterArchetype('aim-ld', 'Grok', used)).toBe('agent-leaddeeds')
    expect(resolveRosterCharacterArchetype('aim-tbsoftwash', 'OpenCode', used)).toBe(
      'agent-tbsoftwash'
    )
    expect(resolveRosterCharacterArchetype('aim-connect', 'AGY', used)).toBe('agent-connect')

    const mapped = mapFleetToOfficeCharacters(DEMO_FLEET_PANES)
    const uniqueArchetypes = new Set(mapped.map((c) => c.archetype))
    expect(uniqueArchetypes.size).toBe(mapped.length)
  })

  it('parses aim-connect /api/fleet/panes payload and triggers 30%-Rule Amnesia Alert when context >= 30%', () => {
    const rawPayload = {
      fleet: [
        {
          session_name: 'aim-joshua',
          vessel: 'agy',
          status: 'THINKING',
          context_pct: 14.2,
          branch: 'main',
          path: '/home/kingb/aim-joshua',
          preview: 'Orchestrating swarm',
        },
        {
          session_name: 'aim-grok',
          vessel: 'grok',
          status: 'THINKING',
          context_pct: 32.5,
          branch: 'feat/swarm',
          path: '/home/kingb/aim-grok',
          preview: 'Approaching amnesia limit',
        },
      ],
    }

    const parsed = parseFleetPanesResponse(rawPayload)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].sessionName).toBe('aim-joshua')
    expect(parsed[0].context.severity).toBe('green')
    expect(parsed[1].sessionName).toBe('aim-grok')
    expect(parsed[1].status).toBe('AMNESIA')
    expect(parsed[1].context.severity).toBe('red')

    const characters = mapFleetToOfficeCharacters(parsed)
    expect(characters[0].deskSpotId).toBe('spot-boss')
    expect(characters[0].archetype).toBe('boss-joshua')
    expect(characters[1].status).toBe('AMNESIA')
    expect(characters[1].context.pct).toBe(32.5)
  })

  it('triggers Courier Walk along corridor waypoints from sender desk to recipient desk and back', () => {
    const characters = mapFleetToOfficeCharacters(DEMO_FLEET_PANES)
    const updated = applyCourierDispatchToCharacters(characters, {
      sender: 'aim-office',
      recipient: 'aim-joshua',
      preview: '[REPORT from aim-office] Ticket #2 Telemetry Ready',
    })

    const courier = updated.find((c) => c.sessionName === 'aim-office')!
    expect(courier.status).toBe('COURIER')
    expect(courier.courierTargetSession).toBe('aim-joshua')
    expect(courier.speechBubble).toContain('Ticket #2 Telemetry Ready')
    expect(courier.targetWaypoints.length).toBeGreaterThan(3)
  })

  it('gracefully falls back to Demo Fleet when aim-connect is unreachable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const client = new AimConnectClient({ baseUrl: 'http://localhost:8000' })
    const result = await client.fetchFleetPanes(false)

    expect(result.isDemoFallback).toBe(true)
    expect(result.panes.length).toBeGreaterThanOrEqual(8)
    expect(result.panes.some((p) => p.sessionName === 'aim-joshua')).toBe(true)
    expect(result.panes.some((p) => p.sessionName === 'aim-auditor')).toBe(true)

    fetchSpy.mockRestore()
  })

  it('accurately parses pane scrollback tokens against 1M AGY / 200k Grok windows and ignores random % output (#15)', () => {
    const agyScrollback = [
      'Build progress: 62% complete',
      '12.4k in | 1.1k out',
      '244.3k in | 2.1k out',
    ].join('\n')

    const parsedAgy = parsePaneScrollbackTelemetry(agyScrollback, 'agy.real', 'aim-office')
    expect(parsedAgy.tokens_limit).toBe(1_000_000)
    expect(parsedAgy.tokens_used).toBe(244_300)
    expect(parsedAgy.context_pct).toBe(24.4)
    expect(parsedAgy.tier).toBe('warning')

    const randomPctScrollback = [
      'Coverage: 88.5% lines covered',
      'Ready at http://localhost:5175/',
    ].join('\n')
    const parsedEmpty = parsePaneScrollbackTelemetry(randomPctScrollback, 'agy.real', 'aim-office')
    expect(parsedEmpty.tokens_used).toBe(0)
    expect(parsedEmpty.context_pct).toBe(0)

    expect(formatTokenCountCompact(244_300, 1_000_000)).toBe('244k/1M')
    expect(formatTokenCountCompact(0, 1_000_000)).toBe('0/1M')
    expect(formatTokenCountCompact(32_500, 200_000)).toBe('33k/200k')

    // Completed tool call ● Bash(...) and prose "confirmation" above idle `? for shortcuts` must stay IDLE (#16)
    const idleCompletedToolScrollback = [
      '5.0k in | 2.0k out | 153 thinking',
      '● Bash(git add memory-wiki/ && git commit -m "docs") (ctrl+o to expand)',
      'Chase Zelle confirmation: ERIK R BROWN sent you $325.00.',
      '>',
      '? for shortcuts                                      Gemini 4 Argon · high',
    ].join('\n')
    const parsedIdle = parsePaneScrollbackTelemetry(
      idleCompletedToolScrollback,
      'agy.real',
      'aim-ld-content'
    )
    expect(parsedIdle.status).toBe('IDLE')

    // Active tool call ○ Bash(...) + spinner + `esc to cancel` must be TOOL_EXEC (#16)
    const activeToolScrollback = [
      '105.9k in | 1.4k out | 743 thinking',
      '○ Bash(npx vitest run) (ctrl+o to expand)',
      '⢿  Running command...',
      '>',
      'esc to cancel                                        Gemini 4 Argon · high',
    ].join('\n')
    const parsedActive = parsePaneScrollbackTelemetry(
      activeToolScrollback,
      'agy.real',
      'aim-office'
    )
    expect(parsedActive.status).toBe('TOOL_EXEC')

    // Active badge label must stay compact ("Active") even with 90-char preview (#16)
    const mapped = mapFleetToOfficeCharacters(DEMO_FLEET_PANES)
    const activeChar = {
      ...mapped[0],
      status: 'TOOL_EXEC' as const,
      activeToolPill:
        'committed (e785f38), and re-indexed LanceDB (1,631 fragments). 38 bundles ready',
    }
    const badge = resolveOverheadStatusBadge(activeChar)
    expect(badge.label).toBe('Active')
  })

  it('proxies /api/office/fleet through aim-connect (:8000), filters customer sandboxes, enriches project_number, and caches results (#20)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fleet: [
          {
            session_name: 'agent-op_9f3c7e-opencode',
            vessel: 'agy',
            status: 'IDLE',
            path: '/home/kingb/aim-connect/backend',
            repo_name: 'backend',
            branch: 'master',
            tokens_used: 18_000,
            tokens_limit: 1_000_000,
            context_pct: 1.8,
          },
          {
            session_name: 'aim-office',
            vessel: 'agy',
            status: 'IDLE',
            path: '/home/kingb/aim-office',
            repo_name: 'aim-office',
            branch: 'main',
            tokens_used: 95_000,
            tokens_limit: 1_000_000,
            context_pct: 9.5,
          },
          {
            session_name: 'aim-ld',
            vessel: 'agy',
            status: 'THINKING',
            path: '/home/kingb/aim-ld',
            repo_name: 'aim-ld',
            branch: 'main',
            tokens_used: 340_000,
            tokens_limit: 1_000_000,
            context_pct: 34.0,
          },
        ],
      }),
    } as Response)

    const fleet = await fetchFleetFromAimConnect('http://127.0.0.1:8000', true)
    expect(fleet).toHaveLength(2)
    expect(fleet[0].session_name).toBe('aim-office')
    expect(fleet[0].project_number).toBe(14)
    expect(fleet[1].session_name).toBe('aim-ld')
    expect(fleet[1].status).toBe('AMNESIA')
    expect(fleet[1].project_number).toBe(5)

    // Second call uses in-memory cache without re-fetching
    const cachedFleet = await fetchFleetFromAimConnect('http://127.0.0.1:8000', false)
    expect(cachedFleet).toHaveLength(2)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    fetchSpy.mockRestore()
  })

  it('enforces Option A read-only telemetry boundary (#21): blocks tmux reply/communicate/output routes and rejects cross-site origins', async () => {
    function makeMockRes() {
      let body = ''
      const headers: Record<string, string> = {}
      const res: any = {
        statusCode: 200,
        setHeader: (k: string, v: string) => {
          headers[k.toLowerCase()] = v
        },
        end: (chunk: string) => {
          body = chunk
        },
        getJson: () => JSON.parse(body || '{}'),
        headers,
      }
      return res
    }

    // 1. Block POST /api/office/session/:session/reply (CSRF/RCE vector)
    const replyRes = makeMockRes()
    const replyHandled = await handleOfficeBridgeRequest(
      { method: 'POST', url: '/api/office/session/aim-joshua/reply', headers: {} } as any,
      replyRes
    )
    expect(replyHandled).toBe(true)
    expect(replyRes.statusCode).toBe(403)
    expect(replyRes.getJson().code).toBe('READ_ONLY_MODE')

    // 2. Block POST /api/office/communicate (broker injection vector)
    const commRes = makeMockRes()
    const commHandled = await handleOfficeBridgeRequest(
      { method: 'POST', url: '/api/office/communicate', headers: {} } as any,
      commRes
    )
    expect(commHandled).toBe(true)
    expect(commRes.statusCode).toBe(403)
    expect(commRes.getJson().code).toBe('READ_ONLY_MODE')

    // 3. Block GET /api/office/session/:session/output (raw scrollback leakage vector)
    const outRes = makeMockRes()
    const outHandled = await handleOfficeBridgeRequest(
      { method: 'GET', url: '/api/office/session/aim-joshua/output', headers: {} } as any,
      outRes
    )
    expect(outHandled).toBe(true)
    expect(outRes.statusCode).toBe(403)
    expect(outRes.getJson().code).toBe('READ_ONLY_MODE')

    // 4. Block cross-site browser requests (`Sec-Fetch-Site: cross-site` or foreign `Origin`)
    expect(
      isAllowedLocalReadRequest({
        headers: { 'sec-fetch-site': 'cross-site' },
      } as any)
    ).toBe(false)
    expect(
      isAllowedLocalReadRequest({
        headers: { origin: 'https://malicious.example.com' },
      } as any)
    ).toBe(false)
    expect(
      isAllowedLocalReadRequest({
        headers: { origin: 'http://127.0.0.1:5175', 'sec-fetch-site': 'same-origin' },
      } as any)
    ).toBe(true)

    const crossRes = makeMockRes()
    await handleOfficeBridgeRequest(
      {
        method: 'GET',
        url: '/api/office/fleet',
        headers: { origin: 'https://evil.example' },
      } as any,
      crossRes
    )
    expect(crossRes.statusCode).toBe(403)
    expect(crossRes.getJson().code).toBe('CROSS_ORIGIN_BLOCKED')

    // 5. Allow local same-origin GET /api/office/fleet in read-only mode
    const okRes = makeMockRes()
    await handleOfficeBridgeRequest(
      {
        method: 'GET',
        url: '/api/office/fleet',
        headers: { origin: 'http://localhost:5175', 'sec-fetch-site': 'same-origin' },
      } as any,
      okRes
    )
    expect(okRes.statusCode).toBe(200)
    expect(okRes.getJson().mode).toBe('read-only')
  })
})
