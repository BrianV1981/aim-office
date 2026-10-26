import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AimConnectClient,
  defaultAimConnectClient,
  FleetPaneRecord,
  SwarmDispatchEvent,
} from '../services/aimConnectClient'
import { COMMAND_OFFICE_ROOM } from './rooms'
import {
  ArchetypeSlug,
  IsometricRoom,
  OfficeCharacter,
  SOVEREIGN_CHARACTER_ROSTER,
  VesselType,
} from './types'
import { findWaypointPath } from './waypointGraph'

/**
 * Map a session name and vessel badge to its base vessel archetype:
 * - `aim-joshua` -> `boss-joshua`
 * - `aim-auditor` / `grok-audit` / `Auditor` -> `vessel-auditor`
 * - `AGY` -> `vessel-agy`
 * - `Grok` -> `vessel-grok`
 * - `OpenCode` -> `vessel-opencode`
 * - `Codex` -> `vessel-codex`
 */
export function resolveSovereignArchetype(
  sessionName: string,
  vessel: VesselType
): ArchetypeSlug {
  const normalized = sessionName.trim().toLowerCase()
  if (normalized === 'aim-joshua' || normalized.startsWith('aim-joshua')) {
    return 'boss-joshua'
  }
  if (
    normalized === 'aim-auditor' ||
    normalized.includes('auditor') ||
    normalized === 'grok-audit' ||
    vessel === 'Auditor'
  ) {
    return 'vessel-auditor'
  }
  switch (vessel) {
    case 'Grok':
      return 'vessel-grok'
    case 'OpenCode':
      return 'vessel-opencode'
    case 'Codex':
      return 'vessel-codex'
    case 'AGY':
    default:
      return 'vessel-agy'
  }
}

const SESSION_PERSONA_MAP: ReadonlyArray<{ match: string; slug: ArchetypeSlug }> = [
  { match: 'aim-joshua', slug: 'boss-joshua' },
  { match: 'aim-auditor', slug: 'vessel-auditor' },
  { match: 'grok-audit', slug: 'vessel-auditor' },
  { match: 'aim-ld-content', slug: 'agent-ld-content' },
  { match: 'aim-ld', slug: 'agent-leaddeeds' },
  { match: 'aim-tbsoftwash-content', slug: 'agent-tb-content' },
  { match: 'tbsoftwash-ai-book', slug: 'agent-ai-book' },
  { match: 'aim-tbsoftwash', slug: 'agent-tbsoftwash' },
  { match: 'aim-skorbane-content', slug: 'agent-skorbane-media' },
  { match: 'aim-skorbane', slug: 'agent-skorbane' },
  { match: 'aim-youtube', slug: 'agent-youtube' },
  { match: 'aim-gbp', slug: 'agent-gbp' },
  { match: 'aim-calendar', slug: 'agent-calendar' },
  { match: 'ayrianna', slug: 'agent-ayrianna' },
  { match: 'aim-cron', slug: 'agent-cron' },
  { match: 'aim-tmux', slug: 'agent-tmux' },
  { match: 'aim-connect', slug: 'agent-connect' },
  { match: 'aim-opencode', slug: 'vessel-opencode' },
  { match: 'aim-codex', slug: 'vessel-codex' },
  { match: 'aim-grok', slug: 'vessel-grok' },
  { match: 'aim-office', slug: 'vessel-agy' },
  { match: 'aim-agy', slug: 'vessel-agy' },
]

/**
 * Deterministically assign a unique avatar from the 20-Character Sovereign Roster (`SOVEREIGN_CHARACTER_ROSTER`)
 * across active sessions, falling back to deterministic hash selection when all 20 have been used.
 */
export function resolveRosterCharacterArchetype(
  sessionName: string,
  vessel: VesselType,
  usedArchetypes?: Set<ArchetypeSlug>
): ArchetypeSlug {
  const normalized = sessionName.trim().toLowerCase()
  for (const entry of SESSION_PERSONA_MAP) {
    if (normalized === entry.match || normalized.includes(entry.match)) {
      if (!usedArchetypes || !usedArchetypes.has(entry.slug) || entry.slug === 'boss-joshua') {
        usedArchetypes?.add(entry.slug)
        return entry.slug
      }
    }
  }

  const baseArchetype = resolveSovereignArchetype(sessionName, vessel)
  if (!usedArchetypes || !usedArchetypes.has(baseArchetype)) {
    usedArchetypes?.add(baseArchetype)
    return baseArchetype
  }

  // Pick next unused character from the 20-character roster (excluding boss-joshua)
  const candidates = SOVEREIGN_CHARACTER_ROSTER.filter((s) => s !== 'boss-joshua')
  for (const candidate of candidates) {
    if (!usedArchetypes.has(candidate)) {
      usedArchetypes.add(candidate)
      return candidate
    }
  }

  // If >20 sessions are active simultaneously, cycle deterministically by session hash
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0
  }
  return candidates[hash % candidates.length]
}

/**
 * Map live or demo `FleetPaneRecord[]` into depth-sorted `OfficeCharacter[]` placed at elastic 4-way quad pod workstations,
 * preserving active walking coordinates or courier state for already-spawned sessions.
 */
export function mapFleetToOfficeCharacters(
  panes: FleetPaneRecord[],
  existingCharacters: OfficeCharacter[] = [],
  room: IsometricRoom = COMMAND_OFFICE_ROOM
): OfficeCharacter[] {
  const existingBySession = new Map<string, OfficeCharacter>()
  for (const char of existingCharacters) {
    existingBySession.set(char.sessionName, char)
  }

  const bossSpot = room.workstations.find((w) => w.isBossDesk) ?? room.workstations[0]
  const regularSpots = room.workstations.filter((w) => !w.isBossDesk)
  const usedArchetypes = new Set<ArchetypeSlug>()

  let regularSpotCursor = 0
  const result: OfficeCharacter[] = []

  for (const pane of panes) {
    const baseArchetype = resolveSovereignArchetype(pane.sessionName, pane.vessel)
    const isBoss = baseArchetype === 'boss-joshua'
    const archetype = isBoss
      ? 'boss-joshua'
      : resolveRosterCharacterArchetype(pane.sessionName, pane.vessel, usedArchetypes)
    if (isBoss) {
      usedArchetypes.add('boss-joshua')
    }

    const assignedSpot = isBoss
      ? bossSpot
      : regularSpots[regularSpotCursor++ % regularSpots.length] ?? bossSpot

    const prev = existingBySession.get(pane.sessionName)
    const isWalking = prev && prev.targetWaypoints.length > 0
    const isAmnesia = pane.context.pct >= 30 || pane.status === 'AMNESIA'

    const effectiveStatus = isWalking
      ? prev.status
      : isAmnesia
        ? 'AMNESIA'
        : pane.status

    result.push({
      id: `char-${pane.sessionName}`,
      sessionName: pane.sessionName,
      displayName: isBoss ? 'J.O.S.H.U.A.' : pane.sessionName,
      roleTitle: isBoss
        ? 'Sovereign Orchestrator'
        : archetype === 'vessel-auditor'
          ? 'The Gatekeeper'
          : `${pane.vessel} Specialist`,
      vessel: pane.vessel,
      archetype,
      status: effectiveStatus,
      context: {
        ...pane.context,
        severity: isAmnesia ? 'red' : pane.context.severity,
      },
      deskSpotId: assignedSpot.id,
      currentWaypointId: assignedSpot.waypointId,
      position: isWalking ? prev.position : { x: assignedSpot.x, y: assignedSpot.y },
      targetWaypoints: isWalking ? prev.targetWaypoints : [],
      facing: isWalking ? prev.facing : assignedSpot.defaultFacing,
      zIndexOverride: assignedSpot.zIndexOverride,
      activeToolPill: pane.preview || undefined,
      speechBubble: isWalking ? prev.speechBubble : undefined,
      courierTargetSession: isWalking ? prev.courierTargetSession : undefined,
      gitBranch: pane.branch,
      worktreePath: pane.path,
    })
  }

  return result
}

/**
 * Trigger a physical `aim-communicate` Courier Walk from `dispatch.sender` to `dispatch.recipient`
 * (defaulting to `aim-joshua`'s Boss Desk if the recipient is not on the floor) and back to the sender's desk.
 */
export function applyCourierDispatchToCharacters(
  characters: OfficeCharacter[],
  dispatch: Pick<SwarmDispatchEvent, 'sender' | 'recipient' | 'preview'>,
  room: IsometricRoom = COMMAND_OFFICE_ROOM
): OfficeCharacter[] {
  const senderChar =
    characters.find((c) => c.sessionName === dispatch.sender) ??
    characters.find((c) => !c.deskSpotId.includes('boss')) ??
    characters[0]

  if (!senderChar) return characters

  const recipientChar =
    characters.find((c) => c.sessionName === dispatch.recipient) ??
    characters.find((c) => c.sessionName === 'aim-joshua') ??
    characters[0]

  const fromWp = senderChar.currentWaypointId
  const toWp = recipientChar?.currentWaypointId ?? 'wp-boss-desk'

  const outbound = findWaypointPath(fromWp, toWp, room.waypoints)
  const returnLeg = findWaypointPath(toWp, fromWp, room.waypoints).slice(1)
  const senderSpot = room.workstations.find((w) => w.id === senderChar.deskSpotId)

  const waypoints = [
    ...outbound.map((n) => ({ x: n.x, y: n.y })),
    ...returnLeg.map((n) => ({ x: n.x, y: n.y })),
    ...(senderSpot ? [{ x: senderSpot.x, y: senderSpot.y }] : []),
  ]

  const summary =
    dispatch.preview.length > 56
      ? `${dispatch.preview.slice(0, 53)}...`
      : dispatch.preview

  return characters.map((char) => {
    if (char.sessionName !== senderChar.sessionName) return char
    return {
      ...char,
      status: 'COURIER',
      courierTargetSession: recipientChar?.sessionName ?? dispatch.recipient,
      speechBubble: summary,
      targetWaypoints: waypoints,
    }
  })
}

export interface UseOfficeDirectorOptions {
  client?: AimConnectClient
  pollIntervalMs?: number
  initialDemoMode?: boolean
}

export function useOfficeDirector(options?: UseOfficeDirectorOptions) {
  const client = options?.client ?? defaultAimConnectClient
  const pollIntervalMs = options?.pollIntervalMs ?? 5000
  const [demoMode, setDemoMode] = useState<boolean>(options?.initialDemoMode ?? false)
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(false)
  const [characters, setCharacters] = useState<OfficeCharacter[]>([])
  const [swarmDispatches, setSwarmDispatches] = useState<SwarmDispatchEvent[]>([])
  const seenDispatchIdsRef = useRef<Set<string>>(new Set())

  const triggerCourierWalk = useCallback(
    (dispatch?: Partial<SwarmDispatchEvent>) => {
      const event: Pick<SwarmDispatchEvent, 'sender' | 'recipient' | 'preview'> = {
        sender: dispatch?.sender ?? 'aim-office',
        recipient: dispatch?.recipient ?? 'aim-joshua',
        preview:
          dispatch?.preview ??
          `[REPORT from ${dispatch?.sender ?? 'aim-office'}] Telemetry sync -> ${
            dispatch?.recipient ?? 'aim-joshua'
          }`,
      }
      setCharacters((prev) => applyCourierDispatchToCharacters(prev, event))
    },
    []
  )

  const refreshTelemetry = useCallback(async () => {
    const [{ panes, isDemoFallback }, dispatches] = await Promise.all([
      client.fetchFleetPanes(demoMode),
      client.fetchSwarmActivity(demoMode),
    ])

    setIsFallbackActive(isDemoFallback)
    setSwarmDispatches(dispatches)

    setCharacters((prev) => {
      let updated = mapFleetToOfficeCharacters(panes, prev)
      if (dispatches.length > 0) {
        const newest = dispatches[0]
        if (!seenDispatchIdsRef.current.has(newest.id)) {
          const isInitialLoad = seenDispatchIdsRef.current.size === 0
          for (const d of dispatches) {
            seenDispatchIdsRef.current.add(d.id)
          }
          if (!isInitialLoad) {
            updated = applyCourierDispatchToCharacters(updated, newest)
          }
        }
      }
      return updated
    })
  }, [client, demoMode])

  useEffect(() => {
    void refreshTelemetry()
    if (pollIntervalMs <= 0) return
    const timer = window.setInterval(() => {
      void refreshTelemetry()
    }, pollIntervalMs)
    return () => window.clearInterval(timer)
  }, [refreshTelemetry, pollIntervalMs])

  const handleCharactersTick = useCallback((nextChars: OfficeCharacter[]) => {
    setCharacters(
      nextChars.map((c) => {
        if (c.targetWaypoints.length === 0 && c.status === 'COURIER') {
          return {
            ...c,
            status: c.context.pct >= 30 ? 'AMNESIA' : 'THINKING',
            speechBubble: undefined,
            courierTargetSession: undefined,
          }
        }
        return c
      })
    )
  }, [])

  return {
    characters,
    swarmDispatches,
    demoMode,
    setDemoMode,
    isFallbackActive,
    triggerCourierWalk,
    refreshTelemetry,
    handleCharactersTick,
    client,
  }
}
