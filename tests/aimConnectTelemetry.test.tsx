import { describe, expect, it, vi } from 'vitest'
import {
  AimConnectClient,
  DEMO_FLEET_PANES,
  parseFleetPanesResponse,
} from '../src/services/aimConnectClient'
import {
  applyCourierDispatchToCharacters,
  mapFleetToOfficeCharacters,
  resolveRosterCharacterArchetype,
  resolveSovereignArchetype,
} from '../src/office/useOfficeDirector'

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
})
