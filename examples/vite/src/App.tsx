import { useState, useRef, useCallback, CSSProperties } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import Grid, { GridItem, SelectionRectangle, MousePosition } from '../../../src/index'
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'

// Initial data for layout
const initialLayoutData: GridItem[] = [
  { id: '1', x: 0, y: 0, width: 100, height: 100 },
  { id: '2', x: 120, y: 0, width: 100, height: 100 },
  { id: '3', x: 240, y: 0, width: 100, height: 100 },
]

// Define the class name for the drag handle
const DRAG_HANDLE_CLASS = 'drag-handle'

// Define Tailwind classes for selected items
const SELECTED_ITEM_CLASSES =
  'outline outline-3 outline-red-500 outline-offset-[-1px] shadow-[0_0_0_3px_rgba(239,68,68,0.3)]'

function App() {
  // Layout State (Lifted)
  const [layout, setLayout] = useState<GridItem[]>(initialLayoutData) // Renamed LayoutItem to GridItem
  const nextItemId = useRef(layout.length + 1)

  // UI Control State
  const [shiftOnCollision, setShiftOnCollision] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [showDropZoneShadow, setShowDropZoneShadow] = useState(true)
  const [enableSelectionTool, setEnableSelectionTool] = useState(false)
  const [useCustomDragHandle, setUseCustomDragHandle] = useState(false)
  const [selectOnlyEmptySpace, setSelectOnlyEmptySpace] = useState(true)

  // Popover/Selection State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [popoverPositionStyle, setPopoverPositionStyle] = useState<CSSProperties>({ display: 'none' })
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const clearSelectionRef = useRef<(() => void) | null>(null)
  const [lastValidSelectionRect, setLastValidSelectionRect] = useState<SelectionRectangle | null>(null)

  const handleLayoutChange = useCallback((newLayout: GridItem[], oldLayout: GridItem[]) => {
    console.log('[App] Layout changed. Old:', oldLayout, 'New:', newLayout)
    setLayout(newLayout)
  }, [])

  // Clear selection state (visual and stored data)
  const clearCurrentSelection = useCallback(() => {
    if (clearSelectionRef.current) {
      clearSelectionRef.current()
      clearSelectionRef.current = null
    }
    setSelectedItems([])
    setLastValidSelectionRect(null)
  }, [])

  // Handle end of selection: store data, open popover at mouse position
  const handleSelectionEnd = useCallback(
    (
      selection: SelectionRectangle | null,
      mousePosition: MousePosition,
      isValidSelection: boolean,
      selectedItemIds: string[],
      clearSelectionFn: () => void,
    ) => {
      clearSelectionRef.current = clearSelectionFn
      setSelectedItems(selectedItemIds)

      if (isValidSelection && selection) {
        setLastValidSelectionRect(selection)

        setPopoverPositionStyle({
          position: 'fixed',
          left: `${mousePosition.clientX}px`,
          top: `${mousePosition.clientY}px`,
          width: 0,
          height: 0,
        })
        setIsPopoverOpen(true)
      } else {
        setIsPopoverOpen(false)
        setLastValidSelectionRect(null)
        setSelectedItems([])
        if (clearSelectionRef.current) {
          clearSelectionRef.current()
          clearSelectionRef.current = null
        }
      }
    },
    [],
  )

  const deleteSelectedItemsHandler = useCallback(() => {
    if (selectedItems.length === 0) return
    setLayout((prev) => prev.filter((item: GridItem) => !selectedItems.includes(item.id)))
    setIsPopoverOpen(false)
    clearCurrentSelection()
  }, [selectedItems, clearCurrentSelection])

  // Add a new card based on the stored selection rectangle
  const addCardHandler = useCallback(() => {
    if (!lastValidSelectionRect) return

    const newItemId = String(nextItemId.current++)
    const newItem: GridItem = {
      id: newItemId,
      x: lastValidSelectionRect.x,
      y: lastValidSelectionRect.y,
      width: lastValidSelectionRect.width,
      height: lastValidSelectionRect.height,
    }

    setLayout((prevLayout) => [...prevLayout, newItem])
    setIsPopoverOpen(false)
    clearCurrentSelection()
  }, [lastValidSelectionRect, clearCurrentSelection])

  // Handle Popover close: clear selection state if closed externally
  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setIsPopoverOpen(open)
    if (!open) {
      setSelectedItems([])
      setLastValidSelectionRect(null)

      if (clearSelectionRef.current) {
        clearCurrentSelection()
      }
    }
  }, [])

  // Function to provide classes to CanvasLayout items
  const getItemClassNameHandler = useCallback(
    (itemId: string): string => {
      return selectedItems.includes(itemId) ? SELECTED_ITEM_CLASSES : ''
    },
    [selectedItems],
  )

  return (
    <div className="p-8 space-y-8 relative">
      <h1 className="text-3xl font-bold mb-4">Canvas Layout Demo</h1>
      <div className="flex gap-4 flex-wrap">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant={shiftOnCollision ? 'default' : 'outline'} onClick={() => setShiftOnCollision((v) => !v)}>
          {shiftOnCollision ? 'Shifting On' : 'Shifting Off'}
        </Button>
        <Button variant={showOutline ? 'default' : 'outline'} onClick={() => setShowOutline((v) => !v)}>
          {showOutline ? 'Outline On' : 'Outline Off'}
        </Button>
        <Button variant={showDropZoneShadow ? 'default' : 'outline'} onClick={() => setShowDropZoneShadow((v) => !v)}>
          {showDropZoneShadow ? 'Drop Zone Shadow On' : 'Drop Zone Shadow Off'}
        </Button>
        <Button
          variant={enableSelectionTool ? 'default' : 'outline'}
          onClick={() => {
            const turningOff = enableSelectionTool
            setEnableSelectionTool((v) => !v)
            if (turningOff) {
              setIsPopoverOpen(false)
              clearCurrentSelection()
            }
          }}
        >
          {enableSelectionTool ? 'Selection Tool On' : 'Selection Tool Off'}
        </Button>
        <Button variant={useCustomDragHandle ? 'default' : 'outline'} onClick={() => setUseCustomDragHandle((v) => !v)}>
          {useCustomDragHandle ? 'Custom Drag Handle On' : 'Custom Drag Handle Off'}
        </Button>
        <Button
          variant={selectOnlyEmptySpace ? 'default' : 'outline'}
          onClick={() => setSelectOnlyEmptySpace((v) => !v)}
          disabled={!enableSelectionTool}
        >
          {selectOnlyEmptySpace ? 'Select Empty Space Only' : 'Select Anywhere'}
        </Button>
      </div>
      <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger style={popoverPositionStyle} />
        <PopoverContent onOpenAutoFocus={(e: Event) => e.preventDefault()} className="w-auto p-0">
          {selectedItems.length > 0 ? (
            <Button
              variant="ghost"
              onClick={deleteSelectedItemsHandler}
              className="block w-full text-left p-2 text-red-600"
            >
              Delete Selected ({selectedItems.length})
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={addCardHandler}
              disabled={!lastValidSelectionRect}
              className="block w-full text-left p-2"
            >
              Add Card Here
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <div className="mt-8">
        <Grid
          layout={layout}
          onLayoutChange={handleLayoutChange}
          width={800}
          height={600}
          isLocked={false}
          gap={10}
          shiftOnCollision={shiftOnCollision}
          snapGridUnit={10}
          resizeGridUnit={10}
          showOutline={showOutline}
          enableSelectionTool={enableSelectionTool}
          onSelectionEnd={handleSelectionEnd}
          selectOnlyEmptySpace={selectOnlyEmptySpace}
          showDropZoneShadow={showDropZoneShadow}
          minSelectionArea={3000}
          dragHandleClassName={useCustomDragHandle ? DRAG_HANDLE_CLASS : undefined}
          getItemClassName={getItemClassNameHandler}
        >
          {layout.map((item) => {
            return (
              <Card className="flex items-center justify-center relative overflow-visible" key={item.id}>
                {useCustomDragHandle && (
                  <div
                    className={DRAG_HANDLE_CLASS}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      padding: '2px 6px',
                      background: 'rgba(100, 100, 255, 0.7)',
                      color: 'white',
                      fontSize: '10px',
                      borderRadius: '4px',
                      cursor: 'move',
                      zIndex: 10,
                      border: '1px solid rgba(0,0,0,0.2)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                    title="Drag"
                  >
                    DRAG
                  </div>
                )}
                Item {item.id}
              </Card>
            )
          })}
        </Grid>
      </div>
    </div>
  )
}

export default App
