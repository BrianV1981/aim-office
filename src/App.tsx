import React, { useEffect, useMemo, useState } from 'react'
import { AgentInspectorDrawer } from './components/AgentInspectorDrawer'
import { AgentStaffRoster, buildFullStaffRosterCharacters } from './components/AgentStaffRoster'
import { OfficeStage } from './components/OfficeStage'
import { TopCommandBar } from './components/TopCommandBar'
import {
  DEFAULT_PHASE1_KANBAN_TICKETS,
  KanbanTicketItem,
  WhiteboardModal,
} from './components/WhiteboardModal'
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
        saved === 'classic-command'
      ) {
        return saved
      }
    }
    return 'sovereign-war-room'
  })

  const activeThemePack = useMemo(() => getOfficeThemePack(activeThemeId), [activeThemeId])

  const {
    characters,
    swarmDispatches,
    demoMode,
    setDemoMode,
    isFallbackActive,
    triggerCourierWalk,
    handleCharactersTick,
    client,
  } = useOfficeDirector({ room: activeThemePack.room })

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
      const spot = activeThemePack.room.workstations.find((w) => w.id === char.deskSpotId)
      if (!spot) return char
      return {
        ...char,
        position: { x: spot.x, y: spot.y },
        facing: spot.defaultFacing,
        zIndexOverride: spot.zIndexOverride,
      }
    })
    return buildFullStaffRosterCharacters(alignedLive, activeThemePack.room, showFullRoster)
  }, [characters, activeThemePack, showFullRoster])

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
        title={activeThemePack.room.name}
        subtitle={activeThemePack.room.subtitle}
        characters={themedCharacters}
        lightingMode={lightingMode}
        demoMode={demoMode}
        isFallbackActive={isFallbackActive}
        activeThemeId={activeThemeId}
        boardLabel={boardLabel}
        isStaffRosterOpen={isStaffRosterOpen}
        onToggleStaffRoster={() => setIsStaffRosterOpen((o) => !o)}
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
        <OfficeStage
          room={activeThemePack.room}
          characters={themedCharacters}
          tickets={boardTickets}
          boardLabel={boardLabel}
          wallBoardRect={activeThemePack.wallBoardRect}
          lightingMode={lightingMode}
          selectedSession={selectedSession}
          onSelectCharacter={(char) => setSelectedSession(char.sessionName)}
          onSelectFurniture={handleFurnitureSelect}
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
