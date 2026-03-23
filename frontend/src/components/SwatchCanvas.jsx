import { useRef, useEffect, useCallback, useState } from 'react'
import * as fabricModule from 'fabric'
const fabric = fabricModule.fabric ?? fabricModule.default?.fabric ?? fabricModule.default
import { Tooltip, Slider, message } from 'antd'
import { DownloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'

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
 * 
 * @param {object} props
 * @param {string[]} [props.toolbarColors] - 工具栏快速添加色（传入后展示颜色快捷按钮）
 * @param {function} [props.onAddColor]    - 点击工具栏「新建」按钮回调（无参数）
 * @param {function} [props.onClearAll]    - 工具栏「清除全部」回调
 * @param {function} [props.onOpacityChange] - 透明度变化回调 (id, opacity) => void
 * @param {function} [props.onColorMix]    - 颜色混合回调 (color1, color2, ratio) => void
 * @param {object[]} [props.items]         - 色块列表，每个包含 id, color, opacity
 */
export function SwatchCanvas ({
  width: widthProp,
  height: heightProp,
  fillContainer = true,
  items = [],
  selectedId,
  onSelect,
  onRemove,
  onPositionChange,
  onAddColor,
  onClearAll,
  onOpacityChange,
  onColorMix,
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

  // 新增：混合模式、取色模式、透明度
  const [mixMode, setMixMode] = useState(false)           // 是否处于混合模式
  const [eyedropperMode, setEyedropperMode] = useState(false) // 取色模式
  const [eyedropperPreview, setEyedropperPreview] = useState(null) // 取色预览

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
        preserveObjectStacking: true,
        selectionKey: 'shiftKey',  // 按住 Shift 多选
        selectionColor: 'rgba(255, 107, 157, 0.15)',
        selectionBorderColor: '#ff6b9d',
        selectionLineWidth: 1
      })
      fabricRef.current = canvas
      objectIdMapRef.current = new Map()
      addGridLines(Fabric, canvas, w, h)

      const handleSelect = (e) => {
        const selected = e.selected || []
        if (selected.length === 0) {
          onSelect(null, '')
          return
        }
        // 多选时只处理第一个（或者可以扩展为处理多个）
        const target = selected[0]
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
        
        // 限制色块不能拖出画布
        const canvas = fabricRef.current
        const maxLeft = canvas.getWidth() - SWATCH_SIZE
        const maxTop = canvas.getHeight() - SWATCH_SIZE
        let left = target.get('left')
        let top = target.get('top')
        
        // 限制在画布范围内
        left = Math.max(0, Math.min(left, maxLeft))
        top = Math.max(0, Math.min(top, maxTop))
        
        // 如果位置被限制了，更新对象位置
        if (left !== target.get('left') || top !== target.get('top')) {
          target.set({ left, top })
          canvas.renderAll()
        }
        
        // 调试输出：每次移动后的坐标
        const bounds = target.getBoundingRect(true)
        console.log(`色块移动 - ID: ${id}, left: ${left.toFixed(1)}, top: ${top.toFixed(1)}, 边界:`, bounds)
        
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

      canvas.on('selection:created', (e) => {
        const activeObjects = canvas.getActiveObjects()
        console.log('选择创建:', e.selected?.length, '个对象, getActiveObjects:', activeObjects.length)
        handleSelect(e)
      })
      canvas.on('selection:updated', (e) => {
        const activeObjects = canvas.getActiveObjects()
        console.log('选择更新:', e.selected?.length, '个对象, getActiveObjects:', activeObjects.length)
        handleSelect(e)
      })
      canvas.on('selection:cleared', () => {
        console.log('选择清除')
        onSelect(null, '')
      })
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
        // 已存在的色块：只更新颜色、透明度、边框，不重置位置
        existing.set('fill', item.color)
        existing.set('opacity', (item.opacity ?? 100) / 100)
        existing.set('borderColor', selectedId === id ? '#ff6b9d' : '#e2e8f0')
        // 只有当 items 中有明确位置时才更新（用于新建时的初始位置回调）
        if (item.left == null && item.top == null && onPositionChange) {
          const defaultPos = getDefaultPosition(index, cw)
          onPositionChange(id, defaultPos.left, defaultPos.top)
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
          opacity: (item.opacity ?? 100) / 100,
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
  // 注意：selectedId 变化不应触发重新同步，否则选中时会导致位置重置
  }, [items, initError])

  // 单独处理选中状态的边框颜色（不触发位置同步）
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.getObjects().forEach((obj) => {
      const id = obj.__swatchId ?? objectIdMapRef.current.get(obj)
      if (id) {
        obj.set('borderColor', selectedId === id ? '#ff6b9d' : '#e2e8f0')
      }
    })
    canvas.renderAll()
  }, [selectedId])

  const handleExport = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `色板-${Date.now()}.png`
    a.click()
  }, [])

  // 上移一层
  const handleBringForward = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !selectedId) return
    const obj = canvas.getObjects().find((o) => o.__swatchId === selectedId)
    if (obj) {
      canvas.bringForward(obj)
      canvas.renderAll()
    }
  }, [selectedId])

  // 下移一层
  const handleSendBackwards = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !selectedId) return
    const obj = canvas.getObjects().find((o) => o.__swatchId === selectedId)
    if (obj) {
      // 确保不会移到网格线下面
      const gridLines = canvas.getObjects().filter((o) => o.__isGridLine)
      const lowestGridIndex = gridLines.length > 0 ? canvas.getObjects().indexOf(gridLines[gridLines.length - 1]) : -1
      const objIndex = canvas.getObjects().indexOf(obj)
      if (objIndex > lowestGridIndex + 1) {
        canvas.sendBackwards(obj)
        canvas.renderAll()
      }
    }
  }, [selectedId])

  // 取色器：读取画布上最终渲染的颜色（含透明度叠加）
  const getPixelColor = useCallback((x, y) => {
    const canvas = fabricRef.current
    if (!canvas) return '#000000'

    // 先强制渲染，确保像素数据是最新的
    canvas.renderAll()

    // 直接读取 Fabric.js 底层 canvas 的像素（包含所有渲染效果）
    const lowerCanvas = canvas.lowerCanvasEl
    if (!lowerCanvas) return '#000000'

    // x, y 已经是像素坐标，直接使用
    const canvasX = Math.floor(x)
    const canvasY = Math.floor(y)

    // 确保坐标在有效范围内
    if (canvasX < 0 || canvasX >= lowerCanvas.width || canvasY < 0 || canvasY >= lowerCanvas.height) {
      console.log('坐标越界:', canvasX, canvasY, 'canvas尺寸:', lowerCanvas.width, lowerCanvas.height)
      return '#000000'
    }

    const ctx = lowerCanvas.getContext('2d')
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
    const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`
    console.log('取色调试 - 坐标:', canvasX, canvasY, '颜色:', hex)
    return hex
  }, [])

  // 混合功能：在离屏 canvas 上渲染两个色块，取交集区域像素平均色
  const handleMix = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // 获取选中的对象
    const activeObjects = canvas.getActiveObjects().filter((obj) => obj.__swatchId)
    if (activeObjects.length < 2) {
      message.warning('请框选选择至少两个色块')
      return
    }

    // 先取消选择，让对象恢复实际坐标
    canvas.discardActiveObject()
    canvas.renderAll()

    // 用 aCoords 获取每个色块的四个角坐标，计算交集
    let intersectLeft = -Infinity, intersectTop = -Infinity
    let intersectRight = Infinity, intersectBottom = Infinity

    activeObjects.forEach((obj, idx) => {
      obj.setCoords()
      const coords = obj.aCoords
      const left = Math.min(coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x)
      const top = Math.min(coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y)
      const right = Math.max(coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x)
      const bottom = Math.max(coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y)
      console.log(`色块${idx} 边界:`, { left, top, right, bottom })

      intersectLeft = Math.max(intersectLeft, left)
      intersectTop = Math.max(intersectTop, top)
      intersectRight = Math.min(intersectRight, right)
      intersectBottom = Math.min(intersectBottom, bottom)
    })

    console.log('交集区域:', { intersectLeft, intersectTop, intersectRight, intersectBottom })

    if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
      message.warning('选中的色块没有重叠区域，无法混合')
      return
    }

    // 在离屏 canvas 上重新按顺序绘制这些色块（含透明度），模拟真实叠加效果
    const iw = Math.max(1, Math.round(intersectRight - intersectLeft))
    const ih = Math.max(1, Math.round(intersectBottom - intersectTop))

    const offscreen = document.createElement('canvas')
    offscreen.width = iw
    offscreen.height = ih
    const ctx = offscreen.getContext('2d')

    // 白色背景（与画布背景一致）
    ctx.fillStyle = '#fafbfc'
    ctx.fillRect(0, 0, iw, ih)

    // 按 z-order 把每个色块绘制到离屏 canvas 上（只绘制交集区域内的部分）
    // 获取 canvas 上所有对象，按 z-order 过滤出选中的
    const allObjects = canvas.getObjects()
    const orderedObjects = allObjects.filter(o => activeObjects.some(a => a.__swatchId === o.__swatchId))

    orderedObjects.forEach((obj) => {
      obj.setCoords()
      const coords = obj.aCoords
      const objLeft = Math.min(coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x)
      const objTop = Math.min(coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y)
      const objW = Math.max(coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x) - objLeft
      const objH = Math.max(coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y) - objTop

      const fill = obj.get('fill')
      const opacity = (obj.get('opacity') ?? 1)
      ctx.globalAlpha = opacity
      ctx.fillStyle = typeof fill === 'string' ? fill : '#000000'

      // 绘制时偏移到交集区域本地坐标
      const rx = obj.get('rx') || 12  // 圆角
      const drawX = objLeft - intersectLeft
      const drawY = objTop - intersectTop

      ctx.beginPath()
      ctx.roundRect(drawX, drawY, objW, objH, rx)
      ctx.fill()
    })

    ctx.globalAlpha = 1

    // 取整个交集区域所有像素的平均色
    const imageData = ctx.getImageData(0, 0, iw, ih)
    const data = imageData.data
    let rSum = 0, gSum = 0, bSum = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i]
      gSum += data[i + 1]
      bSum += data[i + 2]
      count++
    }
    const r = Math.round(rSum / count)
    const g = Math.round(gSum / count)
    const b = Math.round(bSum / count)
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    console.log('交集区域混合色:', hex, { r, g, b })

    if (onAddColor) {
      onAddColor(hex)
      message.success(`混合完成：${hex}`)
    }

    canvas.discardActiveObject()
    canvas.renderAll()
    setMixMode(false)
  }, [onAddColor])

  const handleEyedropper = useCallback((e) => {
    if (!eyedropperMode) return
    const canvas = fabricRef.current
    if (!canvas) return
    const rect = canvas.upperCanvasEl?.getBoundingClientRect() || canvas.getElement()?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hex = getPixelColor(x, y)
    setEyedropperPreview(hex)
  }, [eyedropperMode, getPixelColor])

  // 取色器：点击确认（读取该位置最终渲染的颜色，含透明度叠加）
  const handleEyedropperClick = useCallback((e) => {
    if (!eyedropperMode) return
    const canvas = fabricRef.current
    if (!canvas) return
    const lowerCanvas = canvas.lowerCanvasEl
    if (!lowerCanvas) return
    const rect = lowerCanvas.getBoundingClientRect()
    if (!rect) return
    // 修正坐标：CSS像素坐标 → canvas物理像素坐标（处理devicePixelRatio和缩放）
    const scaleX = lowerCanvas.width / rect.width
    const scaleY = lowerCanvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    canvas.renderAll()
    const ctx = lowerCanvas.getContext('2d')
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`

    if (onAddColor) onAddColor(hex)
    message.success(`已取色：${hex}`)
    setEyedropperMode(false)
    setEyedropperPreview(null)
    document.body.classList.remove('eyedropper-active')
  }, [eyedropperMode, onAddColor])

  // 获取选中色块的透明度
  const selectedItem = items.find(i => i.id === selectedId)
  const currentOpacity = selectedItem?.opacity ?? 100

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
      {/* 简化的顶部提示 */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderBottom: '1px solid #f1f5f9',
          background: 'rgba(255,255,255,0.95)',
          zIndex: 2,
          fontSize: 11,
          color: '#94a3b8',
          fontWeight: 500
        }}
      >
        拖动色块调整位置 · Delete 删除选中
      </div>
      {/* Fabric 画布区域 */}
      <div
        ref={canvasWrapRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
          background: '#fff',
          cursor: eyedropperMode ? 'crosshair' : 'default'
        }}
        onClick={eyedropperMode ? handleEyedropperClick : undefined}
        onMouseMove={eyedropperMode ? handleEyedropper : undefined}
      >
        <canvas id={CANVAS_ID} ref={canvasRef} />
      </div>
      {/* Figma 风格底部工具栏 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 16px',
          borderTop: '1px solid #f1f5f9',
          background: 'rgba(255,255,255,0.98)',
          zIndex: 2
        }}
      >
        {/* 左侧工具组 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '3px 6px'
        }}>
          <Tooltip title="选择" placement="top">
            <button
              type="button"
              className={`rd-canvas-tool-btn ${!mixMode && !eyedropperMode ? 'rd-canvas-tool-btn--active' : ''}`}
              onClick={() => { setMixMode(false); setEyedropperMode(false) }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 3l14 9-7 2-4 7L5 3z" fill="currentColor" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip title="新建" placement="top">
            <button type="button" className="rd-canvas-tool-btn" onClick={() => onAddColor && onAddColor()}>
              <PlusOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>
          <Tooltip title="混合" placement="top">
            <button
              type="button"
              className="rd-canvas-tool-btn"
              onMouseDown={(e) => e.stopPropagation()} // 阻止事件冒泡，防止选择被清除
              onClick={() => {
                // 直接执行混合
                handleMix()
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="12" r="6" fill="currentColor" opacity="0.5" />
                <circle cx="15" cy="12" r="6" fill="currentColor" opacity="0.8" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip title="取色" placement="top">
            <button
              type="button"
              className={`rd-canvas-tool-btn ${eyedropperMode ? 'rd-canvas-tool-btn--active' : ''}`}
              onClick={() => {
                const next = !eyedropperMode
                setEyedropperMode(next)
                setMixMode(false)
                if (next) {
                  document.body.classList.add('eyedropper-active')
                  message.info('点击画布任意位置取色')
                } else {
                  document.body.classList.remove('eyedropper-active')
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.42-1.42 1.42 1.41 1.41L3 17.25V21h3.75l9.42-9.42 1.41 1.41 1.42-1.41-1.42-1.42 3.13-3.12a1 1 0 0 0 0-1.41zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" fill="currentColor" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* 中间透明度滑块 */}
        {selectedId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '3px 10px',
            minWidth: 120
          }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>透明</span>
            <Slider
              min={10}
              max={100}
              value={currentOpacity}
              onChange={(v) => onOpacityChange && onOpacityChange(selectedId, v)}
              style={{ flex: 1, margin: 0 }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
            <span style={{ fontSize: 10, color: '#64748b', width: 28 }}>{currentOpacity}%</span>
          </div>
        )}

        {/* 取色预览 */}
        {eyedropperMode && eyedropperPreview && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '3px 10px'
          }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: eyedropperPreview, border: '1px solid #e2e8f0' }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>{eyedropperPreview}</span>
          </div>
        )}

        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />

        {/* 右侧操作组 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '3px 6px'
        }}>
          <Tooltip title="上移一层" placement="top">
            <button
              type="button"
              className="rd-canvas-tool-btn"
              onClick={handleBringForward}
              disabled={!selectedId}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip title="下移一层" placement="top">
            <button
              type="button"
              className="rd-canvas-tool-btn"
              onClick={handleSendBackwards}
              disabled={!selectedId}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 20l8-8h-5V4h-6v8H4z" fill="currentColor" />
              </svg>
            </button>
          </Tooltip>
          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
          <Tooltip title="导出" placement="top">
            <button type="button" className="rd-canvas-tool-btn" onClick={handleExport}>
              <DownloadOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>
          <Tooltip title="清除" placement="top">
            <button
              type="button"
              className="rd-canvas-tool-btn rd-canvas-tool-btn--danger"
              onClick={onClearAll}
              disabled={items.length === 0}
            >
              <DeleteOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

export default SwatchCanvas
