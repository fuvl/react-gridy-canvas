import { describe, it, expect } from 'vitest'
import { doItemsOverlap, getOverlapRatio, snapToGrid } from './layout-utils'
import type { GridItem } from '../types'

// Helper to create GridItem objects easily
const createItem = (id: string, x: number, y: number, width: number, height: number): GridItem => ({
  id,
  x,
  y,
  width,
  height,
})

describe('layout-utils', () => {
  describe('doItemsOverlap', () => {
    const item1 = createItem('1', 10, 10, 100, 100)

    it('should return true for overlapping items (no gap)', () => {
      const item2 = createItem('2', 50, 50, 100, 100)
      expect(doItemsOverlap(item1, item2, 0)).toBe(true)
    })

    it('should return false for non-overlapping items (no gap)', () => {
      const item2 = createItem('2', 110, 110, 100, 100)
      expect(doItemsOverlap(item1, item2, 0)).toBe(false)
    })

    it('should return false for adjacent items (no gap)', () => {
      const item2 = createItem('2', 110, 10, 100, 100)
      expect(doItemsOverlap(item1, item2, 0)).toBe(false)
      const item3 = createItem('3', 10, 110, 100, 100)
      expect(doItemsOverlap(item1, item3, 0)).toBe(false)
    })

    it('should return true for items overlapping within the gap', () => {
      const item2 = createItem('2', 105, 10, 100, 100)
      expect(doItemsOverlap(item1, item2, 10)).toBe(true)
    })

    it('should return false for items separated by more than the gap', () => {
      const item2 = createItem('2', 121, 10, 100, 100)
      expect(doItemsOverlap(item1, item2, 10)).toBe(false)
    })
  })

  describe('getOverlapRatio', () => {
    const item1 = createItem('1', 0, 0, 100, 100)

    it('should return 1 for identical items', () => {
      const item2 = createItem('2', 0, 0, 100, 100)
      expect(getOverlapRatio(item1, item2)).toBe(1)
    })

    it('should return correct ratio for partial overlap', () => {
      const item2 = createItem('2', 50, 50, 100, 100)
      expect(getOverlapRatio(item1, item2)).toBe(0.25)
    })

    it('should return 0 for non-overlapping items', () => {
      const item2 = createItem('2', 100, 100, 100, 100)
      expect(getOverlapRatio(item1, item2)).toBe(0)
    })

    it('should return 0 if one item has zero area', () => {
      const item2 = createItem('2', 0, 0, 0, 100)
      expect(getOverlapRatio(item1, item2)).toBe(0)
    })
  })

  describe('snapToGrid', () => {
    it('should snap values to the nearest grid multiple', () => {
      expect(snapToGrid(12, 10)).toBe(10)
      expect(snapToGrid(18, 10)).toBe(20)
      expect(snapToGrid(5, 10)).toBe(10)
      expect(snapToGrid(4, 10)).toBe(0)
      expect(snapToGrid(15, 10)).toBe(20)
    })

    it('should handle grid size of 1', () => {
      expect(snapToGrid(12.3, 1)).toBe(12)
      expect(snapToGrid(12.7, 1)).toBe(13)
    })

    it('should handle grid size less than 1 (treat as 1)', () => {
      expect(snapToGrid(12.3, 0.5)).toBe(12)
      expect(snapToGrid(12.7, 0)).toBe(13)
    })
  })
})
