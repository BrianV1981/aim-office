import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TopCommandBar } from '../src/components/TopCommandBar'
import { AgentInspectorDrawer } from '../src/components/AgentInspectorDrawer'
import { WhiteboardModal } from '../src/components/WhiteboardModal'
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

  it('populates AgentInspectorDrawer with session telemetry, last response viewer, TTS, direct reply, Mic STT, Macro pills, and forensic pills', async () => {
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
      expect(screen.getByTestId('inspector-last-response')).toHaveTextContent('[aim-office]')
    })

    // Trigger TTS Read-Aloud
    fireEvent.click(screen.getByTestId('btn-tts-read-aloud'))
    expect(screen.getByTestId('tts-status')).toHaveTextContent('🔊')

    // Trigger Mic Dictation fallback
    fireEvent.click(screen.getByTestId('btn-mic-dictation'))
    const replyInput = screen.getByTestId('input-direct-reply') as HTMLInputElement
    expect(replyInput.value).toContain('voice dictation')

    // Send direct reply
    fireEvent.change(replyInput, { target: { value: 'Run unit tests now' } })
    fireEvent.click(screen.getByTestId('btn-send-direct-reply'))

    await waitFor(() => {
      expect(screen.getByTestId('reply-dispatch-status')).toHaveTextContent(
        'Sent to aim-office: "Run unit tests now"'
      )
    })

    // Trigger 1-tap macro pill
    fireEvent.click(screen.getByTestId('btn-macro-wiki'))
    await waitFor(() => {
      expect(screen.getByTestId('reply-dispatch-status')).toHaveTextContent('/aim-memory-wiki')
    })

    expect(screen.getByTestId('inspector-git-branch')).toHaveTextContent('fix/issue-2')
    expect(screen.getByTestId('inspector-wiki-delta')).toHaveTextContent('Ticket #1')

    const terminalLink = screen.getByTestId('link-open-aim-connect') as HTMLAnchorElement
    expect(terminalLink.href).toContain('http://localhost:8000/?session=aim-office')
  })

  it('dispatches 1-click aim-communicate broker instructions and triggers physical courier walk (#7)', async () => {
    const officeChar = sampleCharacters.find((c) => c.sessionName === 'aim-office')!
    const onClose = vi.fn()
    const onDispatchAimCommunicate = vi.fn()

    render(
      <AgentInspectorDrawer
        character={officeChar}
        allCharacters={sampleCharacters}
        demoMode={true}
        onClose={onClose}
        onDispatchAimCommunicate={onDispatchAimCommunicate}
      />
    )

    const targetSelect = screen.getByTestId('select-communicate-target') as HTMLSelectElement
    fireEvent.change(targetSelect, { target: { value: 'aim-ld' } })

    const instructionInput = screen.getByTestId(
      'input-communicate-instruction'
    ) as HTMLInputElement
    fireEvent.change(instructionInput, {
      target: { value: 'Verify LeadDeeds Project #11 Kanban board sync' },
    })

    fireEvent.click(screen.getByTestId('btn-dispatch-communicate'))

    await waitFor(() => {
      expect(screen.getByTestId('communicate-dispatch-status')).toHaveTextContent(
        'aim-office → aim-ld'
      )
    })

    expect(onDispatchAimCommunicate).toHaveBeenCalledWith({
      sender: 'aim-office',
      recipient: 'aim-ld',
      preview:
        '[DISPATCH aim-office -> aim-ld] Verify LeadDeeds Project #11 Kanban board sync',
    })
  })

  it('switches Kanban board per project (e.g. aim-ld -> Project #11) and renders WhiteboardModal columns', async () => {
    const ldKanban = await defaultAimConnectClient.fetchSessionKanban('aim-ld', true)
    expect(ldKanban.projectNumber).toBe(11)

    const onClose = vi.fn()
    const onReplay = vi.fn()

    render(
      <WhiteboardModal
        isOpen={true}
        boardLabel={`PROJECT #${ldKanban.projectNumber} (${ldKanban.session})`}
        swarmDispatches={DEMO_SWARM_DISPATCHES}
        onClose={onClose}
        onReplayDispatchWalk={onReplay}
      />
    )

    expect(screen.getByTestId('whiteboard-modal')).toBeInTheDocument()
    expect(screen.getByTestId('whiteboard-modal-title')).toHaveTextContent('PROJECT #11 (aim-ld)')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#1')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#2')
    expect(screen.getByTestId('kanban-col-done')).toHaveTextContent('#3')
    expect(screen.getByTestId('kanban-col-in-progress')).toHaveTextContent('#4')
    expect(screen.getByTestId('swarm-activity-feed')).toHaveTextContent('aim-joshua')
  })
})
