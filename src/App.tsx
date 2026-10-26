import React, { useState } from 'react'
import { OfficeStage } from './components/OfficeStage'
import { COMMAND_OFFICE_ROOM } from './office/rooms'
import { useOfficeDirector } from './office/useOfficeDirector'
import './styles/office.css'

export const App: React.FC = () => {
  const {
    characters,
    demoMode,
    setDemoMode,
    isFallbackActive,
    triggerCourierWalk,
    handleCharactersTick,
  } = useOfficeDirector()

  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

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
            {COMMAND_OFFICE_ROOM.subtitle} ({characters.length} Active Vessels ·{' '}
            {demoMode || isFallbackActive ? 'Demo Fleet Simulation' : 'Live AIM-Connect'})
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              triggerCourierWalk({
                sender: 'aim-office',
                recipient: 'aim-joshua',
                preview: '[REPORT from aim-office] Phase 1 Telemetry Bridge Active',
              })
            }
            style={{
              background: '#1e293b',
              color: '#fde68a',
              border: '1px solid #f59e0b',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            📨 Trigger Courier Walk
          </button>
          <button
            type="button"
            onClick={() => setDemoMode((d) => !d)}
            style={{
              background: '#1e293b',
              color: '#67e8f9',
              border: '1px solid #06b6d4',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {demoMode ? '🔄 Switch to Live' : '🧪 Demo Mode'}
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
        onCharactersTick={handleCharactersTick}
      />
    </div>
  )
}

export default App
