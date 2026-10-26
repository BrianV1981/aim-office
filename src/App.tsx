import React, { useEffect, useMemo, useState } from 'react'
import { AgentInspectorDrawer } from './components/AgentInspectorDrawer'
import { OfficeStage } from './components/OfficeStage'
import { TopCommandBar } from './components/TopCommandBar'
import {
  DEFAULT_PHASE1_KANBAN_TICKETS,
  KanbanTicketItem,
  WhiteboardModal,
} from './components/WhiteboardModal'
import { COMMAND_OFFICE_ROOM } from './office/rooms'
import { FurnitureAsset, OfficeCharacter } from './office/types'
import { useOfficeDirector } from './office/useOfficeDirector'
import './styles/office.css'

export const App: React.FC = () => {
  const {
    characters,
    swarmDispatches,
    demoMode,
    setDemoMode,
    isFallbackActive,
    triggerCourierWalk,
    handleCharactersTick,
    client,
  } = useOfficeDirector()

  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState<boolean>(false)
  const [boardLabel, setBoardLabel] = useState<string>('PROJECT #14')
  const [boardTickets, setBoardTickets] = useState<KanbanTicketItem[]>(
    DEFAULT_PHASE1_KANBAN_TICKETS
  )

  const selectedCharacter = useMemo<OfficeCharacter | null>(
    () => characters.find((c) => c.sessionName === selectedSession) ?? null,
    [characters, selectedSession]
  )

  // Dynamically switch the Wall TaskBoard & Whiteboard Modal to the clicked agent's GitHub Project Kanban
  useEffect(() => {
    const targetSession = selectedSession || 'aim-office'
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
      const boss = characters.find((c) => c.sessionName === 'aim-joshua') ?? characters[0]
      if (boss) setSelectedSession(boss.sessionName)
      return
    }
    if (furniture.assignedSpotId) {
      const occupant = characters.find((c) => c.deskSpotId === furniture.assignedSpotId)
      if (occupant) {
        setSelectedSession(occupant.sessionName)
      }
    }
  }

  return (
    <div className="aim-office-app">
      <TopCommandBar
        title={COMMAND_OFFICE_ROOM.name}
        subtitle={COMMAND_OFFICE_ROOM.subtitle}
        characters={characters}
        lightingMode={lightingMode}
        demoMode={demoMode}
        isFallbackActive={isFallbackActive}
        onToggleLighting={() => setLightingMode((m) => (m === 'day' ? 'night' : 'day'))}
        onTriggerCourierDemo={() =>
          triggerCourierWalk({
            sender: 'aim-office',
            recipient: 'aim-joshua',
            preview: '[REPORT from aim-office] Issue #6 Live Tmux & Per-Project Kanban Cockpit Live',
          })
        }
        onToggleDemoMode={() => setDemoMode((d) => !d)}
        onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
      />

      <div className="office-main-workspace">
        <OfficeStage
          room={COMMAND_OFFICE_ROOM}
          characters={characters}
          tickets={boardTickets}
          boardLabel={boardLabel}
          lightingMode={lightingMode}
          selectedSession={selectedSession}
          onSelectCharacter={(char) => setSelectedSession(char.sessionName)}
          onSelectFurniture={handleFurnitureSelect}
          onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
          onCharactersTick={handleCharactersTick}
        />

        <AgentInspectorDrawer
          character={selectedCharacter}
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
