import type { ReactNode } from 'react'
import type { HandleComponent } from 'react-rnd' // Import HandleComponent type

// Transformer Customization Types
export interface TransformerStyle {
  /** Custom class names */
  className?: string
  anchorClassName?: string
  cornerAnchorClassName?: string
  edgeAnchorClassName?: string
  rotationHandleClassName?: string
  rotationLineClassName?: string
  rotationDisplayClassName?: string

  /** Border styles */
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  borderRadius?: number

  /** Anchor styles */
  anchorSize?: number
  anchorColor?: string
  anchorBorderColor?: string
  anchorBorderWidth?: number
  anchorBorderRadius?: number

  /** Rotation handle styles */
  rotationHandleSize?: number
  rotationHandleColor?: string
  rotationHandleDistance?: number

  /** Rotation line styles */
  rotationLineColor?: string
  rotationLineWidth?: number

  /** Rotation display styles */
  rotationDisplayBackground?: string
  rotationDisplayColor?: string

  /** Visibility options */
  hideAnchors?: string[] // Array of anchor positions to hide: 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'
  hideRotationHandle?: boolean
}

// Snap Lines Types
export type SnapType = 'grid-center' | 'item-edge' | 'item-center' | 'item-distance'

export interface SnapLine {
  id: string
  type: 'vertical' | 'horizontal'
  position: number // x for vertical, y for horizontal
  start: number // start position along the line
  end: number // end position along the line
  snapType: SnapType
  itemId?: string // source item ID for item-based snap lines
  distance?: number // distance value for distance-based snap lines
  referenceItems?: string[] // IDs of items used to calculate this distance
}

export interface SnapBehaviorConfig {
  gridCenter?: boolean // Snap to grid center points
  itemEdges?: boolean // Snap to other items' edges
  itemCenters?: boolean // Snap to other items' centers
  itemDistance?: boolean // Snap to maintain distances between items
}

export interface SnapLinesStyle {
  /** Custom class names */
  className?: string
  gridSnapLineClassName?: string
  itemSnapLineClassName?: string

  /** Line styles */
  gridSnapLineColor?: string
  itemSnapLineColor?: string
  snapLineWidth?: number
  snapLineStyle?: 'solid' | 'dashed' | 'dotted'

  /** Opacity and animation */
  snapLineOpacity?: number
  snapLineAnimationDuration?: number

  /** Distance label/badge styles */
  showDistanceLabel?: boolean
  distanceLabelClassName?: string
  distanceLabelColor?: string
  distanceLabelBackground?: string
}

// Basic Types
export interface GridItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** Rotation angle in degrees (default: 0) */
  rotation?: number
  /** If true, disables dragging and resizing on this item */
  locked?: boolean
  /** If true, this item will not shift on collision during others' drag/resize */
  disableCollision?: boolean
  /** If true, shows transformer with resize anchors and rotation handles when this item is active */
  showTransformer?: boolean
  /** If true, disables rotation for this item (default: false) */
  disableRotation?: boolean
  /** Z-index for layer ordering (higher values appear on top) */
  zIndex?: number
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
  /** If true, collision detection is disabled globally for all items */
  disableCollision?: boolean
  /** If true, dragging and resizing are disabled */
  isLocked?: boolean
  /** If true, show dashed outline around items and drop zone */
  showOutline?: boolean
  /** If true, show transformer with resize anchors and rotation handles for active items */
  showTransformer?: boolean
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
  /** Grid line color (default: rgba(209, 213, 219, 0.5)) */
  gridLineColor?: string
  /** Grid line width in pixels (default: 1) */
  gridLineWidth?: number
  /** Grid line style (default: solid) */
  gridLineStyle?: 'solid' | 'dashed' | 'dotted'
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
  /** Called during rotation preview; returns item ID and current rotation angle (null when preview ends) */
  onRotationPreview?: (itemId: string, angle: number | null) => void
  /** Custom styles for the transformer component */
  transformerStyle?: TransformerStyle
  /** If true, disables animations during drag/resize for smoother interaction */
  disableAnimations?: boolean
  /** If true, shows snap lines during drag/resize operations */
  showSnapLines?: boolean
  /** Snap lines configuration and styling */
  snapLinesStyle?: SnapLinesStyle
  /** Snap threshold distance in pixels for item-to-item snapping */
  snapThreshold?: number
  /** If true, enables snapping to other items' edges and centers */
  enableItemSnapping?: boolean
  /** Configuration for different snap behaviors */
  snapBehavior?: SnapBehaviorConfig
  /** If true, disables arrow key movement for selected items (default: false) */
  disableKeyboardMovement?: boolean
}

// Internal Types
export interface SimulateShiftResult {
  previewLayout: GridItem[]
  canDrop: boolean
  dropZone?: GridItem
}

export type UpdateDropZoneCallback = (pos: GridItem | null) => void
