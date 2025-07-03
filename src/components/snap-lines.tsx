import React from 'react'
import { SnapLine, SnapLinesStyle } from '../types'

interface SnapLinesProps {
  snapLines: SnapLine[]
  style?: SnapLinesStyle
  scale?: number
}

const defaultStyle: Required<SnapLinesStyle> = {
  className: 'grid-snap-lines',
  gridSnapLineClassName: 'grid-snap-line--grid',
  itemSnapLineClassName: 'grid-snap-line--item',
  gridSnapLineColor: '#3b82f6',
  itemSnapLineColor: '#ec4899',
  snapLineWidth: 1,
  snapLineStyle: 'solid',
  snapLineOpacity: 0.8,
  snapLineAnimationDuration: 150,
  showDistanceLabel: true,
  distanceLabelClassName: 'grid-snap-distance',
  distanceLabelColor: '#ffffff',
  distanceLabelBackground: '#1f2937',
}

export const SnapLines: React.FC<SnapLinesProps> = ({ snapLines, style = {}, scale = 1 }) => {
  const mergedStyle = { ...defaultStyle, ...style }

  if (snapLines.length === 0) return null

  return (
    <div
      className={mergedStyle.className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2000,
      }}
    >
      {snapLines.map((line) => {
        const isGridLine = line.snapType === 'grid-center'
        const isDistanceLine = line.snapType === 'item-distance'

        let color: string
        let className: string

        if (isGridLine) {
          color = mergedStyle.gridSnapLineColor
          className = mergedStyle.gridSnapLineClassName
        } else if (isDistanceLine) {
          color = '#fbbf24' // Yellow color for distance lines
          className = mergedStyle.itemSnapLineClassName
        } else {
          color = mergedStyle.itemSnapLineColor
          className = mergedStyle.itemSnapLineClassName
        }

        const lineStyle: React.CSSProperties = {
          position: 'absolute',
          backgroundColor: isDistanceLine ? 'transparent' : color,
          opacity: isDistanceLine ? 0.9 : mergedStyle.snapLineOpacity,
          transition: `opacity ${mergedStyle.snapLineAnimationDuration}ms ease-out`,
          borderStyle: mergedStyle.snapLineStyle,
          pointerEvents: 'none',
          ...(isDistanceLine && {
            backgroundColor: 'transparent',
            borderColor: color,
            borderStyle: 'dashed',
            borderWidth: `${mergedStyle.snapLineWidth / scale}px`,
            boxShadow: `0 0 4px ${color}`,
            borderRadius: '1px',
          }),
        }

        if (line.type === 'vertical') {
          lineStyle.left = line.position
          lineStyle.top = line.start
          lineStyle.width = mergedStyle.snapLineWidth / scale
          lineStyle.height = line.end - line.start
        } else {
          lineStyle.left = line.start
          lineStyle.top = line.position
          lineStyle.width = line.end - line.start
          lineStyle.height = mergedStyle.snapLineWidth / scale
        }

        return (
          <React.Fragment key={line.id}>
            <div className={className} style={lineStyle} />

            {/* Triangle markers for distance lines */}
            {isDistanceLine && (
              <>
                {/* Start triangle */}
                <div
                  style={{
                    position: 'absolute',
                    left: line.type === 'vertical' ? line.position - 4 / scale : line.start - 4 / scale,
                    top: line.type === 'horizontal' ? line.position - 4 / scale : line.start - 4 / scale,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth:
                      line.type === 'vertical'
                        ? `${4 / scale}px ${4 / scale}px ${4 / scale}px 0`
                        : `${4 / scale}px ${4 / scale}px 0 ${4 / scale}px`,
                    borderColor:
                      line.type === 'vertical'
                        ? `transparent ${color} transparent transparent`
                        : `${color} transparent transparent transparent`,
                    pointerEvents: 'none',
                    zIndex: 2001,
                  }}
                />

                {/* End triangle */}
                <div
                  style={{
                    position: 'absolute',
                    left: line.type === 'vertical' ? line.position : line.end,
                    top: line.type === 'horizontal' ? line.position : line.end,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth:
                      line.type === 'vertical'
                        ? `${4 / scale}px 0 ${4 / scale}px ${4 / scale}px`
                        : `0 ${4 / scale}px ${4 / scale}px ${4 / scale}px`,
                    borderColor:
                      line.type === 'vertical'
                        ? `transparent transparent transparent ${color}`
                        : `transparent transparent ${color} transparent`,
                    pointerEvents: 'none',
                    zIndex: 2001,
                  }}
                />
              </>
            )}

            {/* Distance label for distance-based snap lines */}
            {isDistanceLine && line.distance && mergedStyle.showDistanceLabel && (
              <div
                className={mergedStyle.distanceLabelClassName}
                style={{
                  position: 'absolute',
                  left: line.type === 'vertical' ? line.position : (line.start + line.end) / 2,
                  top: line.type === 'horizontal' ? line.position : (line.start + line.end) / 2,
                  fontSize: `${12 / scale}px`,
                  padding: `${4 / scale}px ${8 / scale}px`,
                  borderRadius: `${4 / scale}px`,
                  color: mergedStyle.distanceLabelColor,
                  backgroundColor: mergedStyle.distanceLabelBackground,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 2000,
                  transform: 'translateX(-50%) translateY(-50%)',
                  border: `${1 / scale}px solid rgba(255,255,255,0.2)`,
                  fontWeight: 'bold',
                }}
              >
                {Math.round(line.distance)}px
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default SnapLines
