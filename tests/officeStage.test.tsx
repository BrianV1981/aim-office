import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMMAND_OFFICE_ROOM, QUAD_POD_CENTERS } from '../src/office/rooms'
import {
  computeDepthZIndex,
  findWaypointPath,
  selectFacingFromDelta,
  stepAlongWaypoints,
} from '../src/office/waypointGraph'
import { OfficeStage } from '../src/components/OfficeStage'
import { OfficeCharacter } from '../src/office/types'

describe('AIM-Office Isometric 2.5D Engine, 4-Way Quad Pods & Waypoint Pathfinder (#1 & #4)', () => {
  it('defines the 1376x768 Command Office with 4 symmetrical 4-Way Standing Desk Quad Pods (16 workstations) and 4 Wall Hotspots', () => {
    expect(COMMAND_OFFICE_ROOM.logicalWidth).toBe(1376)
    expect(COMMAND_OFFICE_ROOM.logicalHeight).toBe(768)
    expect(QUAD_POD_CENTERS).toHaveLength(4)

    const furnitureIds = new Set(COMMAND_OFFICE_ROOM.furniture.map((f) => f.id))
    expect(furnitureIds.has('whiteboard')).toBe(true)
    expect(furnitureIds.has('memory-vault')).toBe(true)
    expect(furnitureIds.has('coffee-station')).toBe(true)
    expect(furnitureIds.has('entry-door')).toBe(true)

    for (let i = 1; i <= 16; i++) {
      expect(furnitureIds.has(`desk-${i}`)).toBe(true)
    }
    // 16 total standing desk workstations across the 4 Quad Pods (spot-boss is desk-1 NW in Pod 1)
    expect(COMMAND_OFFICE_ROOM.workstations.length).toBe(16)
    const bossSpot = COMMAND_OFFICE_ROOM.workstations.find((w) => w.id === 'spot-boss')!
    expect(bossSpot.deskId).toBe('desk-1')
    expect(bossSpot.podIndex).toBe(1)
    expect(bossSpot.podSlot).toBe('NW')

    // Verify front/rear zIndex occlusion in Pod 1: NW & NE agents render behind rear desks (deskZ - 5), SW & SE render in front (deskZ + 5)
    const desk1 = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === 'desk-1')!
    expect(bossSpot.zIndexOverride).toBe((desk1.zIndexOverride ?? 0) - 5)

    const spot3SW = COMMAND_OFFICE_ROOM.workstations.find((w) => w.id === 'spot-3')!
    const desk3 = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === 'desk-3')!
    expect(spot3SW.zIndexOverride).toBe((desk3.zIndexOverride ?? 0) + 5)

    // Verify wall features are marked as invisible hotspots (no floating SVG boxes)
    for (const wallId of ['entry-door', 'whiteboard', 'coffee-station', 'memory-vault']) {
      const asset = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === wallId)!
      expect(asset.isHotspot).toBe(true)
    }
  })

  it('routes shortest corridor paths between Door, Quad Pods, Boss Desk, Whiteboard, Vault, and Coffee Station via BFS', () => {
    const pathDoorToBoss = findWaypointPath('wp-entry-door', 'wp-boss-desk')
    expect(pathDoorToBoss.length).toBeGreaterThan(2)
    expect(pathDoorToBoss[0].id).toBe('wp-entry-door')
    expect(pathDoorToBoss[pathDoorToBoss.length - 1].id).toBe('wp-boss-desk')

    const pathDeskToCoffee = findWaypointPath('wp-desk-14', 'wp-coffee-station')
    expect(pathDeskToCoffee[0].id).toBe('wp-desk-14')
    expect(pathDeskToCoffee[pathDeskToCoffee.length - 1].id).toBe('wp-coffee-station')
    expect(
      pathDeskToCoffee.some((n) => n.id.startsWith('wp-aisle-') || n.id === 'wp-south-corridor')
    ).toBe(true)
  })

  it('selects 4-direction isometric sprites and interpolates movement along waypoints', () => {
    expect(selectFacingFromDelta(-3, -2)).toBe('rear-left')
    expect(selectFacingFromDelta(4, -2)).toBe('rear-right')
    expect(selectFacingFromDelta(-3, 2)).toBe('front-left')
    expect(selectFacingFromDelta(3, 2)).toBe('front-right')

    const stepped = stepAlongWaypoints(
      { x: 20, y: 50 },
      [
        { x: 25, y: 50 },
        { x: 25, y: 40 },
      ],
      8,
      'front-left'
    )
    expect(stepped.moved).toBe(true)
    expect(stepped.position.x).toBe(25)
    expect(stepped.position.y).toBeCloseTo(47, 2)
    expect(stepped.remainingWaypoints.length).toBe(1)
    expect(stepped.facing).toBe('rear-right')
  })

  it('renders depth-sorted furniture, invisible wall hotspots, skewY WallTaskBoard, and characters with front/rear pod occlusion', () => {
    expect(computeDepthZIndex(48.4)).toBe(484)
    expect(computeDepthZIndex(53.0)).toBe(530)

    const sampleChars: OfficeCharacter[] = [
      {
        id: 'c-1',
        sessionName: 'aim-joshua',
        displayName: 'J.O.S.H.U.A.',
        roleTitle: 'Boss',
        vessel: 'AGY',
        archetype: 'boss-joshua',
        status: 'TOOL_EXEC',
        context: { pct: 12, severity: 'green' },
        deskSpotId: 'spot-boss',
        currentWaypointId: 'wp-boss-desk',
        position: { x: 45.55, y: 46.35 },
        targetWaypoints: [],
        facing: 'front-right',
        activeToolPill: '[Bash] ./aim projects board',
      },
      {
        id: 'c-2',
        sessionName: 'aim-grok',
        displayName: 'Grok',
        roleTitle: 'Swarm',
        vessel: 'Grok',
        archetype: 'vessel-grok',
        status: 'AMNESIA',
        context: { pct: 35, severity: 'red' },
        deskSpotId: 'spot-2',
        currentWaypointId: 'wp-desk-2',
        position: { x: 53.45, y: 46.35 },
        targetWaypoints: [],
        facing: 'front-left',
      },
      {
        id: 'c-3',
        sessionName: 'aim-auditor',
        displayName: 'Auditor',
        roleTitle: 'Gatekeeper',
        vessel: 'Auditor',
        archetype: 'vessel-auditor',
        status: 'WAITING',
        context: { pct: 21, severity: 'amber' },
        deskSpotId: 'spot-3',
        currentWaypointId: 'wp-desk-3',
        position: { x: 45.55, y: 54.85 },
        targetWaypoints: [],
        facing: 'rear-right',
      },
      {
        id: 'c-4',
        sessionName: 'aim-opencode',
        displayName: 'OpenCode',
        roleTitle: 'Courier',
        vessel: 'OpenCode',
        archetype: 'vessel-opencode',
        status: 'COURIER',
        context: { pct: 10, severity: 'green' },
        deskSpotId: 'spot-4',
        currentWaypointId: 'wp-desk-4',
        position: { x: 53.45, y: 54.85 },
        targetWaypoints: [{ x: 49.5, y: 43.5 }],
        facing: 'rear-left',
        courierTargetSession: 'aim-joshua',
        speechBubble: 'Merged #1',
      },
      {
        id: 'c-5',
        sessionName: 'aim-codex',
        displayName: 'Codex',
        roleTitle: 'Architect',
        vessel: 'Codex',
        archetype: 'vessel-codex',
        status: 'IDLE',
        context: { pct: 8, severity: 'green' },
        deskSpotId: 'spot-5',
        currentWaypointId: 'wp-coffee-station',
        position: { x: 73.5, y: 58 },
        targetWaypoints: [],
        facing: 'front-left',
      },
    ]

    const onSelectChar = vi.fn()
    const onOpenWhiteboard = vi.fn()
    render(
      <OfficeStage
        characters={sampleChars}
        onSelectCharacter={onSelectChar}
        onOpenWhiteboard={onOpenWhiteboard}
      />
    )

    expect(screen.getByTestId('badge-aim-joshua')).toHaveTextContent('⌨️')
    expect(screen.getByTestId('badge-aim-grok')).toHaveTextContent('🔥')
    expect(screen.getByTestId('badge-aim-auditor')).toHaveTextContent('✋')
    expect(screen.getByTestId('badge-aim-opencode')).toHaveTextContent('📨')
    expect(screen.getByTestId('badge-aim-codex')).toHaveTextContent('☕')

    // Stationary NW boss character uses Pod 1 NW zIndexOverride (deskZ 490 - 5 = 485)
    const joshuaActor = screen.getByTestId('character-aim-joshua')
    expect(Number(joshuaActor.getAttribute('data-zindex'))).toBe(485)

    // Stationary SW character uses Pod 1 SW zIndexOverride (deskZ 541 + 5 = 546)
    const auditorActor = screen.getByTestId('character-aim-auditor')
    expect(Number(auditorActor.getAttribute('data-zindex'))).toBe(546)

    // Wall hotspot renders without SVG box
    const wbHotspot = screen.getByTestId('furniture-whiteboard')
    expect(wbHotspot.getAttribute('data-hotspot')).toBe('true')
    expect(wbHotspot.querySelector('svg')).toBeNull()

    // Perspective-skewed WallTaskBoard renders sticky notes and opens WhiteboardModal on click
    const wallBoard = screen.getByTestId('wall-task-board')
    expect(wallBoard.style.transform).toContain('skewY(25.6deg)')
    fireEvent.mouseEnter(screen.getByTestId('wall-note-4'))
    expect(screen.getByTestId('wall-task-board-tooltip')).toHaveTextContent('#4')

    fireEvent.click(wallBoard)
    expect(onOpenWhiteboard).toHaveBeenCalledTimes(1)

    fireEvent.click(joshuaActor)
    expect(onSelectChar).toHaveBeenCalledWith(sampleChars[0])
  })
})
