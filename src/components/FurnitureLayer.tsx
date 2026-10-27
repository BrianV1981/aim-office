import React, { useState } from 'react'
import { FurnitureAsset, FurnitureCategory } from '../office/types'
import { computeDepthZIndex } from '../office/waypointGraph'

export interface FurnitureLayerProps {
  items: FurnitureAsset[]
  amnesiaDeskIds?: Set<string>
  selectedDeskId?: string | null
  isBuildMode?: boolean
  onFurnitureClick?: (item: FurnitureAsset) => void
  onFurnitureDragStart?: (
    item: FurnitureAsset,
    clientX: number,
    clientY: number
  ) => void
}

const FallbackDeskSvg: React.FC<{
  isAmnesiaAlert: boolean
}> = ({ isAmnesiaAlert }) => {
  const strokeColor = isAmnesiaAlert ? '#ef4444' : '#38bdf8'
  const topFill = isAmnesiaAlert ? '#450a0a' : '#1e293b'
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
      <polygon
        points="46,18 84,38 46,58 8,38"
        fill={topFill}
        stroke={strokeColor}
        strokeWidth="1.8"
      />
      <polygon points="8,38 46,58 46,78 8,58" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <polygon points="84,38 46,58 46,78 84,58" fill="#111827" stroke="#334155" strokeWidth="1" />
      <rect
        x="28"
        y="16"
        width="15"
        height="10"
        rx="1"
        fill="#0ea5e9"
        stroke="#bae6fd"
        strokeWidth="0.8"
      />
      <rect
        x="47"
        y="16"
        width="15"
        height="10"
        rx="1"
        fill="#6366f1"
        stroke="#c7d2fe"
        strokeWidth="0.8"
      />
    </svg>
  )
}

/**
 * Isometric 2.5D Pixel-Art SVG Renderers for Smart Hangout Furniture
 */
const SmartPropIsometricSvg: React.FC<{ category: FurnitureCategory }> = ({ category }) => {
  switch (category) {
    case 'lounge-couch':
      return (
        <svg
          width="112"
          height="78"
          viewBox="0 0 112 78"
          className="smart-prop-svg prop-lounge-couch"
          aria-hidden="true"
        >
          <ellipse cx="56" cy="68" rx="46" ry="9" fill="rgba(0,0,0,0.45)" />
          {/* Isometric Sofa Base */}
          <polygon
            points="16,44 56,26 96,44 56,62"
            fill="#7c2d12"
            stroke="#fb923c"
            strokeWidth="1.5"
          />
          <polygon
            points="16,44 56,62 56,72 16,54"
            fill="#431407"
            stroke="#7c2d12"
            strokeWidth="1.2"
          />
          <polygon
            points="96,44 56,62 56,72 96,54"
            fill="#5b1e0c"
            stroke="#9a3412"
            strokeWidth="1.2"
          />
          {/* Plush Backrest */}
          <polygon
            points="22,26 56,10 90,26 56,42"
            fill="#9a3412"
            stroke="#fdba74"
            strokeWidth="1.4"
          />
          {/* Cushions */}
          <polygon points="32,42 56,31 78,42 56,53" fill="#c2410c" />
          <circle cx="38" cy="36" r="3" fill="#fed7aa" />
          <circle cx="74" cy="36" r="3" fill="#fed7aa" />
        </svg>
      )

    case 'smoke-station':
      return (
        <svg
          width="76"
          height="88"
          viewBox="0 0 76 88"
          className="smart-prop-svg prop-smoke-station"
          aria-hidden="true"
        >
          <ellipse cx="38" cy="76" rx="24" ry="7" fill="rgba(0,0,0,0.5)" />
          {/* Brass Pedestal Base */}
          <ellipse cx="38" cy="72" rx="16" ry="6" fill="#b45309" stroke="#fde68a" strokeWidth="1.5" />
          <rect x="34" y="42" width="8" height="30" fill="#d97706" stroke="#fef3c7" strokeWidth="1" />
          {/* Ashtray Bowl + Glowing Cigar */}
          <ellipse cx="38" cy="42" rx="18" ry="7" fill="#451a03" stroke="#fbbf24" strokeWidth="1.8" />
          <line x1="27" y1="40" x2="42" y2="43" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
          <circle cx="43" cy="43" r="2.5" fill="#ef4444" />
          {/* Rising Smoke Plumes */}
          <circle cx="44" cy="31" r="3.5" fill="rgba(226,232,240,0.55)" className="fx-smoke-puff puff-1" />
          <circle cx="40" cy="21" r="5" fill="rgba(203,213,225,0.42)" className="fx-smoke-puff puff-2" />
          <circle cx="46" cy="11" r="6.5" fill="rgba(148,163,184,0.28)" className="fx-smoke-puff puff-3" />
        </svg>
      )

    case 'vape-station':
      return (
        <svg
          width="80"
          height="92"
          viewBox="0 0 80 92"
          className="smart-prop-svg prop-vape-station"
          aria-hidden="true"
        >
          <ellipse cx="40" cy="80" rx="26" ry="8" fill="rgba(56,189,248,0.32)" />
          {/* Cyber Pedestal */}
          <polygon
            points="22,72 40,64 58,72 40,80"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.6"
          />
          <rect
            x="33"
            y="40"
            width="14"
            height="32"
            rx="3"
            fill="#1e1b4b"
            stroke="#a855f7"
            strokeWidth="1.5"
          />
          {/* Glowing Neon Vapor Core */}
          <ellipse cx="40" cy="40" rx="16" ry="6" fill="#06b6d4" stroke="#e0f2fe" strokeWidth="1.5" />
          <circle cx="40" cy="28" r="4.5" fill="rgba(56,189,248,0.65)" className="fx-vapor-puff puff-1" />
          <circle cx="35" cy="18" r="6" fill="rgba(168,85,247,0.5)" className="fx-vapor-puff puff-2" />
          <circle cx="44" cy="9" r="7.5" fill="rgba(56,189,248,0.35)" className="fx-vapor-puff puff-3" />
        </svg>
      )

    case 'water-cooler':
      return (
        <svg
          width="68"
          height="88"
          viewBox="0 0 68 88"
          className="smart-prop-svg prop-water-cooler"
          aria-hidden="true"
        >
          <ellipse cx="34" cy="78" rx="20" ry="6" fill="rgba(0,0,0,0.45)" />
          <rect
            x="22"
            y="42"
            width="24"
            height="34"
            rx="3"
            fill="#e2e8f0"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Blue Water Jug */}
          <rect
            x="24"
            y="16"
            width="20"
            height="26"
            rx="6"
            fill="rgba(56,189,248,0.72)"
            stroke="#bae6fd"
            strokeWidth="1.5"
          />
          <circle cx="31" cy="28" r="2.2" fill="#f0f9ff" />
          <circle cx="37" cy="22" r="1.6" fill="#f0f9ff" />
          <rect x="28" y="50" width="4" height="6" fill="#ef4444" />
          <rect x="36" y="50" width="4" height="6" fill="#3b82f6" />
        </svg>
      )

    case 'arcade-cabinet':
      return (
        <svg
          width="76"
          height="94"
          viewBox="0 0 76 94"
          className="smart-prop-svg prop-arcade-cabinet"
          aria-hidden="true"
        >
          <ellipse cx="38" cy="84" rx="24" ry="7" fill="rgba(0,0,0,0.55)" />
          <rect
            x="20"
            y="14"
            width="36"
            height="68"
            rx="4"
            fill="#1e1b4b"
            stroke="#f43f5e"
            strokeWidth="2"
          />
          {/* Marquee */}
          <rect x="23" y="17" width="30" height="9" fill="#fbbf24" />
          {/* CRT Screen */}
          <rect
            x="25"
            y="29"
            width="26"
            height="20"
            rx="2"
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="1.4"
          />
          {/* Joystick & Buttons */}
          <polygon points="20,52 56,52 60,59 16,59" fill="#312e81" stroke="#f43f5e" strokeWidth="1.2" />
          <circle cx="28" cy="55" r="2.5" fill="#ef4444" />
          <circle cx="44" cy="55" r="2" fill="#22c55e" />
          <circle cx="50" cy="55" r="2" fill="#eab308" />
        </svg>
      )

    case 'coffee-station':
    default:
      return (
        <svg
          width="88"
          height="86"
          viewBox="0 0 88 86"
          className="smart-prop-svg prop-coffee-bar"
          aria-hidden="true"
        >
          <ellipse cx="44" cy="76" rx="34" ry="8" fill="rgba(0,0,0,0.48)" />
          {/* Isometric Espresso Counter */}
          <polygon
            points="14,48 44,34 74,48 44,62"
            fill="#78350f"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          <polygon points="14,48 44,62 44,76 14,62" fill="#451a03" stroke="#78350f" strokeWidth="1.2" />
          <polygon points="74,48 44,62 44,76 74,62" fill="#5c2409" stroke="#92400e" strokeWidth="1.2" />
          {/* Espresso Machine */}
          <rect
            x="30"
            y="24"
            width="22"
            height="18"
            rx="2"
            fill="#334155"
            stroke="#94a3b8"
            strokeWidth="1.3"
          />
          {/* Coffee Mugs + Rising Steam */}
          <rect x="56" y="34" width="7" height="8" rx="1.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="59" cy="26" r="2.8" fill="rgba(248,250,252,0.65)" className="fx-smoke-puff puff-1" />
          <circle cx="62" cy="18" r="3.8" fill="rgba(248,250,252,0.4)" className="fx-smoke-puff puff-2" />
        </svg>
      )
  }
}

const SMART_PROP_CATEGORIES = new Set<FurnitureCategory>([
  'coffee-station',
  'lounge-couch',
  'smoke-station',
  'vape-station',
  'water-cooler',
  'arcade-cabinet',
])

const FurnitureNode: React.FC<{
  item: FurnitureAsset
  isAmnesiaAlert: boolean
  isSelected: boolean
  isBuildMode: boolean
  onFurnitureClick?: (item: FurnitureAsset) => void
  onFurnitureDragStart?: (
    item: FurnitureAsset,
    clientX: number,
    clientY: number
  ) => void
}> = ({
  item,
  isAmnesiaAlert,
  isSelected,
  isBuildMode,
  onFurnitureClick,
  onFurnitureDragStart,
}) => {
  const [spriteFailed, setSpriteFailed] = useState(false)
  const zIndex = item.zIndexOverride ?? computeDepthZIndex(item.y)

  // Wall features (entry-door, whiteboard, coffee-station hotspot, memory-vault) are painted into
  // the room background — render as transparent interactive hotspots.
  if (item.isHotspot) {
    return (
      <div
        data-testid={`furniture-${item.id}`}
        data-category={item.category}
        data-hotspot="true"
        data-zindex={zIndex}
        className={`office-furniture-hotspot category-${item.category}${
          item.interactive ? ' is-interactive' : ''
        }${isSelected ? ' is-selected' : ''}`}
        style={{
          position: 'absolute',
          left: `${item.x}%`,
          top: `${item.y}%`,
          width: `${item.widthPct ?? 8}%`,
          height: `${item.heightPct ?? 15}%`,
          transform: 'translate(-50%, -50%)',
          zIndex,
          cursor: item.interactive ? 'pointer' : 'default',
        }}
        title={item.label}
        role={item.interactive ? 'button' : undefined}
        tabIndex={item.interactive ? 0 : undefined}
        aria-label={item.label}
        onClick={item.interactive && onFurnitureClick ? () => onFurnitureClick(item) : undefined}
        onKeyDown={
          item.interactive && onFurnitureClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onFurnitureClick(item)
                }
              }
            : undefined
        }
      >
        <span className="hotspot-hover-tooltip">{item.label}</span>
      </div>
    )
  }

  const isSmartProp = SMART_PROP_CATEGORIES.has(item.category) && !item.spritePath

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBuildMode || e.button !== 0) return
    e.stopPropagation()
    onFurnitureClick?.(item)
    onFurnitureDragStart?.(item, e.clientX, e.clientY)
  }

  return (
    <div
      data-testid={`furniture-${item.id}`}
      data-category={item.category}
      data-zindex={zIndex}
      data-x={item.x}
      data-y={item.y}
      className={`office-furniture-item ${isSmartProp ? 'is-smart-prop' : 'is-desk'} category-${
        item.category
      }${item.interactive || isBuildMode ? ' is-interactive' : ''}${
        isAmnesiaAlert ? ' is-amnesia-alert' : ''
      }${isSelected ? ' is-selected' : ''}${isBuildMode ? ' is-build-draggable' : ''}`}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        height: isSmartProp ? '9.6%' : '9.0%',
        transform: 'translate(-50%, -100%)',
        zIndex,
        cursor: isBuildMode ? 'grab' : item.interactive ? 'pointer' : 'default',
      }}
      title={
        isBuildMode
          ? `🛠️ Drag to move ${item.label} (${item.x}%, ${item.y}%)`
          : item.label
      }
      onMouseDown={handleMouseDown}
      onClick={
        !isBuildMode && item.interactive && onFurnitureClick
          ? () => onFurnitureClick(item)
          : undefined
      }
    >
      {isBuildMode && (
        <span className="build-mode-coord-badge" data-testid={`coord-${item.id}`}>
          {item.id} · {item.x}%,{item.y}%
        </span>
      )}

      {isSmartProp ? (
        <SmartPropIsometricSvg category={item.category} />
      ) : !spriteFailed && item.spritePath ? (
        <img
          src={item.spritePath}
          alt={item.label}
          height={item.heightPx ?? 68}
          style={{
            height: '100%',
            width: 'auto',
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
        <FallbackDeskSvg isAmnesiaAlert={isAmnesiaAlert} />
      )}
    </div>
  )
}

export const FurnitureLayer: React.FC<FurnitureLayerProps> = React.memo(
  ({
    items,
    amnesiaDeskIds,
    selectedDeskId,
    isBuildMode = false,
    onFurnitureClick,
    onFurnitureDragStart,
  }) => {
    return (
      <div className="office-furniture-layer" data-testid="furniture-layer">
        {items.map((item) => (
          <FurnitureNode
            key={item.id}
            item={item}
            isAmnesiaAlert={Boolean(amnesiaDeskIds?.has(item.id))}
            isSelected={selectedDeskId === item.id}
            isBuildMode={isBuildMode}
            onFurnitureClick={onFurnitureClick}
            onFurnitureDragStart={onFurnitureDragStart}
          />
        ))}
      </div>
    )
  }
)
