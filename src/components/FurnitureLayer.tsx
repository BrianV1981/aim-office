import React, { useState } from 'react'
import { FurnitureAsset } from '../office/types'
import { computeDepthZIndex } from '../office/waypointGraph'

export interface FurnitureLayerProps {
  items: FurnitureAsset[]
  amnesiaDeskIds?: Set<string>
  selectedDeskId?: string | null
  onFurnitureClick?: (item: FurnitureAsset) => void
}

const FallbackFurnitureSvg: React.FC<{
  item: FurnitureAsset
  isAmnesiaAlert: boolean
}> = ({ item, isAmnesiaAlert }) => {
  switch (item.category) {
    case 'boss-desk':
      return (
        <svg width="116" height="84" viewBox="0 0 116 84" aria-hidden="true">
          <polygon
            points="58,10 110,36 58,62 6,36"
            fill="#1e293b"
            stroke="#fbbf24"
            strokeWidth="2.5"
          />
          <polygon points="6,36 58,62 58,78 6,52" fill="#0f172a" stroke="#b45309" strokeWidth="1.5" />
          <polygon
            points="110,36 58,62 58,78 110,52"
            fill="#111827"
            stroke="#b45309"
            strokeWidth="1.5"
          />
          {/* Triple Command Monitors */}
          <rect x="34" y="14" width="16" height="11" rx="1" fill="#38bdf8" stroke="#0284c7" />
          <rect x="52" y="11" width="18" height="12" rx="1" fill="#22d3ee" stroke="#0284c7" />
          <rect x="72" y="14" width="16" height="11" rx="1" fill="#38bdf8" stroke="#0284c7" />
          <text x="58" y="46" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="monospace">
            J.O.S.H.U.A.
          </text>
        </svg>
      )
    case 'whiteboard':
      return (
        <svg width="112" height="74" viewBox="0 0 112 74" aria-hidden="true">
          <rect
            x="6"
            y="6"
            width="100"
            height="58"
            rx="4"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <line x1="39" y1="16" x2="39" y2="58" stroke="#334155" strokeWidth="1.5" />
          <line x1="73" y1="16" x2="73" y2="58" stroke="#334155" strokeWidth="1.5" />
          <rect x="12" y="20" width="20" height="8" rx="1" fill="#f59e0b" />
          <rect x="46" y="20" width="20" height="8" rx="1" fill="#38bdf8" />
          <rect x="46" y="32" width="20" height="8" rx="1" fill="#818cf8" />
          <rect x="80" y="20" width="20" height="8" rx="1" fill="#22c55e" />
          <text x="56" y="14" textAnchor="middle" fill="#e2e8f0" fontSize="7" fontFamily="monospace">
            KANBAN #14
          </text>
        </svg>
      )
    case 'memory-vault':
      return (
        <svg width="92" height="98" viewBox="0 0 92 98" aria-hidden="true">
          <rect
            x="16"
            y="8"
            width="60"
            height="82"
            rx="4"
            fill="#090d16"
            stroke="#a855f7"
            strokeWidth="2"
          />
          <rect x="22" y="16" width="48" height="12" fill="#1e1b4b" stroke="#7e22ce" />
          <rect x="22" y="34" width="48" height="12" fill="#1e1b4b" stroke="#7e22ce" />
          <rect x="22" y="52" width="48" height="12" fill="#1e1b4b" stroke="#7e22ce" />
          <circle cx="30" cy="22" r="2.5" fill="#22c55e" />
          <circle cx="38" cy="22" r="2.5" fill="#38bdf8" />
          <circle cx="30" cy="40" r="2.5" fill="#a855f7" />
          <circle cx="30" cy="58" r="2.5" fill="#22c55e" />
          <text x="46" y="80" textAnchor="middle" fill="#c084fc" fontSize="7" fontFamily="monospace">
            MEMORY WIKI
          </text>
        </svg>
      )
    case 'coffee-station':
      return (
        <svg width="76" height="68" viewBox="0 0 76 68" aria-hidden="true">
          <polygon points="38,16 70,32 38,48 6,32" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
          <polygon points="6,32 38,48 38,64 6,48" fill="#1e293b" />
          <polygon points="70,32 38,48 38,64 70,48" fill="#0f172a" />
          <rect x="30" y="8" width="16" height="18" rx="2" fill="#dc2626" stroke="#fca5a5" />
          <text x="38" y="42" textAnchor="middle" fill="#f8fafc" fontSize="7" fontFamily="monospace">
            ESPRESSO
          </text>
        </svg>
      )
    case 'entry-door':
      return (
        <svg width="68" height="88" viewBox="0 0 68 88" aria-hidden="true">
          <rect
            x="12"
            y="6"
            width="44"
            height="76"
            rx="3"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <rect x="18" y="12" width="32" height="28" fill="#0ea5e9" fillOpacity="0.25" />
          <circle cx="48" cy="48" r="3" fill="#fbbf24" />
          <text x="34" y="74" textAnchor="middle" fill="#7dd3fc" fontSize="7" fontFamily="monospace">
            PORTAL
          </text>
        </svg>
      )
    default: {
      const strokeColor = isAmnesiaAlert ? '#ef4444' : '#38bdf8'
      const topFill = isAmnesiaAlert ? '#450a0a' : '#1e293b'
      return (
        <svg width="78" height="62" viewBox="0 0 78 62" aria-hidden="true">
          <polygon
            points="39,12 73,29 39,46 5,29"
            fill={topFill}
            stroke={strokeColor}
            strokeWidth="1.8"
          />
          <polygon points="5,29 39,46 39,58 5,41" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <polygon points="73,29 39,46 39,58 73,41" fill="#111827" stroke="#334155" strokeWidth="1" />
          {/* Dual Isometric Monitors */}
          <rect x="24" y="11" width="13" height="9" rx="1" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="0.8" />
          <rect x="40" y="11" width="13" height="9" rx="1" fill="#6366f1" stroke="#c7d2fe" strokeWidth="0.8" />
        </svg>
      )
    }
  }
}

const FurnitureNode: React.FC<{
  item: FurnitureAsset
  isAmnesiaAlert: boolean
  isSelected: boolean
  onFurnitureClick?: (item: FurnitureAsset) => void
}> = ({ item, isAmnesiaAlert, isSelected, onFurnitureClick }) => {
  const [spriteFailed, setSpriteFailed] = useState(false)
  const zIndex = item.zIndexOverride ?? computeDepthZIndex(item.y)

  return (
    <div
      data-testid={`furniture-${item.id}`}
      data-category={item.category}
      data-zindex={zIndex}
      className={`office-furniture-item category-${item.category}${
        item.interactive ? ' is-interactive' : ''
      }${isAmnesiaAlert ? ' is-amnesia-alert' : ''}${isSelected ? ' is-selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: 'translate(-50%, -85%)',
        zIndex,
        cursor: item.interactive ? 'pointer' : 'default',
      }}
      title={item.label}
      onClick={item.interactive && onFurnitureClick ? () => onFurnitureClick(item) : undefined}
    >
      {!spriteFailed ? (
        <img
          src={item.spritePath}
          alt={item.label}
          width={item.widthPx ?? 78}
          height={item.heightPx ?? 62}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
            filter: isAmnesiaAlert
              ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))'
              : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))',
          }}
          onError={() => setSpriteFailed(true)}
          draggable={false}
        />
      ) : (
        <FallbackFurnitureSvg item={item} isAmnesiaAlert={isAmnesiaAlert} />
      )}
      {(item.category === 'boss-desk' ||
        item.category === 'whiteboard' ||
        item.category === 'memory-vault' ||
        item.category === 'coffee-station') && (
        <span className="furniture-tag">{item.label.split(' (')[0]}</span>
      )}
    </div>
  )
}

export const FurnitureLayer: React.FC<FurnitureLayerProps> = React.memo(
  ({ items, amnesiaDeskIds, selectedDeskId, onFurnitureClick }) => {
    return (
      <div className="office-furniture-layer" data-testid="furniture-layer">
        {items.map((item) => (
          <FurnitureNode
            key={item.id}
            item={item}
            isAmnesiaAlert={Boolean(amnesiaDeskIds?.has(item.id))}
            isSelected={selectedDeskId === item.id}
            onFurnitureClick={onFurnitureClick}
          />
        ))}
      </div>
    )
  }
)
