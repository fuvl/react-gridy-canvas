import type { ReactNode } from 'react'
import type { HandleComponent } from 'react-rnd' // Import HandleComponent type

// Basic Types
export interface GridItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** If true, disables dragging and resizing on this item */
  locked?: boolean
  /** If true, this item will not shift on collision during others' drag/resize */
  disableCollision?: boolean
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
  layout: GridItem[]
  /** Callback when layout changes */
  onLayoutChange: (newLayout: GridItem[], oldLayout: GridItem[]) => void
  /** Width of the canvas */
  width: number
  /** Height of the canvas */
  height: number
  /** Optional CSS transform-origin for the grid container; no origin applied by default */
  transformOrigin?: string
  /** Scale (zoom) factor for the grid container */
  scale?: number
  /** Grid unit size for snapping position; can be single number or [x, y] */
  gridUnitSize?: number | [number, number]
  /** Grid unit size for snapping resize dimensions; single number or [width, height] */
  resizeUnitSize?: number | [number, number]
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
    selection: SelectionRectangle | null,
    mousePosition: MousePosition,
    isValidSelection: boolean,
    selectedItemIds: string[],
    clearSelectionFn: () => void,
  ) => void
  /** If true, displays grid lines based on snapGridUnit */
  showGridLines?: boolean
  /** Optional CSS class name for the grid lines container */
  gridLinesClassName?: string
  /** Custom class for the selection rectangle container */
  selectionRectangleClassName?: string
  /** Custom class for the invalid-selection rectangle state */
  invalidSelectionClassName?: string
  /** Children must be React elements with unique `key` props matching layout item IDs */
  children: ReactNode
  /** Optional custom components for resize handles */
  resizeHandleComponent?: HandleComponent
  /** Optional CSS class name for the drag handle element within children */
  dragHandleClassName?: string
  /** Optional function to provide dynamic class names for each item container (e.g. selected state) */
  getSelectedItemClassName?: (itemId: string) => string
  /** Called when an item drag starts; returns item ID and start position */
  onDragStart?: (itemId: string, position: { x: number; y: number }) => void
  /** Called when an item drag ends; returns item ID and end position */
  onDragEnd?: (itemId: string, position: { x: number; y: number }) => void
  /** Called when an item resize starts; returns item ID and start rect */
  onResizeStart?: (itemId: string, rect: { x: number; y: number; width: number; height: number }) => void
  /** Called when an item resize ends; returns item ID and end rect */
  onResizeEnd?: (itemId: string, rect: { x: number; y: number; width: number; height: number }) => void
}

// Internal Types
export interface SimulateShiftResult {
  previewLayout: GridItem[]
  canDrop: boolean
  dropZone?: GridItem
}

export type UpdateDropZoneCallback = (pos: GridItem | null) => void
