import {
  FurnitureAsset,
  FurnitureCategory,
  HangoutSpot,
  IdleActivityEmote,
  IsometricRoom,
  OfficeCharacter,
  SpriteFacing,
  ThemePackId,
} from './types'
import { computeDepthZIndex } from './waypointGraph'

export const CUSTOM_LAYOUT_STORAGE_KEY = 'aim-office-custom-layout-v1'

export interface SmartFurnitureCatalogItem {
  catalogId: string
  category: FurnitureCategory
  label: string
  shortLabel: string
  emoji: string
  defaultEmote: IdleActivityEmote
  description: string
  defaultX: number
  defaultY: number
}

export const SMART_FURNITURE_CATALOG: ReadonlyArray<SmartFurnitureCatalogItem> = [
  {
    catalogId: 'prop-coffee-bar',
    category: 'coffee-station',
    label: 'Breakroom Espresso & Drip Coffee Bar',
    shortLabel: 'Coffee Bar',
    emoji: '☕',
    defaultEmote: 'coffee',
    description: 'Steaming espresso machine & pour-over station (3 standing hangout slots).',
    defaultX: 84.0,
    defaultY: 56.0,
  },
  {
    catalogId: 'prop-lounge-couch',
    category: 'lounge-couch',
    label: 'Breakroom Isometric Lounge Sofa',
    shortLabel: 'Lounge Sofa',
    emoji: '🛋️',
    defaultEmote: 'lounge',
    description: 'Plush 3-seat lounge sofa where idle agents sit and relax (3 seated slots).',
    defaultX: 20.0,
    defaultY: 79.0,
  },
  {
    catalogId: 'prop-smoke-stand',
    category: 'smoke-station',
    label: 'Retro 80s/90s Cigar & Cigarette Stand',
    shortLabel: 'Smoke Stand',
    emoji: '🚬',
    defaultEmote: 'smoke',
    description: 'Classic brass standing ashtray & humidor corner (3 standing smoke slots).',
    defaultX: 84.5,
    defaultY: 76.0,
  },
  {
    catalogId: 'prop-vape-pod',
    category: 'vape-station',
    label: 'Sci-Fi Neon Cyber-Vape Lounge Pod',
    shortLabel: 'Cyber-Vape Pod',
    emoji: '💨',
    defaultEmote: 'vape',
    description: 'Holographic neon vaporizer pedestal for sci-fi ops breaks (3 standing slots).',
    defaultX: 84.5,
    defaultY: 74.0,
  },
  {
    catalogId: 'prop-water-cooler',
    category: 'water-cooler',
    label: 'Office Chilled Water Cooler',
    shortLabel: 'Water Cooler',
    emoji: '💧',
    defaultEmote: 'water',
    description: 'Classic office water cooler for idle agent gossip (2 standing slots).',
    defaultX: 78.0,
    defaultY: 49.0,
  },
  {
    catalogId: 'prop-arcade-cabinet',
    category: 'arcade-cabinet',
    label: 'Retro Pixel Arcade Cabinet',
    shortLabel: 'Arcade Cab',
    emoji: '🕹️',
    defaultEmote: 'arcade',
    description: '16-bit CRT arcade cabinet for high-score breaks (2 standing slots).',
    defaultX: 16.5,
    defaultY: 66.0,
  },
]

function clampCoord(val: number, min = 6, max = 94): number {
  return Math.round(Math.min(max, Math.max(min, val)) * 10) / 10
}

/**
 * Generate interactive HangoutSpot slots anchored around a smart furniture item's (x, y) coordinates.
 */
export function buildHangoutSpotsForProp(
  furnitureId: string,
  category: FurnitureCategory,
  x: number,
  y: number
): HangoutSpot[] {
  const slotDefs: Array<{
    dx: number
    dy: number
    facing: SpriteFacing
    emote: IdleActivityEmote
    isSeated?: boolean
  }> =
    category === 'lounge-couch'
      ? [
          { dx: -2.4, dy: 0.8, facing: 'front-right', emote: 'lounge', isSeated: true },
          { dx: 0.0, dy: 1.4, facing: 'front-left', emote: 'coffee', isSeated: true },
          { dx: 2.4, dy: 0.8, facing: 'front-left', emote: 'lounge', isSeated: true },
        ]
      : category === 'smoke-station'
        ? [
            { dx: -2.8, dy: 1.2, facing: 'front-right', emote: 'smoke' },
            { dx: 2.8, dy: 1.2, facing: 'front-left', emote: 'smoke' },
            { dx: 0.0, dy: 2.6, facing: 'rear-left', emote: 'smoke' },
          ]
        : category === 'vape-station'
          ? [
              { dx: -2.8, dy: 1.2, facing: 'front-right', emote: 'vape' },
              { dx: 2.8, dy: 1.2, facing: 'front-left', emote: 'vape' },
              { dx: 0.0, dy: 2.6, facing: 'rear-right', emote: 'vape' },
            ]
          : category === 'water-cooler'
            ? [
                { dx: -2.5, dy: 1.1, facing: 'front-right', emote: 'water' },
                { dx: 2.5, dy: 1.1, facing: 'front-left', emote: 'water' },
              ]
            : category === 'arcade-cabinet'
              ? [
                  { dx: -1.8, dy: 1.8, facing: 'rear-right', emote: 'arcade' },
                  { dx: 1.8, dy: 1.8, facing: 'rear-left', emote: 'arcade' },
                ]
              : [
                  { dx: -3.0, dy: 1.4, facing: 'front-right', emote: 'coffee' },
                  { dx: 0.0, dy: 2.5, facing: 'rear-left', emote: 'coffee' },
                  { dx: 3.0, dy: 1.4, facing: 'front-left', emote: 'coffee' },
                ]

  return slotDefs.map((slot, idx) => ({
    id: `hangout-${furnitureId}-${idx + 1}`,
    furnitureId,
    label: `${category} slot #${idx + 1}`,
    x: clampCoord(x + slot.dx),
    y: clampCoord(y + slot.dy),
    facing: slot.facing,
    emote: slot.emote,
    isSeated: slot.isSeated,
  }))
}

export interface PlacedSmartPropRecord {
  id: string
  catalogId: string
  category: FurnitureCategory
  label: string
  x: number
  y: number
}

export interface ThemeCustomLayout {
  movedPositions: Record<string, { x: number; y: number }>
  placedProps: PlacedSmartPropRecord[]
}

export type ThemeLayoutMap = Partial<Record<ThemePackId, ThemeCustomLayout>>

/**
 * Built-in default smart hangout furniture per theme so idle agents immediately have places to gather
 * (Coffee Bar, Lounge Sofa, and Theme-Specific Cyber-Vape / Retro Cigar Stand / Water Cooler).
 */
export const DEFAULT_THEME_SMART_PROPS: Record<ThemePackId, PlacedSmartPropRecord[]> = {
  'sovereign-war-room': [
    {
      id: 'builtin-war-coffee',
      catalogId: 'prop-coffee-bar',
      category: 'coffee-station',
      label: 'Tactical Stim-Brew & Espresso Dispenser',
      x: 86.5,
      y: 55.5,
    },
    {
      id: 'builtin-war-vape',
      catalogId: 'prop-vape-pod',
      category: 'vape-station',
      label: 'Subterranean Cyber-Vape & Neon Vapor Lounge',
      x: 83.5,
      y: 75.5,
    },
    {
      id: 'builtin-war-couch',
      catalogId: 'prop-lounge-couch',
      category: 'lounge-couch',
      label: 'Command Crew Briefing Sofa',
      x: 18.5,
      y: 78.5,
    },
  ],
  'cutaway-agency': [
    {
      id: 'builtin-agency-coffee',
      catalogId: 'prop-coffee-bar',
      category: 'coffee-station',
      label: 'East Wing Artisanal Espresso Bar',
      x: 88.0,
      y: 44.5,
    },
    {
      id: 'builtin-agency-couch',
      catalogId: 'prop-lounge-couch',
      category: 'lounge-couch',
      label: 'Breakroom Sunlit Lounge Couch',
      x: 16.5,
      y: 81.5,
    },
    {
      id: 'builtin-agency-water',
      catalogId: 'prop-water-cooler',
      category: 'water-cooler',
      label: 'Strategy Wing Water Cooler',
      x: 86.0,
      y: 68.0,
    },
  ],
  'classic-command': [
    {
      id: 'builtin-classic-coffee',
      catalogId: 'prop-coffee-bar',
      category: 'coffee-station',
      label: 'Breakroom Drip Coffee & Mug Rack',
      x: 76.5,
      y: 52.5,
    },
    {
      id: 'builtin-classic-couch',
      catalogId: 'prop-lounge-couch',
      category: 'lounge-couch',
      label: 'Executive Leather Lounge Sofa',
      x: 21.5,
      y: 79.0,
    },
    {
      id: 'builtin-classic-smoke',
      catalogId: 'prop-smoke-stand',
      category: 'smoke-station',
      label: 'Executive Cigar & Ashtray Stand',
      x: 82.0,
      y: 76.5,
    },
  ],
  'retro-90s-bullpen': [
    {
      id: 'builtin-retro-smoke-1',
      catalogId: 'prop-smoke-stand',
      category: 'smoke-station',
      label: '1992 Bullpen Standing Ashtray & Cigar Humidor',
      x: 82.5,
      y: 74.5,
    },
    {
      id: 'builtin-retro-coffee',
      catalogId: 'prop-coffee-bar',
      category: 'coffee-station',
      label: 'Retro Diner Glass-Pot Coffee Percolator',
      x: 77.0,
      y: 52.5,
    },
    {
      id: 'builtin-retro-couch',
      catalogId: 'prop-lounge-couch',
      category: 'lounge-couch',
      label: 'Vintage Breakroom Leatherette Couch',
      x: 21.0,
      y: 79.5,
    },
    {
      id: 'builtin-retro-arcade',
      catalogId: 'prop-arcade-cabinet',
      category: 'arcade-cabinet',
      label: '1991 Street Fighter CRT Arcade Cabinet',
      x: 16.5,
      y: 64.5,
    },
  ],
}

export function loadCustomLayoutMap(): ThemeLayoutMap {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(CUSTOM_LAYOUT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as ThemeLayoutMap) : {}
  } catch {
    return {}
  }
}

export function saveCustomLayoutMap(map: ThemeLayoutMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(CUSTOM_LAYOUT_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage quota errors
  }
}

export function updateFurniturePositionInLayout(
  map: ThemeLayoutMap,
  themeId: ThemePackId,
  furnitureId: string,
  x: number,
  y: number
): ThemeLayoutMap {
  const current = map[themeId] ?? { movedPositions: {}, placedProps: [] }
  const clampedX = clampCoord(x)
  const clampedY = clampCoord(y)

  const isPlaced = current.placedProps.some((p) => p.id === furnitureId)
  const nextPlaced = isPlaced
    ? current.placedProps.map((p) =>
        p.id === furnitureId ? { ...p, x: clampedX, y: clampedY } : p
      )
    : current.placedProps

  return {
    ...map,
    [themeId]: {
      movedPositions: {
        ...current.movedPositions,
        [furnitureId]: { x: clampedX, y: clampedY },
      },
      placedProps: nextPlaced,
    },
  }
}

export function addCatalogPropToLayout(
  map: ThemeLayoutMap,
  themeId: ThemePackId,
  catalogId: string,
  customCoords?: { x: number; y: number }
): { nextMap: ThemeLayoutMap; addedProp: PlacedSmartPropRecord | null } {
  const spec = SMART_FURNITURE_CATALOG.find((c) => c.catalogId === catalogId)
  if (!spec) return { nextMap: map, addedProp: null }

  const current = map[themeId] ?? { movedPositions: {}, placedProps: [] }
  const count = current.placedProps.length
  const jitterX = ((count * 5.5) % 16) - 6
  const jitterY = ((count * 3.5) % 10) - 4

  const addedProp: PlacedSmartPropRecord = {
    id: `user-prop-${spec.category}-${Date.now()}-${count + 1}`,
    catalogId: spec.catalogId,
    category: spec.category,
    label: spec.label,
    x: clampCoord(customCoords?.x ?? spec.defaultX + jitterX),
    y: clampCoord(customCoords?.y ?? spec.defaultY + jitterY),
  }

  const nextMap: ThemeLayoutMap = {
    ...map,
    [themeId]: {
      movedPositions: { ...current.movedPositions },
      placedProps: [...current.placedProps, addedProp],
    },
  }
  return { nextMap, addedProp }
}

export function removePlacedPropFromLayout(
  map: ThemeLayoutMap,
  themeId: ThemePackId,
  furnitureId: string
): ThemeLayoutMap {
  const current = map[themeId]
  if (!current) return map
  const nextMoved = { ...current.movedPositions }
  delete nextMoved[furnitureId]
  return {
    ...map,
    [themeId]: {
      movedPositions: nextMoved,
      placedProps: current.placedProps.filter((p) => p.id !== furnitureId),
    },
  }
}

export function resetThemeLayout(
  map: ThemeLayoutMap,
  themeId: ThemePackId
): ThemeLayoutMap {
  const next = { ...map }
  delete next[themeId]
  return next
}

/**
 * Apply custom desk movements, built-in smart props, and user-placed furniture to a room.
 * Moving a desk automatically translates its attached WorkstationSpot by the same (dx, dy).
 */
export function applyCustomLayoutToRoom(
  room: IsometricRoom,
  themeId: ThemePackId,
  layoutMap: ThemeLayoutMap = {}
): IsometricRoom {
  const custom = layoutMap[themeId]
  const movedPositions = custom?.movedPositions ?? {}
  const userProps = custom?.placedProps ?? []
  const builtinProps = DEFAULT_THEME_SMART_PROPS[themeId] ?? []

  const deskDeltaById = new Map<string, { dx: number; dy: number; newY: number }>()

  const updatedBaseFurniture: FurnitureAsset[] = room.furniture.map((item) => {
    const override = movedPositions[item.id]
    if (!override) return item
    const dx = override.x - item.x
    const dy = override.y - item.y
    deskDeltaById.set(item.id, { dx, dy, newY: override.y })
    const newDepth = computeDepthZIndex(override.y)
    return {
      ...item,
      x: override.x,
      y: override.y,
      zIndexOverride: item.isHotspot ? item.zIndexOverride : newDepth,
      hangoutSpots: item.hangoutSpots
        ? buildHangoutSpotsForProp(item.id, item.category, override.x, override.y)
        : undefined,
    }
  })

  const updatedWorkstations = room.workstations.map((ws) => {
    const delta = deskDeltaById.get(ws.deskId)
    if (!delta) return ws
    const nextX = clampCoord(ws.x + delta.dx)
    const nextY = clampCoord(ws.y + delta.dy)
    const deskZ = computeDepthZIndex(delta.newY)
    const isRearSlot = ws.podSlot === 'NW' || ws.podSlot === 'NE'
    return {
      ...ws,
      x: nextX,
      y: nextY,
      zIndexOverride: isRearSlot ? Math.max(1, deskZ - 5) : deskZ + 5,
    }
  })

  const convertSmartPropToAsset = (
    prop: PlacedSmartPropRecord,
    isUserPlaced: boolean
  ): FurnitureAsset => {
    const override = movedPositions[prop.id]
    const effX = override ? override.x : prop.x
    const effY = override ? override.y : prop.y
    return {
      id: prop.id,
      catalogId: prop.catalogId,
      label: prop.label,
      category: prop.category,
      spritePath: '',
      x: effX,
      y: effY,
      interactive: true,
      isUserPlaced,
      zIndexOverride: computeDepthZIndex(effY),
      hangoutSpots: buildHangoutSpotsForProp(prop.id, prop.category, effX, effY),
    }
  }

  const smartAssets: FurnitureAsset[] = [
    ...builtinProps.map((p) => convertSmartPropToAsset(p, false)),
    ...userProps.map((p) => convertSmartPropToAsset(p, true)),
  ]

  return {
    ...room,
    furniture: [...updatedBaseFurniture, ...smartAssets],
    workstations: updatedWorkstations,
  }
}

/**
 * Collect all HangoutSpot slots available in an IsometricRoom.
 */
export function collectRoomHangoutSpots(room: IsometricRoom): HangoutSpot[] {
  const spots: HangoutSpot[] = []
  for (const item of room.furniture) {
    if (item.hangoutSpots && item.hangoutSpots.length > 0) {
      spots.push(...item.hangoutSpots)
    }
  }
  return spots
}

/**
 * Sims-style Idle Agent Hangouts (#18):
 * - When `idleHangoutsEnabled` is true, IDLE agents (excluding `aim-joshua` at the Boss Desk)
 *   gather at available Smart Furniture HangoutSpots (coffee bar, lounge sofa, smoke stand,
 *   cyber-vape pod, water cooler, arcade cabinet) with matching `idleEmote` and `isSeated` flags.
 * - Any agent that transitions to THINKING, TOOL_EXEC, WAITING, AMNESIA, or COURIER
 *   immediately returns to their assigned workstation desk.
 */
export function assignIdleHangoutsToCharacters(
  characters: OfficeCharacter[],
  room: IsometricRoom,
  idleHangoutsEnabled = true,
  themeId: ThemePackId = 'sovereign-war-room'
): OfficeCharacter[] {
  const hangoutSpots = collectRoomHangoutSpots(room)
  if (!idleHangoutsEnabled || hangoutSpots.length === 0) {
    return characters.map((char) => {
      if (char.targetWaypoints.length > 0) return char
      const deskSpot = room.workstations.find((w) => w.id === char.deskSpotId)
      return {
        ...char,
        position: deskSpot ? { x: deskSpot.x, y: deskSpot.y } : char.position,
        facing: deskSpot ? deskSpot.defaultFacing : char.facing,
        zIndexOverride: deskSpot ? deskSpot.zIndexOverride : char.zIndexOverride,
        idleEmote: undefined,
        isSeated: false,
        hangoutSpotId: undefined,
      }
    })
  }

  const defaultDeskIdleEmote: IdleActivityEmote =
    themeId === 'retro-90s-bullpen'
      ? 'smoke'
      : themeId === 'sovereign-war-room'
        ? 'vape'
        : 'coffee'

  let hangoutCursor = 0

  return characters.map((char) => {
    // Active / Courier / Amnesia / Waiting agents or Boss Joshua stay at their workstation (or active walk)
    const isBoss = char.sessionName === 'aim-joshua' || char.archetype === 'boss-joshua'
    if (char.targetWaypoints.length > 0 || char.status !== 'IDLE' || isBoss) {
      const deskSpot = room.workstations.find((w) => w.id === char.deskSpotId)
      return {
        ...char,
        position:
          char.targetWaypoints.length > 0
            ? char.position
            : deskSpot
              ? { x: deskSpot.x, y: deskSpot.y }
              : char.position,
        facing:
          char.targetWaypoints.length > 0
            ? char.facing
            : deskSpot
              ? deskSpot.defaultFacing
              : char.facing,
        zIndexOverride:
          char.targetWaypoints.length > 0
            ? char.zIndexOverride
            : deskSpot?.zIndexOverride,
        idleEmote: isBoss && char.status === 'IDLE' ? 'coffee' : undefined,
        isSeated: false,
        hangoutSpotId: undefined,
      }
    }

    if (hangoutCursor < hangoutSpots.length) {
      const hSpot = hangoutSpots[hangoutCursor++]
      const depthZ = computeDepthZIndex(hSpot.y)
      return {
        ...char,
        position: { x: hSpot.x, y: hSpot.y },
        facing: hSpot.facing,
        zIndexOverride: hSpot.isSeated ? depthZ + 4 : depthZ + 2,
        idleEmote: hSpot.emote,
        isSeated: Boolean(hSpot.isSeated),
        hangoutSpotId: hSpot.id,
      }
    }

    // Remaining idle agents stay at their desks with a theme-reactive idle emote
    const deskSpot = room.workstations.find((w) => w.id === char.deskSpotId)
    return {
      ...char,
      position: deskSpot ? { x: deskSpot.x, y: deskSpot.y } : char.position,
      facing: deskSpot ? deskSpot.defaultFacing : char.facing,
      zIndexOverride: deskSpot?.zIndexOverride,
      idleEmote: defaultDeskIdleEmote,
      isSeated: false,
      hangoutSpotId: undefined,
    }
  })
}
