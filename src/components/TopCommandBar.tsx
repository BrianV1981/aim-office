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
  boardLabel?: string
  isStaffRosterOpen?: boolean
  onToggleStaffRoster?: () => void
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
  boardLabel,
  isStaffRosterOpen = false,
  onToggleStaffRoster,
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
    let activeWorking = 0
    let avgPct = 0

    for (const c of characters) {
      avgPct += c.context.pct
      if (c.status === 'THINKING' || c.status === 'TOOL_EXEC' || c.status === 'COURIER') {
        activeWorking++
      }
      if (c.context.pct >= 30 || c.status === 'AMNESIA') {
        red++
      } else if (c.context.pct >= 20) {
        amber++
      } else {
        green++
      }
    }

    const total = characters.length
    const mean = total > 0 ? Math.round((avgPct / total) * 10) / 10 : 0
    const readinessPct =
      total > 0 ? Math.max(0, Math.min(100, Math.round(((total - red * 0.8 - amber * 0.25) / total) * 100))) : 100
    const fleetLevel = Math.max(1, total)

    return { green, amber, red, activeWorking, mean, readinessPct, fleetLevel }
  }, [characters])

  const isLive = !demoMode && !isFallbackActive
  const connectionLabel = isLive ? 'LIVE TELEMETRY :8000' : 'AUTONOMOUS OPS SIM'

  return (
    <header className="top-command-bar is-tactical-hud" data-testid="top-command-bar">
      {/* Left Pod: Sector Identity + Squad Roster Trigger */}
      <div className="hud-pod hud-pod-brand">
        {onToggleStaffRoster && (
          <button
            type="button"
            className={`hud-btn btn-staff-roster${isStaffRosterOpen ? ' is-active' : ''}`}
            data-testid="btn-toggle-staff-roster"
            onClick={onToggleStaffRoster}
            title="Toggle Tactical Squad & Personnel Roster"
          >
            <span className="btn-roster-dot" />
            👥 SQUAD ({characters.length})
          </button>
        )}

        <div className="command-brand-block">
          <div className="command-title-row">
            <span className="command-emblem" aria-hidden="true">
              ❖
            </span>
            <h1 className="command-title">{title}</h1>
            <span
              className={`connection-pill ${isLive ? 'is-live' : 'is-demo'}`}
              data-testid="connection-status-pill"
            >
              {connectionLabel}
            </span>
          </div>
          <p className="command-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Center Pod: Gamified Squad Readiness XP & 30%-Rule Neural Reactor */}
      <div className="hud-pod command-telemetry-summary" data-testid="fleet-context-summary">
        <div className="telemetry-stat stat-readiness" data-testid="fleet-readiness-score">
          <span className="stat-label">SQUAD RANK</span>
          <strong className="stat-value rank-gold">
            LVL {healthSummary.fleetLevel} · {healthSummary.readinessPct}%
          </strong>
        </div>

        <div className="telemetry-divider" />

        <div className="telemetry-stat">
          <span className="stat-label">UNITS</span>
          <strong className="stat-value" data-testid="active-agent-count">
            {characters.length}
          </strong>
        </div>

        <div className="telemetry-divider" />

        <div className="telemetry-stat">
          <span className="stat-label">30%-RULE NEURAL REACTOR</span>
          <div className="health-badges-row">
            <span className="health-chip chip-green" title="Optimal Recall (<20% context)">
              🟢 {healthSummary.green}
            </span>
            <span className="health-chip chip-amber" title="Elevated Load (20-29% context)">
              🟡 {healthSummary.amber}
            </span>
            <span className="health-chip chip-red" title="Amnesia Hazard (>=30% context)">
              🔥 {healthSummary.red}
            </span>
            <span className="health-mean">AVG {healthSummary.mean}%</span>
          </div>
        </div>
      </div>

      {/* Right Pod: Tactical Sector & Operations Controls */}
      <div className="hud-pod command-actions-group">
        {onSelectTheme && (
          <label className="theme-switcher-label" title="Switch Tactical Sector Map">
            <span className="sr-only-label">Sector:</span>
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
          title={boardLabel ? `Open ${boardLabel} Tactical Kanban Board` : 'Open Tactical Kanban Board'}
        >
          📋 OPS BOARD{boardLabel ? ` · ${boardLabel}` : ''}
        </button>
        <button
          type="button"
          className="hud-btn btn-courier"
          data-testid="btn-trigger-courier"
          onClick={onTriggerCourierDemo}
          title="Dispatch Courier Relay to J.O.S.H.U.A. Command"
        >
          📡 RELAY DISPATCH
        </button>
        <button
          type="button"
          className="hud-btn btn-mode"
          data-testid="btn-toggle-demo-mode"
          onClick={onToggleDemoMode}
          title="Switch between Live AIM-Connect Daemon and Autonomous Simulation"
        >
          {demoMode ? '🔌 GO LIVE' : '⚡ SIM FEED'}
        </button>
        <button
          type="button"
          className="hud-btn btn-lighting"
          data-testid="btn-toggle-lighting"
          onClick={onToggleLighting}
          title="Toggle Day / NVG Night Optics"
        >
          {lightingMode === 'day' ? '☀️ DAY' : '🌙 NVG'}
        </button>
      </div>
    </header>
  )
}
