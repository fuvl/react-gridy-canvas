import { GridItem } from '../types'

// Collision and Overlap Helpers

export function doItemsOverlap(item1: GridItem, item2: GridItem, gap: number): boolean {
  const inflate = gap / 2
  const a = {
    left: item1.x - inflate,
    right: item1.x + item1.width + inflate,
    top: item1.y - inflate,
    bottom: item1.y + item1.height + inflate,
  }
  const b = {
    left: item2.x - inflate,
    right: item2.x + item2.width + inflate,
    top: item2.y - inflate,
    bottom: item2.y + item2.height + inflate,
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
  const safeGrid = Math.max(1, grid)
  return Math.round(value / safeGrid) * safeGrid
}
