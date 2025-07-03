import { GridItem } from '../types'

/**
 * Normalizes z-indices to be sequential starting from 0
 */
export function normalizeZIndices(items: GridItem[]): GridItem[] {
  // Sort by current zIndex (or 0 if undefined)
  const sorted = [...items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  // Reassign sequential z-indices
  return items.map((item) => {
    const index = sorted.findIndex((sortedItem) => sortedItem.id === item.id)
    return { ...item, zIndex: index }
  })
}

/**
 * Moves an item one layer up
 */
export function moveItemUp(items: GridItem[], itemId: string): GridItem[] {
  const normalized = normalizeZIndices(items)
  const itemIndex = normalized.findIndex((item) => item.id === itemId)

  if (itemIndex === -1) return items

  const item = normalized[itemIndex]
  const currentZ = item.zIndex || 0
  const maxZ = Math.max(...normalized.map((i) => i.zIndex || 0))

  if (currentZ >= maxZ) return normalized // Already at top

  // Find next item above
  const itemsAbove = normalized.filter((i) => (i.zIndex || 0) > currentZ)
  const nextItem = itemsAbove.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))[0]

  if (!nextItem) return normalized

  // Swap z-indices
  return normalized.map((i) => {
    if (i.id === itemId) return { ...i, zIndex: nextItem.zIndex }
    if (i.id === nextItem.id) return { ...i, zIndex: currentZ }
    return i
  })
}

/**
 * Moves an item one layer down
 */
export function moveItemDown(items: GridItem[], itemId: string): GridItem[] {
  const normalized = normalizeZIndices(items)
  const itemIndex = normalized.findIndex((item) => item.id === itemId)

  if (itemIndex === -1) return items

  const item = normalized[itemIndex]
  const currentZ = item.zIndex || 0

  if (currentZ <= 0) return normalized // Already at bottom

  // Find next item below
  const itemsBelow = normalized.filter((i) => (i.zIndex || 0) < currentZ)
  const prevItem = itemsBelow.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))[0]

  if (!prevItem) return normalized

  // Swap z-indices
  return normalized.map((i) => {
    if (i.id === itemId) return { ...i, zIndex: prevItem.zIndex }
    if (i.id === prevItem.id) return { ...i, zIndex: currentZ }
    return i
  })
}

/**
 * Moves an item to the top layer
 */
export function moveItemToTop(items: GridItem[], itemId: string): GridItem[] {
  const normalized = normalizeZIndices(items)
  const maxZ = Math.max(...normalized.map((i) => i.zIndex || 0))

  return normalized.map((i) => {
    if (i.id === itemId) return { ...i, zIndex: maxZ + 1 }
    return i
  })
}

/**
 * Moves an item to the bottom layer
 */
export function moveItemToBottom(items: GridItem[], itemId: string): GridItem[] {
  const normalized = normalizeZIndices(items)

  return normalized.map((i) => {
    if (i.id === itemId) return { ...i, zIndex: -1 }
    return { ...i, zIndex: (i.zIndex || 0) + 1 }
  })
}

/**
 * Gets the sorted items by z-index (for rendering order)
 */
export function sortByZIndex(items: GridItem[]): GridItem[] {
  return [...items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
}
