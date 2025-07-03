import { GridItem, SnapLine, SnapBehaviorConfig } from '../types'

/**
 * Calculates grid-based snap lines for a given canvas size and grid unit
 */
export function calculateGridSnapLines(
  width: number,
  height: number,
  _gridUnitSize: number | [number, number],
  snapBehavior: SnapBehaviorConfig = { gridCenter: false },
  canvasX = 0,
  canvasY = 0,
): SnapLine[] {
  const snapLines: SnapLine[] = []

  // Handle both single number and array format (for future grid line implementation)
  // const [gridX, gridY] = Array.isArray(gridUnitSize) ? gridUnitSize : [gridUnitSize, gridUnitSize]

  let lineId = 0

  // Canvas center lines (if grid center snapping is enabled) - always show regardless of grid unit size
  if (snapBehavior.gridCenter) {
    // Vertical center line (middle of canvas width)
    const centerX = canvasX + width / 2
    snapLines.push({
      id: `canvas-center-v-${lineId++}`,
      type: 'vertical',
      position: centerX,
      start: canvasY,
      end: canvasY + height,
      snapType: 'grid-center',
    })

    // Horizontal center line (middle of canvas height)
    const centerY = canvasY + height / 2
    snapLines.push({
      id: `canvas-center-h-${lineId++}`,
      type: 'horizontal',
      position: centerY,
      start: canvasX,
      end: canvasX + width,
      snapType: 'grid-center',
    })
  }

  return snapLines
}

/**
 * Calculates distance indicator lines to show spacing between aligned items
 */
export function calculateDistanceIndicators(items: GridItem[], draggingItem: GridItem): SnapLine[] {
  const snapLines: SnapLine[] = []
  let lineId = 0

  // For horizontal spacing, find items that overlap vertically (share same row space)
  const horizontallyAligned = items.filter((item) => {
    const itemTop = item.y
    const itemBottom = item.y + item.height
    const draggingTop = draggingItem.y
    const draggingBottom = draggingItem.y + draggingItem.height

    // Check if there's any vertical overlap
    return itemTop < draggingBottom && itemBottom > draggingTop
  })

  // Show distances for horizontally aligned items
  if (horizontallyAligned.length > 0) {
    const allItems = [...horizontallyAligned, draggingItem].sort((a, b) => a.x - b.x)

    // Check if all items are in the same row (vertically aligned)
    const allInSameRow = allItems.every((item) => {
      const itemTop = item.y
      const itemBottom = item.y + item.height
      return allItems.every((otherItem) => {
        const otherTop = otherItem.y
        const otherBottom = otherItem.y + otherItem.height
        // Check for vertical overlap (same row)
        return itemTop < otherBottom && itemBottom > otherTop
      })
    })

    if (allInSameRow) {
      // Show distances between adjacent pairs
      for (let i = 0; i < allItems.length - 1; i++) {
        const leftItem = allItems[i]
        const rightItem = allItems[i + 1]
        const distance = rightItem.x - (leftItem.x + leftItem.width)

        if (distance > 0) {
          const gapStart = leftItem.x + leftItem.width
          const gapEnd = rightItem.x

          // Calculate Y position for the line - use the overlapping region
          const overlapTop = Math.max(leftItem.y, rightItem.y, draggingItem.y)
          const overlapBottom = Math.min(
            leftItem.y + leftItem.height,
            rightItem.y + rightItem.height,
            draggingItem.y + draggingItem.height,
          )
          const gapPosition = (overlapTop + overlapBottom) / 2

          snapLines.push({
            id: `distance-indicator-h-${lineId++}`,
            type: 'horizontal',
            position: gapPosition,
            start: gapStart,
            end: gapEnd,
            snapType: 'item-distance',
            distance: Math.round(distance),
            referenceItems: [leftItem.id, rightItem.id],
          })
        }
      }
    } else {
      // Show distances from each item to the dragging item
      horizontallyAligned.forEach((item) => {
        const draggingRight = draggingItem.x + draggingItem.width
        const itemRight = item.x + item.width

        let distance = 0
        let gapStart = 0
        let gapEnd = 0

        // Check if item is to the left of dragging item
        if (itemRight < draggingItem.x) {
          distance = draggingItem.x - itemRight
          gapStart = itemRight
          gapEnd = draggingItem.x
        }
        // Check if item is to the right of dragging item
        else if (item.x > draggingRight) {
          distance = item.x - draggingRight
          gapStart = draggingRight
          gapEnd = item.x
        }

        if (distance > 0) {
          // Calculate Y position for the line - use the overlapping region
          const overlapTop = Math.max(item.y, draggingItem.y)
          const overlapBottom = Math.min(item.y + item.height, draggingItem.y + draggingItem.height)
          const gapPosition = (overlapTop + overlapBottom) / 2

          snapLines.push({
            id: `distance-indicator-h-${lineId++}`,
            type: 'horizontal',
            position: gapPosition,
            start: gapStart,
            end: gapEnd,
            snapType: 'item-distance',
            distance: Math.round(distance),
            referenceItems: [draggingItem.id, item.id],
          })
        }
      })
    }
  }

  // For vertical spacing, find items that overlap horizontally (share same column space)
  const verticallyAligned = items.filter((item) => {
    const itemLeft = item.x
    const itemRight = item.x + item.width
    const draggingLeft = draggingItem.x
    const draggingRight = draggingItem.x + draggingItem.width

    // Check if there's any horizontal overlap
    return itemLeft < draggingRight && itemRight > draggingLeft
  })

  // Show distances for vertically aligned items
  if (verticallyAligned.length > 0) {
    const allItems = [...verticallyAligned, draggingItem].sort((a, b) => a.y - b.y)

    // Check if all items are in the same column (horizontally aligned)
    const allInSameColumn = allItems.every((item) => {
      const itemLeft = item.x
      const itemRight = item.x + item.width
      return allItems.every((otherItem) => {
        const otherLeft = otherItem.x
        const otherRight = otherItem.x + otherItem.width
        // Check for horizontal overlap (same column)
        return itemLeft < otherRight && itemRight > otherLeft
      })
    })

    if (allInSameColumn) {
      // Show distances between adjacent pairs
      for (let i = 0; i < allItems.length - 1; i++) {
        const topItem = allItems[i]
        const bottomItem = allItems[i + 1]
        const distance = bottomItem.y - (topItem.y + topItem.height)

        if (distance > 0) {
          const gapStart = topItem.y + topItem.height
          const gapEnd = bottomItem.y

          // Calculate X position for the line - use the overlapping region
          const overlapLeft = Math.max(topItem.x, bottomItem.x, draggingItem.x)
          const overlapRight = Math.min(
            topItem.x + topItem.width,
            bottomItem.x + bottomItem.width,
            draggingItem.x + draggingItem.width,
          )
          const gapPosition = (overlapLeft + overlapRight) / 2

          snapLines.push({
            id: `distance-indicator-v-${lineId++}`,
            type: 'vertical',
            position: gapPosition,
            start: gapStart,
            end: gapEnd,
            snapType: 'item-distance',
            distance: Math.round(distance),
            referenceItems: [topItem.id, bottomItem.id],
          })
        }
      }
    } else {
      // Show distances from each item to the dragging item
      verticallyAligned.forEach((item) => {
        const draggingBottom = draggingItem.y + draggingItem.height
        const itemBottom = item.y + item.height

        let distance = 0
        let gapStart = 0
        let gapEnd = 0

        // Check if item is above dragging item
        if (itemBottom < draggingItem.y) {
          distance = draggingItem.y - itemBottom
          gapStart = itemBottom
          gapEnd = draggingItem.y
        }
        // Check if item is below dragging item
        else if (item.y > draggingBottom) {
          distance = item.y - draggingBottom
          gapStart = draggingBottom
          gapEnd = item.y
        }

        if (distance > 0) {
          // Calculate X position for the line - use the overlapping region
          const overlapLeft = Math.max(item.x, draggingItem.x)
          const overlapRight = Math.min(item.x + item.width, draggingItem.x + draggingItem.width)
          const gapPosition = (overlapLeft + overlapRight) / 2

          snapLines.push({
            id: `distance-indicator-v-${lineId++}`,
            type: 'vertical',
            position: gapPosition,
            start: gapStart,
            end: gapEnd,
            snapType: 'item-distance',
            distance: Math.round(distance),
            referenceItems: [draggingItem.id, item.id],
          })
        }
      })
    }
  }

  return snapLines
}

/**
 * Calculates item-based snap lines for edges and centers
 */
export function calculateItemSnapLines(
  items: GridItem[],
  excludeItemId?: string,
  snapThreshold = 5,
  snapBehavior: SnapBehaviorConfig = { itemEdges: true, itemCenters: true },
): SnapLine[] {
  const snapLines: SnapLine[] = []

  const relevantItems = items.filter((item) => item.id !== excludeItemId)
  let lineId = 0

  relevantItems.forEach((item) => {
    const itemLeft = item.x
    const itemRight = item.x + item.width
    const itemTop = item.y
    const itemBottom = item.y + item.height
    const itemCenterX = item.x + item.width / 2
    const itemCenterY = item.y + item.height / 2

    // Item edge snap lines
    if (snapBehavior.itemEdges) {
      // Vertical edge lines
      // Left edge
      snapLines.push({
        id: `item-v-left-${lineId++}`,
        type: 'vertical',
        position: itemLeft,
        start: itemTop - snapThreshold,
        end: itemBottom + snapThreshold,
        snapType: 'item-edge',
        itemId: item.id,
      })

      // Right edge
      snapLines.push({
        id: `item-v-right-${lineId++}`,
        type: 'vertical',
        position: itemRight,
        start: itemTop - snapThreshold,
        end: itemBottom + snapThreshold,
        snapType: 'item-edge',
        itemId: item.id,
      })

      // Horizontal edge lines
      // Top edge
      snapLines.push({
        id: `item-h-top-${lineId++}`,
        type: 'horizontal',
        position: itemTop,
        start: itemLeft - snapThreshold,
        end: itemRight + snapThreshold,
        snapType: 'item-edge',
        itemId: item.id,
      })

      // Bottom edge
      snapLines.push({
        id: `item-h-bottom-${lineId++}`,
        type: 'horizontal',
        position: itemBottom,
        start: itemLeft - snapThreshold,
        end: itemRight + snapThreshold,
        snapType: 'item-edge',
        itemId: item.id,
      })
    }

    // Item center snap lines
    if (snapBehavior.itemCenters) {
      // Center X
      snapLines.push({
        id: `item-v-center-${lineId++}`,
        type: 'vertical',
        position: itemCenterX,
        start: itemTop - snapThreshold,
        end: itemBottom + snapThreshold,
        snapType: 'item-center',
        itemId: item.id,
      })

      // Center Y
      snapLines.push({
        id: `item-h-center-${lineId++}`,
        type: 'horizontal',
        position: itemCenterY,
        start: itemLeft - snapThreshold,
        end: itemRight + snapThreshold,
        snapType: 'item-center',
        itemId: item.id,
      })
    }
  })

  return snapLines
}

/**
 * Finds snap lines that are aligned with the dragging item (regardless of distance)
 */
export function findRelevantSnapLines(snapLines: SnapLine[], draggingItem: GridItem): SnapLine[] {
  const relevant: SnapLine[] = []

  const itemLeft = draggingItem.x
  const itemRight = draggingItem.x + draggingItem.width
  const itemTop = draggingItem.y
  const itemBottom = draggingItem.y + draggingItem.height
  const itemCenterX = draggingItem.x + draggingItem.width / 2
  const itemCenterY = draggingItem.y + draggingItem.height / 2

  snapLines.forEach((line) => {
    let isAligned = false

    if (line.type === 'vertical') {
      // Check if any of the item's X positions align exactly with this vertical line
      const alignmentTolerance = 0.1 // Extremely strict tolerance for exact alignment
      const distances = [
        Math.abs(itemLeft - line.position),
        Math.abs(itemRight - line.position),
        Math.abs(itemCenterX - line.position),
      ]

      if (Math.min(...distances) <= alignmentTolerance) {
        isAligned = true
      }
    } else if (line.type === 'horizontal') {
      // Check if any of the item's Y positions align exactly with this horizontal line
      const alignmentTolerance = 0.1 // Extremely strict tolerance for exact alignment
      const distances = [
        Math.abs(itemTop - line.position),
        Math.abs(itemBottom - line.position),
        Math.abs(itemCenterY - line.position),
      ]

      if (Math.min(...distances) <= alignmentTolerance) {
        isAligned = true
      }
    }

    if (isAligned) {
      relevant.push(line)
    }
  })

  return relevant
}

/**
 * Extends snap lines to connect only between aligned components
 */
export function extendSnapLinesForItem(snapLines: SnapLine[], draggingItem: GridItem): SnapLine[] {
  return snapLines.map((line) => {
    if (line.type === 'vertical') {
      // For vertical lines, extend from the top of the higher item to the bottom of the lower item
      const draggingTop = draggingItem.y
      const draggingBottom = draggingItem.y + draggingItem.height

      return {
        ...line,
        start: Math.min(draggingTop, line.start),
        end: Math.max(draggingBottom, line.end),
      }
    } else {
      // For horizontal lines, extend from the left of the leftmost item to the right of the rightmost item
      const draggingLeft = draggingItem.x
      const draggingRight = draggingItem.x + draggingItem.width

      return {
        ...line,
        start: Math.min(draggingLeft, line.start),
        end: Math.max(draggingRight, line.end),
      }
    }
  })
}

/**
 * Calculates distance-based snap targets for maintaining equal spacing
 */
export function calculateDistanceSnapTargets(
  items: GridItem[],
  draggingItem: GridItem,
  snapThreshold = 5,
): { x: number | null; y: number | null } {
  let snapX: number | null = null
  let snapY: number | null = null

  // Use a tighter threshold for distance snapping to make it more precise
  const distanceSnapThreshold = Math.min(snapThreshold, 2)

  // Check for horizontal distance snapping with priority: center, top, bottom
  const checkHorizontalAlignment = (
    alignmentCheck: (item1: GridItem, item2: GridItem, dragging: GridItem) => boolean,
  ) => {
    for (let i = 0; i < items.length && snapX === null; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i]
        const item2 = items[j]

        if (alignmentCheck(item1, item2, draggingItem)) {
          const leftItem = item1.x < item2.x ? item1 : item2
          const rightItem = item1.x < item2.x ? item2 : item1
          const distance = rightItem.x - (leftItem.x + leftItem.width)

          if (distance > 0) {
            const beforeLeftTarget = leftItem.x - distance - draggingItem.width
            const afterRightTarget = rightItem.x + rightItem.width + distance

            const distanceToBefore = Math.abs(draggingItem.x - beforeLeftTarget)
            const distanceToAfter = Math.abs(draggingItem.x - afterRightTarget)

            if (distanceToBefore <= distanceSnapThreshold && distanceToBefore < (distanceToAfter || Infinity)) {
              snapX = beforeLeftTarget
              break
            } else if (distanceToAfter <= distanceSnapThreshold) {
              snapX = afterRightTarget
              break
            }
          }
        }
      }
    }
  }

  // Try center alignment first
  checkHorizontalAlignment((item1, item2, dragging) => {
    const item1CenterY = item1.y + item1.height / 2
    const item2CenterY = item2.y + item2.height / 2
    const draggingCenterY = dragging.y + dragging.height / 2
    return (
      Math.abs(item1CenterY - draggingCenterY) <= distanceSnapThreshold &&
      Math.abs(item2CenterY - draggingCenterY) <= distanceSnapThreshold
    )
  })

  // Try top alignment if no center alignment found
  if (snapX === null) {
    checkHorizontalAlignment((item1, item2, dragging) => {
      return (
        Math.abs(item1.y - dragging.y) <= distanceSnapThreshold &&
        Math.abs(item2.y - dragging.y) <= distanceSnapThreshold
      )
    })
  }

  // Try bottom alignment if no top alignment found
  if (snapX === null) {
    checkHorizontalAlignment((item1, item2, dragging) => {
      const item1Bottom = item1.y + item1.height
      const item2Bottom = item2.y + item2.height
      const draggingBottom = dragging.y + dragging.height
      return (
        Math.abs(item1Bottom - draggingBottom) <= distanceSnapThreshold &&
        Math.abs(item2Bottom - draggingBottom) <= distanceSnapThreshold
      )
    })
  }

  // Try edge alignment if no other alignment found
  if (snapX === null) {
    checkHorizontalAlignment((item1, item2, dragging) => {
      const item1Bottom = item1.y + item1.height
      const item2Bottom = item2.y + item2.height
      const item1Top = item1.y
      const item2Top = item2.y
      const draggingTop = dragging.y
      const draggingBottom = dragging.y + dragging.height

      // Check if any combination of edges align
      return (
        (Math.abs(item1Bottom - item2Top) <= distanceSnapThreshold ||
          Math.abs(item1Top - item2Bottom) <= distanceSnapThreshold) &&
        (Math.abs(item1Bottom - draggingTop) <= distanceSnapThreshold ||
          Math.abs(item1Top - draggingBottom) <= distanceSnapThreshold ||
          Math.abs(item2Bottom - draggingTop) <= distanceSnapThreshold ||
          Math.abs(item2Top - draggingBottom) <= distanceSnapThreshold)
      )
    })
  }

  // Check for vertical distance snapping with priority: center, left, right
  const checkVerticalAlignment = (
    alignmentCheck: (item1: GridItem, item2: GridItem, dragging: GridItem) => boolean,
  ) => {
    for (let i = 0; i < items.length && snapY === null; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i]
        const item2 = items[j]

        if (alignmentCheck(item1, item2, draggingItem)) {
          const topItem = item1.y < item2.y ? item1 : item2
          const bottomItem = item1.y < item2.y ? item2 : item1
          const distance = bottomItem.y - (topItem.y + topItem.height)

          if (distance > 0) {
            const aboveTopTarget = topItem.y - distance - draggingItem.height
            const belowBottomTarget = bottomItem.y + bottomItem.height + distance

            const distanceToAbove = Math.abs(draggingItem.y - aboveTopTarget)
            const distanceToBelow = Math.abs(draggingItem.y - belowBottomTarget)

            if (distanceToAbove <= distanceSnapThreshold && distanceToAbove < (distanceToBelow || Infinity)) {
              snapY = aboveTopTarget
              break
            } else if (distanceToBelow <= distanceSnapThreshold) {
              snapY = belowBottomTarget
              break
            }
          }
        }
      }
    }
  }

  // Try center alignment first
  checkVerticalAlignment((item1, item2, dragging) => {
    const item1CenterX = item1.x + item1.width / 2
    const item2CenterX = item2.x + item2.width / 2
    const draggingCenterX = dragging.x + dragging.width / 2
    return (
      Math.abs(item1CenterX - draggingCenterX) <= distanceSnapThreshold &&
      Math.abs(item2CenterX - draggingCenterX) <= distanceSnapThreshold
    )
  })

  // Try left alignment if no center alignment found
  if (snapY === null) {
    checkVerticalAlignment((item1, item2, dragging) => {
      return (
        Math.abs(item1.x - dragging.x) <= distanceSnapThreshold &&
        Math.abs(item2.x - dragging.x) <= distanceSnapThreshold
      )
    })
  }

  // Try right alignment if no left alignment found
  if (snapY === null) {
    checkVerticalAlignment((item1, item2, dragging) => {
      const item1Right = item1.x + item1.width
      const item2Right = item2.x + item2.width
      const draggingRight = dragging.x + dragging.width
      return (
        Math.abs(item1Right - draggingRight) <= distanceSnapThreshold &&
        Math.abs(item2Right - draggingRight) <= distanceSnapThreshold
      )
    })
  }

  // Try edge alignment if no other alignment found
  if (snapY === null) {
    checkVerticalAlignment((item1, item2, dragging) => {
      const item1Right = item1.x + item1.width
      const item2Right = item2.x + item2.width
      const item1Left = item1.x
      const item2Left = item2.x
      const draggingLeft = dragging.x
      const draggingRight = dragging.x + dragging.width

      // Check if any combination of edges align
      return (
        (Math.abs(item1Right - item2Left) <= distanceSnapThreshold ||
          Math.abs(item1Left - item2Right) <= distanceSnapThreshold) &&
        (Math.abs(item1Right - draggingLeft) <= distanceSnapThreshold ||
          Math.abs(item1Left - draggingRight) <= distanceSnapThreshold ||
          Math.abs(item2Right - draggingLeft) <= distanceSnapThreshold ||
          Math.abs(item2Left - draggingRight) <= distanceSnapThreshold)
      )
    })
  }

  return { x: snapX, y: snapY }
}

/**
 * Applies snapping to item position based on snap lines
 */
export function applySnapToPosition(
  position: { x: number; y: number },
  itemSize: { width: number; height: number },
  snapLines: SnapLine[],
  snapThreshold = 5,
): { x: number; y: number; snappedLines: SnapLine[] } {
  let { x, y } = position
  const snappedLines: SnapLine[] = []

  const itemLeft = x
  const itemRight = x + itemSize.width
  const itemTop = y
  const itemBottom = y + itemSize.height
  const itemCenterX = x + itemSize.width / 2
  const itemCenterY = y + itemSize.height / 2

  // Find the closest snap positions
  let closestVerticalSnap: { distance: number; position: number; line: SnapLine } | null = null
  let closestHorizontalSnap: { distance: number; position: number; line: SnapLine } | null = null

  snapLines.forEach((line) => {
    if (line.type === 'vertical') {
      // Check snapping for left edge, right edge, and center
      const leftDistance = Math.abs(itemLeft - line.position)
      const rightDistance = Math.abs(itemRight - line.position)
      const centerDistance = Math.abs(itemCenterX - line.position)

      let snapDistance = Math.min(leftDistance, rightDistance, centerDistance)
      let snapPosition = x

      if (leftDistance === snapDistance) {
        snapPosition = line.position
      } else if (rightDistance === snapDistance) {
        snapPosition = line.position - itemSize.width
      } else if (centerDistance === snapDistance) {
        snapPosition = line.position - itemSize.width / 2
      }

      if (snapDistance <= snapThreshold && (!closestVerticalSnap || snapDistance < closestVerticalSnap.distance)) {
        closestVerticalSnap = { distance: snapDistance, position: snapPosition, line }
      }
    } else if (line.type === 'horizontal') {
      // Check snapping for top edge, bottom edge, and center
      const topDistance = Math.abs(itemTop - line.position)
      const bottomDistance = Math.abs(itemBottom - line.position)
      const centerDistance = Math.abs(itemCenterY - line.position)

      let snapDistance = Math.min(topDistance, bottomDistance, centerDistance)
      let snapPosition = y

      if (topDistance === snapDistance) {
        snapPosition = line.position
      } else if (bottomDistance === snapDistance) {
        snapPosition = line.position - itemSize.height
      } else if (centerDistance === snapDistance) {
        snapPosition = line.position - itemSize.height / 2
      }

      if (snapDistance <= snapThreshold && (!closestHorizontalSnap || snapDistance < closestHorizontalSnap.distance)) {
        closestHorizontalSnap = { distance: snapDistance, position: snapPosition, line }
      }
    }
  })

  // Apply snapping
  if (closestVerticalSnap) {
    const { position, line } = closestVerticalSnap
    x = position
    snappedLines.push(line)
  }

  if (closestHorizontalSnap) {
    const { position, line } = closestHorizontalSnap
    y = position
    snappedLines.push(line)
  }

  return { x, y, snappedLines }
}
