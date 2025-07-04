# react-gridy-canvas

A flexible grid/canvas layout component for React, built with TypeScript. It utilizes `react-rnd` for draggable and resizable items and includes features like grid snapping, collision handling, and a selection tool.

## Features

- **Draggable & Resizable Items:** Uses `react-rnd` for core interaction.
- **Grid Snapping:** Items snap to a configurable grid during drag and resize.
- **Collision Handling:** Optional automatic shifting of items to prevent overlaps (`shiftOnCollision`).
- **Per-item collision toggle:** Disable collision for specific items so they can overlap freely (`disableCollision`).
- **Per-item locking:** Lock individual items to prevent drag/resize (`locked` flag).
- **Boundary Checks:** Items are constrained within the canvas bounds.
- **Selection Tool:** Allows users to draw a rectangle to select an area or items.
  - Supports selecting only empty space.
  - Provides coordinates, validity status, and selected item IDs via callback.
- **Custom Handles:** Supports custom components for resize handles and specific drag handle elements.
- **Dynamic Styling:** Allows applying custom classes to the canvas, drop zone shadow, and individual items.
- **Zoom / Scale Support:** Optional `scale` prop lets you zoom the entire grid while preserving correct drag, resize and selection behaviors.
- **Custom Transform Origin:** Optional control over the pivot point when zooming the grid (via `transformOrigin`).
- **Snap Lines & Guides:** Visual alignment guides that appear during drag/resize operations to help with precise positioning.
  - **Grid Snap Lines:** Snap to canvas center points.
  - **Item Snap Lines:** Snap to other items' edges and centers.
  - **Distance Indicators:** Show spacing between aligned items with measurements.
  - **Customizable Styling:** Full control over colors, opacity, and line styles.
- **Advanced Item Features:**
  - **Rotation Support:** Items can be rotated with visual rotation handles.
  - **Z-Index Control:** Layer ordering for overlapping items.
  - **Transformer Tool:** Konva-style visual editing controls with resize anchors and rotation handles.
  - **Keyboard Movement:** Arrow key support for moving selected items by grid units.

## Installation

```bash
npm install react-gridy-canvas
# or
yarn add react-gridy-canvas
# or
pnpm add react-gridy-canvas
```

You also need to ensure you have `react` and `react-dom` installed as peer dependencies.

## Usage

```tsx
import React, { useState, useCallback } from 'react'
import Grid, { GridItem, GridProps } from 'react-gridy-canvas'
import 'react-gridy-canvas/dist/index.css'

const initialLayout: GridItem[] = [
  { id: 'item-1', x: 10, y: 10, width: 100, height: 50 },
  { id: 'item-2', x: 120, y: 70, width: 150, height: 80 },
]

function MyComponent() {
  const [layout, setLayout] = useState<GridItem[]>(initialLayout)

  const handleLayoutChange = useCallback((newLayout: GridItem[]) => {
    setLayout(newLayout)
    console.log('Layout updated:', newLayout)
  }, [])

  const handleSelectionEnd = useCallback((selection, mousePosition, isValid, itemIds, clearSelectionFn) => {
    console.log('Selection ended:', {
      selection,
      mousePosition,
      isValid,
      itemIds,
    })
    // If needed, call clearSelectionFn() here or store it to call later
  }, [])

  const gridProps: GridProps = {
    width: 800,
    height: 600,
    layout: layout,
    onLayoutChange: handleLayoutChange,
    onSelectionEnd: handleSelectionEnd,
    enableSelectionTool: true,
    gridUnitSize: 10,
    resizeUnitSize: 10,
    /** Optional canvas zoom factor */
    scale: 1,
    /** Optional zoom pivot (transform-origin) */
    transformOrigin: '0px 0px',
    onDragStart: (id, pos) => console.log('drag started', id, pos),
    onDragEnd: (id, pos) => console.log('drag ended', id, pos),
    onResizeStart: (id, rect) => console.log('resize started', id, rect),
    onResizeEnd: (id, rect) => console.log('resize ended', id, rect),
  }

  return (
    <Grid {...gridProps}>
      {layout.map((item) => (
        <div
          key={item.id}
          style={{
            background: 'lightblue',
            border: '1px solid blue',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          Item {item.id}
        </div>
      ))}
    </Grid>
  )
}

export default MyComponent
```

## Props

| Prop                       | Type                                                                                                                                                               | Default                                  | Description                                                                                                                                               |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `width`                    | `number`                                                                                                                                                           | _Required_                               | The width of the grid container in pixels.                                                                                                                |
| `height`                   | `number`                                                                                                                                                           | _Required_                               | The height of the grid container in pixels.                                                                                                               |
| `layout`                   | `GridItem[]`                                                                                                                                                       | _Required_                               | An array of objects defining the initial position and size of each item. Each item must have a unique `id`.                                               |
| `onLayoutChange`           | `(newLayout: GridItem[], oldLayout: GridItem[]) => void`                                                                                                           | _Required_                               | Callback when layout changes; first argument is the updated layout array, second is the previous (old) layout array.                                      |
| `children`                 | `ReactNode`                                                                                                                                                        | _Required_                               | The child components to be rendered within the grid items. Each child **must** have a `key` prop matching the `id` in the `layout` array.                 |
| `gridUnitSize`             | `number &#124; [number, number]`                                                                                                                                   | `10`                                     | The X/Y grid unit size in pixels for snapping item positions during drag; if tuple, first is X and second is Y. Set to `0` for canvas-like free movement. |
| `resizeUnitSize`           | `number &#124; [number, number]`                                                                                                                                   | `10`                                     | The width/height grid unit size in pixels for snapping resize dimensions; if tuple, first is width and second is height. Set to `0` for free resizing.    |
| `gap`                      | `number`                                                                                                                                                           | `0`                                      | The minimum gap (in pixels) to maintain between items when `shiftOnCollision` is enabled.                                                                 |
| `shiftOnCollision`         | `boolean`                                                                                                                                                          | `true`                                   | If `true`, items will attempt to shift horizontally to avoid overlapping when another item is dragged or resized over them.                               |
| `disableCollision`         | `boolean`                                                                                                                                                          | `false`                                  | If `true`, collision detection is disabled globally for all items, allowing them to overlap freely.                                                       |
| `isLocked`                 | `boolean`                                                                                                                                                          | `false`                                  | If `true`, disables dragging and resizing for all items.                                                                                                  |
| `showOutline`              | `boolean`                                                                                                                                                          | `false`                                  | If `true`, displays a dashed outline around the item being dragged/resized and its potential drop zone. Color indicates validity.                         |
| `showTransformer`          | `boolean`                                                                                                                                                          | `false`                                  | If `true`, displays a Konva-style transformer with resize anchors and rotation handles for active items.                                                  |
| `className`                | `string`                                                                                                                                                           | `""`                                     | Optional CSS class name to apply to the main grid container div.                                                                                          |
| `showDropZoneShadow`       | `boolean`                                                                                                                                                          | `true`                                   | If `true`, displays a visual representation of the item's final snapped position during drag/resize.                                                      |
| `dropZoneClassName`        | `string`                                                                                                                                                           | `""`                                     | Optional CSS class name to apply to the drop zone shadow element.                                                                                         |
| `enableSelectionTool`      | `boolean`                                                                                                                                                          | `false`                                  | If `true`, enables the selection tool, allowing users to draw a rectangle on the grid. Disables item drag/resize unless interacting.                      |
| `selectOnlyEmptySpace`     | `boolean`                                                                                                                                                          | `false`                                  | If `true` (and `enableSelectionTool` is true), the selection is only considered valid if it doesn't overlap any existing items.                           |
| `minSelectionArea`         | `number`                                                                                                                                                           | `snapGridUnit * snapGridUnit`            | The minimum area (width \* height) required for a selection to be considered potentially valid.                                                           |
| `onSelectionEnd`           | `(selection: SelectionRectangle \| null, mousePosition: MousePosition \| null, isValid: boolean, selectedItemIds: string[], clearSelectionFn: () => void) => void` | `undefined`                              | Callback triggered when a selection drag ends. Provides details about the selection rectangle, validity, selected items, and a clear function.            |
| `resizeHandleComponent`    | `Optional<Handles>` (from `react-rnd`)                                                                                                                             | `undefined`                              | Allows providing custom React components for specific resize handles (e.g., `bottomRight`).                                                               |
| `dragHandleClassName`      | `string`                                                                                                                                                           | `undefined`                              | If provided, dragging is restricted to elements within the item that have this CSS class name.                                                            |
| `getSelectedItemClassName` | `(itemId: string) => string`                                                                                                                                       | `undefined`                              | Optional function that receives an item's ID and returns CSS classes (e.g. for selected items) to apply to that grid item container.                      |
| `onDragStart`              | `(itemId: string, position: { x: number; y: number }) => void`                                                                                                     | `undefined`                              | Callback when an item drag begins; provides ID and starting position (snapped).                                                                           |
| `onDragEnd`                | `(itemId: string, position: { x: number; y: number }) => void`                                                                                                     | `undefined`                              | Callback when an item drag ends; provides ID and final position (snapped).                                                                                |
| `onResizeStart`            | `(itemId: string, rect: { x: number; y: number; width: number; height: number }) => void`                                                                          | `undefined`                              | Callback when an item resize begins; provides ID and starting rectangle (snapped).                                                                        |
| `onResizeEnd`              | `(itemId: string, rect: { x: number; y: number; width: number; height: number }) => void`                                                                          | `undefined`                              | Callback when an item resize ends; provides ID and final rectangle (snapped).                                                                             |
| `scale`                    | `number`                                                                                                                                                           | `1`                                      | Optional CSS scale factor for the grid container; zooms the canvas while maintaining accurate interactions                                                |
| `transformOrigin`          | `string`                                                                                                                                                           | `0px 0px`                                | Optional CSS `transform-origin` for the grid container; sets pivot point when using zoom (`scale`)                                                        |
| `showSnapLines`            | `boolean`                                                                                                                                                          | `false`                                  | If `true`, displays visual alignment guides during drag/resize operations                                                                                 |
| `snapLinesStyle`           | `SnapLinesStyle`                                                                                                                                                   | `{}`                                     | Configuration object for customizing snap line colors, styles, and behavior                                                                               |
| `snapThreshold`            | `number`                                                                                                                                                           | `5`                                      | Distance in pixels for snap line activation and item snapping                                                                                             |
| `enableItemSnapping`       | `boolean`                                                                                                                                                          | `true`                                   | If `true`, enables snapping to other items' edges and centers                                                                                             |
| `snapBehavior`             | `SnapBehaviorConfig`                                                                                                                                               | `{ itemEdges: true, itemCenters: true }` | Configuration object for enabling/disabling specific snap behaviors                                                                                       |
| `onRotationPreview`        | `(itemId: string, angle: number &#124; null) => void`                                                                                                              | `undefined`                              | Callback during rotation preview; provides item ID and current rotation angle (null when preview ends)                                                    |
| `transformerStyle`         | `TransformerStyle`                                                                                                                                                 | `{}`                                     | Configuration object for customizing transformer appearance and behavior                                                                                  |
| `disableKeyboardMovement`  | `boolean`                                                                                                                                                          | `false`                                  | If `true`, disables arrow key movement for selected items                                                                                                 |

## GridItem Properties

Each item in the `layout` array has the following properties:

| Property           | Type      | Required | Description                                                                                  |
| :----------------- | :-------- | :------- | :------------------------------------------------------------------------------------------- |
| `id`               | `string`  | Yes      | Unique identifier for the item. Must match the `key` of the corresponding child component.   |
| `x`                | `number`  | Yes      | X-coordinate position in pixels.                                                             |
| `y`                | `number`  | Yes      | Y-coordinate position in pixels.                                                             |
| `width`            | `number`  | Yes      | Width of the item in pixels.                                                                 |
| `height`           | `number`  | Yes      | Height of the item in pixels.                                                                |
| `locked`           | `boolean` | No       | If `true`, this specific item cannot be moved or resized.                                    |
| `disableCollision` | `boolean` | No       | If `true`, this item will be ignored in collision checks and can overlap other items freely. |
| `showTransformer`  | `boolean` | No       | If `true`, this item will always show the transformer when selected or active.               |
| `rotation`         | `number`  | No       | Rotation angle in degrees (default: 0).                                                      |
| `disableRotation`  | `boolean` | No       | If `true`, disables rotation for this specific item (default: false).                        |
| `zIndex`           | `number`  | No       | Z-index for layer ordering (higher values appear on top).                                    |

## Callbacks

#### `onLayoutChange(newLayout: GridItem[], oldLayout: GridItem[])`

- Called whenever an item is successfully moved or resized.
- **`newLayout`**: The complete layout array reflecting the changes after the move/resize.
- **`oldLayout`**: The layout array as it was _before_ the move/resize operation that triggered the callback.
- You should use this callback to update your application's state that holds the layout data (usually using `newLayout`).

#### `onSelectionEnd(selection, mousePosition, isValid, selectedItemIds, clearSelectionFn)`

- Called when the user finishes drawing a selection rectangle (on mouse up).
- **`selection: SelectionRectangle | null`**: An object `{ x, y, width, height }` representing the final, snapped selection rectangle, or `null` if the selection was cleared internally before finishing.
- **`mousePosition: MousePosition | null`**: An object `{ clientX, clientY }` representing the mouse coordinates when the selection ended, or `null`.
- **`isValid: boolean`**: Indicates if the selection met the criteria (`minSelectionArea`, `selectOnlyEmptySpace` if enabled).
- **`selectedItemIds: string[]`**: An array of IDs of the grid items that were sufficiently covered by the selection rectangle (based on `ITEM_SELECTION_COVERAGE_THRESHOLD`). Empty if `selectOnlyEmptySpace` is true or no items were covered.
- **`clearSelectionFn: () => void`**: A function that can be called later to programmatically remove the visual selection rectangle drawn on the grid. This is useful if you want the rectangle to persist until an action is taken (e.g., in a popover).

## Styling

The component requires CSS for basic functionality and appearance. The necessary styles are bundled into `dist/index.css` during the build process. Consumers of the package need to import this CSS file into their application:

```javascript
import 'react-gridy-canvas/dist/index.css'
```

The following classes are used internally and can be targeted for customization (though overriding core layout styles might break functionality):

- `.grid-layout`: The main container div.
- `.grid-item`: The container for each child rendered via `react-rnd`.
- `.grid-dropzone-shadow`: The preview element shown during drag/resize.
- `.grid-selection-rectangle`: The rectangle drawn by the selection tool.
- `.grid-selection-rectangle--invalid`: Added when the selection is invalid.

You can also use the `className`, `dropZoneClassName`, and `getItemClassName` props for more targeted styling.

## Canvas Mode

The grid can behave like a free-form canvas by setting `gridUnitSize` and `resizeUnitSize` to `0`. In this mode:

- **Free Movement**: Items can be positioned at any pixel coordinate without snapping to a grid
- **Free Resizing**: Items can be resized to any dimensions without size constraints
- **Smooth Interaction**: No grid alignment creates a more fluid, canvas-like experience

```tsx
<Grid
  gridUnitSize={0} // Disable position snapping
  resizeUnitSize={0} // Disable size snapping
  // ... other props
>
  {/* Your items */}
</Grid>
```

This is particularly useful for:

- Design tools and editors
- Free-form layouts
- Precise positioning requirements
- Creative applications where grid constraints are not desired

## Transformer

The grid includes a Konva-style transformer that provides visual editing controls for active items. Enable it with the `showTransformer` prop:

```tsx
<Grid
  showTransformer={true}
  // ... other props
>
  {/* Your items */}
</Grid>
```

The transformer provides:

- **8 Resize Anchors**: Corner and edge handles for precise resizing
- **Rotation Handle**: Circular handle above the item for rotation (visual only for now)
- **Visual Feedback**: Blue border and handles that appear when dragging or resizing
- **Precise Control**: Works with both grid snapping and canvas mode

## Transformer Behavior

The transformer appears in two scenarios:

1. **Automatic**: When `showTransformer={true}` globally, it appears automatically when items are clicked, dragged, or resized
2. **Per-item**: Individual items can have `showTransformer: true` to always show the transformer when active, regardless of the global setting

This gives you both automatic behavior for a design-tool experience and fine-grained control for specific items that need persistent transformer access.

## Snap Lines & Visual Guides

The grid includes a comprehensive snap lines system that provides visual alignment guides during drag and resize operations, similar to design tools like Figma or Sketch.

### Enabling Snap Lines

```tsx
<Grid
  showSnapLines={true}
  snapThreshold={5} // Distance in pixels for snapping
  enableItemSnapping={true}
  snapBehavior={{
    gridCenter: true, // Snap to canvas center
    itemEdges: true, // Snap to item edges
    itemCenters: true, // Snap to item centers
    itemDistance: false, // Snap to maintain equal distances
  }}
  // ... other props
>
  {/* Your items */}
</Grid>
```

### Types of Snap Lines

1. **Grid Center Lines**: Vertical and horizontal lines through the canvas center
2. **Item Edge Lines**: Snap to the edges of other items (left, right, top, bottom)
3. **Item Center Lines**: Snap to the center points of other items (both X and Y axes)
4. **Distance Indicators**: Show spacing measurements between aligned items

### Distance Indicators

Distance indicators automatically appear when items share the same row or column space, showing the pixel distance between them with:

- **Yellow dashed lines** connecting the items
- **Triangle markers** at both ends
- **Distance measurements** displayed in the center

### Customizing Snap Lines

Full visual customization is available through the `snapLinesStyle` prop:

```tsx
<Grid
  showSnapLines={true}
  snapLinesStyle={{
    // Line colors
    gridSnapLineColor: '#3b82f6', // Blue for grid lines
    itemSnapLineColor: '#ec4899', // Pink for item lines
    distanceSnapLineColor: '#fbbf24', // Yellow for distance lines

    // Line styles
    snapLineWidth: 1,
    snapLineStyle: 'solid', // 'solid' | 'dashed' | 'dotted'
    distanceSnapLineStyle: 'dashed',

    // Opacity and animation
    snapLineOpacity: 0.8,
    distanceSnapLineOpacity: 0.9,
    snapLineAnimationDuration: 150,

    // Distance labels
    showDistanceLabel: true,
    distanceLabelColor: '#ffffff',
    distanceLabelBackground: '#1f2937',

    // Triangle markers
    distanceTriangleSize: 4,
    distanceTriangleColor: '#fbbf24',

    // Custom CSS classes
    className: 'my-snap-lines',
    gridSnapLineClassName: 'grid-line',
    itemSnapLineClassName: 'item-line',
    distanceSnapLineClassName: 'distance-line',
  }}
  // ... other props
>
  {/* Your items */}
</Grid>
```

### Snap Line Behavior

- **Smart Velocity Detection**: Snap lines automatically disable during fast dragging for smooth movement
- **Real-time Feedback**: Lines appear and update in real-time as you drag
- **Precise Positioning**: Items actually snap to the indicated positions
- **Works with Transformer**: Snap lines work during both drag operations and transformer resize
- **Scale Aware**: All visual elements scale correctly with the canvas zoom level

## Keyboard Controls

The grid supports keyboard movement for selected items using arrow keys:

- **Arrow Keys**: Move the selected item by one grid unit in the corresponding direction
- **Shift + Arrow Keys**: Move the selected item by 10x the normal distance for faster movement
- **Movement Distance**:
  - Grid mode: Items move by the configured `gridUnitSize` (or custom X/Y values if using array format)
  - Canvas mode: Items move by 1 pixel when `gridUnitSize` is 0 (hold Shift for 10 pixels)
- **Collision Handling**: Keyboard movement respects collision settings - items will shift others if `shiftOnCollision` is enabled
- **Boundary Constraints**: Items cannot be moved outside the canvas boundaries
- **Lock Support**: Locked items cannot be moved with keyboard

To disable keyboard movement, set `disableKeyboardMovement={true}` on the Grid component.

## License

[MIT](./LICENSE)
