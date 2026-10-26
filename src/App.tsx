import React, { useState } from 'react'
import { OfficeStage } from './components/OfficeStage'
import { COMMAND_OFFICE_ROOM } from './office/rooms'
import { OfficeCharacter } from './office/types'
import { findWaypointPath } from './office/waypointGraph'
import './styles/office.css'

const INITIAL_STAGE_CHARACTERS: OfficeCharacter[] = [
  {
    id: 'char-aim-joshua',
    sessionName: 'aim-joshua',
    displayName: 'J.O.S.H.U.A.',
    roleTitle: 'Sovereign Orchestrator',
    vessel: 'AGY',
    archetype: 'boss-joshua',
    status: 'THINKING',
    context: { pct: 14, severity: 'green' },
    deskSpotId: 'spot-boss',
    currentWaypointId: 'wp-boss-desk',
    position: { x: 52, y: 27 },
    targetWaypoints: [],
    facing: 'front-left',
    activeToolPill: '[Dispatch] Phase 1 Build',
  },
  {
    id: 'char-aim-office',
    sessionName: 'aim-office',
    displayName: 'AIM-Office Builder',
    roleTitle: 'Isometric Engine Architect',
    vessel: 'AGY',
    archetype: 'vessel-agy',
    status: 'TOOL_EXEC',
    context: { pct: 18, severity: 'green' },
    deskSpotId: 'spot-1',
    currentWaypointId: 'wp-desk-1',
    position: { x: 24, y: 40.6 },
    targetWaypoints: [],
    facing: 'front-right',
    activeToolPill: '[Vitest] officeStage.test.tsx',
  },
  {
    id: 'char-aim-auditor',
    sessionName: 'aim-auditor',
    displayName: 'The Gatekeeper',
    roleTitle: 'Product-Truth Auditor',
    vessel: 'Auditor',
    archetype: 'vessel-auditor',
    status: 'WAITING',
    context: { pct: 22, severity: 'amber' },
    deskSpotId: 'spot-2',
    currentWaypointId: 'wp-desk-2',
    position: { x: 35.5, y: 45.1 },
    targetWaypoints: [],
    facing: 'front-left',
  },
  {
    id: 'char-aim-grok',
    sessionName: 'aim-grok',
    displayName: 'Grok Orchestrator',
    roleTitle: 'Swarm Tactical Node',
    vessel: 'Grok',
    archetype: 'vessel-grok',
    status: 'AMNESIA',
    context: { pct: 34, severity: 'red' },
    deskSpotId: 'spot-5',
    currentWaypointId: 'wp-desk-5',
    position: { x: 20, y: 52.6 },
    targetWaypoints: [],
    facing: 'front-right',
  },
]

export const App: React.FC = () => {
  const [characters, setCharacters] = useState<OfficeCharacter[]>(INITIAL_STAGE_CHARACTERS)
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  const handleDispatchWalkDemo = () => {
    const route = findWaypointPath('wp-desk-1', 'wp-boss-desk')
    const points = route.map((wp) => ({ x: wp.x, y: wp.y }))
    setCharacters((prev) =>
      prev.map((c) =>
        c.sessionName === 'aim-office'
          ? {
              ...c,
              status: 'COURIER',
              courierTargetSession: 'aim-joshua',
              speechBubble: '[REPORT] Ticket #1 Engine Ready',
              targetWaypoints: points,
            }
          : c
      )
    )
  }

  return (
    <div className="aim-office-app">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
        }}
      >
        <div>
          <strong>🏢 {COMMAND_OFFICE_ROOM.name}</strong>
          <span style={{ marginLeft: 10, fontSize: 12, color: '#94a3b8' }}>
            {COMMAND_OFFICE_ROOM.subtitle}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleDispatchWalkDemo}
            style={{
              background: '#1e293b',
              color: '#fde68a',
              border: '1px solid #f59e0b',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            📨 Demo Courier Walk
          </button>
          <button
            type="button"
            onClick={() => setLightingMode((m) => (m === 'day' ? 'night' : 'day'))}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #38bdf8',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {lightingMode === 'day' ? '☀️ Day Shell' : '🌙 Night Shell'}
          </button>
        </div>
      </header>

      <OfficeStage
        room={COMMAND_OFFICE_ROOM}
        characters={characters}
        lightingMode={lightingMode}
        selectedSession={selectedSession}
        onSelectCharacter={(char) => setSelectedSession(char.sessionName)}
        onCharactersTick={setCharacters}
      />
    </div>
  )
}

export default App
