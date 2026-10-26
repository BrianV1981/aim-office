import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMMAND_OFFICE_ROOM } from '../src/office/rooms'
import {
  computeDepthZIndex,
  findWaypointPath,
  selectFacingFromDelta,
  stepAlongWaypoints,
} from '../src/office/waypointGraph'
import { OfficeStage } from '../src/components/OfficeStage'
import { OfficeCharacter } from '../src/office/types'

describe('AIM-Office Isometric 2.5D Engine & Waypoint Pathfinder (#1)', () => {
  it('defines the 1200x800 Command Office with Boss Desk, 16 Agent Desks, Whiteboard, Vault, Coffee & Door', () => {
    expect(COMMAND_OFFICE_ROOM.logicalWidth).toBe(1200)
    expect(COMMAND_OFFICE_ROOM.logicalHeight).toBe(800)

    const furnitureIds = new Set(COMMAND_OFFICE_ROOM.furniture.map((f) => f.id))
    expect(furnitureIds.has('boss-desk')).toBe(true)
    expect(furnitureIds.has('whiteboard')).toBe(true)
    expect(furnitureIds.has('memory-vault')).toBe(true)
    expect(furnitureIds.has('coffee-station')).toBe(true)
    expect(furnitureIds.has('entry-door')).toBe(true)

    for (let i = 1; i <= 16; i++) {
      expect(furnitureIds.has(`desk-${i}`)).toBe(true)
    }
    // 1 boss spot + 16 workstation spots
    expect(COMMAND_OFFICE_ROOM.workstations.length).toBe(17)
  })

  it('routes shortest corridor paths between Door, Cubicles, Boss Desk, Whiteboard, Vault, and Coffee Station via BFS', () => {
    const pathDoorToBoss = findWaypointPath('wp-entry-door', 'wp-boss-desk')
    expect(pathDoorToBoss.length).toBeGreaterThan(2)
    expect(pathDoorToBoss[0].id).toBe('wp-entry-door')
    expect(pathDoorToBoss[pathDoorToBoss.length - 1].id).toBe('wp-boss-desk')

    const pathDeskToCoffee = findWaypointPath('wp-desk-14', 'wp-coffee-station')
    expect(pathDeskToCoffee[0].id).toBe('wp-desk-14')
    expect(pathDeskToCoffee[pathDeskToCoffee.length - 1].id).toBe('wp-coffee-station')
    // Must route via corridor aisles, not direct teleport
    expect(pathDeskToCoffee.some((n) => n.id.startsWith('wp-aisle-'))).toBe(true)
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

  it('renders depth-sorted furniture and characters with overhead status badges (⌨️, ✋, 🔥, 📨, ☕)', () => {
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
        position: { x: 52, y: 27 },
        targetWaypoints: [],
        facing: 'front-left',
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
        deskSpotId: 'spot-1',
        currentWaypointId: 'wp-desk-1',
        position: { x: 24, y: 40.6 },
        targetWaypoints: [],
        facing: 'front-right',
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
        deskSpotId: 'spot-2',
        currentWaypointId: 'wp-desk-2',
        position: { x: 35.5, y: 45.1 },
        targetWaypoints: [],
        facing: 'front-left',
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
        deskSpotId: 'spot-3',
        currentWaypointId: 'wp-desk-3',
        position: { x: 47, y: 49.6 },
        targetWaypoints: [{ x: 52, y: 30 }],
        facing: 'rear-right',
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
        deskSpotId: 'spot-4',
        currentWaypointId: 'wp-coffee-station',
        position: { x: 84, y: 58 },
        targetWaypoints: [],
        facing: 'front-left',
      },
    ]

    const onSelectChar = vi.fn()
    render(<OfficeStage characters={sampleChars} onSelectCharacter={onSelectChar} />)

    expect(screen.getByTestId('badge-aim-joshua')).toHaveTextContent('⌨️')
    expect(screen.getByTestId('badge-aim-grok')).toHaveTextContent('🔥')
    expect(screen.getByTestId('badge-aim-auditor')).toHaveTextContent('✋')
    expect(screen.getByTestId('badge-aim-opencode')).toHaveTextContent('📨')
    expect(screen.getByTestId('badge-aim-codex')).toHaveTextContent('☕')

    const joshuaActor = screen.getByTestId('character-aim-joshua')
    expect(Number(joshuaActor.getAttribute('data-zindex'))).toBe(272)

    fireEvent.click(joshuaActor)
    expect(onSelectChar).toHaveBeenCalledWith(sampleChars[0])
  })
})
