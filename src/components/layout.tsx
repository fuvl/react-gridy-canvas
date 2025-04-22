import React, { useState, useCallback, useRef, Children, isValidElement, ReactNode } from 'react'
import clsx from 'clsx'
import { Rnd, type DraggableData, type RndResizeCallback, type RndResizeStartCallback } from 'react-rnd'
import './styles.css'
import { GridItem, GridProps } from '../types'
import { snapToGrid } from '../utils/layout-utils'
import { simulateQueueShift } from '../utils/shift-simulator'
import { useSelectionHandler } from '../utils/selection-utils'

const DRAG_THRESHOLD = 5

const Grid: React.FC<GridProps> = ({
  width,
  height,
  scale = 1,
  gridUnitSize = 10,
  resizeUnitSize = 10,
  gap = 0,
  shiftOnCollision = true,
  isLocked = false,
  layout,
  onLayoutChange,
  showOutline = false,
  className = '',
  showDropZoneShadow = true,
  dropZoneClassName = '',
  enableSelectionTool = false,
  selectOnlyEmptySpace = false,
  minSelectionArea,
  onSelectionEnd,
  resizeHandleComponent,
  dragHandleClassName,
  getSelectedItemClassName,
  children,
  showGridLines = false,
  gridLinesClassName = '',
  selectionRectangleClassName,
  invalidSelectionClassName,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  onResizeStart: onResizeStartProp,
  onResizeEnd: onResizeEndProp,
}) => {
  // derive numeric grid units for x/y
  const [gridUnitX, gridUnitY] = Array.isArray(gridUnitSize) ? gridUnitSize : [gridUnitSize, gridUnitSize]
  const [resizeUnitW, resizeUnitH] = Array.isArray(resizeUnitSize) ? resizeUnitSize : [resizeUnitSize, resizeUnitSize]
  const effSnapX = gridUnitX
  const effSnapY = gridUnitY
  const effResizeW = resizeUnitW
  const effResizeH = resizeUnitH
  const computedMinSelectionArea = minSelectionArea ?? gridUnitX * gridUnitY

  // Internal interaction state
  const [previewLayout, setPreviewLayout] = useState<GridItem[] | null>(null)
  const [canDropPreview, setCanDropPreview] = useState<boolean>(true)
  const [dropZone, setDropZone] = useState<GridItem | null>(null)
  const [draggedSize, setDraggedSize] = useState<{ width: number; height: number } | undefined>(undefined)

  // Refs
  const dropZoneRef = useRef<GridItem | null>(null)
  const dragStartPosRef = useRef<GridItem | null>(null)
  const draggingItemIdRef = useRef<string | null>(null)
  const resizingItemIdRef = useRef<string | null>(null)
  const draggingItemSizeRef = useRef<{ width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Selection Hook
  const {
    selectionRect,
    isSelectionValidForStyling,
    handleMouseDown: handleSelectionMouseDown,
    handleMouseMove: handleSelectionMouseMove,
    handleMouseUp: handleSelectionMouseUp,
    clearSelectionState,
  } = useSelectionHandler({
    canvasRef,
    layout,
    width,
    height,
    scale,
    snapGridUnit: gridUnitSize,
    enableSelectionTool,
    selectOnlyEmptySpace,
    minSelectionArea: computedMinSelectionArea,
    isLocked,
    draggingItemIdRef,
    resizingItemIdRef,
    dragHandleClassName,
    onSelectionEnd,
  })

  // Drag/Resize Callbacks

  const handleDragStart = useCallback(
    (_e: any, data: DraggableData) => {
      clearSelectionState()
      if (isLocked || resizingItemIdRef.current) return

      const itemId = data.node.dataset.itemid as string
      const currentItem = layout.find((item: GridItem) => item.id === itemId)
      if (currentItem && itemId) {
        const startPos: GridItem = {
          id: itemId,
          x: snapToGrid(currentItem.x, effSnapX),
          y: snapToGrid(currentItem.y, effSnapY),
          width: currentItem.width,
          height: currentItem.height,
        }
        dragStartPosRef.current = startPos
        draggingItemIdRef.current = itemId
        resizingItemIdRef.current = null
        draggingItemSizeRef.current = {
          width: currentItem.width,
          height: currentItem.height,
        }
        onDragStartProp?.(itemId, { x: startPos.x, y: startPos.y })
      }
    },
    [layout, isLocked, effSnapX, effSnapY, clearSelectionState, onDragStartProp],
  )

  const handleDrag = useCallback(
    (_e: any, d: DraggableData) => {
      if (isLocked || !draggingItemIdRef.current || !draggingItemSizeRef.current) return
      const startPos = dragStartPosRef.current
      if (!startPos) return
      // check movement threshold
      const dx = d.x - startPos.x
      const dy = d.y - startPos.y
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return
      }

      const itemId = draggingItemIdRef.current
      if (dropZoneRef.current == null) {
        dropZoneRef.current = { ...startPos }
        setDropZone({ ...startPos })
        setPreviewLayout(null)
        setCanDropPreview(true)
      }
      const currentItemSize = draggingItemSizeRef.current
      const snappedSimPos = {
        x: snapToGrid(d.x, effSnapX),
        y: snapToGrid(d.y, effSnapY),
      }
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        layout,
        itemId,
        snappedSimPos,
        gridUnitSize,
        gap,
        width,
        height,
        currentItemSize,
        shiftOnCollision,
        dropZoneRef.current,
        (pos) => {
          if (pos && currentItemSize) {
            dropZoneRef.current = {
              x: pos.x,
              y: pos.y,
              width: currentItemSize.width,
              height: currentItemSize.height,
              id: itemId,
            }
          } else {
            dropZoneRef.current = null
          }
        },
        dragStartPosRef.current ?? undefined,
      )
      // Standard preview update
      const nextPreviewLayout = simResultLayout.map((item: GridItem) =>
        item.id === itemId ? { ...item, x: d.x, y: d.y } : item,
      )
      setPreviewLayout(nextPreviewLayout)
      setCanDropPreview(canDrop)
      setDropZone(dropZoneResult ?? null)
    },
    [isLocked, layout, shiftOnCollision, effSnapX, effSnapY, width, height, gap, gridUnitSize],
  )

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      const startPos = dragStartPosRef.current
      const lastValidPosForSim = dropZoneRef.current ?? startPos

      setPreviewLayout(null)
      setCanDropPreview(false)
      setDropZone(null)
      setDraggedSize(undefined)
      const wasDraggingId = draggingItemIdRef.current
      draggingItemIdRef.current = null
      dragStartPosRef.current = null
      draggingItemSizeRef.current = null
      dropZoneRef.current = null
      if (isLocked || !wasDraggingId || !startPos || !lastValidPosForSim) return
      const snappedDropPos = {
        x: snapToGrid(d.x, effSnapX),
        y: snapToGrid(d.y, effSnapY),
      }
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        layout,
        wasDraggingId,
        snappedDropPos,
        gridUnitSize,
        gap,
        width,
        height,
        { width: startPos.width, height: startPos.height },
        shiftOnCollision,
        lastValidPosForSim,
        () => {},
        startPos,
      )

      let finalLayout: GridItem[] = canDrop
        ? finalSimLayout.map((item: GridItem) =>
            item.id === wasDraggingId ? { ...item, x: snappedDropPos.x, y: snappedDropPos.y } : item,
          )
        : layout.map((item: GridItem) =>
            item.id === wasDraggingId ? { ...item, x: lastValidPosForSim.x, y: lastValidPosForSim.y } : item,
          )
      onLayoutChange(finalLayout, layout)
    },
    [
      layout,
      isLocked,
      onLayoutChange,
      effSnapX,
      effSnapY,
      width,
      height,
      shiftOnCollision,
      onDragEndProp,
      gap,
      gridUnitSize,
    ],
  )

  const handleResizeStart: RndResizeStartCallback = useCallback(
    (_e, _dir, ref) => {
      clearSelectionState()
      if (isLocked || draggingItemIdRef.current) return

      const itemId = ref.dataset.itemid ?? null
      if (!itemId) return
      const currentItem = layout.find((item: GridItem) => item.id === itemId)
      if (!currentItem) return
      resizingItemIdRef.current = itemId
      draggingItemIdRef.current = null
      dropZoneRef.current = { ...currentItem }
      setDropZone({ ...currentItem })
      setPreviewLayout(null)
      setCanDropPreview(true)
      setDraggedSize({ width: currentItem.width, height: currentItem.height })

      onResizeStartProp?.(itemId, {
        x: currentItem.x,
        y: currentItem.y,
        width: currentItem.width,
        height: currentItem.height,
      })
    },
    [layout, isLocked, clearSelectionState, onResizeStartProp],
  )

  const handleResize: RndResizeCallback = useCallback(
    (_e, _dir, _ref, delta, position) => {
      if (isLocked || !resizingItemIdRef.current || !draggedSize) return

      const itemId = resizingItemIdRef.current
      const initialSize = draggedSize
      const originalItemState = layout.find((i: GridItem) => i.id === itemId)
      const snappedX = snapToGrid(position.x, effSnapX)
      const snappedY = snapToGrid(position.y, effSnapY)
      const potentialWidth = initialSize.width + delta.width
      const potentialHeight = initialSize.height + delta.height
      const snappedWidth = Math.max(effResizeW, snapToGrid(potentialWidth, effResizeW))
      const snappedHeight = Math.max(effResizeH, snapToGrid(potentialHeight, effResizeH))
      const currentSnappedSize = { width: snappedWidth, height: snappedHeight } // Use this size
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        layout,
        itemId,
        { x: snappedX, y: snappedY },
        gridUnitSize,
        gap,
        width,
        height,
        currentSnappedSize,
        shiftOnCollision,
        dropZoneRef.current,
        (pos) => {
          if (pos) {
            dropZoneRef.current = {
              x: pos.x,
              y: pos.y,
              width: currentSnappedSize.width,
              height: currentSnappedSize.height,
              id: itemId,
            }
          } else {
            dropZoneRef.current = null
          }
        },
        originalItemState,
      )
      const nextPreviewLayout = simResultLayout.map((item: GridItem) =>
        item.id === itemId
          ? {
              ...item,
              x: position.x,
              y: position.y,
              width: currentSnappedSize.width,
              height: currentSnappedSize.height,
            }
          : item,
      )
      setPreviewLayout(nextPreviewLayout)
      setCanDropPreview(canDrop)
      setDropZone(dropZoneResult ?? null)
    },
    [
      layout,
      isLocked,
      shiftOnCollision,
      effSnapX,
      effSnapY,
      effResizeW,
      effResizeH,
      width,
      height,
      draggedSize,
      gap,
      gridUnitSize,
    ],
  )

  const handleResizeStop: RndResizeCallback = useCallback(
    (_e, _dir, _ref, delta, position) => {
      const itemId = resizingItemIdRef.current
      const initialSize = draggedSize
      const itemBeforeResize = layout.find((item: GridItem) => item.id === itemId)
      const lastValidPosForSim = dropZoneRef.current ?? itemBeforeResize

      setDropZone(null)
      setPreviewLayout(null)
      const wasResizingId = resizingItemIdRef.current
      resizingItemIdRef.current = null
      setDraggedSize(undefined)
      dropZoneRef.current = null
      if (isLocked || !wasResizingId || !initialSize || !itemBeforeResize || !lastValidPosForSim) return
      const snappedX = snapToGrid(position.x, effSnapX)
      const snappedY = snapToGrid(position.y, effSnapY)
      const snappedWidth = Math.max(effResizeW, snapToGrid(initialSize.width + delta.width, effResizeW))
      const snappedHeight = Math.max(effResizeH, snapToGrid(initialSize.height + delta.height, effResizeH))
      const finalSize = { width: snappedWidth, height: snappedHeight }
      onResizeEndProp?.(wasResizingId, { x: snappedX, y: snappedY, width: snappedWidth, height: snappedHeight })
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        layout,
        wasResizingId,
        { x: snappedX, y: snappedY },
        gridUnitSize,
        gap,
        width,
        height,
        finalSize,
        shiftOnCollision,
        lastValidPosForSim,
        () => {},
        itemBeforeResize,
      )
      let finalLayout: GridItem[]
      if (canDrop) {
        finalLayout = finalSimLayout.map((item: GridItem) =>
          item.id === wasResizingId ? { ...item, x: snappedX, y: snappedY, ...finalSize } : item,
        )
      } else {
        finalLayout = layout.map((item: GridItem) =>
          item.id === wasResizingId
            ? {
                ...item,
                x: lastValidPosForSim.x,
                y: lastValidPosForSim.y,
                width: lastValidPosForSim.width,
                height: lastValidPosForSim.height,
              }
            : item,
        )
      }
      onLayoutChange(finalLayout, layout)
    },
    [
      layout,
      isLocked,
      onLayoutChange,
      effSnapX,
      effSnapY,
      effResizeW,
      effResizeH,
      shiftOnCollision,
      width,
      height,
      draggedSize,
      onResizeEndProp,
      gap,
      gridUnitSize,
    ],
  )
  // Rendering
  const childrenMap = new Map<string, ReactNode>()
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.key != null) {
      childrenMap.set(String(child.key), child)
    }
  })

  const renderLayout = previewLayout || layout
  const dropPoint = dropZone
  const outlineColor = canDropPreview ? '#ff9800' : 'red'

  const gridClasses = clsx('grid-layout', enableSelectionTool && !isLocked && 'cursor-crosshair', className)

  // Combine default and custom selection rectangle classes
  const selectionBaseClass = selectionRectangleClassName || 'grid-selection-rectangle'
  const invalidBaseClass = invalidSelectionClassName || 'grid-selection-rectangle--invalid'
  const selectionRectClass = clsx(selectionBaseClass, selectionRect && !isSelectionValidForStyling && invalidBaseClass)

  // Combine default and custom grid lines class names
  const combinedGridLinesClass = clsx('grid-lines', gridLinesClassName)
  return (
    <div
      ref={canvasRef}
      className={gridClasses}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
        cursor: enableSelectionTool && !isLocked ? 'crosshair' : undefined,
      }}
      onMouseDown={handleSelectionMouseDown}
      onMouseMove={handleSelectionMouseMove}
      onMouseUp={handleSelectionMouseUp}
    >
      {showGridLines && (
        <div
          className={combinedGridLinesClass}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
        />
      )}
      {dropPoint && showDropZoneShadow && (
        <div
          className={`grid-dropzone-shadow${dropZoneClassName ? ' ' + dropZoneClassName : ''}`}
          style={{
            left: dropPoint.x,
            top: dropPoint.y,
            width: dropPoint.width,
            height: dropPoint.height,
            border: showOutline ? `2px dashed ${outlineColor}` : 'none',
          }}
        />
      )}
      {selectionRect && (
        <div
          className={selectionRectClass}
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}

      {renderLayout.map((item: GridItem) => {
        const isDragging = draggingItemIdRef.current === item.id
        const isResizing = resizingItemIdRef.current === item.id
        const isActive = isDragging || isResizing

        const itemOutline = showOutline && isActive ? `2px dashed ${outlineColor}` : undefined

        const currentPos = { x: item.x, y: item.y }
        const currentSize = { width: item.width, height: item.height }

        const childToRender = childrenMap.get(item.id)

        if (!childToRender) {
          if (!previewLayout && layout.find((l: GridItem) => l.id === item.id)) {
            console.warn(`Grid: No child found with key matching layout item id "${item.id}"`)
          }
          return null
        }

        // Determine if this specific item is locked (global or per-item)
        const itemLocked = isLocked || item.locked

        let cursorStyle: string
        if (enableSelectionTool && !isLocked) {
          cursorStyle = 'crosshair'
        } else if (dragHandleClassName) {
          cursorStyle = 'auto'
        } else {
          cursorStyle = isResizing ? 'auto' : 'move'
        }
        if (itemLocked) cursorStyle = 'default'

        const dynamicClasses = getSelectedItemClassName ? getSelectedItemClassName(item.id) : ''
        const combinedClasses = clsx('grid-item', showOutline && 'grid-item-outline', dynamicClasses)

        return (
          <Rnd
            scale={scale}
            dragStartThreshold={5}
            key={item.id}
            size={currentSize}
            position={currentPos}
            bounds="parent"
            resizeGrid={[effResizeW, effResizeH]}
            minWidth={effResizeW}
            minHeight={effResizeH}
            disableDragging={itemLocked || (enableSelectionTool && !isActive)}
            enableResizing={!itemLocked && !(enableSelectionTool && !isActive)}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            onResize={handleResize}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            className={combinedClasses}
            style={{
              zIndex: isActive ? 100 : 1,
              border: itemOutline,
              pointerEvents:
                (draggingItemIdRef.current && !isDragging) || (resizingItemIdRef.current && !isResizing)
                  ? 'none'
                  : undefined,
              transition: isActive ? 'none' : undefined,
              cursor: cursorStyle,
            }}
            data-itemid={item.id}
            resizeHandleComponent={resizeHandleComponent}
            dragHandleClassName={dragHandleClassName}
          >
            {childToRender}
          </Rnd>
        )
      })}
    </div>
  )
}

export default Grid
