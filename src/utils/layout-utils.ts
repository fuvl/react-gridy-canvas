import { GridItem } from '../types'

// Collision and Overlap Helpers

/**
 * Calculates the rotated bounding box corners of an item
 */
export function getRotatedBoundingBox(item: GridItem): { x: number; y: number }[] {
  const { x, y, width, height, rotation = 0 } = item
  const centerX = x + width / 2
  const centerY = y + height / 2
  const angleRad = (rotation * Math.PI) / 180

  // Original corners relative to center
  const corners = [
    { x: -width / 2, y: -height / 2 }, // top-left
    { x: width / 2, y: -height / 2 }, // top-right
    { x: width / 2, y: height / 2 }, // bottom-right
    { x: -width / 2, y: height / 2 }, // bottom-left
  ]

  // Rotate corners and translate back to world coordinates
  return corners.map((corner) => ({
    x: centerX + corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad),
    y: centerY + corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad),
  }))
}

/**
 * Calculates the axis-aligned bounding box (AABB) that encompasses a rotated rectangle
 */
export function getRotatedAABB(item: GridItem): { x: number; y: number; width: number; height: number } {
  if (!item.rotation || item.rotation === 0) {
    return { x: item.x, y: item.y, width: item.width, height: item.height }
  }

  const corners = getRotatedBoundingBox(item)
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Checks if two convex polygons overlap using the Separating Axis Theorem (SAT)
 */
function polygonsOverlap(corners1: { x: number; y: number }[], corners2: { x: number; y: number }[]): boolean {
  const polygons = [corners1, corners2]

  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i]
      const next = polygon[(i + 1) % polygon.length]

      // Get edge normal (perpendicular to edge)
      const edge = { x: next.x - current.x, y: next.y - current.y }
      const normal = { x: -edge.y, y: edge.x }
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y)
      if (length === 0) continue

      // Normalize
      normal.x /= length
      normal.y /= length

      // Project both polygons onto this axis
      let min1 = Infinity,
        max1 = -Infinity
      let min2 = Infinity,
        max2 = -Infinity

      for (const corner of corners1) {
        const projection = corner.x * normal.x + corner.y * normal.y
        min1 = Math.min(min1, projection)
        max1 = Math.max(max1, projection)
      }

      for (const corner of corners2) {
        const projection = corner.x * normal.x + corner.y * normal.y
        min2 = Math.min(min2, projection)
        max2 = Math.max(max2, projection)
      }

      // Check for separation
      if (max1 < min2 || max2 < min1) {
        return false // No overlap
      }
    }
  }

  return true // Overlap found
}

export function doItemsOverlap(item1: GridItem, item2: GridItem, gap: number | [number, number]): boolean {
  const [gapX, gapY] = Array.isArray(gap) ? gap : [gap, gap]

  // Check if either item is rotated
  const item1Rotated = item1.rotation && item1.rotation !== 0
  const item2Rotated = item2.rotation && item2.rotation !== 0

  if (!item1Rotated && !item2Rotated) {
    // Fast path: both items are axis-aligned rectangles
    const inflateX = gapX / 2
    const inflateY = gapY / 2
    const a = {
      left: item1.x - inflateX,
      right: item1.x + item1.width + inflateX,
      top: item1.y - inflateY,
      bottom: item1.y + item1.height + inflateY,
    }
    const b = {
      left: item2.x - inflateX,
      right: item2.x + item2.width + inflateX,
      top: item2.y - inflateY,
      bottom: item2.y + item2.height + inflateY,
    }
    const horizontalOverlap = a.left < b.right && a.right > b.left
    const verticalOverlap = a.top < b.bottom && a.bottom > b.top
    return horizontalOverlap && verticalOverlap
  }

  // At least one item is rotated, use precise polygon collision detection
  // Apply gap by expanding the bounding boxes
  const expandedItem1 = {
    ...item1,
    x: item1.x - gapX / 2,
    y: item1.y - gapY / 2,
    width: item1.width + gapX,
    height: item1.height + gapY,
  }
  const expandedItem2 = {
    ...item2,
    x: item2.x - gapX / 2,
    y: item2.y - gapY / 2,
    width: item2.width + gapX,
    height: item2.height + gapY,
  }

  const corners1 = getRotatedBoundingBox(expandedItem1)
  const corners2 = getRotatedBoundingBox(expandedItem2)

  return polygonsOverlap(corners1, corners2)
}

export function getOverlapRatio(item1: GridItem, item2: GridItem): number {
  // Check if either item is rotated
  const item1Rotated = item1.rotation && item1.rotation !== 0
  const item2Rotated = item2.rotation && item2.rotation !== 0

  if (!item1Rotated && !item2Rotated) {
    // Fast path: both items are axis-aligned rectangles
    const x_overlap = Math.max(0, Math.min(item1.x + item1.width, item2.x + item2.width) - Math.max(item1.x, item2.x))
    const y_overlap = Math.max(0, Math.min(item1.y + item1.height, item2.y + item2.height) - Math.max(item1.y, item2.y))
    const overlapArea = x_overlap * y_overlap
    const minArea = Math.min(item1.width * item1.height, item2.width * item2.height)
    if (minArea === 0) return 0
    return overlapArea / minArea
  }

  // For rotated items, use AABB approximation for performance
  // This is less precise but much faster than computing exact polygon intersection
  const aabb1 = getRotatedAABB(item1)
  const aabb2 = getRotatedAABB(item2)

  const x_overlap = Math.max(0, Math.min(aabb1.x + aabb1.width, aabb2.x + aabb2.width) - Math.max(aabb1.x, aabb2.x))
  const y_overlap = Math.max(0, Math.min(aabb1.y + aabb1.height, aabb2.y + aabb2.height) - Math.max(aabb1.y, aabb2.y))
  const overlapArea = x_overlap * y_overlap
  const minArea = Math.min(item1.width * item1.height, item2.width * item2.height)
  if (minArea === 0) return 0
  return overlapArea / minArea
}

export function snapToGrid(value: number, grid: number): number {
  // If grid is 0 or less, return the value as-is for free movement
  if (grid <= 0) return value
  return Math.round(value / grid) * grid
}
