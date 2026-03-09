import { useRef, useEffect, useCallback, useState } from 'react'
import * as fabricModule from 'fabric'
const fabric = fabricModule.fabric ?? fabricModule.default?.fabric ?? fabricModule.default
import { Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

const CANVAS_ID = 'rd-swatch-canvas'
const GRID_SIZE = 20
const SWATCH_SIZE = 64
const PADDING = 40
const GAP = 24
const MIN_CANVAS_W = 320
const MIN_CANVAS_H = 200

/**
 * 默认新色块摆放位置（按网格）
 */
function getDefaultPosition (index, canvasWidth) {
  const perRow = Math.max(1, Math.floor((canvasWidth - PADDING * 2 + GAP) / (SWATCH_SIZE + GAP)))
  const col = index % perRow
  const row = Math.floor(index / perRow)
  return {
    left: PADDING + col * (SWATCH_SIZE + GAP),
    top: PADDING + row * (SWATCH_SIZE + GAP)
  }
}

function addGridLines (Fabric, canvas, w, h) {
  const gridLines = []
  for (let x = 0; x <= w; x += GRID_SIZE) {
    const line = new Fabric.Line([x, 0, x, h], { stroke: 'rgba(0,0,0,0.08)', selectable: false, evented: false })
    line.__isGridLine = true
    gridLines.push(line)
  }
  for (let y = 0; y <= h; y += GRID_SIZE) {
    const line = new Fabric.Line([0, y, w, y], { stroke: 'rgba(0,0,0,0.08)', selectable: false, evented: false })
    line.__isGridLine = true
    gridLines.push(line)
  }
  gridLines.forEach((line) => canvas.add(line))
  gridLines.forEach((line) => canvas.sendToBack(line))
}

/**
 * 色板画布（Fabric）：网格随容器形状填满，可拖动色块、选中边框、导出
 */
export function SwatchCanvas ({
  width: widthProp,
  height: heightProp,
  fillContainer = true,
  items = [],
  selectedId,
  onSelect,
  onRemove,
  onPositionChange
}) {
  const containerRef = useRef(null)
  const canvasWrapRef = useRef(null)
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const fabricNamespaceRef = useRef(null)
  const objectIdMapRef = useRef(new Map())
  const skipSyncRef = useRef(false)
  const [initError, setInitError] = useState(null)
  const [canvasSize, setCanvasSize] = useState(() =>
    fillContainer ? null : { width: widthProp ?? 720, height: heightProp ?? 480 }
  )

  // 测量容器尺寸（fillContainer 时）
  useEffect(() => {
    if (!fillContainer || !canvasWrapRef.current) return
    const el = canvasWrapRef.current
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {}
      const w = Math.max(MIN_CANVAS_W, Math.floor(width || 0))
      const h = Math.max(MIN_CANVAS_H, Math.floor(height || 0))
      if (w > 0 && h > 0) setCanvasSize((prev) => (prev?.width === w && prev?.height === h ? prev : { width: w, height: h }))
    })
    ro.observe(el)
    const { width, height } = el.getBoundingClientRect()
    if (width > 0 && height > 0) setCanvasSize({ width: Math.max(MIN_CANVAS_W, Math.floor(width)), height: Math.max(MIN_CANVAS_H, Math.floor(height)) })
    return () => ro.disconnect()
  }, [fillContainer])

  const effectiveWidth = canvasSize?.width ?? widthProp ?? 720
  const effectiveHeight = canvasSize?.height ?? heightProp ?? 480

  // 初始化 Fabric 画布（仅首次有尺寸时创建，避免 resize 时重建丢失对象）
  useEffect(() => {
    if (!canvasRef.current || !canvasSize || fabricRef.current) return
    const w = canvasSize.width
    const h = canvasSize.height
    if (w < MIN_CANVAS_W || h < MIN_CANVAS_H) return
    setInitError(null)
    const canvasEl = canvasRef.current
    let canvas
    try {
      const Fabric = fabric?.Canvas ? fabric : (typeof window !== 'undefined' && window.fabric) || fabric
      if (!Fabric?.Canvas) {
        setInitError('Fabric 未正确加载')
        return
      }
      fabricNamespaceRef.current = Fabric
      canvas = new Fabric.Canvas(canvasEl, {
        width: w,
        height: h,
        backgroundColor: '#fafbfc',
        selection: true,
        preserveObjectStacking: true
      })
      fabricRef.current = canvas
      objectIdMapRef.current = new Map()
      addGridLines(Fabric, canvas, w, h)

      const handleSelect = (e) => {
        const target = e.selected?.[0]
        if (!target) {
          onSelect(null, '')
          return
        }
        const id = target.__swatchId ?? objectIdMapRef.current.get(target)
        const fill = target.get('fill')
        const color = typeof fill === 'string' ? fill : '#000'
        if (id) onSelect(id, color)
      }

      const handleModified = (e) => {
        const target = e.target
        if (!target || !onPositionChange) return
        const id = target.__swatchId ?? objectIdMapRef.current.get(target)
        if (!id) return
        const left = target.get('left')
        const top = target.get('top')
        onPositionChange(id, left, top)
      }

      const handleKey = (ev) => {
        if (ev.key !== 'Delete' && ev.key !== 'Backspace') return
        const c = fabricRef.current
        if (!c) return
        const active = c.getActiveObject()
        if (!active) return
        const id = active.__swatchId ?? objectIdMapRef.current.get(active)
        if (id) {
          onRemove(id)
          c.remove(active)
          objectIdMapRef.current.delete(active)
        }
      }

      canvas.on('selection:created', handleSelect)
      canvas.on('selection:updated', handleSelect)
      canvas.on('selection:cleared', () => onSelect(null, ''))
      canvas.on('object:modified', handleModified)
      window.addEventListener('keydown', handleKey)

      return () => {
        window.removeEventListener('keydown', handleKey)
        canvas.off('selection:created', handleSelect)
        canvas.off('selection:updated', handleSelect)
        canvas.off('selection:cleared')
        canvas.off('object:modified', handleModified)
        canvas.dispose()
        fabricRef.current = null
      }
    } catch (err) {
      console.error('SwatchCanvas init error:', err)
      setInitError(err?.message || '画布初始化失败')
      return () => {}
    }
  }, [canvasSize])

  // 容器尺寸变化时：调整 Fabric 画布尺寸并重绘网格
  useEffect(() => {
    if (!fillContainer || !canvasSize) return
    const canvas = fabricRef.current
    if (!canvas) return
    const w = canvasSize.width
    const h = canvasSize.height
    if (canvas.getWidth() === w && canvas.getHeight() === h) return
    try {
      canvas.getObjects().forEach((obj) => {
        if (obj.__isGridLine) canvas.remove(obj)
      })
      canvas.setDimensions({ width: w, height: h })
      const Fabric = fabricNamespaceRef.current
      if (Fabric) addGridLines(Fabric, canvas, w, h)
      canvas.renderAll()
    } catch (err) {
      console.error('SwatchCanvas resize error:', err)
    }
  }, [fillContainer, canvasSize])

  // 同步 items 到画布：增删、位置、颜色、选中态
  useEffect(() => {
    if (initError) return
    const canvas = fabricRef.current
    if (!canvas) return
    try {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }

    const itemIds = new Set(items.map((i) => i.id))

    // 只删除已不存在的色块（不删网格线）
    canvas.getObjects().forEach((obj) => {
      const id = obj.__swatchId ?? objectIdMapRef.current.get(obj)
      if (id && !itemIds.has(id)) {
        canvas.remove(obj)
        objectIdMapRef.current.delete(obj)
      }
    })

    const cw = canvas.getWidth()
    items.forEach((item, index) => {
      const id = item.id
      const existing = canvas.getObjects().find((o) => (o.__swatchId ?? objectIdMapRef.current.get(o)) === id)
      const pos = item.left != null && item.top != null
        ? { left: item.left, top: item.top }
        : getDefaultPosition(index, cw)

      if (existing) {
        existing.set('fill', item.color)
        existing.set('left', pos.left)
        existing.set('top', pos.top)
        existing.set('borderColor', selectedId === id ? '#ff6b9d' : '#e2e8f0')
        if (item.left == null && item.top == null && onPositionChange) {
          onPositionChange(id, pos.left, pos.top)
        }
      } else {
        const FabricClass = fabricNamespaceRef.current
        if (!FabricClass?.Rect) return
        const rect = new FabricClass.Rect({
          left: pos.left,
          top: pos.top,
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
          fill: item.color,
          rx: 12,
          ry: 12,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          borderColor: selectedId === id ? '#ff6b9d' : '#e2e8f0',
          cornerColor: '#ff6b9d',
          cornerSize: 10,
          transparentCorners: false
        })
        rect.__swatchId = id
        canvas.add(rect)
        objectIdMapRef.current.set(rect, id)
        if (onPositionChange) onPositionChange(id, pos.left, pos.top)
      }
    })

      canvas.renderAll()
    } catch (err) {
      console.error('SwatchCanvas sync error:', err)
    }
  }, [items, selectedId, initError])

  const handleExport = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `色板-${Date.now()}.png`
    a.click()
  }, [])

  if (initError) {
    return (
      <div
        className="rd-swatch-canvas-wrapper card-hover animate-fade-in"
        style={{
          minHeight: effectiveHeight + 60,
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: 14
        }}
      >
        {initError}，请刷新页面重试
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="rd-swatch-canvas-wrapper card-hover animate-fade-in"
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        background: '#fff',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 画布工具栏：保证文字与按钮完整展示 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 20px',
          borderBottom: '1px solid #f1f5f9',
          background: 'rgba(255,255,255,0.95)',
          zIndex: 2
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', minWidth: 0, flex: '1 1 200px' }}>
          画布 · 拖动色块调整位置，Delete 删除
        </span>
        <Button
          type="default"
          size="small"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          className="rd-btn-default"
          style={{ height: 36, borderRadius: 18, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          导出色板
        </Button>
      </div>
      {/* Fabric 画布区域：随容器填满，格子与容器同形 */}
      <div
        ref={canvasWrapRef}
        style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 1, background: '#fff' }}
      >
        <canvas id={CANVAS_ID} ref={canvasRef} />
      </div>
    </div>
  )
}

export default SwatchCanvas
