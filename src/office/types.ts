export type SpriteFacing = 'front-left' | 'front-right' | 'rear-left' | 'rear-right'

export type VesselType = 'AGY' | 'Grok' | 'OpenCode' | 'Codex' | 'Auditor' | 'Shell'

export type ArchetypeSlug =
  | 'boss-joshua'
  | 'vessel-agy'
  | 'vessel-grok'
  | 'vessel-opencode'
  | 'vessel-codex'
  | 'vessel-auditor'

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

export interface FurnitureAsset {
  id: string
  label: string
  category: FurnitureCategory
  spritePath: string
  x: number
  y: number
  widthPx?: number
  heightPx?: number
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
  activeToolPill?: string
  speechBubble?: string
  courierTargetSession?: string
  gitBranch?: string
  worktreePath?: string
}
