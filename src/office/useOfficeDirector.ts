import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AimConnectClient,
  defaultAimConnectClient,
  FleetPaneRecord,
  SwarmDispatchEvent,
} from '../services/aimConnectClient'
import { COMMAND_OFFICE_ROOM } from './rooms'
import { ArchetypeSlug, IsometricRoom, OfficeCharacter, VesselType } from './types'
import { findWaypointPath } from './waypointGraph'

/**
 * Map a session name and vessel badge to its sovereign AIM-Office character archetype:
 * - `aim-joshua` -> `boss-joshua` (Executive Command Desk)
 * - `aim-auditor` / `grok-audit` / `Auditor` -> `vessel-auditor` (The Gatekeeper)
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

/**
 * Map live or demo `FleetPaneRecord[]` into depth-sorted `OfficeCharacter[]` placed at workstations,
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

  let regularSpotCursor = 0
  const result: OfficeCharacter[] = []

  for (const pane of panes) {
    const archetype = resolveSovereignArchetype(pane.sessionName, pane.vessel)
    const isBoss = archetype === 'boss-joshua'
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
