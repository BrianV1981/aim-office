export type SpriteFacing = 'front-left' | 'front-right' | 'rear-left' | 'rear-right'

export type VesselType = 'AGY' | 'Grok' | 'OpenCode' | 'Codex' | 'Auditor' | 'Shell'

export const SOVEREIGN_CHARACTER_ROSTER = [
  'boss-joshua',
  'vessel-agy',
  'vessel-grok',
  'vessel-auditor',
  'vessel-opencode',
  'vessel-codex',
  'agent-leaddeeds',
  'agent-ld-content',
  'agent-tbsoftwash',
  'agent-tb-content',
  'agent-ai-book',
  'agent-skorbane',
  'agent-skorbane-media',
  'agent-youtube',
  'agent-gbp',
  'agent-calendar',
  'agent-ayrianna',
  'agent-cron',
  'agent-tmux',
  'agent-connect',
] as const

export type ArchetypeSlug = (typeof SOVEREIGN_CHARACTER_ROSTER)[number]

export type AgentOperationalStatus =
  | 'THINKING'
  | 'TOOL_EXEC'
  | 'WAITING'
  | 'IDLE'
  | 'AMNESIA'
  | 'COURIER'

export type ContextSeverity = 'green' | 'amber' | 'red'

export interface ContextGauge {
  pct: number
  severity: ContextSeverity
  tokensUsed?: number
  tokenBudget?: number
}

export interface Point2D {
  x: number // percentage 0..100
  y: number // percentage 0..100
}

export interface WaypointNode {
  id: string
  label: string
  x: number
  y: number
  connections: string[]
}

export type FurnitureCategory =
  | 'boss-desk'
  | 'agent-desk'
  | 'whiteboard'
  | 'memory-vault'
  | 'coffee-station'
  | 'entry-door'
  | 'plant'
  | 'server-rack'

export type PodSlotOrientation = 'NW' | 'NE' | 'SW' | 'SE'

export type ThemePackId = 'classic-command' | 'sovereign-war-room' | 'cutaway-agency'

export interface WallBoardRectConfig {
  left: number
  top: number
  width: number
  height: number
  skewDeg: number
  zIndex: number
  variant?: 'whiteboard' | 'telemetry-wall' | 'glass-board'
}

export interface OfficeThemePack {
  id: ThemePackId
  name: string
  shortLabel: string
  badge: string
  description: string
  room: IsometricRoom
  wallBoardRect: WallBoardRectConfig
}

export interface FurnitureAsset {
  id: string
  label: string
  category: FurnitureCategory
  spritePath: string
  x: number
  y: number
  widthPx?: number
  heightPx?: number
  widthPct?: number
  heightPct?: number
  isHotspot?: boolean
  podIndex?: number
  podSlot?: PodSlotOrientation
  zIndexOverride?: number
  interactive?: boolean
  state?: 'idle' | 'active' | 'brewing' | 'alert'
  assignedSpotId?: string
}

export interface WorkstationSpot {
  id: string
  label: string
  deskId: string
  waypointId: string
  x: number
  y: number
  defaultFacing: SpriteFacing
  zIndexOverride?: number
  podIndex?: number
  podSlot?: PodSlotOrientation
  isBossDesk?: boolean
}

export interface IsometricRoom {
  id: string
  name: string
  subtitle: string
  logicalWidth: number
  logicalHeight: number
  backgrounds: {
    day: string
    night: string
  }
  furniture: FurnitureAsset[]
  workstations: WorkstationSpot[]
  waypoints: WaypointNode[]
}

export interface OfficeCharacter {
  id: string
  sessionName: string
  displayName: string
  roleTitle: string
  vessel: VesselType
  archetype: ArchetypeSlug
  status: AgentOperationalStatus
  context: ContextGauge
  deskSpotId: string
  currentWaypointId: string
  position: Point2D
  targetWaypoints: Point2D[]
  facing: SpriteFacing
  zIndexOverride?: number
  activeToolPill?: string
  speechBubble?: string
  courierTargetSession?: string
  gitBranch?: string
  worktreePath?: string
  projectNumber?: number
}
