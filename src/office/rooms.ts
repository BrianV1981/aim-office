import {
  FurnitureAsset,
  IsometricRoom,
  PodSlotOrientation,
  SpriteFacing,
  WaypointNode,
  WorkstationSpot,
} from './types'

/**
 * 4 Symmetrical 4-Way Standing Desk Quad Pods (16 Workstations Total)
 * empirically calibrated against `public/rooms/office-day.png` (`1376 x 768`, 16:9)
 * inside the hardwood floor diamond:
 *   Top: (50, 41.5), Left: (23.5, 64.5), Right: (76.5, 64.5), Bottom: (50, 88.0)
 */
export const QUAD_POD_CENTERS: ReadonlyArray<{
  podIndex: number
  name: string
  cx: number
  cy: number
  aisleWaypointId: string
}> = [
  {
    podIndex: 1,
    name: 'Pod 1 (North Command Pod)',
    cx: 49.5,
    cy: 51.5,
    aisleWaypointId: 'wp-north-corridor',
  },
  {
    podIndex: 2,
    name: 'Pod 2 (West Sunlit Pod)',
    cx: 35.0,
    cy: 64.0,
    aisleWaypointId: 'wp-aisle-1',
  },
  {
    podIndex: 3,
    name: 'Pod 3 (East Telemetry Pod)',
    cx: 64.0,
    cy: 64.0,
    aisleWaypointId: 'wp-aisle-2',
  },
  {
    podIndex: 4,
    name: 'Pod 4 (South Fleet Pod)',
    cx: 49.5,
    cy: 76.5,
    aisleWaypointId: 'wp-south-corridor',
  },
]

const POD_DX = 2.85
const POD_DY = 2.55

interface PodSlotSpec {
  slot: PodSlotOrientation
  offsetX: number
  offsetY: number
  spritePath: string
  zOffset: number
  agentOffsetX: number
  agentOffsetY: number
  defaultFacing: SpriteFacing
  agentZDelta: number
}

const POD_SLOTS: ReadonlyArray<PodSlotSpec> = [
  {
    slot: 'NW',
    offsetX: -POD_DX,
    offsetY: -POD_DY,
    spritePath: '/sprites/furniture/standing-desk-left-rear.png',
    zOffset: 0,
    agentOffsetX: -1.1,
    agentOffsetY: -2.6,
    defaultFacing: 'front-right',
    agentZDelta: -5, // Stands BEHIND desk; desk occludes lower legs
  },
  {
    slot: 'NE',
    offsetX: POD_DX,
    offsetY: -POD_DY,
    spritePath: '/sprites/furniture/standing-desk-right-rear.png',
    zOffset: 1,
    agentOffsetX: 1.1,
    agentOffsetY: -2.6,
    defaultFacing: 'front-left',
    agentZDelta: -5, // Stands BEHIND desk; desk occludes lower legs
  },
  {
    slot: 'SW',
    offsetX: -POD_DX,
    offsetY: POD_DY,
    spritePath: '/sprites/furniture/standing-desk-right-front.png',
    zOffset: 0,
    agentOffsetX: -1.1,
    agentOffsetY: 0.8,
    defaultFacing: 'rear-right',
    agentZDelta: 5, // Stands IN FRONT of desk facing monitors
  },
  {
    slot: 'SE',
    offsetX: POD_DX,
    offsetY: POD_DY,
    spritePath: '/sprites/furniture/standing-desk-left-front.png',
    zOffset: 1,
    agentOffsetX: 1.1,
    agentOffsetY: 0.8,
    defaultFacing: 'rear-left',
    agentZDelta: 5, // Stands IN FRONT of desk facing monitors
  },
]

function buildQuadPodWorkstations(): {
  workstations: WorkstationSpot[]
  deskFurniture: FurnitureAsset[]
  deskWaypoints: WaypointNode[]
} {
  const workstations: WorkstationSpot[] = []
  const deskFurniture: FurnitureAsset[] = []
  const deskWaypoints: WaypointNode[] = []

  let deskCounter = 1
  for (const pod of QUAD_POD_CENTERS) {
    for (const spec of POD_SLOTS) {
      const deskNum = deskCounter++
      const isBossDesk = deskNum === 1
      const deskId = `desk-${deskNum}`
      const spotId = isBossDesk ? 'spot-boss' : `spot-${deskNum}`
      const wpId = isBossDesk ? 'wp-boss-desk' : `wp-desk-${deskNum}`

      const deskX = Number((pod.cx + spec.offsetX).toFixed(2))
      const deskY = Number((pod.cy + spec.offsetY).toFixed(2))
      const deskZIndex = Math.round(deskY * 10) + spec.zOffset

      const agentX = Number((deskX + spec.agentOffsetX).toFixed(2))
      const agentY = Number((deskY + spec.agentOffsetY).toFixed(2))
      const agentZIndex = deskZIndex + spec.agentZDelta

      workstations.push({
        id: spotId,
        label: isBossDesk
          ? 'Executive Command Desk (J.O.S.H.U.A. — Pod 1 NW)'
          : `${pod.name} · ${spec.slot} (#${deskNum})`,
        deskId,
        waypointId: wpId,
        x: agentX,
        y: agentY,
        defaultFacing: spec.defaultFacing,
        zIndexOverride: agentZIndex,
        podIndex: pod.podIndex,
        podSlot: spec.slot,
        isBossDesk,
      })

      deskFurniture.push({
        id: deskId,
        label: isBossDesk
          ? 'Executive Command Desk (aim-joshua)'
          : `Standing Workstation #${deskNum} (${pod.name} ${spec.slot})`,
        category: isBossDesk ? 'boss-desk' : 'agent-desk',
        spritePath: spec.spritePath,
        x: deskX,
        y: deskY,
        widthPx: 92,
        heightPx: 92,
        zIndexOverride: deskZIndex,
        podIndex: pod.podIndex,
        podSlot: spec.slot,
        interactive: true,
        state: isBossDesk ? 'active' : 'idle',
        assignedSpotId: spotId,
      })

      deskWaypoints.push({
        id: wpId,
        label: `Workstation Node ${deskId}`,
        x: agentX,
        y: agentY,
        connections: [pod.aisleWaypointId, 'wp-central-hub'],
      })

      // Also provide `wp-desk-1` alias node for `desk-1` so callers using `wp-desk-1` or `wp-boss-desk` both resolve
      if (isBossDesk) {
        deskWaypoints.push({
          id: 'wp-desk-1',
          label: 'Workstation Node desk-1',
          x: agentX,
          y: agentY,
          connections: ['wp-boss-desk', pod.aisleWaypointId, 'wp-central-hub'],
        })
      }
    }
  }

  return { workstations, deskFurniture, deskWaypoints }
}

const { workstations, deskFurniture, deskWaypoints } = buildQuadPodWorkstations()

const CORE_WAYPOINTS: WaypointNode[] = [
  {
    id: 'wp-entry-door',
    label: 'J.O.S.H.U.A. Executive Portal Approach',
    x: 57.0,
    y: 42.5,
    connections: ['wp-north-corridor', 'wp-whiteboard', 'wp-aisle-2'],
  },
  {
    id: 'wp-north-corridor',
    label: 'North Command Corridor',
    x: 49.5,
    y: 43.5,
    connections: [
      'wp-entry-door',
      'wp-aisle-1',
      'wp-aisle-2',
      'wp-central-hub',
      'wp-boss-desk',
      'wp-desk-1',
      'wp-desk-2',
      'wp-desk-3',
      'wp-desk-4',
    ],
  },
  {
    id: 'wp-whiteboard',
    label: 'Wall Kanban TaskBoard Approach',
    x: 66.0,
    y: 48.0,
    connections: ['wp-entry-door', 'wp-aisle-2', 'wp-east-wing', 'wp-coffee-station'],
  },
  {
    id: 'wp-aisle-1',
    label: 'North-West Quad Aisle',
    x: 42.0,
    y: 57.8,
    connections: [
      'wp-north-corridor',
      'wp-central-hub',
      'wp-aisle-3',
      'wp-boss-desk',
      'wp-desk-1',
      'wp-desk-5',
      'wp-desk-6',
      'wp-desk-7',
      'wp-desk-8',
    ],
  },
  {
    id: 'wp-aisle-2',
    label: 'North-East Quad Aisle',
    x: 57.0,
    y: 57.8,
    connections: [
      'wp-north-corridor',
      'wp-entry-door',
      'wp-whiteboard',
      'wp-central-hub',
      'wp-east-wing',
      'wp-aisle-4',
      'wp-desk-9',
      'wp-desk-10',
      'wp-desk-11',
      'wp-desk-12',
    ],
  },
  {
    id: 'wp-central-hub',
    label: 'Central Diamond Nexus',
    x: 49.5,
    y: 64.0,
    connections: [
      'wp-north-corridor',
      'wp-aisle-1',
      'wp-aisle-2',
      'wp-aisle-3',
      'wp-aisle-4',
      'wp-south-corridor',
      'wp-boss-desk',
    ],
  },
  {
    id: 'wp-east-wing',
    label: 'East Wall Telemetry Promenade',
    x: 70.5,
    y: 55.5,
    connections: ['wp-whiteboard', 'wp-aisle-2', 'wp-coffee-station', 'wp-memory-vault'],
  },
  {
    id: 'wp-coffee-station',
    label: 'Breakroom Coffee & Water Station Approach',
    x: 73.5,
    y: 58.0,
    connections: ['wp-whiteboard', 'wp-east-wing', 'wp-memory-vault', 'wp-aisle-2'],
  },
  {
    id: 'wp-memory-vault',
    label: 'A.I.M. MEMORY Server Rack Approach',
    x: 77.5,
    y: 63.5,
    connections: ['wp-coffee-station', 'wp-east-wing', 'wp-aisle-4'],
  },
  {
    id: 'wp-aisle-3',
    label: 'South-West Quad Aisle',
    x: 42.0,
    y: 70.2,
    connections: ['wp-aisle-1', 'wp-central-hub', 'wp-south-corridor'],
  },
  {
    id: 'wp-aisle-4',
    label: 'South-East Quad Aisle',
    x: 57.0,
    y: 70.2,
    connections: ['wp-aisle-2', 'wp-central-hub', 'wp-memory-vault', 'wp-south-corridor'],
  },
  {
    id: 'wp-south-corridor',
    label: 'South Fleet Promenade',
    x: 49.5,
    y: 84.0,
    connections: [
      'wp-aisle-3',
      'wp-aisle-4',
      'wp-central-hub',
      'wp-desk-13',
      'wp-desk-14',
      'wp-desk-15',
      'wp-desk-16',
    ],
  },
]

/**
 * Wall Hotspots — baked directly into `office-day.png` and `office-night.png`.
 * Rendered as invisible interactive hitboxes (`isHotspot: true`) with subtle hover glow & tooltips.
 */
const WALL_HOTSPOT_FURNITURE: FurnitureAsset[] = [
  {
    id: 'entry-door',
    label: 'J.O.S.H.U.A. Executive Portal & Swarm Door',
    category: 'entry-door',
    spritePath: '',
    x: 57.0,
    y: 31.0,
    widthPct: 6.5,
    heightPct: 18.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'idle',
  },
  {
    id: 'whiteboard',
    label: 'GitHub Projects Kanban Whiteboard (#14)',
    category: 'whiteboard',
    spritePath: '',
    x: 68.7,
    y: 31.0,
    widthPct: 11.8,
    heightPct: 17.5,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'coffee-station',
    label: 'Breakroom Coffee & Water Cooler Station',
    category: 'coffee-station',
    spritePath: '',
    x: 76.2,
    y: 51.5,
    widthPct: 5.0,
    heightPct: 15.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'brewing',
  },
  {
    id: 'memory-vault',
    label: 'A.I.M. MEMORY Server Rack & LanceDB Vault',
    category: 'memory-vault',
    spritePath: '',
    x: 81.8,
    y: 54.5,
    widthPct: 6.5,
    heightPct: 22.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
]

export const COMMAND_OFFICE_ROOM: IsometricRoom = {
  id: 'aim-command-office',
  name: 'A.I.M. / LeadDeeds Sovereign Command Center',
  subtitle: 'J.O.S.H.U.A. Multi-Vessel Isometric Fleet Floor',
  logicalWidth: 1376,
  logicalHeight: 768,
  backgrounds: {
    day: '/rooms/office-day.png',
    night: '/rooms/office-night.png',
  },
  furniture: [...deskFurniture, ...WALL_HOTSPOT_FURNITURE],
  workstations,
  waypoints: [...CORE_WAYPOINTS, ...deskWaypoints],
}
