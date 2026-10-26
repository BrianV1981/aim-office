import React, { useState } from 'react'
import { FurnitureAsset } from '../office/types'
import { computeDepthZIndex } from '../office/waypointGraph'

export interface FurnitureLayerProps {
  items: FurnitureAsset[]
  amnesiaDeskIds?: Set<string>
  selectedDeskId?: string | null
  onFurnitureClick?: (item: FurnitureAsset) => void
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
      <rect x="28" y="16" width="15" height="10" rx="1" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="0.8" />
      <rect x="47" y="16" width="15" height="10" rx="1" fill="#6366f1" stroke="#c7d2fe" strokeWidth="0.8" />
    </svg>
  )
}

const FurnitureNode: React.FC<{
  item: FurnitureAsset
  isAmnesiaAlert: boolean
  isSelected: boolean
  onFurnitureClick?: (item: FurnitureAsset) => void
}> = ({ item, isAmnesiaAlert, isSelected, onFurnitureClick }) => {
  const [spriteFailed, setSpriteFailed] = useState(false)
  const zIndex = item.zIndexOverride ?? computeDepthZIndex(item.y)

  // Wall features (entry-door, whiteboard, coffee-station, memory-vault) are painted into
  // office-day.png / office-night.png — render as transparent interactive hotspots.
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

  return (
    <div
      data-testid={`furniture-${item.id}`}
      data-category={item.category}
      data-zindex={zIndex}
      className={`office-furniture-item is-desk category-${item.category}${
        item.interactive ? ' is-interactive' : ''
      }${isAmnesiaAlert ? ' is-amnesia-alert' : ''}${isSelected ? ' is-selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        height: '12%',
        transform: 'translate(-50%, -100%)',
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
          height={item.heightPx ?? 92}
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
