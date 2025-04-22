import { useState, useCallback, useRef, useEffect, RefObject, MouseEvent as ReactMouseEvent } from 'react'
import { snapToGrid, doItemsOverlap } from './layout-utils'
import { GridItem, SelectionRectangle, MousePosition } from '../types'

// Constants
const ITEM_SELECTION_COVERAGE_THRESHOLD = 0.9
const MIN_DRAG_DISTANCE = 5

// Types
interface UseSelectionHandlerProps {
  canvasRef: RefObject<HTMLDivElement>
  layout: GridItem[]
  width: number
  height: number
  /** Scale factor of the canvas */
  scale?: number
  snapGridUnit: number | [number, number]
  enableSelectionTool: boolean
  selectOnlyEmptySpace: boolean
  minSelectionArea: number
  isLocked: boolean
  draggingItemIdRef: RefObject<string | null>
  resizingItemIdRef: RefObject<string | null>
  dragHandleClassName?: string
  onSelectionEnd?: (
    selectionRect: SelectionRectangle | null,
    mousePosition: MousePosition,
    isValid: boolean,
    selectedItemIds: string[],
    clearSelection: () => void,
  ) => void
}

interface UseSelectionHandlerReturn {
  selectionRect: SelectionRectangle | null
  isSelectionValidForStyling: boolean
  handleMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void
  handleMouseMove: (e: ReactMouseEvent<HTMLDivElement>) => void
  handleMouseUp: (e: ReactMouseEvent<HTMLDivElement>) => void
  clearSelectionState: () => void
}

// Custom Hook
export const useSelectionHandler = ({
  canvasRef,
  layout,
  width,
  height,
  scale = 1,
  snapGridUnit,
  enableSelectionTool,
  selectOnlyEmptySpace,
  minSelectionArea,
  isLocked,
  draggingItemIdRef,
  resizingItemIdRef,
  dragHandleClassName,
  onSelectionEnd,
}: UseSelectionHandlerProps): UseSelectionHandlerReturn => {
  const [snapX, snapY] = Array.isArray(snapGridUnit) ? snapGridUnit : [snapGridUnit, snapGridUnit]
  // State
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [selectionStart, setSelectionStart] = useState<{
    x: number
    y: number
  } | null>(null)
  const [selectionRect, setSelectionRect] = useState<SelectionRectangle | null>(null)
  const [isSelectionValidForStyling, setIsSelectionValidForStyling] = useState<boolean>(true)

  // Refs
  const listenersAttachedRef = useRef<boolean>(false)
  const selectionListenersRef = useRef<{
    handleGlobalMouseMove: ((e: MouseEvent) => void) | null
    handleGlobalMouseUp: ((e: MouseEvent) => void) | null
  }>({ handleGlobalMouseMove: null, handleGlobalMouseUp: null })

  // Listener Management
  const removeSelectionListeners = useCallback(() => {
    if (listenersAttachedRef.current) {
      if (selectionListenersRef.current.handleGlobalMouseMove) {
        window.removeEventListener('mousemove', selectionListenersRef.current.handleGlobalMouseMove)
        selectionListenersRef.current.handleGlobalMouseMove = null
      }
      if (selectionListenersRef.current.handleGlobalMouseUp) {
        window.removeEventListener('mouseup', selectionListenersRef.current.handleGlobalMouseUp)
        selectionListenersRef.current.handleGlobalMouseUp = null
      }
      listenersAttachedRef.current = false
    }
  }, [])

  // Effect for cleanup if component unmounts during selection
  useEffect(() => {
    return () => {
      removeSelectionListeners()
    }
  }, [removeSelectionListeners])

  // Internal Selection Clear Function
  const clearSelectionState = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false)
      removeSelectionListeners()
    }
    setSelectionStart(null)
    setSelectionRect(null)
    setIsSelectionValidForStyling(true)
    listenersAttachedRef.current = false
  }, [isSelecting, removeSelectionListeners])

  // Selection Logic (Mouse Move)
  const processSelectionMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isSelecting || !selectionStart || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const relX = (clientX - rect.left) / scale
      const relY = (clientY - rect.top) / scale
      const currentX = Math.max(0, Math.min(relX, width))
      const currentY = Math.max(0, Math.min(relY, height))
      const startX = selectionStart.x
      const startY = selectionStart.y

      const snappedStartX = snapToGrid(startX, snapX)
      const snappedStartY = snapToGrid(startY, snapY)
      const snappedCurrentX = snapToGrid(currentX, snapX)
      const snappedCurrentY = snapToGrid(currentY, snapY)

      const finalSnappedX = Math.min(snappedStartX, snappedCurrentX)
      const finalSnappedY = Math.min(snappedStartY, snappedCurrentY)
      const finalSnappedEndX = Math.max(snappedStartX, snappedCurrentX)
      const finalSnappedEndY = Math.max(snappedStartY, snappedCurrentY)

      const calculatedSnappedWidth = finalSnappedEndX - finalSnappedX
      const calculatedSnappedHeight = finalSnappedEndY - finalSnappedY

      const snappedWidth = Math.max(snapX, calculatedSnappedWidth)
      const snappedHeight = Math.max(snapY, calculatedSnappedHeight)

      const currentSelection: SelectionRectangle = {
        x: finalSnappedX,
        y: finalSnappedY,
        width: snappedWidth,
        height: snappedHeight,
      }
      setSelectionRect(currentSelection)

      let isAreaValid = currentSelection.width * currentSelection.height >= minSelectionArea
      let isEmptySpaceValid = true

      if (selectOnlyEmptySpace) {
        const selectionWithId = { ...currentSelection, id: '__selection__' }
        for (const item of layout) {
          if (doItemsOverlap(selectionWithId, item, 1)) {
            isEmptySpaceValid = false
            break
          }
        }
      }
      setIsSelectionValidForStyling(isAreaValid && (isEmptySpaceValid || !selectOnlyEmptySpace))
    },
    [
      isSelecting,
      selectionStart,
      canvasRef,
      width,
      height,
      snapX,
      snapY,
      minSelectionArea,
      selectOnlyEmptySpace,
      layout,
      scale,
    ],
  )

  // Selection Logic (Mouse Up)
  const processSelectionEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (!isSelecting || !selectionStart || !canvasRef.current) {
        setIsSelecting(false)
        setSelectionStart(null)
        listenersAttachedRef.current = false
        return
      }

      const rect = canvasRef.current.getBoundingClientRect()
      const relX = (clientX - rect.left) / scale
      const relY = (clientY - rect.top) / scale
      const finalCurrentX = Math.max(0, Math.min(relX, width))
      const finalCurrentY = Math.max(0, Math.min(relY, height))
      const startX = selectionStart.x
      const startY = selectionStart.y

      const snappedStartX = snapToGrid(startX, snapX)
      const snappedStartY = snapToGrid(startY, snapY)
      const snappedCurrentX = snapToGrid(finalCurrentX, snapX)
      const snappedCurrentY = snapToGrid(finalCurrentY, snapY)

      const finalSnappedX = Math.min(snappedStartX, snappedCurrentX)
      const finalSnappedY = Math.min(snappedStartY, snappedCurrentY)
      const finalSnappedEndX = Math.max(snappedStartX, snappedCurrentX)
      const finalSnappedEndY = Math.max(snappedStartY, snappedCurrentY)

      const calculatedSnappedWidth = finalSnappedEndX - finalSnappedX
      const calculatedSnappedHeight = finalSnappedEndY - finalSnappedY

      const finalSnappedWidth = Math.max(snapX, calculatedSnappedWidth)
      const finalSnappedHeight = Math.max(snapY, calculatedSnappedHeight)

      const finalCalculatedRect: SelectionRectangle = {
        x: finalSnappedX,
        y: finalSnappedY,
        width: finalSnappedWidth,
        height: finalSnappedHeight,
      }

      let isFinalAreaValid = finalCalculatedRect.width * finalCalculatedRect.height >= minSelectionArea
      let isFinalEmptySpaceValid = true
      if (selectOnlyEmptySpace) {
        const selectionWithId = { ...finalCalculatedRect, id: '__selection__' }
        for (const item of layout) {
          if (doItemsOverlap(selectionWithId, item, 1)) {
            isFinalEmptySpaceValid = false
            break
          }
        }
      }
      const finalIsValidSelection = isFinalAreaValid && (isFinalEmptySpaceValid || !selectOnlyEmptySpace)

      const finalMousePosition: MousePosition = { clientX, clientY }

      let finalSelectedItemIds: string[] = []
      if (!selectOnlyEmptySpace) {
        const selectionArea = finalCalculatedRect.width * finalCalculatedRect.height
        if (selectionArea > 0) {
          layout.forEach((item) => {
            const itemArea = item.width * item.height
            if (itemArea <= 0) return
            const intersectX1 = Math.max(finalCalculatedRect.x, item.x)
            const intersectY1 = Math.max(finalCalculatedRect.y, item.y)
            const intersectX2 = Math.min(finalCalculatedRect.x + finalCalculatedRect.width, item.x + item.width)
            const intersectY2 = Math.min(finalCalculatedRect.y + finalCalculatedRect.height, item.y + item.height)
            const intersectWidth = Math.max(0, intersectX2 - intersectX1)
            const intersectHeight = Math.max(0, intersectY2 - intersectY1)
            const intersectArea = intersectWidth * intersectHeight
            if (intersectArea / itemArea >= ITEM_SELECTION_COVERAGE_THRESHOLD) {
              finalSelectedItemIds.push(item.id)
            }
          })
        }
      }

      const stableClearFn = clearSelectionState
      onSelectionEnd?.(
        finalCalculatedRect,
        finalMousePosition,
        finalIsValidSelection,
        finalSelectedItemIds,
        stableClearFn,
      )

      setIsSelecting(false)
      setSelectionStart(null)
      listenersAttachedRef.current = false
    },
    [
      isSelecting,
      selectionStart,
      canvasRef,
      width,
      height,
      snapX,
      snapY,
      minSelectionArea,
      selectOnlyEmptySpace,
      layout,
      onSelectionEnd,
      clearSelectionState,
      scale,
    ],
  )

  // Event Handlers

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      processSelectionMove(e.clientX, e.clientY)
    },
    [processSelectionMove],
  )

  const handleGlobalMouseUp = useCallback(
    (e: MouseEvent) => {
      removeSelectionListeners()
      processSelectionEnd(e.clientX, e.clientY)
    },
    [processSelectionEnd, removeSelectionListeners],
  )

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (dragHandleClassName && (e.target as HTMLElement).closest(`.${dragHandleClassName}`)) {
        return
      }
      if ((e.target as HTMLElement).closest('.react-resizable-handle')) {
        return
      }
      if (e.button === 2) {
        return
      }
      e.preventDefault()

      if (!enableSelectionTool || isLocked) {
        return
      }

      if (draggingItemIdRef.current || resizingItemIdRef.current) {
        return
      }

      clearSelectionState()

      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const startX = (e.clientX - rect.left) / scale
      const startY = (e.clientY - rect.top) / scale

      if (startX < 0 || startX > width || startY < 0 || startY > height) {
        return
      }

      setIsSelecting(true)
      setSelectionStart({ x: startX, y: startY })
      const initialSnappedX = snapToGrid(startX, snapX)
      const initialSnappedY = snapToGrid(startY, snapY)
      setSelectionRect({
        x: initialSnappedX,
        y: initialSnappedY,
        width: snapX,
        height: snapY,
      })
      setIsSelectionValidForStyling(false)
      listenersAttachedRef.current = false
    },
    [
      enableSelectionTool,
      isLocked,
      clearSelectionState,
      dragHandleClassName,
      snapX,
      snapY,
      width,
      height,
      canvasRef,
      draggingItemIdRef,
      resizingItemIdRef,
      scale,
    ],
  )

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!isSelecting || !selectionStart) return

      if (!listenersAttachedRef.current) {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          const relCurrentX = (e.clientX - rect.left) / scale
          const relCurrentY = (e.clientY - rect.top) / scale
          const dx = Math.abs(relCurrentX - selectionStart.x)
          const dy = Math.abs(relCurrentY - selectionStart.y)
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance >= MIN_DRAG_DISTANCE) {
            selectionListenersRef.current.handleGlobalMouseMove = handleGlobalMouseMove
            selectionListenersRef.current.handleGlobalMouseUp = handleGlobalMouseUp
            window.addEventListener('mousemove', handleGlobalMouseMove)
            window.addEventListener('mouseup', handleGlobalMouseUp)
            listenersAttachedRef.current = true
          }
        }
      }

      processSelectionMove(e.clientX, e.clientY)
    },
    [isSelecting, selectionStart, canvasRef, handleGlobalMouseMove, handleGlobalMouseUp, processSelectionMove, scale],
  )

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (isSelecting && !listenersAttachedRef.current) {
        processSelectionEnd(e.clientX, e.clientY)
        listenersAttachedRef.current = false
      }
    },
    [isSelecting, processSelectionEnd],
  )

  // Return Values
  return {
    selectionRect,
    isSelectionValidForStyling,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearSelectionState,
  }
}
