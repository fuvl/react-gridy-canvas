import React, { useCallback, useRef, useState } from 'react'
import { GridItem } from '../types'

export interface TransformerProps {
  item: GridItem
  scale?: number
  previewRotation?: number | null
  onResize?: (newRect: { x: number; y: number; width: number; height: number }) => void
  onRotate?: (angle: number) => void
  onRotatePreview?: (angle: number | null) => void
  onResizePreview?: (newRect: { x: number; y: number; width: number; height: number } | null) => void
  className?: string
  // Customizable class names
  anchorClassName?: string
  cornerAnchorClassName?: string
  edgeAnchorClassName?: string
  rotationHandleClassName?: string
  rotationLineClassName?: string
  rotationDisplayClassName?: string
  // Customizable styles
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  borderRadius?: number
  anchorSize?: number
  anchorColor?: string
  anchorBorderColor?: string
  anchorBorderWidth?: number
  anchorBorderRadius?: number
  rotationHandleSize?: number
  rotationHandleColor?: string
  rotationHandleDistance?: number
  rotationLineColor?: string
  rotationLineWidth?: number
  rotationDisplayBackground?: string
  rotationDisplayColor?: string
  hideAnchors?: string[] // Array of anchor positions to hide: 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'
  hideRotationHandle?: boolean
}

export const Transformer: React.FC<TransformerProps> = ({ 
  item, 
  scale = 1, 
  previewRotation, 
  onResize, 
  onRotate, 
  onRotatePreview, 
  onResizePreview, 
  className = '',
  // Class names
  anchorClassName = '',
  cornerAnchorClassName = '',
  edgeAnchorClassName = '',
  rotationHandleClassName = '',
  rotationLineClassName = '',
  rotationDisplayClassName = '',
  // Styles
  borderColor,
  borderWidth,
  borderStyle,
  borderRadius,
  anchorSize = 12,
  anchorColor,
  anchorBorderColor,
  anchorBorderWidth,
  anchorBorderRadius,
  rotationHandleSize = 16,
  rotationHandleColor,
  rotationHandleDistance = 30,
  rotationLineColor,
  rotationLineWidth,
  rotationDisplayBackground,
  rotationDisplayColor,
  hideAnchors = [],
  hideRotationHandle = false
}) => {
  const transformerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const currentResizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const currentRotationRef = useRef<number | null>(null)

  // Helper to create anchor styles
  const getAnchorStyle = (position: { left?: number; right?: number; top?: number; bottom?: number }) => ({
    ...position,
    width: anchorSize,
    height: anchorSize,
    ...(anchorColor && { backgroundColor: anchorColor }),
    ...(anchorBorderColor && { borderColor: anchorBorderColor }),
    ...(anchorBorderWidth && { borderWidth: `${anchorBorderWidth}px` }),
    ...(anchorBorderRadius && { borderRadius: `${anchorBorderRadius}px` }),
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'resize' | 'rotate', handle: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (type === 'rotate') {
        isDraggingRef.current = true
        const centerX = item.x + item.width / 2
        const centerY = item.y + item.height / 2
        const startRotation = item.rotation || 0
        
        // Calculate where the handle is initially positioned (at top of item)
        const handleAngleRad = (startRotation * Math.PI) / 180 - Math.PI / 2 // -90 degrees because handle is at top
        const handleX = centerX + rotationHandleDistance * Math.cos(handleAngleRad)
        const handleY = centerY + rotationHandleDistance * Math.sin(handleAngleRad)
        
        // Calculate offset from handle to initial mouse position
        const offsetX = e.clientX / scale - handleX
        const offsetY = e.clientY / scale - handleY

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isDraggingRef.current) return
          
          // Calculate where the handle should be based on mouse position minus offset
          const targetX = moveEvent.clientX / scale - offsetX
          const targetY = moveEvent.clientY / scale - offsetY
          
          // Calculate angle from center to target handle position
          const angleToTarget = Math.atan2(targetY - centerY, targetX - centerX)
          
          // Convert to degrees and adjust for handle being at top (add 90 degrees)
          let newRotation = (angleToTarget * 180) / Math.PI + 90
          
          // Apply snap points for common angles
          const snapPoints = [0, 45, 90, 135, 180, 225, 270, 315, 360]
          const snapThreshold = 5 // degrees
          
          // Normalize rotation to 0-360 range
          newRotation = ((newRotation % 360) + 360) % 360
          
          // Check for snap points
          for (const snapPoint of snapPoints) {
            if (Math.abs(newRotation - snapPoint) <= snapThreshold) {
              newRotation = snapPoint
              break
            }
          }
          
          // Update ref and notify parent for preview
          currentRotationRef.current = newRotation
          onRotatePreview?.(newRotation)
        }

        const handleMouseUp = () => {
          if (isDraggingRef.current && currentRotationRef.current !== null) {
            // Only update the layout when drag ends
            onRotate?.(currentRotationRef.current)
          }
          
          // Clear preview rotation
          onRotatePreview?.(null)
          
          isDraggingRef.current = false
          currentRotationRef.current = null
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      } else if (type === 'resize') {
        isDraggingRef.current = true
        const startRect = { ...item }
        let lastValidRect = { ...item }

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isDraggingRef.current) return
          
          const deltaX = (moveEvent.clientX - e.clientX) / scale
          const deltaY = (moveEvent.clientY - e.clientY) / scale
          
          let newRect = { ...lastValidRect }

          switch (handle) {
            case 'tl': // top-left
              const proposedWidthTL = startRect.width - deltaX
              const proposedHeightTL = startRect.height - deltaY
              
              if (proposedWidthTL >= 10) {
                newRect.x = startRect.x + deltaX
                newRect.width = proposedWidthTL
              }
              
              if (proposedHeightTL >= 10) {
                newRect.y = startRect.y + deltaY
                newRect.height = proposedHeightTL
              }
              break
            case 'tr': // top-right
              const proposedHeightTR = startRect.height - deltaY
              if (proposedHeightTR >= 10) {
                newRect.y = startRect.y + deltaY
                newRect.height = proposedHeightTR
              }
              newRect.width = Math.max(10, startRect.width + deltaX)
              break
            case 'bl': // bottom-left
              const proposedWidthBL = startRect.width - deltaX
              if (proposedWidthBL >= 10) {
                newRect.x = startRect.x + deltaX
                newRect.width = proposedWidthBL
              }
              newRect.height = Math.max(10, startRect.height + deltaY)
              break
            case 'br': // bottom-right
              newRect.width = Math.max(10, startRect.width + deltaX)
              newRect.height = Math.max(10, startRect.height + deltaY)
              break
            case 't': // top edge
              const proposedHeightT = startRect.height - deltaY
              if (proposedHeightT >= 10) {
                newRect.y = startRect.y + deltaY
                newRect.height = proposedHeightT
              }
              break
            case 'b': // bottom edge
              newRect.height = Math.max(10, startRect.height + deltaY)
              break
            case 'l': // left edge
              const proposedWidthL = startRect.width - deltaX
              if (proposedWidthL >= 10) {
                newRect.x = startRect.x + deltaX
                newRect.width = proposedWidthL
              }
              break
            case 'r': // right edge
              newRect.width = Math.max(10, startRect.width + deltaX)
              break
          }
          
          // Update last valid rect only if we made changes
          if (newRect.width >= 10 && newRect.height >= 10) {
            lastValidRect = { ...newRect }
          }

          // Update ref and notify parent for preview
          currentResizeRef.current = newRect
          onResizePreview?.(newRect)
        }

        const handleMouseUp = () => {
          if (isDraggingRef.current && currentResizeRef.current !== null) {
            // Only update the layout when resize ends
            onResize?.(currentResizeRef.current)
          }
          
          // Clear preview resize
          onResizePreview?.(null)
          
          isDraggingRef.current = false
          currentResizeRef.current = null
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      }
    },
    [item, scale, onResize, onRotate, onRotatePreview, onResizePreview],
  )


  return (
    <div
      ref={transformerRef}
      className={`grid-transformer ${className}`}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: (() => {
          // Use preview rotation if available, otherwise use item rotation
          const currentRotation = previewRotation !== null ? previewRotation : item.rotation
          return currentRotation ? `rotate(${currentRotation}deg)` : undefined
        })(),
        transformOrigin: 'center center',
        ...(borderColor && { borderColor }),
        ...(borderWidth && { borderWidth: `${borderWidth}px` }),
        ...(borderStyle && { borderStyle }),
        ...(borderRadius && { borderRadius: `${borderRadius}px` }),
      }}
    >
      {/* Corner anchors */}
      {!hideAnchors.includes('tl') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--tl ${anchorClassName} ${cornerAnchorClassName}`}
          style={getAnchorStyle({ left: -anchorSize / 2, top: -anchorSize / 2 })}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'tl')}
        />
      )}
      {!hideAnchors.includes('tr') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--tr ${anchorClassName} ${cornerAnchorClassName}`}
          style={getAnchorStyle({ right: -anchorSize / 2, top: -anchorSize / 2 })}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'tr')}
        />
      )}
      {!hideAnchors.includes('bl') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--bl ${anchorClassName} ${cornerAnchorClassName}`}
          style={getAnchorStyle({ left: -anchorSize / 2, bottom: -anchorSize / 2 })}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'bl')}
        />
      )}
      {!hideAnchors.includes('br') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--br ${anchorClassName} ${cornerAnchorClassName}`}
          style={getAnchorStyle({ right: -anchorSize / 2, bottom: -anchorSize / 2 })}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'br')}
        />
      )}

      {/* Edge anchors */}
      {!hideAnchors.includes('t') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--t ${anchorClassName} ${edgeAnchorClassName}`}
          style={{
            ...getAnchorStyle({ top: -anchorSize / 2 }),
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 't')}
        />
      )}
      {!hideAnchors.includes('b') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--b ${anchorClassName} ${edgeAnchorClassName}`}
          style={{
            ...getAnchorStyle({ bottom: -anchorSize / 2 }),
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'b')}
        />
      )}
      {!hideAnchors.includes('l') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--l ${anchorClassName} ${edgeAnchorClassName}`}
          style={{
            ...getAnchorStyle({ left: -anchorSize / 2 }),
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'l')}
        />
      )}
      {!hideAnchors.includes('r') && (
        <div
          className={`grid-transformer-anchor grid-transformer-anchor--r ${anchorClassName} ${edgeAnchorClassName}`}
          style={{
            ...getAnchorStyle({ right: -anchorSize / 2 }),
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'resize', 'r')}
        />
      )}

      {/* Rotation handle - only show if rotation is not disabled */}
      {!item.disableRotation && !hideRotationHandle && (
        <>
          <div
            className={`grid-transformer-rotation-handle ${rotationHandleClassName}`}
            style={{
              left: '50%',
              top: -rotationHandleDistance,
              transform: 'translate(-50%, -50%)',
              width: rotationHandleSize,
              height: rotationHandleSize,
              ...(rotationHandleColor && { backgroundColor: rotationHandleColor }),
            }}
            onMouseDown={(e) => handleMouseDown(e, 'rotate', 'rotate')}
            title="Rotate"
          >
            ↻
          </div>

          {/* Rotation angle display */}
          {(previewRotation !== null || item.rotation) && (
            <div
              className={`grid-transformer-rotation-display ${rotationDisplayClassName}`}
              style={{
                left: '50%',
                top: -rotationHandleDistance - 25,
                transform: 'translate(-50%, -50%)',
                position: 'absolute',
                background: rotationDisplayBackground || 'rgba(0, 0, 0, 0.8)',
                color: rotationDisplayColor || 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                zIndex: 1002,
                whiteSpace: 'nowrap',
              }}
            >
              {Math.round(previewRotation !== null ? previewRotation : (item.rotation || 0))}°
            </div>
          )}

          {/* Line connecting from transformer border to rotation handle */}
          <div
            className={`grid-transformer-rotation-line ${rotationLineClassName}`}
            style={{
              left: '50%',
              bottom: '100%', // Start from the top edge of transformer
              height: rotationHandleDistance - rotationHandleSize / 2, // Extend to center of rotation handle
              transform: 'translateX(-50%)',
              ...(rotationLineColor && { backgroundColor: rotationLineColor }),
              ...(rotationLineWidth && { width: `${rotationLineWidth}px` }),
            }}
          />
        </>
      )}
    </div>
  )
}
