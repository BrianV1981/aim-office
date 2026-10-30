import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TopCommandBar } from '../src/components/TopCommandBar'
import { AgentInspectorDrawer } from '../src/components/AgentInspectorDrawer'
import {
  AgentStaffRoster,
  buildFullStaffRosterCharacters,
  SOVEREIGN_STAFF_DIRECTORY,
} from '../src/components/AgentStaffRoster'
import { WallTaskBoard } from '../src/components/WallTaskBoard'
import { WhiteboardModal } from '../src/components/WhiteboardModal'
import { COMMAND_OFFICE_ROOM } from '../src/office/rooms'
import { resolveMappedProjectNumber } from '../src/server/officeBridge'
import {
  DEMO_FLEET_PANES,
  DEMO_SWARM_DISPATCHES,
  defaultAimConnectClient,
} from '../src/services/aimConnectClient'
import { mapFleetToOfficeCharacters } from '../src/office/useOfficeDirector'

describe('AIM-Office HUD Command Bar, Forensic Inspector Drawer & Kanban Modal (#3, #4, #6)', () => {
  const sampleCharacters = mapFleetToOfficeCharacters(DEMO_FLEET_PANES)

  it('renders TopCommandBar with active agent count, 30%-Rule health summary, and interactive toggles', () => {
    const onToggleLighting = vi.fn()
    const onTriggerCourierDemo = vi.fn()
    const onToggleDemoMode = vi.fn()
    const onOpenWhiteboard = vi.fn()
    const onSelectTheme = vi.fn()

    render(
      <TopCommandBar
        title="A.I.M. / LeadDeeds Sovereign Command Center"
        subtitle="J.O.S.H.U.A. Multi-Vessel Isometric Fleet Floor"
        characters={sampleCharacters}
        lightingMode="day"
        demoMode={true}
        isFallbackActive={false}
        activeThemeId="sovereign-war-room"
        onSelectTheme={onSelectTheme}
        onToggleLighting={onToggleLighting}
        onTriggerCourierDemo={onTriggerCourierDemo}
        onToggleDemoMode={onToggleDemoMode}
        onOpenWhiteboard={onOpenWhiteboard}
      />
    )

    expect(screen.getByTestId('active-agent-count')).toHaveTextContent(
      String(sampleCharacters.length)
    )
    expect(screen.getByTestId('fleet-readiness-score')).toHaveTextContent('LVL')
    expect(screen.getByTestId('fleet-context-summary')).toHaveTextContent('🔥 1')

    const themeSelect = screen.getByTestId('select-theme-pack') as HTMLSelectElement
    expect(themeSelect.value).toBe('sovereign-war-room')
    fireEvent.change(themeSelect, { target: { value: 'cutaway-agency' } })
    expect(onSelectTheme).toHaveBeenCalledWith('cutaway-agency')

    fireEvent.click(screen.getByTestId('btn-toggle-lighting'))
    expect(onToggleLighting).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-trigger-courier'))
    expect(onTriggerCourierDemo).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-toggle-demo-mode'))
    expect(onToggleDemoMode).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-open-whiteboard'))
    expect(onOpenWhiteboard).toHaveBeenCalledTimes(1)
  })

  it('populates AgentInspectorDrawer in strict Read-Only Visualizer mode (#21) with telemetry, forensic pills, worktree/wiki delta, and AIM-Connect gateway link', async () => {
    const officeChar = sampleCharacters.find((c) => c.sessionName === 'aim-office')!
    const onClose = vi.fn()
    const onDispatchCourierFromAgent = vi.fn()

    render(
      <AgentInspectorDrawer
        character={officeChar}
        demoMode={true}
        onClose={onClose}
        onDispatchCourierFromAgent={onDispatchCourierFromAgent}
      />
    )

    expect(screen.getByTestId('inspector-session-name')).toHaveTextContent('aim-office')
    expect(screen.getByTestId('inspector-context-pct')).toHaveTextContent('18%')
    expect(screen.getByTestId('dossier-stat-strip')).toHaveTextContent('82% OPTIMAL')
    expect(screen.getByTestId('agent-inspector-drawer')).toHaveAttribute('data-floating', 'true')
    expect(screen.getByTestId('agent-inspector-drawer')).toHaveAttribute('data-readonly', 'true')
    expect(screen.getByTestId('agent-inspector-drawer').style.zIndex).toBe('3100')
    expect(screen.getByTestId('inspector-drag-handle')).toBeInTheDocument()

    // Verify Option A Read-Only Security Boundary card & telemetry pulse
    expect(screen.getByTestId('inspector-readonly-gateway')).toBeInTheDocument()
    expect(screen.getByTestId('inspector-readonly-badge')).toHaveTextContent('ZERO-EXECUTION MODE')
    expect(screen.getByTestId('inspector-telemetry-preview')).toHaveTextContent('Vitest')

    // Ensure all tmux write/injection and raw scrollback DOM elements are completely removed (#21)
    expect(screen.queryByTestId('input-direct-reply')).toBeNull()
    expect(screen.queryByTestId('btn-send-direct-reply')).toBeNull()
    expect(screen.queryByTestId('macro-pills-bar')).toBeNull()
    expect(screen.queryByTestId('select-communicate-target')).toBeNull()
    expect(screen.queryByTestId('input-communicate-instruction')).toBeNull()
    expect(screen.queryByTestId('btn-dispatch-communicate')).toBeNull()
    expect(screen.queryByTestId('inspector-last-response')).toBeNull()

    await waitFor(() => {
      expect(screen.getByTestId('inspector-forensic-pills')).toHaveTextContent('[Bash]')
    })

    expect(screen.getByTestId('inspector-git-branch')).toHaveTextContent('fix/issue-2')
    expect(screen.getByTestId('inspector-wiki-delta')).toHaveTextContent('Ticket #1')

    const terminalLink = screen.getByTestId('link-open-aim-connect') as HTMLAnchorElement
    expect(terminalLink.href).toContain('http://localhost:8000/?session=aim-office')

    // Visual-only courier walk preview triggers local animation callback without network POST
    fireEvent.click(screen.getByTestId('btn-preview-courier-walk'))
    expect(onDispatchCourierFromAgent).toHaveBeenCalledWith(officeChar)
  })

  it('switches Kanban board per project (e.g. aim-ld -> Project #5, aim-joshua -> Project #7) and updates WallTaskBoard & WhiteboardModal (#10)', async () => {
    expect(resolveMappedProjectNumber('aim-office', '/home/kingb/aim-office', null)).toBe(14)
    expect(resolveMappedProjectNumber('aim-joshua', '/home/kingb/aim-joshua', null)).toBe(7)
    expect(resolveMappedProjectNumber('aim-connect', '/home/kingb/aim-connect', null)).toBe(6)
    expect(resolveMappedProjectNumber('aim-ld', '/home/kingb/aim-ld', null)).toBe(5)
    expect(resolveMappedProjectNumber('aim-tbsoftwash', '/home/kingb/aim-tbsoftwash', null)).toBe(15)
    expect(resolveMappedProjectNumber('aim-skorbane', '/home/kingb/aim-skorbane', null)).toBe(17)

    const ldKanban = await defaultAimConnectClient.fetchSessionKanban('aim-ld', true)
    const joshuaKanban = await defaultAimConnectClient.fetchSessionKanban('aim-joshua', true)
    expect(ldKanban.projectNumber).toBe(5)
    expect(joshuaKanban.projectNumber).toBe(7)
    expect(ldKanban.tickets[0].number).not.toBe(joshuaKanban.tickets[0].number)

    const onClose = vi.fn()
    const onReplay = vi.fn()

    const { rerender } = render(
      <>
        <WallTaskBoard
          boardLabel={`PROJECT #${ldKanban.projectNumber} (${ldKanban.session})`}
          tickets={ldKanban.tickets}
        />
        <WhiteboardModal
          isOpen={true}
          boardLabel={`PROJECT #${ldKanban.projectNumber} (${ldKanban.session})`}
          tickets={ldKanban.tickets}
          swarmDispatches={DEMO_SWARM_DISPATCHES}
          onClose={onClose}
          onReplayDispatchWalk={onReplay}
        />
      </>
    )

    expect(screen.getByTestId('wall-task-board-header')).toHaveTextContent('PROJECT #5 (aim-ld)')
    expect(screen.getByTestId('whiteboard-modal')).toBeInTheDocument()
    expect(screen.getByTestId('whiteboard-modal-title')).toHaveTextContent('PROJECT #5 (aim-ld)')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#51')
    expect(screen.getByTestId('kanban-col-in-progress')).toHaveTextContent('#52')
    expect(screen.getByTestId('kanban-col-todo')).toHaveTextContent('#53')
    expect(screen.getByTestId('swarm-activity-feed')).toHaveTextContent('aim-joshua')

    // Simulate clicking aim-joshua -> WallTaskBoard & WhiteboardModal update to Project #7
    rerender(
      <>
        <WallTaskBoard
          boardLabel={`PROJECT #${joshuaKanban.projectNumber} (${joshuaKanban.session})`}
          tickets={joshuaKanban.tickets}
        />
        <WhiteboardModal
          isOpen={true}
          boardLabel={`PROJECT #${joshuaKanban.projectNumber} (${joshuaKanban.session})`}
          tickets={joshuaKanban.tickets}
          swarmDispatches={DEMO_SWARM_DISPATCHES}
          onClose={onClose}
          onReplayDispatchWalk={onReplay}
        />
      </>
    )

    expect(screen.getByTestId('wall-task-board-header')).toHaveTextContent(
      'PROJECT #7 (aim-joshua)'
    )
    expect(screen.getByTestId('whiteboard-modal-title')).toHaveTextContent(
      'PROJECT #7 (aim-joshua)'
    )
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#71')
    expect(screen.getByTestId('whiteboard-modal-body')).toBeInTheDocument()

    // Verify Escape key closes WhiteboardModal (#12)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    // Verify Close Board button closes WhiteboardModal (#12)
    fireEvent.click(screen.getByTestId('btn-close-whiteboard'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('renders AgentStaffRoster with all 20 Sovereign staff personas, search filter, status filter pills, and 1-click agent selection (#11)', () => {
    const fullRoster = buildFullStaffRosterCharacters(
      sampleCharacters,
      COMMAND_OFFICE_ROOM,
      true
    )
    expect(SOVEREIGN_STAFF_DIRECTORY).toHaveLength(20)
    expect(fullRoster).toHaveLength(20)

    const onToggleFullRoster = vi.fn()
    const onSelectCharacter = vi.fn()
    const onClose = vi.fn()

    render(
      <AgentStaffRoster
        isOpen={true}
        characters={fullRoster}
        liveAgentCount={sampleCharacters.length}
        selectedSession="aim-office"
        showFullRoster={true}
        onToggleFullRoster={onToggleFullRoster}
        onSelectCharacter={onSelectCharacter}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('agent-staff-roster')).toBeInTheDocument()
    expect(screen.getByTestId('agent-staff-roster').style.zIndex).toBe('3000')
    expect(screen.getByTestId('staff-roster-count')).toHaveTextContent('20 Agents')
    expect(screen.getByTestId('staff-row-aim-joshua')).toBeInTheDocument()
    expect(screen.getByTestId('staff-row-aim-ld')).toBeInTheDocument()
    expect(screen.getByTestId('staff-row-aim-tbsoftwash')).toBeInTheDocument()

    // Click an agent row -> selects character
    fireEvent.click(screen.getByTestId('staff-row-aim-ld'))
    expect(onSelectCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: 'aim-ld' })
    )

    // Filter by search query
    const searchInput = screen.getByTestId('input-staff-search') as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'tbsoftwash' } })
    expect(screen.getByTestId('staff-row-aim-tbsoftwash')).toBeInTheDocument()
    expect(screen.queryByTestId('staff-row-aim-joshua')).toBeNull()

    // Clear search and filter by Amnesia status pill
    fireEvent.change(searchInput, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('staff-filter-amnesia'))
    expect(screen.getByTestId('staff-row-aim-grok')).toBeInTheDocument()
    expect(screen.queryByTestId('staff-row-aim-office')).toBeNull()

    // Toggle full roster vs live fleet mode
    fireEvent.click(screen.getByTestId('btn-toggle-full-roster'))
    expect(onToggleFullRoster).toHaveBeenCalledTimes(1)
  })
})
