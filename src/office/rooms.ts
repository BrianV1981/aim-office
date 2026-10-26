import { IsometricRoom, WorkstationSpot, FurnitureAsset, WaypointNode } from './types'

/**
 * 16 Agent Workstations arranged in 4 isometric rows of 4 cubicles each,
 * plus the Executive Command Desk (`boss-desk`) at the upper command tier.
 */
const WORKSTATION_ROWS: Array<{
  rowIndex: number
  baseX: number
  baseY: number
  stepX: number
  stepY: number
}> = [
  { rowIndex: 0, baseX: 24, baseY: 42, stepX: 11.5, stepY: 4.5 }, // Desks 1..4
  { rowIndex: 1, baseX: 20, baseY: 54, stepX: 11.5, stepY: 4.5 }, // Desks 5..8
  { rowIndex: 2, baseX: 36, baseY: 62, stepX: 11.5, stepY: 4.5 }, // Desks 9..12
  { rowIndex: 3, baseX: 32, baseY: 74, stepX: 11.5, stepY: 4.5 }, // Desks 13..16
]

function buildAgentWorkstations(): {
  workstations: WorkstationSpot[]
  deskFurniture: FurnitureAsset[]
  deskWaypoints: WaypointNode[]
} {
  const workstations: WorkstationSpot[] = [
    {
      id: 'spot-boss',
      label: 'Executive Command Desk (J.O.S.H.U.A.)',
      deskId: 'boss-desk',
      waypointId: 'wp-boss-desk',
      x: 52,
      y: 27,
      defaultFacing: 'front-left',
      isBossDesk: true,
    },
  ]

  const deskFurniture: FurnitureAsset[] = [
    {
      id: 'boss-desk',
      label: 'Executive Command Desk (aim-joshua)',
      category: 'boss-desk',
      spritePath: '/sprites/furniture/boss-desk.png',
      x: 52,
      y: 29,
      widthPx: 116,
      heightPx: 84,
      interactive: true,
      state: 'active',
      assignedSpotId: 'spot-boss',
    },
  ]

  const deskWaypoints: WaypointNode[] = []

  let deskCounter = 1
  for (const row of WORKSTATION_ROWS) {
    const aisleId = `wp-aisle-${row.rowIndex + 1}`
    for (let col = 0; col < 4; col++) {
      const deskNum = deskCounter++
      const deskId = `desk-${deskNum}`
      const spotId = `spot-${deskNum}`
      const wpId = `wp-desk-${deskNum}`
      const x = Number((row.baseX + col * row.stepX).toFixed(1))
      const y = Number((row.baseY + col * row.stepY).toFixed(1))
      const spriteVariant =
        col % 2 === 0
          ? '/sprites/furniture/desk-left-front.png'
          : '/sprites/furniture/desk-right-front.png'

      workstations.push({
        id: spotId,
        label: `Workstation #${deskNum}`,
        deskId,
        waypointId: wpId,
        x,
        y: Number((y - 1.4).toFixed(1)),
        defaultFacing: col % 2 === 0 ? 'front-right' : 'front-left',
      })

      deskFurniture.push({
        id: deskId,
        label: `Agent Workstation #${deskNum}`,
        category: 'agent-desk',
        spritePath: spriteVariant,
        x,
        y,
        widthPx: 78,
        heightPx: 62,
        interactive: true,
        state: 'idle',
        assignedSpotId: spotId,
      })

      const neighbors = [aisleId]
      if (col > 0) {
        neighbors.push(`wp-desk-${deskNum - 1}`)
      }
      if (col < 3) {
        neighbors.push(`wp-desk-${deskNum + 1}`)
      }

      deskWaypoints.push({
        id: wpId,
        label: `Corridor Node ${deskId}`,
        x,
        y: Number((y + 1.8).toFixed(1)),
        connections: neighbors,
      })
    }
  }

  return { workstations, deskFurniture, deskWaypoints }
}

const { workstations, deskFurniture, deskWaypoints } = buildAgentWorkstations()

const CORE_WAYPOINTS: WaypointNode[] = [
  {
    id: 'wp-entry-door',
    label: 'Entrance Doorway',
    x: 14,
    y: 82,
    connections: ['wp-south-corridor', 'wp-aisle-4'],
  },
  {
    id: 'wp-south-corridor',
    label: 'South Main Corridor',
    x: 24,
    y: 76,
    connections: ['wp-entry-door', 'wp-aisle-4', 'wp-aisle-3'],
  },
  {
    id: 'wp-aisle-4',
    label: 'Isometric Row 4 Aisle',
    x: 30,
    y: 72,
    connections: [
      'wp-entry-door',
      'wp-south-corridor',
      'wp-aisle-3',
      'wp-desk-13',
      'wp-desk-14',
      'wp-desk-15',
      'wp-desk-16',
    ],
  },
  {
    id: 'wp-aisle-3',
    label: 'Isometric Row 3 Aisle',
    x: 34,
    y: 60,
    connections: [
      'wp-south-corridor',
      'wp-aisle-4',
      'wp-aisle-2',
      'wp-central-hub',
      'wp-desk-9',
      'wp-desk-10',
      'wp-desk-11',
      'wp-desk-12',
    ],
  },
  {
    id: 'wp-aisle-2',
    label: 'Isometric Row 2 Aisle',
    x: 22,
    y: 52,
    connections: [
      'wp-aisle-3',
      'wp-aisle-1',
      'wp-central-hub',
      'wp-desk-5',
      'wp-desk-6',
      'wp-desk-7',
      'wp-desk-8',
    ],
  },
  {
    id: 'wp-aisle-1',
    label: 'Isometric Row 1 Aisle',
    x: 26,
    y: 40,
    connections: [
      'wp-aisle-2',
      'wp-north-corridor',
      'wp-central-hub',
      'wp-desk-1',
      'wp-desk-2',
      'wp-desk-3',
      'wp-desk-4',
    ],
  },
  {
    id: 'wp-central-hub',
    label: 'Central Command Plaza',
    x: 54,
    y: 48,
    connections: [
      'wp-aisle-1',
      'wp-aisle-2',
      'wp-aisle-3',
      'wp-north-corridor',
      'wp-east-wing',
      'wp-boss-desk',
    ],
  },
  {
    id: 'wp-north-corridor',
    label: 'North Command Promenade',
    x: 44,
    y: 32,
    connections: ['wp-aisle-1', 'wp-central-hub', 'wp-boss-desk', 'wp-whiteboard'],
  },
  {
    id: 'wp-boss-desk',
    label: 'Executive Command Desk Approach',
    x: 52,
    y: 30,
    connections: ['wp-north-corridor', 'wp-central-hub', 'wp-whiteboard'],
  },
  {
    id: 'wp-whiteboard',
    label: 'Kanban Project Whiteboard Approach',
    x: 68,
    y: 28,
    connections: ['wp-boss-desk', 'wp-north-corridor', 'wp-east-wing', 'wp-memory-vault'],
  },
  {
    id: 'wp-east-wing',
    label: 'East Telemetry Corridor',
    x: 74,
    y: 46,
    connections: ['wp-central-hub', 'wp-whiteboard', 'wp-memory-vault', 'wp-coffee-station'],
  },
  {
    id: 'wp-memory-vault',
    label: 'Memory Wiki Server Vault',
    x: 82,
    y: 36,
    connections: ['wp-whiteboard', 'wp-east-wing', 'wp-coffee-station'],
  },
  {
    id: 'wp-coffee-station',
    label: 'Breakroom Espresso & Recharge Bar',
    x: 84,
    y: 58,
    connections: ['wp-east-wing', 'wp-memory-vault', 'wp-aisle-3'],
  },
]

const SPECIAL_FURNITURE: FurnitureAsset[] = [
  {
    id: 'whiteboard',
    label: 'GitHub Projects Kanban Whiteboard (#14)',
    category: 'whiteboard',
    spritePath: '/sprites/furniture/whiteboard.png',
    x: 70,
    y: 24,
    widthPx: 112,
    heightPx: 74,
    interactive: true,
    state: 'active',
  },
  {
    id: 'memory-vault',
    label: 'Memory Wiki & LanceDB Server Vault',
    category: 'memory-vault',
    spritePath: '/sprites/furniture/memory-vault.png',
    x: 85,
    y: 34,
    widthPx: 92,
    heightPx: 98,
    interactive: true,
    state: 'active',
  },
  {
    id: 'coffee-station',
    label: 'Breakroom Coffee Station',
    category: 'coffee-station',
    spritePath: '/sprites/furniture/coffee-idle.png',
    x: 87,
    y: 57,
    widthPx: 76,
    heightPx: 68,
    interactive: true,
    state: 'brewing',
  },
  {
    id: 'entry-door',
    label: 'Swarm Entrance & Reincarnation Portal',
    category: 'entry-door',
    spritePath: '/sprites/furniture/entry-door.png',
    x: 12,
    y: 83,
    widthPx: 68,
    heightPx: 88,
    interactive: true,
    state: 'idle',
  },
]

export const COMMAND_OFFICE_ROOM: IsometricRoom = {
  id: 'aim-command-office',
  name: 'A.I.M. / LeadDeeds Sovereign Command Center',
  subtitle: 'J.O.S.H.U.A. Multi-Vessel Isometric Fleet Floor',
  logicalWidth: 1200,
  logicalHeight: 800,
  backgrounds: {
    day: '/rooms/office-day.png',
    night: '/rooms/office-night.png',
  },
  furniture: [...deskFurniture, ...SPECIAL_FURNITURE],
  workstations,
  waypoints: [...CORE_WAYPOINTS, ...deskWaypoints],
}
