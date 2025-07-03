import { Card } from './ui/card'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Button } from './ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip'
import { MoreHorizontal, Lock, Unlock, Slash, Zap, Move3D, RotateCw, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine } from 'lucide-react'
import { GridItem } from '../../../../src/index'

interface ItemCardProps {
  item: GridItem
  toggleItemLock: (id: string) => void
  toggleItemDisableCollision: (id: string) => void
  toggleItemShowTransformer: (id: string) => void
  toggleItemDisableRotation: (id: string) => void
  moveItemUp: (id: string) => void
  moveItemDown: (id: string) => void
  moveItemToTop: (id: string) => void
  moveItemToBottom: (id: string) => void
  useCustomDragHandle: boolean
  dragHandleClassName?: string
}

export function ItemCard({ item, toggleItemLock, toggleItemDisableCollision, toggleItemShowTransformer, toggleItemDisableRotation, moveItemUp, moveItemDown, moveItemToTop, moveItemToBottom, useCustomDragHandle, dragHandleClassName }: ItemCardProps) {
  return (
    <Card className="flex items-center justify-center relative overflow-visible w-full h-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute top-2 right-2 z-10 cursor-pointer p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm transition-all duration-200"
            title="Options"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          side="right"
          align="center"
          className="!p-1 !m-0 w-auto"
        >
          <div className="flex flex-col space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => toggleItemLock(item.id)}
                  title={item.locked ? 'Unlock' : 'Lock'}
                >
                  {item.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{item.locked ? 'Unlock' : 'Lock'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => toggleItemDisableCollision(item.id)}
                  title={item.disableCollision ? 'Enable collision' : 'Disable collision'}
                >
                  {item.disableCollision ? <Zap className="h-4 w-4" /> : <Slash className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.disableCollision ? 'Enable collision' : 'Disable collision'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => toggleItemShowTransformer(item.id)}
                  title={item.showTransformer ? 'Hide transformer' : 'Show transformer'}
                >
                  <Move3D className={`h-4 w-4 ${item.showTransformer ? 'text-blue-500' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.showTransformer ? 'Hide transformer' : 'Show transformer'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => toggleItemDisableRotation(item.id)}
                  title={item.disableRotation ? 'Enable rotation' : 'Disable rotation'}
                >
                  <RotateCw className={`h-4 w-4 ${item.disableRotation ? 'text-gray-400' : 'text-green-500'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.disableRotation ? 'Enable rotation' : 'Disable rotation'}
              </TooltipContent>
            </Tooltip>
            
            <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => moveItemUp(item.id)}
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move up</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => moveItemDown(item.id)}
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move down</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => moveItemToTop(item.id)}
                  title="Move to top"
                >
                  <ArrowUpToLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move to top</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="p-1"
                  variant="ghost"
                  onClick={() => moveItemToBottom(item.id)}
                  title="Move to background"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move to background</TooltipContent>
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>
      {useCustomDragHandle && dragHandleClassName && (
        <div
          className={`${dragHandleClassName} absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md cursor-move z-10 shadow-lg border border-blue-400/50 backdrop-blur-sm`}
          title="Drag"
        >
          ⋮⋮
        </div>
      )}
      <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Item {item.id}
      </div>
    </Card>
  )
}

export default ItemCard
