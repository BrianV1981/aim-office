import React, { useState } from 'react'
import { WallBoardRectConfig } from '../office/types'
import { DEFAULT_PHASE1_KANBAN_TICKETS, KanbanTicketItem } from './WhiteboardModal'

export interface WallTaskBoardProps {
  tickets?: KanbanTicketItem[]
  boardLabel?: string
  lightingMode?: 'day' | 'night'
  rect?: WallBoardRectConfig
  onActivate?: () => void
}

export const WALL_BOARD_RECT: WallBoardRectConfig = {
  left: 63.0,
  top: 22.2,
  width: 11.4,
  height: 15.8,
  skewDeg: 25.6,
  zIndex: 15,
  variant: 'whiteboard',
}

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
  boardLabel = 'PROJECT #14',
  lightingMode = 'day',
  rect = WALL_BOARD_RECT,
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

  const variant = rect.variant ?? 'whiteboard'

  return (
    <>
      <div
        className={`wall-task-board lighting-${lightingMode} variant-${variant}`}
        data-testid="wall-task-board"
        data-variant={variant}
        style={{
          position: 'absolute',
          left: `${rect.left}%`,
          top: `${rect.top}%`,
          width: `${rect.width}%`,
          height: `${rect.height}%`,
          transform: `skewY(${rect.skewDeg}deg)`,
          transformOrigin: '0 0',
          zIndex: rect.zIndex,
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
        <div className="wall-task-board-header" data-testid="wall-task-board-header">
          {boardLabel}
        </div>
        <div className="wall-task-board-columns">
          {COLUMNS.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.status)
            const visibleNotes = colTickets.slice(0, 6)
            return (
              <div
                key={col.status}
                className="wall-task-col"
                data-testid={`wall-col-${col.status.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="wall-task-col-title">
                  {col.title} ({colTickets.length})
                </div>
                <div className="wall-task-col-notes">
                  {visibleNotes.map((ticket) => (
                    <span
                      key={ticket.id}
                      data-testid={`wall-note-${ticket.number}`}
                      className={`wall-task-note ${col.noteClass}`}
                      aria-label={`#${ticket.number}: ${ticket.title}`}
                      onMouseEnter={() => setHoveredTicketId(ticket.id)}
                      onMouseLeave={() => setHoveredTicketId(null)}
                    >
                      <span className="wall-task-note-num">#{ticket.number}</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="wall-task-board-footer" data-testid="wall-task-board-footer">
          {boardLabel}
        </div>
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
            left: `${rect.left + rect.width / 2}%`,
            top: `${rect.top - 1.5}%`,
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
