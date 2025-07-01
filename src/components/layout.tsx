import React, { useState, useCallback, useRef, Children, isValidElement, ReactNode } from 'react'
import clsx from 'clsx'
import { Rnd, type DraggableData, type RndResizeCallback, type RndResizeStartCallback } from 'react-rnd'
import './styles.css'
import { GridItem, GridProps } from '../types'
import { snapToGrid } from '../utils/layout-utils'
import { simulateQueueShift } from '../utils/shift-simulator'
import { useSelectionHandler } from '../utils/selection-utils'
import { sortByZIndex } from '../utils/z-index-utils'
import { calculateGridSnapLines, calculateItemSnapLines, calculateDistanceIndicators, calculateDistanceSnapTargets, findRelevantSnapLines, extendSnapLinesForItem, applySnapToPosition } from '../utils/snap-lines-utils'
import { Transformer } from './transformer'
import { SnapLines } from './snap-lines'

const DRAG_THRESHOLD = 5

const Grid: React.FC<GridProps> = ({
  width,
  height,
  scale = 1,
  transformOrigin = '0px 0px',
  gridUnitSize = 10,
  resizeUnitSize = 10,
  gap = 0,
  shiftOnCollision = true,
  disableCollision = false,
  isLocked = false,
  layout,
  onLayoutChange,
  showOutline = false,
  showTransformer = true,
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
  onRotationPreview,
  transformerStyle,
  disableAnimations = false,
  showSnapLines = false,
  snapLinesStyle,
  snapThreshold = 5,
  enableItemSnapping = true,
  snapBehavior = { gridCenter: false, itemEdges: true, itemCenters: true, itemDistance: false },
}) => {
  // derive numeric grid units for x/y
  const [gridUnitX, gridUnitY] = Array.isArray(gridUnitSize) ? gridUnitSize : [gridUnitSize, gridUnitSize]
  const [resizeUnitW, resizeUnitH] = Array.isArray(resizeUnitSize) ? resizeUnitSize : [resizeUnitSize, resizeUnitSize]
  const effSnapX = gridUnitX
  const effSnapY = gridUnitY
  const effResizeW = resizeUnitW
  const effResizeH = resizeUnitH
  const computedMinSelectionArea = minSelectionArea ?? gridUnitX * gridUnitY

  // Apply global disableCollision to all items if enabled
  const effectiveLayout = disableCollision ? layout.map((item) => ({ ...item, disableCollision: true })) : layout

  // Internal interaction state
  const [previewLayout, setPreviewLayout] = useState<GridItem[] | null>(null)
  const [canDropPreview, setCanDropPreview] = useState<boolean>(true)
  const [dropZone, setDropZone] = useState<GridItem | null>(null)
  const [draggedSize, setDraggedSize] = useState<{ width: number; height: number } | undefined>(undefined)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [previewRotation, setPreviewRotation] = useState<{itemId: string, angle: number} | null>(null)
  const [previewResize, setPreviewResize] = useState<{itemId: string, rect: { x: number; y: number; width: number; height: number }} | null>(null)
  const [activeSnapLines, setActiveSnapLines] = useState<import('../types').SnapLine[]>([])

  // Refs
  const dropZoneRef = useRef<GridItem | null>(null)
  const dragStartPosRef = useRef<GridItem | null>(null)
  const draggingItemIdRef = useRef<string | null>(null)
  const resizingItemIdRef = useRef<string | null>(null)
  const draggingItemSizeRef = useRef<{ width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastDragPositionRef = useRef<{ x: number; y: number; timestamp: number } | null>(null)
  const dragVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 })

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
          rotation: currentItem.rotation,
        }
        dragStartPosRef.current = startPos
        draggingItemIdRef.current = itemId
        resizingItemIdRef.current = null
        draggingItemSizeRef.current = {
          width: currentItem.width,
          height: currentItem.height,
        }
        // Initialize velocity tracking
        lastDragPositionRef.current = { x: startPos.x, y: startPos.y, timestamp: Date.now() }
        dragVelocityRef.current = { vx: 0, vy: 0 }
        setSelectedItemId(itemId) // Select item when dragging starts
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
      
      // Calculate drag velocity
      const currentTime = Date.now()
      const lastPos = lastDragPositionRef.current
      let shouldSnap = true
      
      if (lastPos) {
        const deltaTime = currentTime - lastPos.timestamp
        if (deltaTime > 0) {
          const dx = Math.abs(d.x - lastPos.x)
          const dy = Math.abs(d.y - lastPos.y)
          const vx = dx / deltaTime
          const vy = dy / deltaTime
          const totalVelocity = Math.sqrt(vx * vx + vy * vy)
          
          dragVelocityRef.current = { vx, vy }
          
          // Disable snapping if moving too fast (threshold: 0.2 pixels per ms)
          const velocityThreshold = 0.2
          if (totalVelocity > velocityThreshold) {
            shouldSnap = false
          }
          
        }
      }
      
      // Update position tracking
      lastDragPositionRef.current = { x: d.x, y: d.y, timestamp: currentTime }
      
      // Apply snapping during drag for real-time snapping (only when moving slowly)
      let finalPosition = { x: d.x, y: d.y }
      
      if (showSnapLines && shouldSnap) {
        // Calculate all available snap lines based on behavior config
        const gridSnapLines = calculateGridSnapLines(width, height, gridUnitSize, snapBehavior)
        const itemSnapLines = enableItemSnapping 
          ? calculateItemSnapLines(effectiveLayout, itemId, snapThreshold, snapBehavior) 
          : []
        const allSnapLines = [...gridSnapLines, ...itemSnapLines]
        
        // Apply snapping to the current position
        const snapResult = applySnapToPosition(
          { x: d.x, y: d.y },
          currentItemSize,
          allSnapLines,
          snapThreshold
        )
        
        // Apply distance-based snapping if enabled
        let distanceSnapPosition = { x: snapResult.x, y: snapResult.y }
        if (snapBehavior.itemDistance) {
          const draggingItem = { ...startPos, x: snapResult.x, y: snapResult.y, ...currentItemSize }
          const distanceSnap = calculateDistanceSnapTargets(
            effectiveLayout.filter(item => item.id !== itemId),
            draggingItem,
            snapThreshold
          )
          
          if (distanceSnap.x !== null) {
            distanceSnapPosition.x = distanceSnap.x
          }
          if (distanceSnap.y !== null) {
            distanceSnapPosition.y = distanceSnap.y
          }
        }
        
        finalPosition = distanceSnapPosition
        
        // Calculate distance indicators for spacing between aligned items (only when moving slowly)
        const draggingItem = { ...startPos, x: finalPosition.x, y: finalPosition.y, ...currentItemSize }
        const distanceIndicators = calculateDistanceIndicators(effectiveLayout.filter(item => item.id !== itemId), draggingItem)
        
        // Find relevant snap lines based on alignment (not proximity)
        const relevantSnapLines = findRelevantSnapLines(allSnapLines, draggingItem)
        const extendedSnapLines = extendSnapLinesForItem(relevantSnapLines, draggingItem)
        
        // Combine with distance indicators for display
        const allDisplayLines = [...extendedSnapLines, ...distanceIndicators]
        
        setActiveSnapLines(allDisplayLines)
      } else {
        // Clear snap lines when moving fast or snap lines disabled
        setActiveSnapLines([])
      }
      
      const snappedSimPos = {
        x: snapToGrid(finalPosition.x, effSnapX),
        y: snapToGrid(finalPosition.y, effSnapY),
      }
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        effectiveLayout,
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
            const draggingItem = effectiveLayout.find(item => item.id === itemId)
            dropZoneRef.current = {
              x: pos.x,
              y: pos.y,
              width: currentItemSize.width,
              height: currentItemSize.height,
              id: itemId,
              rotation: draggingItem?.rotation,
            }
          } else {
            dropZoneRef.current = null
          }
        },
        dragStartPosRef.current ?? undefined,
      )
      // Standard preview update
      const nextPreviewLayout = simResultLayout.map((item: GridItem) =>
        item.id === itemId ? { ...item, x: finalPosition.x, y: finalPosition.y } : item,
      )
      setPreviewLayout(nextPreviewLayout)
      setCanDropPreview(canDrop)
      setDropZone(dropZoneResult ?? null)
    },
    [isLocked, effectiveLayout, shiftOnCollision, effSnapX, effSnapY, width, height, gap, gridUnitSize, showSnapLines, enableItemSnapping, snapThreshold, snapBehavior],
  )

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      const startPos = dragStartPosRef.current
      const lastValidPosForSim = dropZoneRef.current ?? startPos

      setPreviewLayout(null)
      setCanDropPreview(false)
      setDropZone(null)
      setDraggedSize(undefined)
      setActiveSnapLines([])
      const wasDraggingId = draggingItemIdRef.current
      draggingItemIdRef.current = null
      dragStartPosRef.current = null
      draggingItemSizeRef.current = null
      dropZoneRef.current = null
      lastDragPositionRef.current = null
      dragVelocityRef.current = { vx: 0, vy: 0 }
      if (isLocked || !wasDraggingId || !startPos || !lastValidPosForSim) return
      
      const snappedDropPos = {
        x: snapToGrid(d.x, effSnapX),
        y: snapToGrid(d.y, effSnapY),
      }
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        effectiveLayout,
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
        : effectiveLayout.map((item: GridItem) =>
            item.id === wasDraggingId ? { ...item, x: lastValidPosForSim.x, y: lastValidPosForSim.y } : item,
          )
      onLayoutChange(finalLayout, effectiveLayout)
    },
    [
      effectiveLayout,
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
      setSelectedItemId(itemId) // Select item when resizing starts

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
      const originalItemState = effectiveLayout.find((i: GridItem) => i.id === itemId)
      const snappedX = snapToGrid(position.x, effSnapX)
      const snappedY = snapToGrid(position.y, effSnapY)
      const potentialWidth = initialSize.width + delta.width
      const potentialHeight = initialSize.height + delta.height
      const snappedWidth = Math.max(effResizeW || 1, snapToGrid(potentialWidth, effResizeW))
      const snappedHeight = Math.max(effResizeH || 1, snapToGrid(potentialHeight, effResizeH))
      const currentSnappedSize = { width: snappedWidth, height: snappedHeight }
      const {
        previewLayout: simResultLayout,
        canDrop,
        dropZone: dropZoneResult,
      } = simulateQueueShift(
        effectiveLayout,
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
            const resizingItem = effectiveLayout.find(item => item.id === itemId)
            dropZoneRef.current = {
              x: pos.x,
              y: pos.y,
              width: currentSnappedSize.width,
              height: currentSnappedSize.height,
              id: itemId,
              rotation: resizingItem?.rotation,
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
      effectiveLayout,
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
      const itemBeforeResize = effectiveLayout.find((item: GridItem) => item.id === itemId)
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
      const snappedWidth = Math.max(effResizeW || 1, snapToGrid(initialSize.width + delta.width, effResizeW))
      const snappedHeight = Math.max(effResizeH || 1, snapToGrid(initialSize.height + delta.height, effResizeH))
      const finalSize = { width: snappedWidth, height: snappedHeight }
      onResizeEndProp?.(wasResizingId, { x: snappedX, y: snappedY, width: snappedWidth, height: snappedHeight })
      const { previewLayout: finalSimLayout, canDrop } = simulateQueueShift(
        effectiveLayout,
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
        finalLayout = effectiveLayout.map((item: GridItem) =>
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
      onLayoutChange(finalLayout, effectiveLayout)
    },
    [
      effectiveLayout,
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

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Don't clear selection if any dragging or resizing is happening
    if (draggingItemIdRef.current || resizingItemIdRef.current) {
      return
    }

    // Clear selection when clicking on empty space
    const target = e.target as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement

    // Don't clear selection if clicking on any transformer-related element
    if (
      target.closest('.grid-transformer') ||
      target.closest('.grid-transformer-anchor') ||
      target.closest('.grid-transformer-rotation-handle')
    ) {
      return
    }

    // Check if click was on the canvas itself or any direct child that's not an item
    if (
      target === currentTarget ||
      (target.closest('.grid-layout') === currentTarget &&
        !target.closest('[data-itemid]') &&
        !target.closest('.grid-dropzone-shadow') &&
        !target.closest('.grid-selection-rectangle'))
    ) {
      setSelectedItemId(null)
    }
  }, [])

  // Item click handler
  const handleItemClick = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItemId(itemId)
  }, [])

  // Transformer callbacks
  const handleTransformerResize = useCallback(
    (itemId: string, newRect: { x: number; y: number; width: number; height: number }) => {
      let snappedRect = {
        x: snapToGrid(newRect.x, effSnapX),
        y: snapToGrid(newRect.y, effSnapY),
        width: Math.max(effResizeW || 1, snapToGrid(newRect.width, effResizeW)),
        height: Math.max(effResizeH || 1, snapToGrid(newRect.height, effResizeH)),
      }
      
      // Apply snap lines if enabled
      if (showSnapLines) {
        const currentItemSize = { width: snappedRect.width, height: snappedRect.height }
        
        // Calculate all available snap lines
        const gridSnapLines = calculateGridSnapLines(width, height, gridUnitSize, snapBehavior)
        const itemSnapLines = enableItemSnapping 
          ? calculateItemSnapLines(effectiveLayout, itemId, snapThreshold, snapBehavior) 
          : []
        const allSnapLines = [...gridSnapLines, ...itemSnapLines]
        
        // Apply snapping to the position
        const snapResult = applySnapToPosition(
          { x: snappedRect.x, y: snappedRect.y },
          currentItemSize,
          allSnapLines,
          snapThreshold
        )
        
        // Update with snapped position
        snappedRect.x = snapResult.x
        snappedRect.y = snapResult.y
      }

      const newLayout = effectiveLayout.map((item) => (item.id === itemId ? { ...item, ...snappedRect } : item))
      onLayoutChange(newLayout, effectiveLayout)
    },
    [effectiveLayout, onLayoutChange, effSnapX, effSnapY, effResizeW, effResizeH, showSnapLines, width, height, gridUnitSize, snapBehavior, enableItemSnapping, snapThreshold],
  )

  const handleTransformerRotate = useCallback(
    (itemId: string, angle: number) => {
      const newLayout = effectiveLayout.map((item) => (item.id === itemId ? { ...item, rotation: angle } : item))
      onLayoutChange(newLayout, effectiveLayout)
    },
    [effectiveLayout, onLayoutChange],
  )

  const handleTransformerRotatePreview = useCallback(
    (itemId: string, angle: number | null) => {
      if (angle !== null) {
        setPreviewRotation({ itemId, angle })
      } else {
        setPreviewRotation(null)
      }
      // Call external callback to expose rotation preview
      onRotationPreview?.(itemId, angle)
    },
    [onRotationPreview],
  )

  const handleTransformerResizePreview = useCallback(
    (itemId: string, rect: { x: number; y: number; width: number; height: number } | null) => {
      if (rect !== null) {
        let snappedRect = rect
        
        // Apply snap lines during transformer resize
        if (showSnapLines) {
          const currentItemSize = { width: rect.width, height: rect.height }
          
          // Calculate all available snap lines
          const gridSnapLines = calculateGridSnapLines(width, height, gridUnitSize, snapBehavior)
          const itemSnapLines = enableItemSnapping 
            ? calculateItemSnapLines(effectiveLayout, itemId, snapThreshold, snapBehavior) 
            : []
          const allSnapLines = [...gridSnapLines, ...itemSnapLines]
          
          // Apply snapping to the position
          const snapResult = applySnapToPosition(
            { x: rect.x, y: rect.y },
            currentItemSize,
            allSnapLines,
            snapThreshold
          )
          
          // Update rect with snapped position
          snappedRect = {
            ...rect,
            x: snapResult.x,
            y: snapResult.y
          }
          
          // Calculate distance indicators during transformer resize
          const resizingItem = { id: itemId, x: snappedRect.x, y: snappedRect.y, ...currentItemSize }
          const distanceIndicators = calculateDistanceIndicators(effectiveLayout.filter(item => item.id !== itemId), resizingItem)
          
          // Find relevant snap lines for display
          const relevantSnapLines = findRelevantSnapLines(allSnapLines, resizingItem)
          const extendedSnapLines = extendSnapLinesForItem(relevantSnapLines, resizingItem)
          
          // Combine with distance indicators for display
          const allDisplayLines = [...extendedSnapLines, ...distanceIndicators]
          
          setActiveSnapLines(allDisplayLines)
        }
        
        setPreviewResize({ itemId, rect: snappedRect })
      } else {
        setPreviewResize(null)
        setActiveSnapLines([])
      }
    },
    [showSnapLines, width, height, gridUnitSize, snapBehavior, enableItemSnapping, snapThreshold, effectiveLayout],
  )

  // Rendering
  const childrenMap = new Map<string, ReactNode>()
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.key != null) {
      childrenMap.set(String(child.key), child)
    }
  })

  const renderLayout = sortByZIndex(previewLayout || layout)
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
        transformOrigin,
        cursor: enableSelectionTool && !isLocked ? 'crosshair' : undefined,
      }}
      onMouseDown={handleSelectionMouseDown}
      onMouseMove={handleSelectionMouseMove}
      onMouseUp={(e) => {
        handleSelectionMouseUp(e)
        // Also handle canvas click for deselection
        handleCanvasClick(e)
      }}
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
            transformOrigin: 'center center',
            transform: dropPoint.rotation ? `rotate(${dropPoint.rotation}deg)` : undefined,
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
      
      {/* Snap Lines */}
      {showSnapLines && activeSnapLines.length > 0 && (
        <SnapLines 
          snapLines={activeSnapLines} 
          style={snapLinesStyle}
          scale={scale}
        />
      )}

      {renderLayout.map((item: GridItem) => {
        const isDragging = draggingItemIdRef.current === item.id
        const isResizing = resizingItemIdRef.current === item.id
        const isSelected = selectedItemId === item.id
        const isActive = isDragging || isResizing

        const itemOutline = showOutline && isActive ? `2px dashed ${outlineColor}` : undefined

        // Use preview resize if available, otherwise use item dimensions
        const currentPos = (previewResize?.itemId === item.id) 
          ? { x: previewResize.rect.x, y: previewResize.rect.y }
          : { x: item.x, y: item.y }
        const currentSize = (previewResize?.itemId === item.id)
          ? { width: previewResize.rect.width, height: previewResize.rect.height }
          : { width: item.width, height: item.height }

        const childToRender = childrenMap.get(item.id)

        if (!childToRender) {
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
        const combinedClasses = clsx(
          'grid-item', 
          showOutline && 'grid-item-outline', 
          disableAnimations && 'grid-item--no-animations',
          isDragging && 'grid-item--dragging',
          isResizing && 'grid-item--resizing',
          dynamicClasses
        )

        return (
          <Rnd
            scale={scale}
            key={item.id}
            size={currentSize}
            position={currentPos}
            bounds="parent"
            resizeGrid={[effResizeW, effResizeH]}
            minWidth={effResizeW || 1}
            minHeight={effResizeH || 1}
            disableDragging={itemLocked || (enableSelectionTool && !isActive)}
            enableResizing={
              !itemLocked &&
              !(enableSelectionTool && !isActive) &&
              !((showTransformer && (isSelected || isActive)) || item.showTransformer)
            }
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            onResize={handleResize}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            className={combinedClasses}
            style={{
              zIndex: isActive ? 1000 + (item.zIndex || 0) : (item.zIndex || 0),
              border: itemOutline,
              pointerEvents:
                (draggingItemIdRef.current && !isDragging) || (resizingItemIdRef.current && !isResizing)
                  ? 'none'
                  : undefined,
              transition: isActive ? 'none' : undefined,
              cursor: cursorStyle,
              transformOrigin: 'center center',
            }}
            data-itemid={item.id}
            resizeHandleComponent={resizeHandleComponent}
            {...(dragHandleClassName && { dragHandleClassName })}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              handleItemClick(item.id, e)
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: 'center center',
                transform: (() => {
                  // Use preview rotation if available, otherwise use item rotation
                  const currentRotation = (previewRotation?.itemId === item.id) 
                    ? previewRotation.angle 
                    : item.rotation
                  
                  return currentRotation ? `rotate(${currentRotation}deg)` : undefined
                })(),
              }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                handleItemClick(item.id, e)
              }}
            >
              {React.cloneElement(childToRender as React.ReactElement, {
                onClick: (e: React.MouseEvent) => {
                  // Call original onClick if it exists
                  if ((childToRender as React.ReactElement).props.onClick) {
                    ;(childToRender as React.ReactElement).props.onClick(e)
                  }
                  handleItemClick(item.id, e)
                },
                style: {
                  width: '100%',
                  height: '100%',
                  ...(childToRender as React.ReactElement).props.style,
                },
              })}
            </div>
          </Rnd>
        )
      })}

      {/* Transformers for items */}
      {renderLayout.map((item: GridItem) => {
        const isDragging = draggingItemIdRef.current === item.id
        const isResizing = resizingItemIdRef.current === item.id
        const isSelected = selectedItemId === item.id
        const isActive = isDragging || isResizing

        // Show transformer if: global flag is enabled AND (item is selected OR active) OR item specifically has showTransformer enabled
        const shouldShowTransformer = (showTransformer && (isSelected || isActive)) || item.showTransformer

        if (!shouldShowTransformer) return null

        // Use preview dimensions for transformer if available
        const transformerItem = (previewResize?.itemId === item.id) 
          ? { ...item, ...previewResize.rect }
          : item

        return (
          <Transformer
            key={`transformer-${item.id}`}
            item={transformerItem}
            scale={scale}
            previewRotation={previewRotation?.itemId === item.id ? previewRotation.angle : null}
            onResize={(newRect) => handleTransformerResize(item.id, newRect)}
            onRotate={(angle) => handleTransformerRotate(item.id, angle)}
            onRotatePreview={(angle) => handleTransformerRotatePreview(item.id, angle)}
            onResizePreview={(rect) => handleTransformerResizePreview(item.id, rect)}
            {...transformerStyle}
          />
        )
      })}
    </div>
  )
}

export default Grid
