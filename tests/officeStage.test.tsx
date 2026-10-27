import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  COMMAND_OFFICE_ROOM,
  CUTAWAY_AGENCY_POD_CENTERS,
  QUAD_POD_CENTERS,
  WAR_ROOM_POD_CENTERS,
  computeElasticPodCount,
  filterRoomForAgentCount,
  getOfficeThemePack,
} from '../src/office/rooms'
import {
  computeDepthZIndex,
  findWaypointPath,
  selectFacingFromDelta,
  stepAlongWaypoints,
} from '../src/office/waypointGraph'
import { OfficeStage } from '../src/components/OfficeStage'
import {
  addCatalogPropToLayout,
  applyCustomLayoutToRoom,
  assignIdleHangoutsToCharacters,
  collectRoomHangoutSpots,
  removePlacedPropFromLayout,
  resetThemeLayout,
  updateFurniturePositionInLayout,
} from '../src/office/layoutPersistence'
import { OfficeCharacter, SOVEREIGN_CHARACTER_ROSTER } from '../src/office/types'

describe('AIM-Office Isometric 2.5D Engine, Elastic 4-Way Quad Pods, Pan/Zoom & Waypoints (#1, #4, #5)', () => {
  it('defines the 1376x768 Command Office with up to 8 elastic 4-Way Standing Desk Quad Pods (32 workstations) and 20-character roster', () => {
    expect(COMMAND_OFFICE_ROOM.logicalWidth).toBe(1376)
    expect(COMMAND_OFFICE_ROOM.logicalHeight).toBe(768)
    expect(QUAD_POD_CENTERS).toHaveLength(8)
    expect(SOVEREIGN_CHARACTER_ROSTER).toHaveLength(20)

    const furnitureIds = new Set(COMMAND_OFFICE_ROOM.furniture.map((f) => f.id))
    expect(furnitureIds.has('whiteboard')).toBe(true)
    expect(furnitureIds.has('memory-vault')).toBe(true)
    expect(furnitureIds.has('coffee-station')).toBe(true)
    expect(furnitureIds.has('entry-door')).toBe(true)

    for (let i = 1; i <= 32; i++) {
      expect(furnitureIds.has(`desk-${i}`)).toBe(true)
    }
    expect(COMMAND_OFFICE_ROOM.workstations.length).toBe(32)

    // Verify elastic pod scaling from 11 to 32 agents
    expect(computeElasticPodCount(11)).toBe(4)
    expect(computeElasticPodCount(16)).toBe(4)
    expect(computeElasticPodCount(19)).toBe(5)
    expect(computeElasticPodCount(24)).toBe(6)
    expect(computeElasticPodCount(32)).toBe(8)

    const roomFor12 = filterRoomForAgentCount(COMMAND_OFFICE_ROOM, 12)
    expect(roomFor12.workstations).toHaveLength(16)
    const roomFor28 = filterRoomForAgentCount(COMMAND_OFFICE_ROOM, 28)
    expect(roomFor28.workstations).toHaveLength(28)

    const bossSpot = COMMAND_OFFICE_ROOM.workstations.find((w) => w.id === 'spot-boss')!
    expect(bossSpot.deskId).toBe('desk-1')
    expect(bossSpot.podIndex).toBe(1)
    expect(bossSpot.podSlot).toBe('NW')

    const desk1 = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === 'desk-1')!
    expect(bossSpot.zIndexOverride).toBe((desk1.zIndexOverride ?? 0) - 5)

    const spot3SW = COMMAND_OFFICE_ROOM.workstations.find((w) => w.id === 'spot-3')!
    const desk3 = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === 'desk-3')!
    expect(spot3SW.zIndexOverride).toBe((desk3.zIndexOverride ?? 0) + 5)

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

  it('supports mouse wheel zoom (0.75x..1.8x), click-and-drag panning, Reset Camera button, and depth-sorted actors', () => {
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

    const stage = screen.getByTestId('office-stage')
    expect(screen.getByTestId('camera-zoom-readout')).toHaveTextContent('100%')

    // Zoom in via wheel and button
    fireEvent.wheel(stage, { deltaY: -100 })
    expect(screen.getByTestId('camera-zoom-readout')).toHaveTextContent('110%')

    // Drag to pan
    fireEvent.mouseDown(stage, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(stage, { clientX: 145, clientY: 130 })
    fireEvent.mouseUp(stage)
    expect(stage.getAttribute('data-pan')).toBe('45,30')

    // Reset camera
    fireEvent.click(screen.getByTestId('btn-reset-camera'))
    expect(screen.getByTestId('camera-zoom-readout')).toHaveTextContent('100%')
    expect(stage.getAttribute('data-pan')).toBe('0,0')

    const joshuaActor = screen.getByTestId('character-aim-joshua')
    const bossDesk = screen.getByTestId('furniture-desk-1')
    expect(Number(joshuaActor.getAttribute('data-zindex'))).toBe(
      Number(bossDesk.getAttribute('data-zindex')) - 5
    )
    fireEvent.click(joshuaActor)
    expect(onSelectChar).toHaveBeenCalledWith(sampleChars[0])

    // Verify Bottom Tactical Dock, Live Telemetry Ticker & RTS Squad Quick-Select Hotbar (#13)
    expect(screen.getByTestId('tactical-bottom-dock')).toBeInTheDocument()
    expect(screen.getByTestId('live-telemetry-ticker')).toHaveTextContent('aim-opencode')
    expect(screen.getByTestId('squad-quick-hotbar')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('hotbar-slot-aim-grok'))
    expect(onSelectChar).toHaveBeenCalledWith(sampleChars[1])
  })

  it('omits WallTaskBoard in Sovereign War Room (wallBoardRect: null) while rendering skewDeg 0 in Cutaway Agency and skewDeg 25.6 in Classic Studio (#9)', () => {
    const warPack = getOfficeThemePack('sovereign-war-room')
    const agencyPack = getOfficeThemePack('cutaway-agency')
    const classicPack = getOfficeThemePack('classic-command')

    expect(warPack.wallBoardRect).toBeNull()
    expect(agencyPack.wallBoardRect?.skewDeg).toBe(0)
    expect(classicPack.wallBoardRect?.skewDeg).toBe(25.6)

    const onSelectFurniture = vi.fn()
    const { rerender } = render(
      <OfficeStage
        room={warPack.room}
        wallBoardRect={warPack.wallBoardRect}
        characters={[]}
        onSelectFurniture={onSelectFurniture}
      />
    )

    // No WallTaskBoard rendered in the subterranean War Room bunker
    expect(screen.queryByTestId('wall-task-board')).toBeNull()

    // Clicking the Central Holographic Situation Table hotspot triggers whiteboard furniture handler
    const holoTableHotspot = screen.getByTestId('furniture-whiteboard')
    expect(holoTableHotspot).toHaveAttribute('data-hotspot', 'true')
    fireEvent.click(holoTableHotspot)
    expect(onSelectFurniture).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'whiteboard', category: 'whiteboard' })
    )

    // Rerender with Cutaway Agency theme -> flat Strategy Wing WallTaskBoard (skewY(0deg))
    rerender(
      <OfficeStage
        room={agencyPack.room}
        wallBoardRect={agencyPack.wallBoardRect}
        characters={[]}
      />
    )
    const agencyBoard = screen.getByTestId('wall-task-board')
    expect(agencyBoard.style.transform).toContain('skewY(0deg)')

    // Rerender with Classic Command theme -> isometric angled WallTaskBoard (skewY(25.6deg))
    rerender(
      <OfficeStage
        room={classicPack.room}
        wallBoardRect={classicPack.wallBoardRect}
        characters={[]}
      />
    )
    const classicBoard = screen.getByTestId('wall-task-board')
    expect(classicBoard.style.transform).toContain('skewY(25.6deg)')

    // Verify War Room v4 pod coordinates keep x=50% central reactor/holo aisle clear (#10)
    expect(WAR_ROOM_POD_CENTERS).toHaveLength(8)
    for (const pod of WAR_ROOM_POD_CENTERS) {
      expect(Math.abs(pod.cx - 50.0)).toBeGreaterThanOrEqual(8.0)
    }

    // Verify Cutaway Agency v4 pod coordinates populate HQ foyer + all 4 woven rugs across Pods 1..5 (#10)
    expect(CUTAWAY_AGENCY_POD_CENTERS).toHaveLength(8)
    expect(CUTAWAY_AGENCY_POD_CENTERS[0]).toMatchObject({ cx: 51.0, cy: 51.5 })
    expect(CUTAWAY_AGENCY_POD_CENTERS[1]).toMatchObject({ cx: 26.5, cy: 55.0 })
    expect(CUTAWAY_AGENCY_POD_CENTERS[2]).toMatchObject({ cx: 75.5, cy: 59.5 })
    expect(CUTAWAY_AGENCY_POD_CENTERS[3]).toMatchObject({ cx: 70.0, cy: 83.5 })
    expect(CUTAWAY_AGENCY_POD_CENTERS[4]).toMatchObject({ cx: 28.5, cy: 72.0 })
  })

  it('supports Build Mode desk dragging, workstation translation, and Smart Furniture Catalog placement (#17)', () => {
    const origDesk1 = COMMAND_OFFICE_ROOM.furniture.find((f) => f.id === 'desk-1')!
    const origBossSpot = COMMAND_OFFICE_ROOM.workstations.find((w) => w.id === 'spot-boss')!

    let layoutMap = updateFurniturePositionInLayout(
      {},
      'classic-command',
      'desk-1',
      origDesk1.x + 10,
      origDesk1.y + 8
    )

    const { nextMap, addedProp } = addCatalogPropToLayout(
      layoutMap,
      'classic-command',
      'prop-lounge-couch',
      { x: 30, y: 78 }
    )
    layoutMap = nextMap
    expect(addedProp).not.toBeNull()

    const customized = applyCustomLayoutToRoom(
      COMMAND_OFFICE_ROOM,
      'classic-command',
      layoutMap
    )
    const movedDesk1 = customized.furniture.find((f) => f.id === 'desk-1')!
    const movedBossSpot = customized.workstations.find((w) => w.id === 'spot-boss')!

    expect(movedDesk1.x).toBeCloseTo(origDesk1.x + 10, 1)
    expect(movedDesk1.y).toBeCloseTo(origDesk1.y + 8, 1)
    expect(movedBossSpot.x).toBeCloseTo(origBossSpot.x + 10, 1)
    expect(movedBossSpot.y).toBeCloseTo(origBossSpot.y + 8, 1)

    const placedCouch = customized.furniture.find((f) => f.id === addedProp!.id)!
    expect(placedCouch.isUserPlaced).toBe(true)
    expect(placedCouch.hangoutSpots).toHaveLength(3)
    expect(placedCouch.hangoutSpots![0].isSeated).toBe(true)

    const allHangouts = collectRoomHangoutSpots(customized)
    expect(allHangouts.length).toBeGreaterThanOrEqual(10)

    const onMoveFurniture = vi.fn()
    render(
      <OfficeStage
        room={customized}
        characters={[]}
        isBuildMode={true}
        selectedFurnitureId={addedProp!.id}
        onMoveFurniture={onMoveFurniture}
      />
    )

    const couchEl = screen.getByTestId(`furniture-${addedProp!.id}`)
    fireEvent.mouseDown(couchEl, { button: 0, clientX: 200, clientY: 200 })
    fireEvent.mouseMove(window, { clientX: 337, clientY: 276 })
    fireEvent.mouseUp(window)
    expect(onMoveFurniture).toHaveBeenCalledWith(
      addedProp!.id,
      expect.any(Number),
      expect.any(Number)
    )

    layoutMap = removePlacedPropFromLayout(layoutMap, 'classic-command', addedProp!.id)
    expect(layoutMap['classic-command']?.placedProps).toHaveLength(0)

    layoutMap = resetThemeLayout(layoutMap, 'classic-command')
    expect(layoutMap['classic-command']).toBeUndefined()
  })

  it('routes IDLE agents to Smart Furniture HangoutSpots and returns active agents immediately to their desks (#18)', () => {
    const customized = applyCustomLayoutToRoom(
      COMMAND_OFFICE_ROOM,
      'classic-command',
      {}
    )
    const testChars: OfficeCharacter[] = [
      {
        id: 'c-boss',
        sessionName: 'aim-joshua',
        displayName: 'J.O.S.H.U.A.',
        roleTitle: 'Boss',
        vessel: 'AGY',
        archetype: 'boss-joshua',
        status: 'IDLE',
        context: { pct: 4, severity: 'green' },
        deskSpotId: 'spot-boss',
        currentWaypointId: 'wp-boss-desk',
        position: { x: 45.55, y: 49.15 },
        targetWaypoints: [],
        facing: 'front-right',
      },
      {
        id: 'c-idle-1',
        sessionName: 'aim-ld',
        displayName: 'aim-ld',
        roleTitle: 'LeadDeeds',
        vessel: 'AGY',
        archetype: 'agent-leaddeeds',
        status: 'IDLE',
        context: { pct: 8, severity: 'green' },
        deskSpotId: 'spot-2',
        currentWaypointId: 'wp-desk-2',
        position: { x: 53.45, y: 49.15 },
        targetWaypoints: [],
        facing: 'front-left',
      },
      {
        id: 'c-idle-2',
        sessionName: 'aim-tbsoftwash',
        displayName: 'aim-tbsoftwash',
        roleTitle: 'TBSoftwash',
        vessel: 'AGY',
        archetype: 'agent-tbsoftwash',
        status: 'IDLE',
        context: { pct: 7, severity: 'green' },
        deskSpotId: 'spot-3',
        currentWaypointId: 'wp-desk-3',
        position: { x: 45.55, y: 54.85 },
        targetWaypoints: [],
        facing: 'rear-right',
      },
    ]

    const withHangouts = assignIdleHangoutsToCharacters(
      testChars,
      customized,
      true,
      'classic-command'
    )
    // Boss Joshua stays at spot-boss
    expect(withHangouts[0].hangoutSpotId).toBeUndefined()
    // Idle agents move to HangoutSpots (coffee bar / lounge sofa / smoke stand)
    expect(withHangouts[1].hangoutSpotId).toBeDefined()
    expect(withHangouts[1].idleEmote).toBeDefined()
    expect(withHangouts[2].hangoutSpotId).toBeDefined()

    // When aim-ld transitions to TOOL_EXEC, it immediately returns to its assigned desk (spot-2)
    const activeChars = testChars.map((c) =>
      c.sessionName === 'aim-ld' ? { ...c, status: 'TOOL_EXEC' as const } : c
    )
    const afterWake = assignIdleHangoutsToCharacters(
      activeChars,
      customized,
      true,
      'classic-command'
    )
    const spot2 = customized.workstations.find((w) => w.id === 'spot-2')!
    expect(afterWake[1].hangoutSpotId).toBeUndefined()
    expect(afterWake[1].position).toEqual({ x: spot2.x, y: spot2.y })

    // Disabling hangouts returns all IDLE agents to their desks
    const disabledHangouts = assignIdleHangoutsToCharacters(
      testChars,
      customized,
      false,
      'classic-command'
    )
    expect(disabledHangouts[1].hangoutSpotId).toBeUndefined()
    expect(disabledHangouts[2].hangoutSpotId).toBeUndefined()
  })
})
