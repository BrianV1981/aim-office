import {
  FurnitureAsset,
  IsometricRoom,
  OfficeThemePack,
  PodSlotOrientation,
  SpriteFacing,
  ThemePackId,
  WallBoardRectConfig,
  WaypointNode,
  WorkstationSpot,
} from './types'

export interface PodCenterSpec {
  podIndex: number
  name: string
  cx: number
  cy: number
  aisleWaypointId: string
  benchAxis?: 'slash' | 'backslash'
}

/**
 * Calibrated 3x2 + 2 True Isometric Lattice on the 1376x768 floor diamond.
 * Every pod is separated by >= 10.5% in X and >= 9.0% in Y along the 2:1 isometric axes
 * so 4-desk Parallel Quad Benches have wide walking corridors and zero overlap.
 */
export const QUAD_POD_CENTERS: ReadonlyArray<PodCenterSpec> = [
  {
    podIndex: 1,
    name: 'Pod 1 (North Command Bridge)',
    cx: 50.0,
    cy: 49.5,
    aisleWaypointId: 'wp-north-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 2,
    name: 'Pod 2 (West Sunlit Bay)',
    cx: 39.0,
    cy: 59.0,
    aisleWaypointId: 'wp-aisle-1',
    benchAxis: 'slash',
  },
  {
    podIndex: 3,
    name: 'Pod 3 (East Telemetry Bay)',
    cx: 61.0,
    cy: 59.0,
    aisleWaypointId: 'wp-aisle-2',
    benchAxis: 'slash',
  },
  {
    podIndex: 4,
    name: 'Pod 4 (Central Operations Bay)',
    cx: 50.0,
    cy: 68.5,
    aisleWaypointId: 'wp-central-hub',
    benchAxis: 'slash',
  },
  {
    podIndex: 5,
    name: 'Pod 5 (South-West Wing Bay)',
    cx: 28.5,
    cy: 68.5,
    aisleWaypointId: 'wp-aisle-3',
    benchAxis: 'slash',
  },
  {
    podIndex: 6,
    name: 'Pod 6 (South Promenade Bay)',
    cx: 39.0,
    cy: 78.0,
    aisleWaypointId: 'wp-south-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 7,
    name: 'Pod 7 (South-East Server Bay)',
    cx: 61.0,
    cy: 72.5,
    aisleWaypointId: 'wp-aisle-4',
    benchAxis: 'slash',
  },
  {
    podIndex: 8,
    name: 'Pod 8 (Deep South Reserve Bay)',
    cx: 50.0,
    cy: 81.5,
    aisleWaypointId: 'wp-south-corridor',
    benchAxis: 'slash',
  },
]

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

/**
 * Parallel 2x2 Isometric Quad Bench ("/" SW-to-NE axis):
 * - Rear row (`NW` and `NE`): 2 side-by-side `standing-desk-left-rear.png` desks.
 *   Agents stand BEHIND the desks (`NW` side, `agentZDelta = -5`) facing `front-right` (SE),
 *   so the desk surface cleanly occludes their lower legs.
 * - Front row (`SW` and `SE`): 2 side-by-side `standing-desk-left-front.png` desks back-to-back
 *   against the rear monitors. Agents stand IN FRONT of the keyboards (`SE` side, `agentZDelta = +5`)
 *   facing `rear-left` (NW).
 */
const SLASH_BENCH_SLOTS: ReadonlyArray<PodSlotSpec> = [
  {
    slot: 'NW',
    offsetX: -2.25,
    offsetY: -0.15,
    spritePath: '/sprites/furniture/standing-desk-left-rear.png',
    zOffset: 1,
    agentOffsetX: -0.9,
    agentOffsetY: -2.1,
    defaultFacing: 'front-right',
    agentZDelta: -5,
  },
  {
    slot: 'NE',
    offsetX: 0.25,
    offsetY: -2.35,
    spritePath: '/sprites/furniture/standing-desk-left-rear.png',
    zOffset: 0,
    agentOffsetX: -0.9,
    agentOffsetY: -2.1,
    defaultFacing: 'front-right',
    agentZDelta: -5,
  },
  {
    slot: 'SW',
    offsetX: -0.25,
    offsetY: 2.35,
    spritePath: '/sprites/furniture/standing-desk-left-front.png',
    zOffset: 3,
    agentOffsetX: 0.9,
    agentOffsetY: 0.7,
    defaultFacing: 'rear-left',
    agentZDelta: 5,
  },
  {
    slot: 'SE',
    offsetX: 2.25,
    offsetY: 0.15,
    spritePath: '/sprites/furniture/standing-desk-left-front.png',
    zOffset: 2,
    agentOffsetX: 0.9,
    agentOffsetY: 0.7,
    defaultFacing: 'rear-left',
    agentZDelta: 5,
  },
]

const BACKSLASH_BENCH_SLOTS: ReadonlyArray<PodSlotSpec> = [
  {
    slot: 'NW',
    offsetX: -0.25,
    offsetY: -2.35,
    spritePath: '/sprites/furniture/standing-desk-right-rear.png',
    zOffset: 0,
    agentOffsetX: 0.9,
    agentOffsetY: -2.1,
    defaultFacing: 'front-left',
    agentZDelta: -5,
  },
  {
    slot: 'NE',
    offsetX: 2.25,
    offsetY: -0.15,
    spritePath: '/sprites/furniture/standing-desk-right-rear.png',
    zOffset: 1,
    agentOffsetX: 0.9,
    agentOffsetY: -2.1,
    defaultFacing: 'front-left',
    agentZDelta: -5,
  },
  {
    slot: 'SW',
    offsetX: -2.25,
    offsetY: 0.15,
    spritePath: '/sprites/furniture/standing-desk-right-front.png',
    zOffset: 2,
    agentOffsetX: -0.9,
    agentOffsetY: 0.7,
    defaultFacing: 'rear-right',
    agentZDelta: 5,
  },
  {
    slot: 'SE',
    offsetX: 0.25,
    offsetY: 2.35,
    spritePath: '/sprites/furniture/standing-desk-right-front.png',
    zOffset: 3,
    agentOffsetX: -0.9,
    agentOffsetY: 0.7,
    defaultFacing: 'rear-right',
    agentZDelta: 5,
  },
]

export function buildQuadPodWorkstations(
  maxPods = 8,
  podCenters: ReadonlyArray<PodCenterSpec> = QUAD_POD_CENTERS
): {
  workstations: WorkstationSpot[]
  deskFurniture: FurnitureAsset[]
  deskWaypoints: WaypointNode[]
} {
  const workstations: WorkstationSpot[] = []
  const deskFurniture: FurnitureAsset[] = []
  const deskWaypoints: WaypointNode[] = []

  const clampedPods = Math.max(1, Math.min(podCenters.length, maxPods))
  let deskCounter = 1
  for (const pod of podCenters.slice(0, clampedPods)) {
    const slots = pod.benchAxis === 'backslash' ? BACKSLASH_BENCH_SLOTS : SLASH_BENCH_SLOTS
    for (const spec of slots) {
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
        widthPx: 68,
        heightPx: 68,
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
    x: 50.0,
    y: 44.0,
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
    x: 43.5,
    y: 54.5,
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
    x: 56.5,
    y: 54.5,
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
    x: 50.0,
    y: 63.5,
    connections: [
      'wp-north-corridor',
      'wp-aisle-1',
      'wp-aisle-2',
      'wp-aisle-3',
      'wp-aisle-4',
      'wp-south-corridor',
      'wp-boss-desk',
      'wp-desk-13',
      'wp-desk-14',
      'wp-desk-15',
      'wp-desk-16',
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
    x: 34.0,
    y: 64.5,
    connections: [
      'wp-aisle-1',
      'wp-central-hub',
      'wp-south-corridor',
      'wp-desk-17',
      'wp-desk-18',
      'wp-desk-19',
      'wp-desk-20',
    ],
  },
  {
    id: 'wp-aisle-4',
    label: 'South-East Quad Aisle',
    x: 56.5,
    y: 68.5,
    connections: [
      'wp-aisle-2',
      'wp-central-hub',
      'wp-memory-vault',
      'wp-south-corridor',
      'wp-desk-25',
      'wp-desk-26',
      'wp-desk-27',
      'wp-desk-28',
    ],
  },
  {
    id: 'wp-south-corridor',
    label: 'South Fleet Promenade',
    x: 45.0,
    y: 76.0,
    connections: [
      'wp-aisle-3',
      'wp-aisle-4',
      'wp-central-hub',
      'wp-desk-21',
      'wp-desk-22',
      'wp-desk-23',
      'wp-desk-24',
      'wp-desk-29',
      'wp-desk-30',
      'wp-desk-31',
      'wp-desk-32',
    ],
  },
]

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

/**
 * Compute how many 4-Way Quad Pods (4..8 pods = 16..32 workstations) are needed
 * for a given active agent count so the floor scales elastically without overcrowding.
 */
export function computeElasticPodCount(agentCount: number): number {
  if (agentCount <= 16) return 4
  return Math.min(8, Math.ceil(agentCount / 4))
}

/**
 * Filter a room's furniture and workstations to only the active elastic pods (4..8).
 */
export function filterRoomForAgentCount(
  room: IsometricRoom,
  agentCount: number
): IsometricRoom {
  const activePods = computeElasticPodCount(agentCount)
  return {
    ...room,
    furniture: room.furniture.filter(
      (f) => f.isHotspot || !f.podIndex || f.podIndex <= activePods
    ),
    workstations: room.workstations.filter(
      (w) => !w.podIndex || w.podIndex <= activePods
    ),
  }
}

function createRoomFromPodCenters(config: {
  id: string
  name: string
  subtitle: string
  dayBg: string
  nightBg: string
  podCenters: ReadonlyArray<PodCenterSpec>
  hotspots?: FurnitureAsset[]
}): IsometricRoom {
  const { workstations, deskFurniture, deskWaypoints } = buildQuadPodWorkstations(
    8,
    config.podCenters
  )
  return {
    id: config.id,
    name: config.name,
    subtitle: config.subtitle,
    logicalWidth: 1376,
    logicalHeight: 768,
    backgrounds: {
      day: config.dayBg,
      night: config.nightBg,
    },
    furniture: [...deskFurniture, ...(config.hotspots ?? WALL_HOTSPOT_FURNITURE)],
    workstations,
    waypoints: [...CORE_WAYPOINTS, ...deskWaypoints],
  }
}

export const COMMAND_OFFICE_ROOM: IsometricRoom = createRoomFromPodCenters({
  id: 'aim-command-office',
  name: 'A.I.M. / LeadDeeds Sovereign Command Center',
  subtitle: 'J.O.S.H.U.A. Multi-Vessel Isometric Fleet Floor',
  dayBg: '/rooms/office-day.png',
  nightBg: '/rooms/office-night.png',
  podCenters: QUAD_POD_CENTERS,
})

/**
 * Direction B — Sovereign Ops / War Room ("J.O.S.H.U.A. Command Center")
 * Subterranean steel command bunker with J.O.S.H.U.A. AI Neural Core Reactor, Left Bulkhead
 * WOPR Telemetry Wall, Right Bulkhead A.I.M. Memory Vault + Swarm Portal, and Central Holographic Globe Table.
 */
export const WAR_ROOM_POD_CENTERS: ReadonlyArray<PodCenterSpec> = [
  {
    podIndex: 1,
    name: 'Conduit Sector Alpha (NW Telemetry Upper Bay)',
    cx: 39.5,
    cy: 49.5,
    aisleWaypointId: 'wp-north-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 2,
    name: 'Conduit Sector Beta (NE Memory Vault Upper Bay)',
    cx: 60.5,
    cy: 49.5,
    aisleWaypointId: 'wp-north-corridor',
    benchAxis: 'backslash',
  },
  {
    podIndex: 3,
    name: 'Conduit Sector Gamma (West Context Shield Bay)',
    cx: 23.5,
    cy: 59.5,
    aisleWaypointId: 'wp-aisle-1',
    benchAxis: 'slash',
  },
  {
    podIndex: 4,
    name: 'Conduit Sector Delta (East Swarm Portal Bay)',
    cx: 76.5,
    cy: 59.5,
    aisleWaypointId: 'wp-aisle-2',
    benchAxis: 'backslash',
  },
  {
    podIndex: 5,
    name: 'Holographic Flank West (Central Telemetry Sector)',
    cx: 33.5,
    cy: 69.5,
    aisleWaypointId: 'wp-aisle-3',
    benchAxis: 'slash',
  },
  {
    podIndex: 6,
    name: 'Holographic Flank East (Central Vault Sector)',
    cx: 66.5,
    cy: 69.5,
    aisleWaypointId: 'wp-aisle-4',
    benchAxis: 'backslash',
  },
  {
    podIndex: 7,
    name: 'Overwatch Sector Epsilon (South-West Bunker Bay)',
    cx: 41.5,
    cy: 84.5,
    aisleWaypointId: 'wp-south-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 8,
    name: 'Overwatch Sector Zeta (South-East Bunker Bay)',
    cx: 58.5,
    cy: 84.5,
    aisleWaypointId: 'wp-south-corridor',
    benchAxis: 'backslash',
  },
]

export const WAR_ROOM_HOTSPOT_FURNITURE: FurnitureAsset[] = [
  {
    id: 'whiteboard',
    label: 'Central Holographic Situation Table (Mission Control Kanban)',
    category: 'whiteboard',
    spritePath: '',
    x: 50.0,
    y: 63.5,
    widthPct: 13.0,
    heightPct: 22.0,
    isHotspot: true,
    zIndexOverride: 620,
    interactive: true,
    state: 'active',
  },
  {
    id: 'telemetry-wall',
    label: 'WOPR Mission Control Telemetry Screens',
    category: 'whiteboard',
    spritePath: '',
    x: 20.5,
    y: 33.5,
    widthPct: 29.0,
    heightPct: 36.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'entry-door',
    label: 'J.O.S.H.U.A. AI Neural Core Reactor & Swarm Portal',
    category: 'entry-door',
    spritePath: '',
    x: 50.0,
    y: 22.0,
    widthPct: 15.0,
    heightPct: 36.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'memory-vault',
    label: 'A.I.M. MEMORY VAULT Server Racks & Swarm Blast Door',
    category: 'memory-vault',
    spritePath: '',
    x: 78.5,
    y: 38.0,
    widthPct: 22.0,
    heightPct: 28.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'coffee-station',
    label: 'Subterranean Tactical Ration & Coolant Dispenser',
    category: 'coffee-station',
    spritePath: '',
    x: 92.0,
    y: 55.0,
    widthPct: 10.0,
    heightPct: 22.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'brewing',
  },
]

export const SOVEREIGN_WAR_ROOM: IsometricRoom = createRoomFromPodCenters({
  id: 'sovereign-war-room',
  name: 'J.O.S.H.U.A. Sovereign Ops War Room',
  subtitle: 'Direction B · Subterranean Command Bunker, Holographic Situation Table & WOPR Wall',
  dayBg: '/rooms/war-room-day.png',
  nightBg: '/rooms/war-room-night.png',
  podCenters: WAR_ROOM_POD_CENTERS,
  hotspots: WAR_ROOM_HOTSPOT_FURNITURE,
})

/**
 * Direction A — Multi-Zone "Agency Floorplan" (Sims / Project Zomboid 3-Alcove Cutaway Building)
 * Unobstructed multi-wing cutaway floorplan with Raised West Server Platform, Center J.O.S.H.U.A. HQ Alcove,
 * Right Strategy Wing (flat front-facing Whiteboard + Espresso Bar), and 4 woven area rugs.
 */
export const CUTAWAY_AGENCY_POD_CENTERS: ReadonlyArray<PodCenterSpec> = [
  {
    podIndex: 1,
    name: 'J.O.S.H.U.A. HQ Command Foyer (Top Center Alcove)',
    cx: 51.0,
    cy: 51.5,
    aisleWaypointId: 'wp-north-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 2,
    name: 'Project Bay A — West Sunlit Rug (LeadDeeds & Content)',
    cx: 26.5,
    cy: 55.0,
    aisleWaypointId: 'wp-aisle-1',
    benchAxis: 'slash',
  },
  {
    podIndex: 3,
    name: 'Project Bay B — East Strategy Rug (TBSoftwash & AI Book)',
    cx: 75.5,
    cy: 59.5,
    aisleWaypointId: 'wp-aisle-2',
    benchAxis: 'slash',
  },
  {
    podIndex: 4,
    name: 'Project Bay C — South-East Lounge Rug (Skorbane & Media)',
    cx: 70.0,
    cy: 83.5,
    aisleWaypointId: 'wp-aisle-4',
    benchAxis: 'slash',
  },
  {
    podIndex: 5,
    name: 'Project Bay D — South-West Woven Rug (GBP & Calendar Ops)',
    cx: 28.5,
    cy: 72.0,
    aisleWaypointId: 'wp-aisle-3',
    benchAxis: 'backslash',
  },
  {
    podIndex: 6,
    name: 'Infrastructure Bay E — Central Hardwood Nexus (Daemons & Connect)',
    cx: 50.5,
    cy: 68.0,
    aisleWaypointId: 'wp-central-hub',
    benchAxis: 'slash',
  },
  {
    podIndex: 7,
    name: 'South Promenade Bay — Fleet Expansion',
    cx: 47.5,
    cy: 84.5,
    aisleWaypointId: 'wp-south-corridor',
    benchAxis: 'slash',
  },
  {
    podIndex: 8,
    name: 'North-East Strategy Foyer (Under Whiteboard)',
    cx: 75.5,
    cy: 46.5,
    aisleWaypointId: 'wp-whiteboard',
    benchAxis: 'slash',
  },
]

export const CUTAWAY_AGENCY_HOTSPOT_FURNITURE: FurnitureAsset[] = [
  {
    id: 'entry-door',
    label: 'J.O.S.H.U.A. HQ Recessed Doors & LED News Ticker',
    category: 'entry-door',
    spritePath: '',
    x: 51.8,
    y: 24.0,
    widthPct: 13.0,
    heightPct: 24.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'idle',
  },
  {
    id: 'whiteboard',
    label: 'Strategy Wing Flat Kanban Whiteboard (#14)',
    category: 'whiteboard',
    spritePath: '',
    x: 78.0,
    y: 20.8,
    widthPct: 13.0,
    heightPct: 13.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'memory-vault',
    label: 'Raised West Platform A.I.M. MEMORY Server Vault',
    category: 'memory-vault',
    spritePath: '',
    x: 29.0,
    y: 19.5,
    widthPct: 15.0,
    heightPct: 18.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'active',
  },
  {
    id: 'coffee-station',
    label: 'East Wing Espresso & Cold Brew Bar',
    category: 'coffee-station',
    spritePath: '',
    x: 91.0,
    y: 36.0,
    widthPct: 9.0,
    heightPct: 18.0,
    isHotspot: true,
    zIndexOverride: 12,
    interactive: true,
    state: 'brewing',
  },
]

export const CUTAWAY_AGENCY_ROOM: IsometricRoom = createRoomFromPodCenters({
  id: 'cutaway-agency',
  name: 'A.I.M. Multi-Zone Cutaway Agency Floorplan',
  subtitle: 'Direction A · 3-Alcove Floorplan, Raised Memory Vault & Strategy Wing',
  dayBg: '/rooms/agency-floorplan-day.png',
  nightBg: '/rooms/agency-floorplan-night.png',
  podCenters: CUTAWAY_AGENCY_POD_CENTERS,
  hotspots: CUTAWAY_AGENCY_HOTSPOT_FURNITURE,
})

export const DEFAULT_WALL_BOARD_RECT: WallBoardRectConfig = {
  left: 63.0,
  top: 22.2,
  width: 11.4,
  height: 15.8,
  skewDeg: 25.6,
  zIndex: 15,
  variant: 'whiteboard',
}

/**
 * Direction C — Standardized Theme Pack Registry
 */
export const OFFICE_THEME_PACKS: ReadonlyArray<OfficeThemePack> = [
  {
    id: 'sovereign-war-room',
    name: 'Direction B · Sovereign Ops War Room',
    shortLabel: '⚡ War Room (Mission Control)',
    badge: 'DIRECTION B',
    description:
      'Subterranean steel bunker with AI Neural Core Reactor, WOPR Telemetry Wall, Central Holographic Globe Table, and NO wall whiteboard.',
    room: SOVEREIGN_WAR_ROOM,
    wallBoardRect: null,
  },
  {
    id: 'cutaway-agency',
    name: 'Direction A · Multi-Zone Cutaway Agency',
    shortLabel: '🏢 Cutaway Agency (Multi-Bay)',
    badge: 'DIRECTION A',
    description:
      'Unobstructed 3-alcove cutaway floorplan with Raised A.I.M. Memory Platform, J.O.S.H.U.A. HQ Foyer, flat Strategy Wing Whiteboard, and 4 area rugs.',
    room: CUTAWAY_AGENCY_ROOM,
    wallBoardRect: {
      left: 71.8,
      top: 14.8,
      width: 12.5,
      height: 12.0,
      skewDeg: 0,
      zIndex: 15,
      variant: 'glass-board',
    },
  },
  {
    id: 'classic-command',
    name: 'Classic A.I.M. Executive Studio',
    shortLabel: '🪵 Classic Studio (Hardwood)',
    badge: 'CLASSIC',
    description:
      'Original sunlit hardwood diamond floor with calibrated 2x2 parallel standing desk benches and dry-erase Kanban wall board.',
    room: COMMAND_OFFICE_ROOM,
    wallBoardRect: DEFAULT_WALL_BOARD_RECT,
  },
  {
    id: 'retro-90s-bullpen',
    name: '1992 Smoke-Filled Retro Bullpen',
    shortLabel: '🚬 Retro 90s Bullpen (Smoke Haze)',
    badge: 'RETRO 90S',
    description:
      'Vintage 1990s agency bullpen with warm CRT amber grading, drifting cigar/cigarette smoke haze, standing ashtrays, and arcade breaks.',
    room: {
      ...COMMAND_OFFICE_ROOM,
      id: 'retro-90s-bullpen',
      name: '1992 Smoke-Filled Retro Agency Bullpen',
      subtitle: 'CRT Amber Monitors · Cigar & Coffee Breakroom · 16-Bit Arcade',
    },
    wallBoardRect: DEFAULT_WALL_BOARD_RECT,
  },
]

export function getOfficeThemePack(themeId?: ThemePackId | string | null): OfficeThemePack {
  return (
    OFFICE_THEME_PACKS.find((t) => t.id === themeId) ?? OFFICE_THEME_PACKS[0]
  )
}
