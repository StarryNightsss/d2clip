/**
 * ColorPicker —— Canvas 色谱面板 + 色相/透明度滑条 + HEX 输入 + 调色板
 * 风格与整个项目 rd-panel-embed / rd-texture-chip 完全统一
 */
import { useRef, useEffect, useCallback, useState } from 'react'
import { message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { dataAPI } from '../services/api'

// ─── 颜色工具函数 ──────────────────────────────────────────────

/** HSV → RGB (0-255) */
function hsvToRgb(h, s, v) {
  s /= 100; v /= 100
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  const map = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i]
  return map.map(x => Math.round(x * 255))
}

/** RGB → HEX */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** HEX → RGB */
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16),
  }
}

/** RGB → HSV */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  const s = max === 0 ? 0 : d / max * 100
  const v = max * 100
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) }
}

// ─── 画布绘制函数 ─────────────────────────────────────────────

/** 绘制 HSV 色谱面板（固定 hue，横=饱和度，纵=明度反转） */
function drawSpectrum(canvas, hue) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  // 纯色相
  const gradH = ctx.createLinearGradient(0, 0, w, 0)
  gradH.addColorStop(0, '#fff')
  gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`)
  ctx.fillStyle = gradH
  ctx.fillRect(0, 0, w, h)
  // 叠加黑色纵向渐变
  const gradV = ctx.createLinearGradient(0, 0, 0, h)
  gradV.addColorStop(0, 'rgba(0,0,0,0)')
  gradV.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = gradV
  ctx.fillRect(0, 0, w, h)
}

/** 绘制色相彩虹滑条 */
function drawHueRail(canvas) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  const stops = [[0,'#f00'],[60/360,'#ff0'],[120/360,'#0f0'],[180/360,'#0ff'],[240/360,'#00f'],[300/360,'#f0f'],[1,'#f00']]
  stops.forEach(([p, c]) => grad.addColorStop(p, c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

/** 绘制透明度棋盘+渐变滑条 */
function drawAlphaRail(canvas, hex) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  // 棋盘底
  const sz = 6
  for (let y = 0; y < h; y += sz) {
    for (let x = 0; x < w; x += sz) {
      ctx.fillStyle = (Math.floor(x/sz) + Math.floor(y/sz)) % 2 === 0 ? '#e2e8f0' : '#fff'
      ctx.fillRect(x, y, sz, sz)
    }
  }
  // 颜色渐变
  const rgb = hexToRgb(hex) || { r: 255, g: 107, b: 157 }
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
  grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// ─── 主组件 ──────────────────────────────────────────────────

/**
 * @param {string}   color        - 当前颜色 HEX
 * @param {function} onChange     - (hex, opacity) 颜色变化回调
 * @param {number}   opacity      - 0-100
 * @param {function} onOpacityChange
 */
export default function ColorPicker({ color = '#ff6b9d', onChange, opacity = 100, onOpacityChange }) {
  const spectrumRef = useRef(null)
  const hueRef = useRef(null)
  const alphaRef = useRef(null)

  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(color)
    return rgb ? rgbToHsv(rgb.r, rgb.g, rgb.b) : { h: 336, s: 58, v: 100 }
  })
  const [hexInput, setHexInput] = useState(color.toUpperCase())
  const [cursorPct, setCursorPct] = useState({ x: hsv.s, y: 100 - hsv.v })

  // 调色板（后端存储）
  const [swatches, setSwatches] = useState([])
  const [swatchLoading, setSwatchLoading] = useState(false)

  // 是否在拖拽
  const dragging = useRef(null) // 'spectrum' | 'hue' | 'alpha'

  // ── 初始化：从后端加载调色板 ──
  useEffect(() => {
    setSwatchLoading(true)
    dataAPI.getSwatches()
      .then(data => setSwatches(Array.isArray(data) ? data : []))
      .catch(() => setSwatches([]))
      .finally(() => setSwatchLoading(false))
  }, [])

  // ── 当外部 color 变化时同步 hsv / hexInput ──
  useEffect(() => {
    const rgb = hexToRgb(color)
    if (!rgb) return
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
    setHsv(newHsv)
    setHexInput(color.toUpperCase())
    setCursorPct({ x: newHsv.s, y: 100 - newHsv.v })
  }, [color])

  // ── 绘制色谱（用 ResizeObserver 确保 canvas 尺寸正确再画）──
  useEffect(() => {
    const canvas = spectrumRef.current
    if (!canvas) return
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w > 0 && h > 0) {
        canvas.width = w
        canvas.height = h
        drawSpectrum(canvas, hsv.h)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [hsv.h])

  // ── 绘制色相滑条 ──
  useEffect(() => {
    const canvas = hueRef.current
    if (!canvas) return
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w > 0 && h > 0) {
        canvas.width = w
        canvas.height = h
        drawHueRail(canvas)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // ── 绘制透明度滑条 ──
  useEffect(() => {
    const canvas = alphaRef.current
    if (!canvas) return
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w > 0 && h > 0) {
        canvas.width = w
        canvas.height = h
        drawAlphaRail(canvas, color)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [color])

  // ── 从 HSV 更新颜色 ──
  const applyHsv = useCallback((h, s, v) => {
    const clamped = { h: Math.max(0, Math.min(360, h)), s: Math.max(0, Math.min(100, s)), v: Math.max(0, Math.min(100, v)) }
    setHsv(clamped)
    const [r, g, b] = hsvToRgb(clamped.h, clamped.s, clamped.v)
    const hex = rgbToHex(r, g, b)
    setHexInput(hex)
    setCursorPct({ x: clamped.s, y: 100 - clamped.v })
    onChange?.(hex, opacity)
  }, [opacity, onChange])

  // ── 色谱面板交互 ──
  const handleSpectrumPointer = useCallback((e, canvas) => {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    applyHsv(hsv.h, x * 100, (1 - y) * 100)
  }, [hsv.h, applyHsv])

  // ── 色相滑条交互 ──
  const handleHuePointer = useCallback((e, canvas) => {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    applyHsv(x * 360, hsv.s, hsv.v)
  }, [hsv.s, hsv.v, applyHsv])

  // ── 透明度滑条交互 ──
  const handleAlphaPointer = useCallback((e, canvas) => {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onOpacityChange?.(Math.round(x * 100))
  }, [onOpacityChange])

  // ── 全局 mousemove/mouseup ──
  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current === 'spectrum') handleSpectrumPointer(e, spectrumRef.current)
      else if (dragging.current === 'hue') handleHuePointer(e, hueRef.current)
      else if (dragging.current === 'alpha') handleAlphaPointer(e, alphaRef.current)
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [handleSpectrumPointer, handleHuePointer, handleAlphaPointer])

  // ── HEX 输入框 ──
  const handleHexChange = (e) => setHexInput(e.target.value.toUpperCase())
  const commitHex = () => {
    const val = hexInput.startsWith('#') ? hexInput : '#' + hexInput
    const rgb = hexToRgb(val)
    if (!rgb) { setHexInput(color.toUpperCase()); return }
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
    setHsv(newHsv)
    setCursorPct({ x: newHsv.s, y: 100 - newHsv.v })
    onChange?.(val.toUpperCase(), opacity)
  }

  // ── 调色板：添加当前色 ──
  const handleAddSwatch = async () => {
    if (swatches.some(s => s.hex.toUpperCase() === color.toUpperCase())) {
      message.info('调色板中已有这个颜色')
      return
    }
    try {
      const newSwatch = await dataAPI.addSwatch(color)
      setSwatches(prev => [...prev, newSwatch])
    } catch (e) {
      message.error('保存失败：' + (e.message || '请检查登录状态'))
    }
  }

  // ── 调色板：删除（双击触发）──
  const handleDeleteSwatch = async (id) => {
    try {
      await dataAPI.deleteSwatch(id)
      setSwatches(prev => prev.filter(s => s.id !== id))
      message.success('已删除')
    } catch {
      message.error('删除失败')
    }
  }

  // ── 调色板：单击应用颜色 ──
  const handlePickSwatch = (hex) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
    setHsv(newHsv)
    setHexInput(hex.toUpperCase())
    setCursorPct({ x: newHsv.s, y: 100 - newHsv.v })
    onChange?.(hex.toUpperCase(), opacity)
  }

  const huePercent = hsv.h / 360 * 100
  const alphaPercent = opacity

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 色谱面板 */}
      <div
        className="rd-spectrum-wrap"
        style={{ height: 140 }}
        onMouseDown={(e) => {
          dragging.current = 'spectrum'
          handleSpectrumPointer(e, spectrumRef.current)
        }}
      >
        <canvas ref={spectrumRef} style={{ width: '100%', height: '100%' }} />
        <div
          className="rd-spectrum-cursor"
          style={{
            left: `${cursorPct.x}%`,
            top: `${cursorPct.y}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* 色相 + 透明度滑条 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 色相 */}
        <div
          className="rd-rail-wrap"
          onMouseDown={(e) => {
            dragging.current = 'hue'
            handleHuePointer(e, hueRef.current)
          }}
        >
          <canvas ref={hueRef} style={{ width: '100%', height: '100%' }} />
          <div
            className="rd-rail-thumb"
            style={{ left: `${huePercent}%`, backgroundColor: `hsl(${hsv.h},100%,50%)` }}
          />
        </div>
        {/* 透明度 */}
        <div
          className="rd-rail-wrap"
          onMouseDown={(e) => {
            dragging.current = 'alpha'
            handleAlphaPointer(e, alphaRef.current)
          }}
        >
          <canvas ref={alphaRef} style={{ width: '100%', height: '100%' }} />
          <div
            className="rd-rail-thumb"
            style={{ left: `${alphaPercent}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* HEX 输入 + 颜色预览 */}
      <div className="rd-hex-row">
        <div className="rd-hex-preview">
          <div className="rd-hex-preview-color" style={{ backgroundColor: color, opacity: opacity / 100 }} />
        </div>
        <input
          className="rd-hex-input"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={commitHex}
          onKeyDown={(e) => e.key === 'Enter' && commitHex()}
          spellCheck={false}
          maxLength={9}
        />
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>
          {opacity}%
        </span>
      </div>

      {/* 调色板 */}
      <div className="rd-panel-embed">
        <div className="rd-picker-label">调色板</div>
        <div className="rd-palette-strip">
          {swatchLoading
            ? <span style={{ fontSize: 11, color: '#94a3b8' }}>加载中…</span>
            : swatches.map(s => (
              <div
                key={s.id}
                className={`rd-palette-dot${s.hex.toUpperCase() === color.toUpperCase() ? ' rd-palette-dot--active' : ''}`}
                title={`${s.hex}\n单击应用 · 双击删除`}
                onClick={() => handlePickSwatch(s.hex)}
                onDoubleClick={() => handleDeleteSwatch(s.id)}
              >
                <div className="rd-palette-dot-color" style={{ backgroundColor: s.hex }} />
              </div>
            ))
          }
          {/* 添加按钮 */}
          <button
            type="button"
            className="rd-palette-add"
            title="将当前颜色添加到调色板"
            onClick={handleAddSwatch}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
