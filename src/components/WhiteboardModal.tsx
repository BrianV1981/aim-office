import React from 'react'
import { SwarmDispatchEvent } from '../services/aimConnectClient'

export interface KanbanTicketItem {
  id: string
  number: number
  title: string
  status: 'Todo' | 'In Progress' | 'Done'
  assignee: string
}

export interface WhiteboardModalProps {
  isOpen: boolean
  tickets?: KanbanTicketItem[]
  swarmDispatches: SwarmDispatchEvent[]
  onClose: () => void
  onReplayDispatchWalk?: (dispatch: SwarmDispatchEvent) => void
}

export const DEFAULT_PHASE1_KANBAN_TICKETS: KanbanTicketItem[] = [
  {
    id: 'ticket-1',
    number: 1,
    title: 'feat(engine): scaffold React 19 + TS isometric 2.5D stage, waypoint pathfinder & Python 2x2 sprite slicer',
    status: 'Done',
    assignee: 'aim-office',
  },
  {
    id: 'ticket-2',
    number: 2,
    title: 'feat(telemetry): live aim-connect fleet bridge, vessel archetype mapper & aim-communicate courier walks',
    status: 'Done',
    assignee: 'aim-office',
  },
  {
    id: 'ticket-3',
    number: 3,
    title: 'feat(hud): top command bar, click-to-inspect agent forensic drawer & interactive Kanban whiteboard modal',
    status: 'In Progress',
    assignee: 'aim-office',
  },
]

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  isOpen,
  tickets = DEFAULT_PHASE1_KANBAN_TICKETS,
  swarmDispatches,
  onClose,
  onReplayDispatchWalk,
}) => {
  if (!isOpen) return null

  const columns: Array<'Todo' | 'In Progress' | 'Done'> = ['Todo', 'In Progress', 'Done']

  return (
    <div
      className="whiteboard-modal-backdrop"
      data-testid="whiteboard-modal"
      onClick={onClose}
    >
      <div
        className="whiteboard-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Project #14 Kanban Whiteboard & Swarm Activity"
      >
        <div className="whiteboard-modal-header">
          <div>
            <h2>📋 GitHub Project #14 — AIM-Office Kanban Board & Swarm Feed</h2>
            <p className="whiteboard-subtitle">
              Live GitOps Worktree Status (`./aim projects board`) & `aim-communicate` Dispatches
            </p>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            data-testid="btn-close-whiteboard"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 3-Column Kanban Board */}
        <div className="kanban-columns-grid" data-testid="kanban-columns-grid">
          {columns.map((colStatus) => {
            const items = tickets.filter((t) => t.status === colStatus)
            return (
              <div
                key={colStatus}
                className="kanban-column"
                data-testid={`kanban-col-${colStatus.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="kanban-column-header">
                  <strong>{colStatus}</strong>
                  <span className="kanban-count-badge">{items.length}</span>
                </div>
                <div className="kanban-cards-list">
                  {items.map((item) => (
                    <div key={item.id} className="kanban-ticket-card">
                      <div className="ticket-meta-row">
                        <span className="ticket-number">#{item.number}</span>
                        <span className="ticket-assignee">{item.assignee}</span>
                      </div>
                      <div className="ticket-title">{item.title}</div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="kanban-empty-slot">No tickets in {colStatus}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Live aim-communicate Swarm Activity Feed */}
        <div className="swarm-activity-section" data-testid="swarm-activity-feed">
          <h3>📨 Recent `aim-communicate` Swarm Dispatches</h3>
          <div className="swarm-dispatch-list">
            {swarmDispatches.map((d) => (
              <div key={d.id} className="swarm-dispatch-row">
                <div className="dispatch-route-pill">
                  <code>{d.sender}</code>
                  <span>→</span>
                  <code>{d.recipient}</code>
                </div>
                <div className="dispatch-preview-text">{d.preview}</div>
                {onReplayDispatchWalk && (
                  <button
                    type="button"
                    className="btn-replay-walk"
                    onClick={() => {
                      onReplayDispatchWalk(d)
                      onClose()
                    }}
                  >
                    🚶 Replay Walk
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
