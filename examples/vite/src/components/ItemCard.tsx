import { Card } from './ui/card'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Button } from './ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip'
import { MoreHorizontal, Lock, Unlock, Slash, Zap } from 'lucide-react'
import { GridItem } from '../../../../src/index'

interface ItemCardProps {
  item: GridItem
  toggleItemLock: (id: string) => void
  toggleItemDisableCollision: (id: string) => void
  useCustomDragHandle: boolean
  dragHandleClassName?: string
}

export function ItemCard({ item, toggleItemLock, toggleItemDisableCollision, useCustomDragHandle, dragHandleClassName }: ItemCardProps) {
  return (
    <Card className="flex items-center justify-center relative overflow-visible">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute top-1 right-1 z-10 cursor-pointer p-1"
            title="Options"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
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
          </div>
        </PopoverContent>
      </Popover>
      {useCustomDragHandle && dragHandleClassName && (
        <div
          className={`${dragHandleClassName} absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500/70 text-white text-[10px] rounded cursor-move z-10 border border-black/20 shadow-sm`}
          title="Drag"
        >
          DRAG
        </div>
      )}
      Item {item.id}
    </Card>
  )
}

export default ItemCard
