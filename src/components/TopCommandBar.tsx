import React, { useMemo } from 'react'
import { OFFICE_THEME_PACKS } from '../office/rooms'
import { OfficeCharacter, ThemePackId } from '../office/types'

export interface TopCommandBarProps {
  title: string
  subtitle: string
  characters: OfficeCharacter[]
  lightingMode: 'day' | 'night'
  demoMode: boolean
  isFallbackActive: boolean
  activeThemeId?: ThemePackId
  onSelectTheme?: (themeId: ThemePackId) => void
  onToggleLighting: () => void
  onTriggerCourierDemo: () => void
  onToggleDemoMode: () => void
  onOpenWhiteboard: () => void
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  title,
  subtitle,
  characters,
  lightingMode,
  demoMode,
  isFallbackActive,
  activeThemeId = 'sovereign-war-room',
  onSelectTheme,
  onToggleLighting,
  onTriggerCourierDemo,
  onToggleDemoMode,
  onOpenWhiteboard,
}) => {
  const healthSummary = useMemo(() => {
    let green = 0
    let amber = 0
    let red = 0
    let avgPct = 0

    for (const c of characters) {
      avgPct += c.context.pct
      if (c.context.pct >= 30 || c.status === 'AMNESIA') {
        red++
      } else if (c.context.pct >= 20) {
        amber++
      } else {
        green++
      }
    }

    const mean = characters.length > 0 ? Math.round((avgPct / characters.length) * 10) / 10 : 0
    return { green, amber, red, mean }
  }, [characters])

  const connectionLabel = demoMode
    ? 'DEMO SIMULATION'
    : isFallbackActive
      ? 'DEMO FALLBACK (AIM-Connect Offline)'
      : 'LIVE AIM-CONNECT (:8000)'

  return (
    <header className="top-command-bar" data-testid="top-command-bar">
      <div className="command-brand-block">
        <div className="command-title-row">
          <span className="command-emblem" aria-hidden="true">
            🏢
          </span>
          <h1 className="command-title">{title}</h1>
          <span
            className={`connection-pill ${
              !demoMode && !isFallbackActive ? 'is-live' : 'is-demo'
            }`}
            data-testid="connection-status-pill"
          >
            {connectionLabel}
          </span>
        </div>
        <p className="command-subtitle">{subtitle}</p>
      </div>

      {/* Fleet-Wide 30%-Rule Context Health Summary */}
      <div className="command-telemetry-summary" data-testid="fleet-context-summary">
        <div className="telemetry-stat">
          <span className="stat-label">Active Vessels</span>
          <strong className="stat-value" data-testid="active-agent-count">
            {characters.length}
          </strong>
        </div>
        <div className="telemetry-stat">
          <span className="stat-label">30%-Rule Fleet Health</span>
          <div className="health-badges-row">
            <span className="health-chip chip-green" title="Healthy (<20% context)">
              🟢 {healthSummary.green}
            </span>
            <span className="health-chip chip-amber" title="Warning (20-29% context)">
              🟡 {healthSummary.amber}
            </span>
            <span className="health-chip chip-red" title="Amnesia Risk (>=30% context)">
              🔥 {healthSummary.red}
            </span>
            <span className="health-mean">Avg {healthSummary.mean}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Command Controls */}
      <div className="command-actions-group">
        {onSelectTheme && (
          <label className="theme-switcher-label" title="Switch Standardized Room Theme Pack">
            <span className="sr-only-label">Theme:</span>
            <select
              className="hud-select-theme"
              data-testid="select-theme-pack"
              aria-label="Room Theme Pack"
              value={activeThemeId}
              onChange={(e) => onSelectTheme(e.target.value as ThemePackId)}
            >
              {OFFICE_THEME_PACKS.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.shortLabel}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="hud-btn btn-kanban"
          data-testid="btn-open-whiteboard"
          onClick={onOpenWhiteboard}
        >
          📋 Kanban Whiteboard
        </button>
        <button
          type="button"
          className="hud-btn btn-courier"
          data-testid="btn-trigger-courier"
          onClick={onTriggerCourierDemo}
        >
          📨 Trigger Courier Demo
        </button>
        <button
          type="button"
          className="hud-btn btn-mode"
          data-testid="btn-toggle-demo-mode"
          onClick={onToggleDemoMode}
        >
          {demoMode ? '🔌 Switch to Live' : '🧪 Demo Mode'}
        </button>
        <button
          type="button"
          className="hud-btn btn-lighting"
          data-testid="btn-toggle-lighting"
          onClick={onToggleLighting}
        >
          {lightingMode === 'day' ? '☀️ Day Mode' : '🌙 Night Mode'}
        </button>
      </div>
    </header>
  )
}
