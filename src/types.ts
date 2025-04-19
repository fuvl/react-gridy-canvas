import type { ReactNode } from 'react'
import type { HandleComponent } from 'react-rnd' // Import HandleComponent type

// --- Basic Types ---
export interface GridItem {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface MousePosition {
  clientX: number
  clientY: number
}

export interface SelectionRectangle {
  x: number
  y: number
  width: number
  height: number
}

// Component Props
export interface GridProps {
  /** Layout items array */
  layout: GridItem[] // Renamed from LayoutItem
  /** Callback when layout changes */
  onLayoutChange: (newLayout: GridItem[], oldLayout: GridItem[]) => void
  /** Width of the canvas */
  width: number
  /** Height of the canvas */
  height: number
  /** Grid unit for snapping position (pixels) */
  snapGridUnit?: number
  /** Grid unit for snapping resize dimensions (pixels) */
  resizeGridUnit?: number
  /** Gap between items during shift simulation (pixels) */
  gap?: number
  /** If true, items will shift others on collision */
  shiftOnCollision?: boolean
  /** If true, dragging and resizing are disabled */
  isLocked?: boolean
  /** If true, show dashed outline around items and drop zone */
  showOutline?: boolean
  /** Optional CSS class name for the main canvas div */
  className?: string
  /** If true, show a shadow where the item will drop */
  showDropZoneShadow?: boolean
  /** Optional CSS class name for the drop zone shadow */
  dropZoneClassName?: string
  /** If true, enables the selection tool */
  enableSelectionTool?: boolean
  /** If true, selection tool only works on empty space and selection is invalid if it overlaps items */
  selectOnlyEmptySpace?: boolean
  /** Minimum area (width * height) for a valid selection */
  minSelectionArea?: number
  /**
   * Callback when a selection drag finishes (mouse up).
   * Always triggered when selection tool is enabled and a drag occurs.
   */
  onSelectionEnd?: (
    selection: SelectionRectangle | null, // Allow null for the selection rectangle
    mousePosition: MousePosition,
    isValidSelection: boolean, // Indicates if selection met area/empty space criteria
    selectedItemIds: string[], // IDs of items covered >= threshold (if selectOnlyEmptySpace is false)
    clearSelectionFn: () => void,
  ) => void
  /** Children must be React elements with unique `key` props matching layout item IDs */
  children: ReactNode
  /** Optional custom components for resize handles */
  resizeHandleComponent?: HandleComponent
  /** Optional CSS class name for the drag handle element within children */
  dragHandleClassName?: string
  /** Optional function to provide dynamic class names for each item container (<Rnd>) */
  getItemClassName?: (itemId: string) => string
}

// Internal Types
export interface SimulateShiftResult {
  previewLayout: GridItem[]
  canDrop: boolean
  dropZone?: GridItem
}

export type UpdateDropZoneCallback = (pos: GridItem | null) => void
