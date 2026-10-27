import React from 'react'
import { SMART_FURNITURE_CATALOG } from '../office/layoutPersistence'
import { FurnitureAsset } from '../office/types'

export interface BuildModeDockProps {
  isOpen: boolean
  selectedFurniture: FurnitureAsset | null
  onAddCatalogProp: (catalogId: string) => void
  onDeleteSelectedProp: (furnitureId: string) => void
  onResetThemeLayout: () => void
  onCloseBuildMode: () => void
}

export const BuildModeDock: React.FC<BuildModeDockProps> = ({
  isOpen,
  selectedFurniture,
  onAddCatalogProp,
  onDeleteSelectedProp,
  onResetThemeLayout,
  onCloseBuildMode,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="build-mode-dock"
      data-testid="build-mode-dock"
      role="region"
      aria-label="Interactive Layout & Smart Furniture Builder"
    >
      <div className="build-dock-header">
        <div className="build-dock-title-group">
          <span className="build-dock-badge">🛠️ BUILD MODE</span>
          <span className="build-dock-hint">
            Drag any desk or prop on the floor · Idle agents automatically use placed stations
          </span>
        </div>

        <div className="build-dock-actions">
          {selectedFurniture && (
            <span className="build-selected-pill" data-testid="build-selected-furniture">
              Selected: <strong>{selectedFurniture.label}</strong> ({selectedFurniture.x}%,{' '}
              {selectedFurniture.y}%)
            </span>
          )}

          {selectedFurniture?.isUserPlaced && (
            <button
              type="button"
              className="build-btn btn-delete-prop"
              data-testid="btn-delete-selected-prop"
              onClick={() => onDeleteSelectedProp(selectedFurniture.id)}
              title="Remove selected user-placed furniture item"
            >
              🗑️ Delete Prop
            </button>
          )}

          <button
            type="button"
            className="build-btn btn-reset-layout"
            data-testid="btn-reset-layout"
            onClick={onResetThemeLayout}
            title="Reset all desk and furniture positions in this theme to factory defaults"
          >
            ↺ Reset Layout
          </button>

          <button
            type="button"
            className="build-btn btn-done-build"
            data-testid="btn-close-build-mode"
            onClick={onCloseBuildMode}
          >
            ✓ Done
          </button>
        </div>
      </div>

      <div className="build-catalog-row" data-testid="build-catalog-row">
        {SMART_FURNITURE_CATALOG.map((item) => (
          <button
            key={item.catalogId}
            type="button"
            className="build-catalog-item-btn"
            data-testid={`btn-add-prop-${item.category}`}
            onClick={() => onAddCatalogProp(item.catalogId)}
            title={item.description}
          >
            <span className="catalog-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="catalog-label">+ {item.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
