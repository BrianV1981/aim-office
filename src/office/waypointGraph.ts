import { COMMAND_OFFICE_ROOM } from './rooms'
import { Point2D, SpriteFacing, WaypointNode } from './types'

/**
 * Compute depth-sorted zIndex for any y percentage coordinate (0..100).
 * Per architectural specification: zIndex = Math.round(y * 10)
 */
export function computeDepthZIndex(yPercent: number): number {
  return Math.round(yPercent * 10)
}

/**
 * Select the 4-directional isometric sprite orientation from movement delta (dx, dy).
 */
export function selectFacingFromDelta(
  dx: number,
  dy: number,
  fallback: SpriteFacing = 'front-left'
): SpriteFacing {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return fallback
  }
  if (dy < 0 && dx < 0) {
    return 'rear-left'
  }
  if (dy < 0 && dx >= 0) {
    return 'rear-right'
  }
  if (dy >= 0 && dx < 0) {
    return 'front-left'
  }
  return 'front-right'
}

/**
 * Build a lookup map of waypoint IDs to WaypointNodes.
 */
export function indexWaypoints(
  nodes: WaypointNode[] = COMMAND_OFFICE_ROOM.waypoints
): Map<string, WaypointNode> {
  const map = new Map<string, WaypointNode>()
  for (const node of nodes) {
    map.set(node.id, node)
  }
  return map
}

/**
 * Find the nearest waypoint ID to an arbitrary (x, y) percentage point.
 */
export function findNearestWaypointId(
  point: Point2D,
  nodes: WaypointNode[] = COMMAND_OFFICE_ROOM.waypoints
): string {
  let bestId = nodes[0]?.id ?? 'wp-central-hub'
  let bestDistSq = Number.POSITIVE_INFINITY
  for (const node of nodes) {
    const dx = node.x - point.x
    const dy = node.y - point.y
    const distSq = dx * dx + dy * dy
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      bestId = node.id
    }
  }
  return bestId
}

/**
 * Breadth-First Search (BFS) shortest-path router across the isometric corridor waypoint graph.
 * Returns an ordered list of WaypointNode objects from `fromId` to `toId` (inclusive).
 */
export function findWaypointPath(
  fromId: string,
  toId: string,
  nodes: WaypointNode[] = COMMAND_OFFICE_ROOM.waypoints
): WaypointNode[] {
  const nodeMap = indexWaypoints(nodes)
  const startNode = nodeMap.get(fromId)
  const targetNode = nodeMap.get(toId)

  if (!startNode || !targetNode) {
    return []
  }
  if (fromId === toId) {
    return [startNode]
  }

  const queue: string[] = [fromId]
  const visited = new Set<string>([fromId])
  const parentMap = new Map<string, string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (currentId === toId) {
      const path: WaypointNode[] = []
      let cursor: string | undefined = toId
      while (cursor !== undefined) {
        const waypoint = nodeMap.get(cursor)
        if (waypoint) {
          path.unshift(waypoint)
        }
        cursor = parentMap.get(cursor)
      }
      return path
    }

    const current = nodeMap.get(currentId)
    if (!current) continue

    for (const neighborId of current.connections) {
      if (!visited.has(neighborId) && nodeMap.has(neighborId)) {
        visited.add(neighborId)
        parentMap.set(neighborId, currentId)
        queue.push(neighborId)
      }
    }
  }

  // Fallback direct line if disconnected
  return [startNode, targetNode]
}

/**
 * Advance a character along its target waypoint queue by `maxDistance` percentage units.
 */
export function stepAlongWaypoints(
  current: Point2D,
  queue: Point2D[],
  maxDistance: number,
  currentFacing: SpriteFacing
): {
  position: Point2D
  remainingWaypoints: Point2D[]
  facing: SpriteFacing
  moved: boolean
} {
  if (queue.length === 0 || maxDistance <= 0) {
    return {
      position: current,
      remainingWaypoints: queue,
      facing: currentFacing,
      moved: false,
    }
  }

  let cursor = { ...current }
  const remaining = [...queue]
  let budget = maxDistance
  let facing = currentFacing
  let moved = false

  while (remaining.length > 0 && budget > 0) {
    const nextTarget = remaining[0]
    const dx = nextTarget.x - cursor.x
    const dy = nextTarget.y - cursor.y
    const dist = Math.hypot(dx, dy)

    if (dist <= 0.001) {
      cursor = { x: nextTarget.x, y: nextTarget.y }
      remaining.shift()
      continue
    }

    facing = selectFacingFromDelta(dx, dy, facing)
    moved = true

    if (dist <= budget) {
      cursor = { x: nextTarget.x, y: nextTarget.y }
      budget -= dist
      remaining.shift()
    } else {
      const ratio = budget / dist
      cursor = {
        x: Number((cursor.x + dx * ratio).toFixed(3)),
        y: Number((cursor.y + dy * ratio).toFixed(3)),
      }
      budget = 0
    }
  }

  return {
    position: cursor,
    remainingWaypoints: remaining,
    facing,
    moved,
  }
}
