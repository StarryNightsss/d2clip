import { useState, useCallback } from 'react'
import { Card, Row, Col, Button, Input, Space, message } from 'antd'
import {
  ExperimentOutlined,
  HistoryOutlined,
  SaveOutlined,
  ShareAltOutlined,
  UploadOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  BgColorsOutlined
} from '@ant-design/icons'
import SwatchCanvas from '../components/SwatchCanvas'
import HeartLottieRow from '../components/HeartLottieRow'

const HISTORY_MOCK = [
  { id: '1', color: '#ff6b9d', name: 'Aura Pink', date: '2024-03-20' },
  { id: '2', color: '#ffa6c1', name: 'Soft Petal', date: '2024-03-19' },
  { id: '3', color: '#c44569', name: 'Deep Rose', date: '2024-03-18' }
]

const AI_SCHEMES = [
  { name: '落日余晖', colors: ['#ff6b6b', '#feca57', '#ff9f43'] },
  { name: '午夜玫瑰', colors: ['#5f27cd', '#341f97', '#c44569'] },
  { name: '清新薄荷', colors: ['#1dd1a1', '#00d2d3', '#48dbfb'] }
]

const TEXTURES = ['哑光', '缎面', '镜面', '金属']

const ColorDesign = () => {
  const [palette, setPalette] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedColor, setSelectedColor] = useState('#ff6b9d')
  const [history, setHistory] = useState(HISTORY_MOCK)
  const [reportFile, setReportFile] = useState(null)
  const [colorName, setColorName] = useState('')
  const [hue, setHue] = useState(350)
  const [sat, setSat] = useState(85)
  const [val, setVal] = useState(92)
  const [textureIndex, setTextureIndex] = useState(0)

  const handleSelect = useCallback((id, color) => {
    setSelectedId(id)
    setSelectedColor(color || '#ff6b9d')
    const item = palette.find((p) => p.id === id)
    if (item?.name) setColorName(item.name)
  }, [palette])

  const handleRemove = useCallback((id) => {
    setPalette((prev) => prev.filter((p) => p.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
      setSelectedColor('#ff6b9d')
    }
  }, [selectedId])

  const handlePositionChange = useCallback((id, left, top) => {
    setPalette((prev) => prev.map((p) => (p.id === id ? { ...p, left, top } : p)))
  }, [])

  const addToPalette = useCallback((color, name) => {
    const id = `swatch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setPalette((prev) => [...prev, { id, color, name }])
    setSelectedId(id)
    setSelectedColor(color)
    if (name) setColorName(name)
  }, [])

  const loadFromHistory = (item) => {
    addToPalette(item.color, item.name)
  }

  const handleSave = () => {
    const newItem = {
      id: String(Date.now()),
      color: selectedColor,
      name: colorName || `色号 ${history.length + 1}`,
      date: new Date().toISOString().split('T')[0]
    }
    setHistory((prev) => [newItem, ...prev])
    message.success('已保存到研发历史')
  }

  const updateSelectedInPalette = (newColor) => {
    setSelectedColor(newColor)
    if (!selectedId) return
    setPalette((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, color: newColor } : p))
    )
  }

  const handleAiColor = () => {
    message.info('AI 智能配色将基于已上传的报告生成，功能开发中')
  }

  const handleAiName = () => {
    message.info('AI 取名功能开发中')
  }

  return (
    <div className="page-wrap animate-fade-in">
      <header className="page-header" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <h1 className="page-title">AI 色号实验室</h1>
            <p className="page-subtitle">基于趋势分析的色号研发，画布为唯一颜色展示区</p>
          </div>
          <Space wrap size="middle" align="center">
            <label className="rd-upload-trigger">
              <UploadOutlined />
              <span>上传产品报告</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setReportFile({ name: f.name })
                }}
              />
            </label>
            {reportFile && (
              <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileTextOutlined /> 当前依据：{reportFile.name}
              </span>
            )}
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleAiColor} className="rd-btn-primary">
              AI 智能配色
            </Button>
          </Space>
        </div>
      </header>

      {/* 心形 Lottie：从左到右依次播放，播完消失，循环（区域无背景） */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <HeartLottieRow />
      </div>

      <Row gutter={[24, 24]} style={{ alignItems: 'stretch' }}>
        {/* 研发历史 */}
        <Col xs={24} lg={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="page-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <HistoryOutlined style={{ color: 'var(--color-primary)' }} />
            研发历史
          </div>
          <Card
            className="card-hover"
            style={{ borderRadius: 20, overflow: 'hidden', minHeight: 540, flex: 1, display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    cursor: 'pointer',
                    marginBottom: 8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      flexShrink: 0,
                      backgroundColor: item.color
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{item.date}</div>
                  </div>
                  <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#cbd5e1' }} />
                </div>
              ))}
            </div>
            <Button type="link" size="small" style={{ marginTop: 8, padding: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              查看全部
            </Button>
          </Card>
        </Col>

        {/* 色板画布（唯一展示颜色）- 网格、可拖动、编辑器风格 */}
        <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="page-section-label" style={{ marginBottom: 12, flexShrink: 0 }}>
            色板画布
          </div>
          <Card
            className="card-hover"
            style={{ borderRadius: 20, overflow: 'hidden', minHeight: 540, flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
            bodyStyle={{ padding: 0, position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <SwatchCanvas
              fillContainer
              items={palette}
              selectedId={selectedId}
              onSelect={handleSelect}
              onRemove={handleRemove}
              onPositionChange={handlePositionChange}
            />
            {palette.length === 0 && (
              <p style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: 0, fontSize: 14, color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }}>
                从左侧历史或下方 AI 推荐选取颜色加入画布，拖动可调整位置
              </p>
            )}
          </Card>
        </Col>

        {/* 选中色属性 */}
        <Col xs={24} lg={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="page-section-label" style={{ marginBottom: 12, flexShrink: 0 }}>
            选中色属性
          </div>
          <Card
            className="card-hover"
            style={{ borderRadius: 20, minHeight: 540, flex: 1, display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 20, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%', flex: 1, minHeight: 0 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>色号名称</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Input
                    placeholder="如：桃夭"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    style={{ flex: 1, borderRadius: 20 }}
                  />
                  <Button type="primary" onClick={handleAiName} className="rd-btn-primary">AI 取名</Button>
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 64,
                  borderRadius: 16,
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9',
                  backgroundColor: selectedColor
                }}
              />
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>{selectedColor.toUpperCase()}</div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BgColorsOutlined style={{ color: 'var(--color-primary)' }} /> 色彩调节
                </div>
                {[
                  { label: '色相', value: hue, set: setHue, max: 360 },
                  { label: '饱和度', value: sat, set: setSat, max: 100 },
                  { label: '明度', value: val, set: setVal, max: 100 }
                ].map(({ label, value, set, max }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ color: 'var(--color-primary)' }}>{value}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={max}
                      value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>
                ))}
              </div>

              <div className="rd-panel-embed">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 10 }}>
                  质地
                </div>
                <div className="rd-texture-chips">
                  {TEXTURES.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      className={`rd-texture-chip ${textureIndex === i ? 'rd-texture-chip--selected' : ''}`}
                      onClick={() => setTextureIndex(i)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Space style={{ width: '100%', marginTop: 8 }}>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} className="rd-btn-primary" style={{ flex: 1 }}>
                  保存配方
                </Button>
                <Button icon={<ShareAltOutlined />} className="rd-btn-default" />
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* AI 推荐配色 */}
      <div style={{ marginTop: 40 }}>
        <div className="page-section-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExperimentOutlined style={{ color: 'var(--color-primary)' }} />
          AI 推荐配色（点选加入画布）
        </div>
        <Row gutter={[24, 24]}>
          {AI_SCHEMES.map((scheme) => (
            <Col xs={24} md={8} key={scheme.name}>
              <Card
                className="card-hover"
                style={{ borderRadius: 20, cursor: 'pointer' }}
                bodyStyle={{ padding: 24 }}
                onClick={() => scheme.colors.forEach((c) => addToPalette(c))}
              >
                <div
                  style={{
                    display: 'flex',
                    height: 56,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
                    marginBottom: 16
                  }}
                >
                  {scheme.colors.map((c) => (
                    <div
                      key={c}
                      style={{ flex: 1, backgroundColor: c, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        addToPalette(c)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.transition = 'transform 0.2s'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{scheme.name}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 18 }}>→</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}

export default ColorDesign
