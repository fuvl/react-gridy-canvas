export { default } from './components/layout'

export type {
  GridProps,
  GridItem,
  SelectionRectangle,
  MousePosition,
  TransformerStyle,
  SnapLine,
  SnapLinesStyle,
  SnapBehaviorConfig,
  SnapType,
} from './types'

export {
  moveItemUp,
  moveItemDown,
  moveItemToTop,
  moveItemToBottom,
  normalizeZIndices,
  sortByZIndex,
} from './utils/z-index-utils'

export {
  calculateGridSnapLines,
  calculateItemSnapLines,
  calculateDistanceIndicators,
  calculateDistanceSnapTargets,
  findRelevantSnapLines,
  extendSnapLinesForItem,
  applySnapToPosition,
} from './utils/snap-lines-utils'

import './components/styles.css'
