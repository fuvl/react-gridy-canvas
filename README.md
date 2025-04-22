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
    scale: 1,
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

| Prop                       | Type                                                                                                                                                               | Default                       | Description                                                                                                                                    |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `width`                    | `number`                                                                                                                                                           | _Required_                    | The width of the grid container in pixels.                                                                                                     |
| `height`                   | `number`                                                                                                                                                           | _Required_                    | The height of the grid container in pixels.                                                                                                    |
| `layout`                   | `GridItem[]`                                                                                                                                                       | _Required_                    | An array of objects defining the initial position and size of each item. Each item must have a unique `id`.                                    |
| `onLayoutChange`           | `(newLayout: GridItem[], oldLayout: GridItem[]) => void`                                                                                                           | _Required_                    | Callback when layout changes; first argument is the updated layout array, second is the previous (old) layout array.                           |
| `children`                 | `ReactNode`                                                                                                                                                        | _Required_                    | The child components to be rendered within the grid items. Each child **must** have a `key` prop matching the `id` in the `layout` array.      |
| `gridUnitSize`             | `number &#124; [number, number]`                                                                                                                                   | `10`                          | The X/Y grid unit size in pixels for snapping item positions during drag; if tuple, first is X and second is Y.                                |
| `resizeUnitSize`           | `number &#124; [number, number]`                                                                                                                                   | `10`                          | The width/height grid unit size in pixels for snapping resize dimensions; if tuple, first is width and second is height.                       |
| `gap`                      | `number`                                                                                                                                                           | `0`                           | The minimum gap (in pixels) to maintain between items when `shiftOnCollision` is enabled.                                                      |
| `shiftOnCollision`         | `boolean`                                                                                                                                                          | `true`                        | If `true`, items will attempt to shift horizontally to avoid overlapping when another item is dragged or resized over them.                    |
| `isLocked`                 | `boolean`                                                                                                                                                          | `false`                       | If `true`, disables dragging and resizing for all items.                                                                                       |
| `showOutline`              | `boolean`                                                                                                                                                          | `false`                       | If `true`, displays a dashed outline around the item being dragged/resized and its potential drop zone. Color indicates validity.              |
| `className`                | `string`                                                                                                                                                           | `""`                          | Optional CSS class name to apply to the main grid container div.                                                                               |
| `showDropZoneShadow`       | `boolean`                                                                                                                                                          | `true`                        | If `true`, displays a visual representation of the item's final snapped position during drag/resize.                                           |
| `dropZoneClassName`        | `string`                                                                                                                                                           | `""`                          | Optional CSS class name to apply to the drop zone shadow element.                                                                              |
| `enableSelectionTool`      | `boolean`                                                                                                                                                          | `false`                       | If `true`, enables the selection tool, allowing users to draw a rectangle on the grid. Disables item drag/resize unless interacting.           |
| `selectOnlyEmptySpace`     | `boolean`                                                                                                                                                          | `false`                       | If `true` (and `enableSelectionTool` is true), the selection is only considered valid if it doesn't overlap any existing items.                |
| `minSelectionArea`         | `number`                                                                                                                                                           | `snapGridUnit * snapGridUnit` | The minimum area (width \* height) required for a selection to be considered potentially valid.                                                |
| `onSelectionEnd`           | `(selection: SelectionRectangle \| null, mousePosition: MousePosition \| null, isValid: boolean, selectedItemIds: string[], clearSelectionFn: () => void) => void` | `undefined`                   | Callback triggered when a selection drag ends. Provides details about the selection rectangle, validity, selected items, and a clear function. |
| `resizeHandleComponent`    | `Optional<Handles>` (from `react-rnd`)                                                                                                                             | `undefined`                   | Allows providing custom React components for specific resize handles (e.g., `bottomRight`).                                                    |
| `dragHandleClassName`      | `string`                                                                                                                                                           | `undefined`                   | If provided, dragging is restricted to elements within the item that have this CSS class name.                                                 |
| `disableCollision`         | `boolean`                                                                                                                                                          | `false`                       | If `true`, this item will be ignored in collision checks and can overlap other items freely.                                                   |
| `locked`                   | `boolean`                                                                                                                                                          | `false`                       | If `true`, this item cannot be moved or resized.                                                                                               |
| `getSelectedItemClassName` | `(itemId: string) => string`                                                                                                                                       | `undefined`                   | Optional function that receives an item's ID and returns CSS classes (e.g. for selected items) to apply to that grid item container.           |
| `onDragStart`              | `(itemId: string, position: { x: number; y: number }) => void`                                                                                                     | `undefined`                   | Callback when an item drag begins; provides ID and starting position (snapped).                                                                |
| `onDragEnd`                | `(itemId: string, position: { x: number; y: number }) => void`                                                                                                     | `undefined`                   | Callback when an item drag ends; provides ID and final position (snapped).                                                                     |
| `onResizeStart`            | `(itemId: string, rect: { x: number; y: number; width: number; height: number }) => void`                                                                          | `undefined`                   | Callback when an item resize begins; provides ID and starting rectangle (snapped).                                                             |
| `onResizeEnd`              | `(itemId: string, rect: { x: number; y: number; width: number; height: number }) => void`                                                                          | `undefined`                   | Callback when an item resize ends; provides ID and final rectangle (snapped).                                                                  |
| `scale`                    | `number`                                                                                                                                                           | `1`                           | Optional CSS scale factor for the grid container; zooms the canvas while maintaining accurate interactions                                     |

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

## Building

To build the package, navigate to the `packages` directory and run:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

This will generate the `dist` folder containing the JavaScript bundles (ESM and CJS), type definitions, and the extracted CSS file.

## License

[MIT](./LICENSE)
