import React, { useState } from 'react'
import { DEFAULT_PHASE1_KANBAN_TICKETS, KanbanTicketItem } from './WhiteboardModal'

export interface WallTaskBoardProps {
  tickets?: KanbanTicketItem[]
  lightingMode?: 'day' | 'night'
  onActivate?: () => void
}

export const WALL_BOARD_RECT = {
  left: 63.0,
  top: 22.2,
  width: 11.4,
  height: 15.8,
  skewDeg: 25.6,
  zIndex: 15,
} as const

const COLUMNS: ReadonlyArray<{
  status: KanbanTicketItem['status']
  title: string
  noteClass: string
}> = [
  { status: 'Todo', title: 'Todo', noteClass: 'note-todo' },
  { status: 'In Progress', title: 'In Progress', noteClass: 'note-in-progress' },
  { status: 'Done', title: 'Done', noteClass: 'note-done' },
]

export const WallTaskBoard: React.FC<WallTaskBoardProps> = ({
  tickets = DEFAULT_PHASE1_KANBAN_TICKETS,
  lightingMode = 'day',
  onActivate,
}) => {
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null)
  const hoveredTicket = hoveredTicketId
    ? tickets.find((t) => t.id === hoveredTicketId) ?? null
    : null

  const handleActivate = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    onActivate?.()
  }

  return (
    <>
      <div
        className={`wall-task-board lighting-${lightingMode}`}
        data-testid="wall-task-board"
        style={{
          position: 'absolute',
          left: `${WALL_BOARD_RECT.left}%`,
          top: `${WALL_BOARD_RECT.top}%`,
          width: `${WALL_BOARD_RECT.width}%`,
          height: `${WALL_BOARD_RECT.height}%`,
          transform: `skewY(${WALL_BOARD_RECT.skewDeg}deg)`,
          transformOrigin: '0 0',
          zIndex: WALL_BOARD_RECT.zIndex,
        }}
        role="button"
        tabIndex={0}
        aria-label="In-world Project #14 Kanban TaskBoard"
        title="Click to open full Project #14 Kanban Whiteboard Modal"
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleActivate(e)
          }
        }}
      >
        <div className="wall-task-board-surface" />
        <div className="wall-task-board-columns">
          {COLUMNS.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.status)
            return (
              <div
                key={col.status}
                className="wall-task-col"
                data-testid={`wall-col-${col.status.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="wall-task-col-title">{col.title}</div>
                <div className="wall-task-col-notes">
                  {colTickets.map((ticket) => (
                    <span
                      key={ticket.id}
                      data-testid={`wall-note-${ticket.number}`}
                      className={`wall-task-note ${col.noteClass}`}
                      aria-label={`#${ticket.number}: ${ticket.title}`}
                      onMouseEnter={() => setHoveredTicketId(ticket.id)}
                      onMouseLeave={() => setHoveredTicketId(null)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="wall-task-board-footer">PROJECT #14</div>
        {lightingMode === 'night' && (
          <div className="wall-task-board-night-tint" aria-hidden="true" />
        )}
      </div>

      {hoveredTicket && (
        <div
          className="wall-task-board-tooltip"
          data-testid="wall-task-board-tooltip"
          style={{
            position: 'absolute',
            left: `${WALL_BOARD_RECT.left + WALL_BOARD_RECT.width / 2}%`,
            top: `${WALL_BOARD_RECT.top - 1.5}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: 950,
          }}
        >
          <span className={`tooltip-dot status-${hoveredTicket.status.toLowerCase().replace(/\s+/g, '-')}`} />
          <strong>#{hoveredTicket.number}</strong> · {hoveredTicket.title}
        </div>
      )}
    </>
  )
}
