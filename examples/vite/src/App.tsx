import { useState, useRef, useCallback, CSSProperties } from 'react'
import { Button } from './components/ui/button'
import Grid, { GridItem, SelectionRectangle, MousePosition } from '../../../src/index'
import { Switch } from './components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover'
import { SquareDashedMousePointer, ZoomOut, ZoomIn } from 'lucide-react'
import ItemCard from './components/ItemCard'
import './App.css'

// Initial data for layout
const initialLayoutData: GridItem[] = [
  { id: '1', x: 0, y: 0, width: 100, height: 80 },
  { id: '2', x: 120, y: 0, width: 100, height: 80 },
  { id: '3', x: 240, y: 0, width: 100, height: 80 },
]

// Define the class name for the drag handle
const DRAG_HANDLE_CLASS = 'drag-handle'

const SELECTED_ITEM_CLASSES = 'outline outline-2 outline-red-500 shadow-red-500/30'

const CUSTOM_GRID_LINES_CLASSES = 'bg-[background-image:linear-gradient(to_right,rgba(209,213,219,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(209,213,219,0.5)_1px,transparent_1px)] bg-[background-size:10px_10px]'

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
  const [showGrid, setShowGrid] = useState(false)
  const [scale, setScale] = useState<number>(1)

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
    setEnableSelectionTool(false) 
  }, [selectedItems, clearCurrentSelection, setEnableSelectionTool])

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
    setEnableSelectionTool(false) // turn off selection tool after creation
  }, [lastValidSelectionRect, clearCurrentSelection, setEnableSelectionTool])

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
  const getSelectedItemClassHandler = useCallback(
    (itemId: string): string => {
      // Use the renamed constant for selected item classes
      return selectedItems.includes(itemId) ? SELECTED_ITEM_CLASSES : ''
    },
    [selectedItems],
  )

  // Toggle lock flag for an item
  const toggleItemLock = useCallback((id: string) => {
    setLayout((prev) => prev.map(item => item.id === id ? { ...item, locked: !item.locked } : item));
  }, []);

  // Toggle disableCollision flag for an item
  const toggleItemDisableCollision = useCallback((id: string) => {
    setLayout(prev => prev.map(item => item.id === id ? { ...item, disableCollision: !item.disableCollision } : item));
  }, []);

  return (
    <div className="p-8 space-y-8 relative flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Gridy Canvas Demo</h1>
      <div className="w-[800px] mx-auto grid grid-rows-2 grid-flow-col gap-x-8 gap-y-4">
        <div className="flex justify-between items-center w-full">
          <label>Shift on Collision</label>
          <Switch checked={shiftOnCollision} onCheckedChange={setShiftOnCollision} />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Outline</label>
          <Switch checked={showOutline} onCheckedChange={setShowOutline} />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Drop Zone Shadow</label>
          <Switch checked={showDropZoneShadow} onCheckedChange={setShowDropZoneShadow} />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Custom Drag Handle</label>
          <Switch checked={useCustomDragHandle} onCheckedChange={setUseCustomDragHandle} />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Selection Tool</label>
          <Button
            variant={enableSelectionTool ? 'default' : 'outline'}
            onClick={() => {
              const off = enableSelectionTool
              setEnableSelectionTool((v) => !v)
              if (off) {
                setIsPopoverOpen(false)
                clearCurrentSelection()
              }
            }}
          >
            <SquareDashedMousePointer className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Select Only Empty</label>
          <Switch
            checked={selectOnlyEmptySpace}
            onCheckedChange={setSelectOnlyEmptySpace}
            disabled={!enableSelectionTool}
          />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Grid Lines</label>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} />
        </div>
        <div className="flex justify-between items-center w-full">
          <label>Scale</label>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}>
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={() => setScale(s => +(s + 0.1).toFixed(1))}>
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger style={popoverPositionStyle} />
        <PopoverContent onOpenAutoFocus={(e: Event) => e.preventDefault()} className="w-auto p-0 z-[200]">
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

      <div className="mt-8 flex justify-center">
        <Grid
          scale={scale}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          width={800}
          height={600}
          isLocked={false}
          gap={1}
          shiftOnCollision={shiftOnCollision}
          gridUnitSize={10}
          resizeUnitSize={10}
          showOutline={showOutline}
          enableSelectionTool={enableSelectionTool}
          onSelectionEnd={handleSelectionEnd}
          selectOnlyEmptySpace={selectOnlyEmptySpace}
          showDropZoneShadow={showDropZoneShadow}
          minSelectionArea={3000}
          dragHandleClassName={useCustomDragHandle ? DRAG_HANDLE_CLASS : undefined}
          getSelectedItemClassName={getSelectedItemClassHandler}
          showGridLines={showGrid}
          gridLinesClassName={CUSTOM_GRID_LINES_CLASSES}
        >
          {layout.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              toggleItemLock={toggleItemLock}
              toggleItemDisableCollision={toggleItemDisableCollision}
              useCustomDragHandle={useCustomDragHandle}
              dragHandleClassName={useCustomDragHandle ? DRAG_HANDLE_CLASS : undefined}
            />
          ))}
        </Grid>
      </div>
    </div>
  )
}

export default App
