import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TopCommandBar } from '../src/components/TopCommandBar'
import { AgentInspectorDrawer } from '../src/components/AgentInspectorDrawer'
import { WhiteboardModal } from '../src/components/WhiteboardModal'
import { DEMO_FLEET_PANES, DEMO_SWARM_DISPATCHES } from '../src/services/aimConnectClient'
import { mapFleetToOfficeCharacters } from '../src/office/useOfficeDirector'

describe('AIM-Office HUD Command Bar, Forensic Inspector Drawer & Kanban Modal (#3 & #4)', () => {
  const sampleCharacters = mapFleetToOfficeCharacters(DEMO_FLEET_PANES)

  it('renders TopCommandBar with active agent count, 30%-Rule health summary, and interactive toggles', () => {
    const onToggleLighting = vi.fn()
    const onTriggerCourierDemo = vi.fn()
    const onToggleDemoMode = vi.fn()
    const onOpenWhiteboard = vi.fn()

    render(
      <TopCommandBar
        title="A.I.M. / LeadDeeds Sovereign Command Center"
        subtitle="J.O.S.H.U.A. Multi-Vessel Isometric Fleet Floor"
        characters={sampleCharacters}
        lightingMode="day"
        demoMode={true}
        isFallbackActive={false}
        onToggleLighting={onToggleLighting}
        onTriggerCourierDemo={onTriggerCourierDemo}
        onToggleDemoMode={onToggleDemoMode}
        onOpenWhiteboard={onOpenWhiteboard}
      />
    )

    expect(screen.getByTestId('active-agent-count')).toHaveTextContent(
      String(sampleCharacters.length)
    )
    expect(screen.getByTestId('fleet-context-summary')).toHaveTextContent('🔥 1')

    fireEvent.click(screen.getByTestId('btn-toggle-lighting'))
    expect(onToggleLighting).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-trigger-courier'))
    expect(onTriggerCourierDemo).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-toggle-demo-mode'))
    expect(onToggleDemoMode).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('btn-open-whiteboard'))
    expect(onOpenWhiteboard).toHaveBeenCalledTimes(1)
  })

  it('populates AgentInspectorDrawer with session telemetry, forensic tool pills, git branch/wiki delta, and AIM-Connect terminal link', async () => {
    const officeChar = sampleCharacters.find((c) => c.sessionName === 'aim-office')!
    const onClose = vi.fn()

    render(
      <AgentInspectorDrawer
        character={officeChar}
        demoMode={true}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('inspector-session-name')).toHaveTextContent('aim-office')
    expect(screen.getByTestId('inspector-context-pct')).toHaveTextContent('18%')

    await waitFor(() => {
      expect(screen.getByTestId('inspector-forensic-pills')).toHaveTextContent('[Bash]')
    })

    expect(screen.getByTestId('inspector-git-branch')).toHaveTextContent('fix/issue-2')
    expect(screen.getByTestId('inspector-wiki-delta')).toHaveTextContent('Ticket #1')

    const terminalLink = screen.getByTestId('link-open-aim-connect') as HTMLAnchorElement
    expect(terminalLink.href).toContain('http://localhost:8000/?session=aim-office')
  })

  it('renders WhiteboardModal with Todo / In Progress / Done Kanban columns and aim-communicate Swarm Activity feed', () => {
    const onClose = vi.fn()
    const onReplay = vi.fn()

    render(
      <WhiteboardModal
        isOpen={true}
        swarmDispatches={DEMO_SWARM_DISPATCHES}
        onClose={onClose}
        onReplayDispatchWalk={onReplay}
      />
    )

    expect(screen.getByTestId('whiteboard-modal')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#1')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#2')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#3')
    expect(screen.getByTestId('kanban-col-in-progress')).toHaveTextContent('#4')
    expect(screen.getByTestId('swarm-activity-feed')).toHaveTextContent('aim-joshua')
  })
})
