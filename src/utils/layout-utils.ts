import { GridItem } from '../types'

// Collision and Overlap Helpers

export function doItemsOverlap(item1: GridItem, item2: GridItem, gap: number | [number, number]): boolean {
  const [gapX, gapY] = Array.isArray(gap) ? gap : [gap, gap]
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

export function getOverlapRatio(item1: GridItem, item2: GridItem): number {
  const x_overlap = Math.max(0, Math.min(item1.x + item1.width, item2.x + item2.width) - Math.max(item1.x, item2.x))
  const y_overlap = Math.max(0, Math.min(item1.y + item1.height, item2.y + item2.height) - Math.max(item1.y, item2.y))
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
