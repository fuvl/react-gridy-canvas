import { GridItem } from '../types'
import { doItemsOverlap, getOverlapRatio, snapToGrid } from './layout-utils'

const SHIFT_TRIGGER_OVERLAP_RATIO = 0.08

export interface ShiftSimulationResult {
  previewLayout: GridItem[]
  canDrop: boolean
  draggedPreview?: GridItem
  dropZone?: GridItem
  showShadow?: boolean
}

/**
 * Simulates the queue-based shift logic for the canvas layout.
 * Handles sticky fallback, partial overlap, and final 1D overlap check.
 */
export function simulateQueueShift(
  layout: GridItem[],
  draggedId: string,
  dropPos: { x: number; y: number },
  snapGridUnit: number | [number, number],
  gap: number,
  canvasWidth: number,
  canvasHeight: number,
  draggedSize?: { width: number; height: number },
  shiftOnCollision?: boolean,
  dropZone?: GridItem | null, // single dropZone variable
  updateDropZone?: (pos: GridItem) => void,
  dragStart?: { x: number; y: number; width: number; height: number },
): ShiftSimulationResult {
  const dragged = layout.find((i) => i.id === draggedId)
  if (!dragged) return { previewLayout: layout, canDrop: false }
  // allow separate snap units for X/Y
  const [snapX, snapY] = Array.isArray(snapGridUnit) ? snapGridUnit : [snapGridUnit, snapGridUnit]
  const actualWidth = draggedSize?.width ?? dragged.width
  const actualHeight = draggedSize?.height ?? dragged.height
  // compute pixel gap separately for X and Y axes
  const pixelGapX = gap * snapX
  const pixelGapY = gap * snapY
  // snap drop position to grid separately on X and Y
  const snappedDropPos = {
    x: snapToGrid(dropPos.x, snapX),
    y: snapToGrid(dropPos.y, snapY),
  }
  // preview of dragged item at dropped position
  const draggedPreview: GridItem = {
    id: draggedId,
    ...snappedDropPos,
    width: actualWidth,
    height: actualHeight,
  }
  const skipCollision = !!dragged.disableCollision
  // If this item should ignore collisions, allow unrestricted drop
  if (skipCollision) {
    const previewLayout = layout.map((item) =>
      item.id === draggedId ? { ...item, ...snappedDropPos, width: actualWidth, height: actualHeight } : item,
    )
    return {
      previewLayout,
      canDrop: true,
      draggedPreview,
      dropZone: draggedPreview,
      showShadow: true,
    }
  }

  let partialOverlap = false
  let anyOverlap = false
  let maxOverlapRatio = 0

  for (const item of layout) {
    if (item.id === draggedId || item.disableCollision) continue
    // use separate X/Y pixel gaps
    if (doItemsOverlap(draggedPreview, item, [pixelGapX, pixelGapY])) {
      anyOverlap = true
      const overlapRatio = getOverlapRatio(draggedPreview, item)
      if (overlapRatio > 0 && overlapRatio < SHIFT_TRIGGER_OVERLAP_RATIO) {
        partialOverlap = true
        if (overlapRatio > maxOverlapRatio) {
          maxOverlapRatio = overlapRatio
        }
      }
    }
  }

  // Only update dropZone if the current position is not colliding
  let newDropZone: GridItem | undefined = undefined
  if (!anyOverlap) {
    newDropZone = draggedPreview
  } else {
    newDropZone =
      dropZone ||
      (dragStart
        ? {
            id: draggedId,
            x: dragStart.x,
            y: dragStart.y,
            width: dragStart.width,
            height: dragStart.height,
          }
        : undefined)
  }

  // Always update dropZone if changed and not colliding
  if (updateDropZone && newDropZone && !anyOverlap) {
    if (
      !dropZone ||
      dropZone.x !== newDropZone.x ||
      dropZone.y !== newDropZone.y ||
      dropZone.width !== newDropZone.width ||
      dropZone.height !== newDropZone.height
    ) {
      updateDropZone(newDropZone)
    }
  }

  if (!anyOverlap) {
    return {
      previewLayout: layout.map((item) =>
        item.id === draggedId
          ? {
              ...item,
              ...snappedDropPos,
              width: actualWidth,
              height: actualHeight,
            }
          : item,
      ),
      canDrop: true,
      draggedPreview,
      dropZone: draggedPreview,
      showShadow: true,
    }
  }

  if (!shiftOnCollision) {
    return {
      previewLayout: layout.map((item) =>
        item.id === draggedId
          ? {
              ...item,
              ...snappedDropPos,
              width: actualWidth,
              height: actualHeight,
            }
          : item,
      ),
      canDrop: false,
      draggedPreview: newDropZone,
      dropZone: newDropZone,
      showShadow: !!newDropZone,
    }
  }

  if (partialOverlap) {
    if (newDropZone) {
      return {
        previewLayout: layout.map((item) =>
          item.id === draggedId
            ? {
                ...item,
                ...newDropZone,
                width: actualWidth,
                height: actualHeight,
              }
            : item,
        ),
        canDrop: false,
        draggedPreview: newDropZone,
        dropZone: newDropZone,
        showShadow: true,
      }
    }
    return {
      previewLayout: layout.map((item) =>
        item.id === draggedId
          ? {
              ...item,
              ...snappedDropPos,
              width: actualWidth,
              height: actualHeight,
            }
          : item,
      ),
      canDrop: false,
      draggedPreview: undefined,
      dropZone: undefined,
      showShadow: false,
    }
  }

  // If full overlap (enough for shift), run shift logic
  const virtualMap = new Map<string, GridItem>()
  layout.forEach((item) => virtualMap.set(item.id, { ...item }))
  virtualMap.set(draggedId, {
    ...dragged,
    ...snappedDropPos,
    width: actualWidth,
    height: actualHeight,
  })

  const queue: string[] = [draggedId]
  const processed = new Set<string>()

  // helper: snap down to ensure shifts align exactly
  const snapFloor = (value: number, grid: number) => Math.floor(value / grid) * grid

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue
    const currentItem = virtualMap.get(currentId)!

    for (const [otherId, other] of virtualMap.entries()) {
      if (otherId === currentId || other.disableCollision) continue
      if (doItemsOverlap(currentItem, other, [pixelGapX, pixelGapY])) {
        if (currentId === draggedId) {
          const overlapRatio = getOverlapRatio(currentItem, other)
          if (overlapRatio < SHIFT_TRIGGER_OVERLAP_RATIO) {
            if (typeof window !== 'undefined') {
            }
            if (newDropZone) {
              return {
                previewLayout: layout.map((item) =>
                  item.id === draggedId
                    ? {
                        ...item,
                        ...newDropZone,
                        width: actualWidth,
                        height: actualHeight,
                      }
                    : item,
                ),
                canDrop: false,
                draggedPreview: newDropZone,
                dropZone: newDropZone,
                showShadow: !!newDropZone,
              }
            } else {
              return {
                previewLayout: layout.map((item) =>
                  item.id === draggedId
                    ? {
                        ...item,
                        ...snappedDropPos,
                        width: actualWidth,
                        height: actualHeight,
                      }
                    : item,
                ),
                canDrop: false,
                draggedPreview: undefined,
                dropZone: undefined,
                showShadow: false,
              }
            }
          }
        }
        const shiftsToTry = [
          { x: other.x, y: currentItem.y + currentItem.height + pixelGapY },
          { x: currentItem.x + currentItem.width + pixelGapX, y: other.y },
          { x: other.x, y: currentItem.y - other.height - pixelGapY },
          { x: currentItem.x - other.width - pixelGapX, y: other.y },
        ]
        let shifted = false
        for (const shift of shiftsToTry) {
          // snap shifted items to grid using separate X/Y units
          const newPos: GridItem = {
            ...other,
            x: snapFloor(shift.x, snapX),
            y: snapFloor(shift.y, snapY),
          }
          if (
            newPos.x < 0 ||
            newPos.y < 0 ||
            newPos.x + other.width > canvasWidth ||
            newPos.y + other.height > canvasHeight
          ) {
            continue
          }
          virtualMap.set(otherId, newPos)

          let hasCollision = false
          for (const [checkId, checkItem] of virtualMap.entries()) {
            if (checkId === otherId || checkItem.disableCollision) continue
            if (doItemsOverlap(newPos, checkItem, [pixelGapX, pixelGapY])) {
              hasCollision = true
              break
            }
          }
          if (!hasCollision) {
            if (!processed.has(otherId)) queue.push(otherId)
            shifted = true
            break
          }
          virtualMap.set(otherId, other)
        }
        if (!shifted) {
          if (newDropZone) {
            return {
              previewLayout: layout.map((item) =>
                item.id === draggedId
                  ? {
                      ...item,
                      ...newDropZone,
                      width: actualWidth,
                      height: actualHeight,
                    }
                  : item,
              ),
              canDrop: false,
              draggedPreview: newDropZone,
              dropZone: newDropZone,
              showShadow: true,
            }
          }
          return {
            previewLayout: layout.map((item) =>
              item.id === draggedId
                ? {
                    ...item,
                    ...snappedDropPos,
                    width: actualWidth,
                    height: actualHeight,
                  }
                : item,
            ),
            canDrop: false,
            draggedPreview: undefined,
            dropZone: undefined,
            showShadow: false,
          }
        }
      }
    }
    processed.add(currentId ?? '')
  }

  const resultLayout = Array.from(virtualMap.values())
  return {
    previewLayout: resultLayout,
    canDrop: true,
    draggedPreview: virtualMap.get(draggedId)
      ? {
          id: virtualMap.get(draggedId)!.id,
          x: virtualMap.get(draggedId)!.x,
          y: virtualMap.get(draggedId)!.y,
          width: virtualMap.get(draggedId)!.width,
          height: virtualMap.get(draggedId)!.height,
        }
      : undefined,
    dropZone: virtualMap.get(draggedId)
      ? {
          id: virtualMap.get(draggedId)!.id,
          x: virtualMap.get(draggedId)!.x,
          y: virtualMap.get(draggedId)!.y,
          width: virtualMap.get(draggedId)!.width,
          height: virtualMap.get(draggedId)!.height,
        }
      : undefined,
    showShadow: true,
  }
}
