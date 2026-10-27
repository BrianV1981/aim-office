import React, { useEffect, useMemo, useState } from 'react'
import { AgentInspectorDrawer } from './components/AgentInspectorDrawer'
import { AgentStaffRoster, buildFullStaffRosterCharacters } from './components/AgentStaffRoster'
import { BuildModeDock } from './components/BuildModeDock'
import { OfficeStage } from './components/OfficeStage'
import { TopCommandBar } from './components/TopCommandBar'
import {
  DEFAULT_PHASE1_KANBAN_TICKETS,
  KanbanTicketItem,
  WhiteboardModal,
} from './components/WhiteboardModal'
import {
  addCatalogPropToLayout,
  applyCustomLayoutToRoom,
  loadCustomLayoutMap,
  removePlacedPropFromLayout,
  resetThemeLayout,
  saveCustomLayoutMap,
  ThemeLayoutMap,
  updateFurniturePositionInLayout,
} from './office/layoutPersistence'
import { getOfficeThemePack } from './office/rooms'
import { FurnitureAsset, OfficeCharacter, ThemePackId } from './office/types'
import { useOfficeDirector } from './office/useOfficeDirector'
import './styles/office.css'

export const App: React.FC = () => {
  const [activeThemeId, setActiveThemeId] = useState<ThemePackId>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage?.getItem('aim-office-theme') as ThemePackId | null
      if (
        saved === 'sovereign-war-room' ||
        saved === 'cutaway-agency' ||
        saved === 'classic-command' ||
        saved === 'retro-90s-bullpen'
      ) {
        return saved
      }
    }
    return 'sovereign-war-room'
  })

  const [customLayoutMap, setCustomLayoutMap] = useState<ThemeLayoutMap>(() =>
    loadCustomLayoutMap()
  )
  const [isBuildMode, setIsBuildMode] = useState<boolean>(false)
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null)

  const activeThemePack = useMemo(() => getOfficeThemePack(activeThemeId), [activeThemeId])
  const customizedRoom = useMemo(
    () => applyCustomLayoutToRoom(activeThemePack.room, activeThemeId, customLayoutMap),
    [activeThemePack.room, activeThemeId, customLayoutMap]
  )

  const {
    characters,
    swarmDispatches,
    demoMode,
    setDemoMode,
    isFallbackActive,
    triggerCourierWalk,
    handleCharactersTick,
    client,
  } = useOfficeDirector({ room: customizedRoom })

  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [isStaffRosterOpen, setIsStaffRosterOpen] = useState<boolean>(true)
  const [showFullRoster, setShowFullRoster] = useState<boolean>(true)
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState<boolean>(false)
  const [boardLabel, setBoardLabel] = useState<string>('PROJECT #14')
  const [boardTickets, setBoardTickets] = useState<KanbanTicketItem[]>(
    DEFAULT_PHASE1_KANBAN_TICKETS
  )

  const handleSelectTheme = (nextThemeId: ThemePackId) => {
    setActiveThemeId(nextThemeId)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('aim-office-theme', nextThemeId)
      } catch {
        // Ignore storage error
      }
    }
  }

  // Realign stationary characters to the active theme pack's workstation coordinates
  // and optionally expand to the full 20-persona Sovereign Office Staff Roster
  const themedCharacters = useMemo(() => {
    const alignedLive = characters.map((char) => {
      if (char.targetWaypoints.length > 0) return char
      const spot = customizedRoom.workstations.find((w) => w.id === char.deskSpotId)
      if (!spot) return char
      return {
        ...char,
        position: { x: spot.x, y: spot.y },
        facing: spot.defaultFacing,
        zIndexOverride: spot.zIndexOverride,
      }
    })
    return buildFullStaffRosterCharacters(alignedLive, customizedRoom, showFullRoster)
  }, [characters, customizedRoom, showFullRoster])

  const selectedFurniture = useMemo<FurnitureAsset | null>(
    () => customizedRoom.furniture.find((f) => f.id === selectedFurnitureId) ?? null,
    [customizedRoom.furniture, selectedFurnitureId]
  )

  const handleMoveFurniture = (furnitureId: string, x: number, y: number) => {
    setCustomLayoutMap((prev) => {
      const next = updateFurniturePositionInLayout(prev, activeThemeId, furnitureId, x, y)
      saveCustomLayoutMap(next)
      return next
    })
  }

  const handleAddCatalogProp = (catalogId: string) => {
    setCustomLayoutMap((prev) => {
      const { nextMap, addedProp } = addCatalogPropToLayout(prev, activeThemeId, catalogId)
      saveCustomLayoutMap(nextMap)
      if (addedProp) {
        setSelectedFurnitureId(addedProp.id)
      }
      return nextMap
    })
  }

  const handleDeleteSelectedProp = (furnitureId: string) => {
    setCustomLayoutMap((prev) => {
      const next = removePlacedPropFromLayout(prev, activeThemeId, furnitureId)
      saveCustomLayoutMap(next)
      return next
    })
    setSelectedFurnitureId(null)
  }

  const handleResetThemeLayout = () => {
    setCustomLayoutMap((prev) => {
      const next = resetThemeLayout(prev, activeThemeId)
      saveCustomLayoutMap(next)
      return next
    })
    setSelectedFurnitureId(null)
  }

  const selectedCharacter = useMemo<OfficeCharacter | null>(
    () => themedCharacters.find((c) => c.sessionName === selectedSession) ?? null,
    [themedCharacters, selectedSession]
  )

  // Dynamically switch the Wall TaskBoard & Whiteboard Modal to the clicked agent's GitHub Project Kanban
  useEffect(() => {
    const targetSession = selectedSession || 'aim-office'
    setBoardLabel(`PROJECT · ${targetSession}`)
    let cancelled = false
    client
      .fetchSessionKanban(targetSession, demoMode || isFallbackActive)
      .then((payload) => {
        if (cancelled) return
        setBoardLabel(`PROJECT #${payload.projectNumber} (${payload.session})`)
        if (payload.tickets && payload.tickets.length > 0) {
          setBoardTickets(payload.tickets)
        }
      })
      .catch(() => {
        // Keep current board on error
      })

    return () => {
      cancelled = true
    }
  }, [selectedSession, client, demoMode, isFallbackActive])

  const handleFurnitureSelect = (furniture: FurnitureAsset) => {
    setSelectedFurnitureId(furniture.id)
    if (isBuildMode) {
      return
    }
    if (furniture.category === 'whiteboard') {
      setIsWhiteboardOpen(true)
      return
    }
    if (furniture.category === 'entry-door') {
      const boss =
        themedCharacters.find((c) => c.sessionName === 'aim-joshua') ?? themedCharacters[0]
      if (boss) setSelectedSession(boss.sessionName)
      return
    }
    if (furniture.assignedSpotId) {
      const occupant = themedCharacters.find((c) => c.deskSpotId === furniture.assignedSpotId)
      if (occupant) {
        setSelectedSession(occupant.sessionName)
      }
    }
  }

  return (
    <div className="aim-office-app" data-theme-pack={activeThemePack.id}>
      <TopCommandBar
        title={customizedRoom.name}
        subtitle={customizedRoom.subtitle}
        characters={themedCharacters}
        lightingMode={lightingMode}
        demoMode={demoMode}
        isFallbackActive={isFallbackActive}
        activeThemeId={activeThemeId}
        boardLabel={boardLabel}
        isStaffRosterOpen={isStaffRosterOpen}
        isBuildMode={isBuildMode}
        onToggleStaffRoster={() => setIsStaffRosterOpen((o) => !o)}
        onToggleBuildMode={() => setIsBuildMode((b) => !b)}
        onSelectTheme={handleSelectTheme}
        onToggleLighting={() => setLightingMode((m) => (m === 'day' ? 'night' : 'day'))}
        onTriggerCourierDemo={() =>
          triggerCourierWalk({
            sender: 'aim-office',
            recipient: 'aim-joshua',
            preview: `[REPORT from aim-office] Theme ${activeThemePack.shortLabel} & Parallel Quad Benches Active`,
          })
        }
        onToggleDemoMode={() => setDemoMode((d) => !d)}
        onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
      />

      <div className="office-main-workspace is-fullscreen-stage">
        <BuildModeDock
          isOpen={isBuildMode}
          selectedFurniture={selectedFurniture}
          onAddCatalogProp={handleAddCatalogProp}
          onDeleteSelectedProp={handleDeleteSelectedProp}
          onResetThemeLayout={handleResetThemeLayout}
          onCloseBuildMode={() => setIsBuildMode(false)}
        />

        <OfficeStage
          room={customizedRoom}
          characters={themedCharacters}
          tickets={boardTickets}
          boardLabel={boardLabel}
          wallBoardRect={activeThemePack.wallBoardRect}
          lightingMode={lightingMode}
          selectedSession={selectedSession}
          selectedFurnitureId={selectedFurnitureId}
          isBuildMode={isBuildMode}
          onSelectCharacter={(char) => setSelectedSession(char.sessionName)}
          onSelectFurniture={handleFurnitureSelect}
          onMoveFurniture={handleMoveFurniture}
          onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
          onCharactersTick={handleCharactersTick}
        />

        <AgentStaffRoster
          isOpen={isStaffRosterOpen}
          characters={themedCharacters}
          liveAgentCount={characters.length}
          selectedSession={selectedSession}
          showFullRoster={showFullRoster}
          onToggleFullRoster={() => setShowFullRoster((f) => !f)}
          onSelectCharacter={(char) => setSelectedSession(char.sessionName)}
          onClose={() => setIsStaffRosterOpen(false)}
        />

        <AgentInspectorDrawer
          character={selectedCharacter}
          allCharacters={themedCharacters}
          client={client}
          demoMode={demoMode || isFallbackActive}
          onClose={() => setSelectedSession(null)}
          onDispatchCourierFromAgent={(char) =>
            triggerCourierWalk({
              sender: char.sessionName,
              recipient: 'aim-joshua',
              preview: `[REPORT from ${char.sessionName}] Status sync -> aim-joshua`,
            })
          }
          onDispatchAimCommunicate={(dispatch) => triggerCourierWalk(dispatch)}
        />
      </div>

      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        tickets={boardTickets}
        boardLabel={boardLabel}
        swarmDispatches={swarmDispatches}
        onClose={() => setIsWhiteboardOpen(false)}
        onReplayDispatchWalk={(dispatch) => triggerCourierWalk(dispatch)}
      />
    </div>
  )
}

export default App
