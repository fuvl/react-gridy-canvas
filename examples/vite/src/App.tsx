import { useState, useRef, useCallback, CSSProperties } from 'react'
import { Button } from './components/ui/button'
import Grid, { GridItem, SelectionRectangle, MousePosition, moveItemUp, moveItemDown, moveItemToTop, moveItemToBottom, SnapLinesStyle, SnapBehaviorConfig } from '../../../src/index'
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
  const [disableCollision, setDisableCollision] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [showTransformer, setShowTransformer] = useState(true)
  const [showDropZoneShadow, setShowDropZoneShadow] = useState(true)
  const [enableSelectionTool, setEnableSelectionTool] = useState(false)
  const [useCustomDragHandle, setUseCustomDragHandle] = useState(false)
  const [selectOnlyEmptySpace, setSelectOnlyEmptySpace] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [scale, setScale] = useState<number>(1)
  const [canvasMode, setCanvasMode] = useState(false)
  const [disableAnimations, setDisableAnimations] = useState(false)
  const [showSnapLines, setShowSnapLines] = useState(true)
  const [enableItemSnapping, setEnableItemSnapping] = useState(true)
  const [snapThreshold, setSnapThreshold] = useState(5)
  const [snapBehavior, setSnapBehavior] = useState<SnapBehaviorConfig>({
    gridCenter: true,
    itemEdges: true,
    itemCenters: true,
    itemDistance: true
  })

  // Popover/Selection State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [popoverPositionStyle, setPopoverPositionStyle] = useState<CSSProperties>({ display: 'none' })
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const clearSelectionRef = useRef<(() => void) | null>(null)
  const [lastValidSelectionRect, setLastValidSelectionRect] = useState<SelectionRectangle | null>(null)
  const [currentRotation, setCurrentRotation] = useState<{itemId: string, angle: number} | null>(null)

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

  // Toggle showTransformer flag for an item
  const toggleItemShowTransformer = useCallback((id: string) => {
    setLayout(prev => prev.map(item => item.id === id ? { ...item, showTransformer: !item.showTransformer } : item));
  }, []);

  // Toggle disableRotation flag for an item
  const toggleItemDisableRotation = useCallback((id: string) => {
    setLayout(prev => prev.map(item => item.id === id ? { ...item, disableRotation: !item.disableRotation } : item));
  }, []);

  const handleRotationPreview = useCallback((itemId: string, angle: number | null) => {
    if (angle !== null) {
      setCurrentRotation({ itemId, angle })
    } else {
      setCurrentRotation(null)
    }
  }, []);

  // Z-index management functions
  const handleMoveItemUp = useCallback((id: string) => {
    setLayout(prev => moveItemUp(prev, id));
  }, []);

  const handleMoveItemDown = useCallback((id: string) => {
    setLayout(prev => moveItemDown(prev, id));
  }, []);

  const handleMoveItemToTop = useCallback((id: string) => {
    setLayout(prev => moveItemToTop(prev, id));
  }, []);

  const handleMoveItemToBottom = useCallback((id: string) => {
    setLayout(prev => moveItemToBottom(prev, id));
  }, []);

  // Snap lines style configuration
  const snapLinesStyle: SnapLinesStyle = {
    gridSnapLineColor: '#3b82f6',
    itemSnapLineColor: '#ec4899',
    snapLineWidth: 1,
    snapLineOpacity: 0.8,
    snapLineAnimationDuration: 150,
    snapLineStyle: 'solid',
    showSnapDistance: true,
    snapDistanceColor: '#ffffff',
    snapDistanceBackground: '#1f2937'
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Gridy Canvas
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A powerful React grid layout system with drag, resize, and rotation capabilities
          </p>
        </div>

        {/* Controls Panel */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Controls
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shift on Collision</label>
              <Switch checked={shiftOnCollision} onCheckedChange={setShiftOnCollision} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200/50 dark:border-red-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Disable Collision</label>
              <Switch checked={disableCollision} onCheckedChange={setDisableCollision} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Outline</label>
              <Switch checked={showOutline} onCheckedChange={setShowOutline} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transformer</label>
              <Switch checked={showTransformer} onCheckedChange={setShowTransformer} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop Zone Shadow</label>
              <Switch checked={showDropZoneShadow} onCheckedChange={setShowDropZoneShadow} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200/50 dark:border-teal-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Drag Handle</label>
              <Switch checked={useCustomDragHandle} onCheckedChange={setUseCustomDragHandle} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Selection Tool</label>
              <Button
                variant={enableSelectionTool ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const off = enableSelectionTool
                  setEnableSelectionTool((v) => !v)
                  if (off) {
                    setIsPopoverOpen(false)
                    clearCurrentSelection()
                  }
                }}
                className="w-full"
              >
                <SquareDashedMousePointer className="h-4 w-4 mr-2" />
                {enableSelectionTool ? 'Active' : 'Inactive'}
              </Button>
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl border border-rose-200/50 dark:border-rose-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Only Empty</label>
              <Switch
                checked={selectOnlyEmptySpace}
                onCheckedChange={setSelectOnlyEmptySpace}
                disabled={!enableSelectionTool}
              />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Canvas Mode</label>
              <Switch checked={canvasMode} onCheckedChange={setCanvasMode} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Grid Lines</label>
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200/50 dark:border-violet-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scale ({scale.toFixed(1)}x)</label>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setScale(s => Math.round(Math.max(0.1, s - 0.1) * 10) / 10)} className="flex-1">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setScale(s => Math.round(Math.min(2, s + 0.1) * 10) / 10)} className="flex-1">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200/50 dark:border-cyan-700/50">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Disable Animations</label>
              <Switch checked={disableAnimations} onCheckedChange={setDisableAnimations} />
            </div>
            {/* Snap Behavior Group */}
            <div className="col-span-full">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Snap Behavior
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Snap Lines</label>
                    <Switch checked={showSnapLines} onCheckedChange={setShowSnapLines} />
                  </div>
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Snapping</label>
                    <Switch 
                      checked={enableItemSnapping} 
                      onCheckedChange={setEnableItemSnapping}
                      disabled={!showSnapLines}
                    />
                  </div>
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Canvas Center</label>
                    <Switch 
                      checked={snapBehavior.gridCenter || false} 
                      onCheckedChange={(checked) => setSnapBehavior(prev => ({ ...prev, gridCenter: checked }))}
                      disabled={!showSnapLines}
                    />
                  </div>
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Edges</label>
                    <Switch 
                      checked={snapBehavior.itemEdges || false} 
                      onCheckedChange={(checked) => setSnapBehavior(prev => ({ ...prev, itemEdges: checked }))}
                      disabled={!showSnapLines || !enableItemSnapping}
                    />
                  </div>
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Centers</label>
                    <Switch 
                      checked={snapBehavior.itemCenters || false} 
                      onCheckedChange={(checked) => setSnapBehavior(prev => ({ ...prev, itemCenters: checked }))}
                      disabled={!showSnapLines || !enableItemSnapping}
                    />
                  </div>
                  <div className="flex flex-col space-y-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100 dark:border-blue-800">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Distance Snapping</label>
                    <Switch 
                      checked={snapBehavior.itemDistance || false} 
                      onCheckedChange={(checked) => setSnapBehavior(prev => ({ ...prev, itemDistance: checked }))}
                      disabled={!showSnapLines || !enableItemSnapping}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Canvas
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {layout.length} items • Scale: {scale.toFixed(1)}x
            </div>
          </div>
          
          <div className="relative mx-auto" style={{ padding: '20px' }}>
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner transition-all duration-200" style={{ width: `${800 * scale}px`, height: `${600 * scale}px` }}>
            <Grid
              scale={scale}
              layout={layout}
              onLayoutChange={handleLayoutChange}
              width={800}
              height={600}
              isLocked={false}
              gap={1}
              shiftOnCollision={shiftOnCollision}
              disableCollision={disableCollision}
              gridUnitSize={canvasMode ? 0 : 10}
              resizeUnitSize={canvasMode ? 0 : 10}
              showOutline={showOutline}
              showTransformer={showTransformer}
              enableSelectionTool={enableSelectionTool}
              onSelectionEnd={handleSelectionEnd}
              selectOnlyEmptySpace={selectOnlyEmptySpace}
              showDropZoneShadow={showDropZoneShadow}
              minSelectionArea={3000}
              dragHandleClassName={useCustomDragHandle ? DRAG_HANDLE_CLASS : undefined}
              getSelectedItemClassName={getSelectedItemClassHandler}
              showGridLines={showGrid}
              gridLinesClassName={CUSTOM_GRID_LINES_CLASSES}
              disableAnimations={disableAnimations}
              onRotationPreview={handleRotationPreview}
              showSnapLines={showSnapLines}
              snapLinesStyle={snapLinesStyle}
              snapThreshold={snapThreshold}
              enableItemSnapping={enableItemSnapping}
              snapBehavior={snapBehavior}
            >
              {layout.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  toggleItemLock={toggleItemLock}
                  toggleItemDisableCollision={toggleItemDisableCollision}
                  toggleItemShowTransformer={toggleItemShowTransformer}
                  toggleItemDisableRotation={toggleItemDisableRotation}
                  moveItemUp={handleMoveItemUp}
                  moveItemDown={handleMoveItemDown}
                  moveItemToTop={handleMoveItemToTop}
                  moveItemToBottom={handleMoveItemToBottom}
                  useCustomDragHandle={useCustomDragHandle}
                  dragHandleClassName={useCustomDragHandle ? DRAG_HANDLE_CLASS : undefined}
                />
              ))}
            </Grid>
            </div>
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

    </div>
  )
}

export default App
