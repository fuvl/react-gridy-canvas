import React, { useState, useCallback, useRef, Children, isValidElement, ReactNode, useMemo } from 'react'
import { Rnd, type DraggableData, type RndResizeCallback, type RndResizeStartCallback } from 'react-rnd'
import './styles.css'
import { GridItem, GridProps } from '../types'
import { snapToGrid } from '../utils/layout-utils'
import { simulateQueueShift } from '../utils/shift-simulator'
import { useSelectionHandler } from '../utils/selection-utils'

const Grid: React.FC<GridProps> = ({
  width,
  height,
  snapGridUnit = 10,
  resizeGridUnit = 10,
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
  minSelectionArea = snapGridUnit * snapGridUnit,
  onSelectionEnd,
  resizeHandleComponent,
  dragHandleClassName,
  getItemClassName,
  children,
  showGridLines = false,
  gridLinesClassName = '',
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  onResizeStart: onResizeStartProp,
  onResizeEnd: onResizeEndProp,
}) => {
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
    snapGridUnit,
    enableSelectionTool,
    selectOnlyEmptySpace,
    minSelectionArea,
    isLocked,
    draggingItemIdRef,
    resizingItemIdRef,
    dragHandleClassName,
    onSelectionEnd: onSelectionEnd,
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
          x: snapToGrid(currentItem.x, snapGridUnit),
          y: snapToGrid(currentItem.y, snapGridUnit),
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
        dropZoneRef.current = { ...startPos }
        setDropZone({ ...startPos })
        setPreviewLayout(null)
        setCanDropPreview(true)
        setDraggedSize(undefined)
        // invoke callback
        onDragStartProp?.(itemId, { x: startPos.x, y: startPos.y })
      }
    },
    [layout, isLocked, snapGridUnit, clearSelectionState, onDragStartProp],
  )

  const handleDrag = useCallback(
    (_e: any, d: DraggableData) => {
      if (isLocked || !draggingItemIdRef.current || !draggingItemSizeRef.current) return

      const itemId = draggingItemIdRef.current
      const currentItemSize = draggingItemSizeRef.current
      const snappedSimPos = {
        x: snapToGrid(d.x, snapGridUnit),
        y: snapToGrid(d.y, snapGridUnit),
      }
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        layout,
        itemId,
        snappedSimPos,
        snapGridUnit,
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
      const nextPreviewLayout = simResultLayout.map((item: GridItem) =>
        item.id === itemId ? { ...item, x: d.x, y: d.y } : item,
      )
      setPreviewLayout(nextPreviewLayout)
      setCanDropPreview(canDrop)
      setDropZone(dropZoneResult ?? null)
    },
    [isLocked, layout, shiftOnCollision, snapGridUnit, gap, width, height],
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
        x: snapToGrid(d.x, snapGridUnit),
        y: snapToGrid(d.y, snapGridUnit),
      }
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        layout,
        wasDraggingId,
        snappedDropPos,
        snapGridUnit,
        gap,
        width,
        height,
        { width: startPos.width, height: startPos.height },
        shiftOnCollision,
        lastValidPosForSim,
        () => {},
        startPos,
      )
      // invoke drag end callback
      onDragEndProp?.(wasDraggingId, { x: snappedDropPos.x, y: snappedDropPos.y })
      let finalLayout: GridItem[]
      if (canDrop) {
        finalLayout = finalSimLayout.map((item: GridItem) =>
          item.id === wasDraggingId ? { ...item, x: snappedDropPos.x, y: snappedDropPos.y } : item,
        )
      } else {
        finalLayout = layout.map((item: GridItem) =>
          item.id === wasDraggingId ? { ...item, x: lastValidPosForSim.x, y: lastValidPosForSim.y } : item,
        )
      }
      onLayoutChange(finalLayout, layout) // Pass original layout as oldLayout
    },
    [layout, isLocked, onLayoutChange, snapGridUnit, gap, width, height, shiftOnCollision, onDragEndProp],
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
      // invoke resize start callback
      onResizeStartProp?.(itemId, { x: currentItem.x, y: currentItem.y, width: currentItem.width, height: currentItem.height })
    },
    [layout, isLocked, clearSelectionState, onResizeStartProp],
  )

  const handleResize: RndResizeCallback = useCallback(
    (_e, _dir, _ref, delta, position) => {
      if (isLocked || !resizingItemIdRef.current || !draggedSize) return

      const itemId = resizingItemIdRef.current
      const initialSize = draggedSize
      const originalItemState = layout.find((i: GridItem) => i.id === itemId)
      const snappedX = snapToGrid(position.x, snapGridUnit)
      const snappedY = snapToGrid(position.y, snapGridUnit)
      const potentialWidth = initialSize.width + delta.width
      const potentialHeight = initialSize.height + delta.height
      const snappedWidth = Math.max(resizeGridUnit, snapToGrid(potentialWidth, resizeGridUnit))
      const snappedHeight = Math.max(resizeGridUnit, snapToGrid(potentialHeight, resizeGridUnit))
      const currentSnappedSize = { width: snappedWidth, height: snappedHeight } // Use this size
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        layout,
        itemId,
        { x: snappedX, y: snappedY },
        snapGridUnit,
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
    [layout, isLocked, shiftOnCollision, snapGridUnit, resizeGridUnit, gap, width, height, draggedSize],
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
      const snappedX = snapToGrid(position.x, snapGridUnit)
      const snappedY = snapToGrid(position.y, snapGridUnit)
      const snappedWidth = Math.max(resizeGridUnit, snapToGrid(initialSize.width + delta.width, resizeGridUnit))
      const snappedHeight = Math.max(resizeGridUnit, snapToGrid(initialSize.height + delta.height, resizeGridUnit))
      const finalSize = { width: snappedWidth, height: snappedHeight }
      // invoke resize end callback
      onResizeEndProp?.(wasResizingId, { x: snappedX, y: snappedY, width: snappedWidth, height: snappedHeight })
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        layout,
        wasResizingId,
        { x: snappedX, y: snappedY },
        snapGridUnit,
        gap,
        width,
        height,
        finalSize,
        shiftOnCollision,
        lastValidPosForSim,
        () => {}, // No need to update ref on stop
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
      onLayoutChange(finalLayout, layout) // Pass original layout as oldLayout
    },
    [layout, isLocked, onLayoutChange, snapGridUnit, resizeGridUnit, gap, shiftOnCollision, width, height, draggedSize, onResizeEndProp],
  )

  // --- Grid Lines ---
  const gridLinesStyle = useMemo(() => {
    if (!showGridLines || snapGridUnit <= 0) return {}
    const color = 'rgba(0, 0, 0, 0.08)' // Light gray lines
    return {
      backgroundImage: `
        linear-gradient(to right, ${color} 1px, transparent 1px),
        linear-gradient(to bottom, ${color} 1px, transparent 1px)
      `,
      backgroundSize: `${snapGridUnit}px ${snapGridUnit}px`,
    }
  }, [showGridLines, snapGridUnit])

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

  const gridClasses = `grid-layout${className ? ' ' + className : ''}${
    enableSelectionTool && !isLocked ? ' cursor-crosshair' : ''
  }`

  const selectionRectClass = `grid-selection-rectangle${
    selectionRect && !isSelectionValidForStyling ? ' grid-selection-rectangle--invalid' : ''
  }`

  // Combine default and custom grid lines class names
  const combinedGridLinesClass = `grid-lines${gridLinesClassName ? ` ${gridLinesClassName}` : ''}`

  return (
    <div
      ref={canvasRef}
      className={gridClasses}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        cursor: enableSelectionTool && !isLocked ? 'crosshair' : undefined,
      }}
      onMouseDown={handleSelectionMouseDown}
      onMouseMove={handleSelectionMouseMove}
      onMouseUp={handleSelectionMouseUp}
    >
      {/* Render Grid Lines */}
      {showGridLines && <div className={combinedGridLinesClass} style={gridLinesStyle} />}

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

        let cursorStyle: string
        if (enableSelectionTool && !isLocked) {
          cursorStyle = 'crosshair'
        } else if (dragHandleClassName) {
          cursorStyle = 'auto'
        } else {
          cursorStyle = isResizing ? 'auto' : 'move'
        }

        const dynamicClasses = getItemClassName ? getItemClassName(item.id) : ''
        const combinedClasses = `grid-item${
          showOutline ? ' grid-item-outline' : ''
        }${dynamicClasses ? ` ${dynamicClasses}` : ''}`

        return (
          <Rnd
            key={item.id}
            size={currentSize}
            position={currentPos}
            bounds="parent"
            resizeGrid={[resizeGridUnit, resizeGridUnit]}
            minWidth={resizeGridUnit}
            minHeight={resizeGridUnit}
            disableDragging={isLocked || (enableSelectionTool && !isActive)}
            enableResizing={!isLocked && !(enableSelectionTool && !isActive)}
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
