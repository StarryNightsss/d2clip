import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Button, Input, Space, message, Tag, Spin, Empty, Tooltip } from 'antd'
import {
  ExperimentOutlined,
  HistoryOutlined,
  SaveOutlined,
  ImportOutlined,
  DeleteOutlined,
  BgColorsOutlined,
  BarChartOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import SwatchCanvas from '../components/SwatchCanvas'
import HeartLottieRow from '../components/HeartLottieRow'
import HeartLottieStatic from '../components/HeartLottieStatic'
import ColorPicker from '../components/ColorPicker'
import { agentAPI, rdAPI } from '../services/api'

const TEXTURES = ['哑光', '缎面', '镜面', '金属']

const ColorDesign = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session_id')

  // 色板画布状态
  const [palette, setPalette] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedColor, setSelectedColor] = useState('#ff6b9d')
  const [history, setHistory] = useState([])         // 左侧历史：从后端加载
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reportFile, setReportFile] = useState(null)
  const [colorName, setColorName] = useState('')
  const [hue, setHue] = useState(336)
  const [opacity, setOpacity] = useState(100)

  // 报告数据状态
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [showReportPanel, setShowReportPanel] = useState(false)

  const [textureIndex, setTextureIndex] = useState(0)

  // 加载研发历史色号
  useEffect(() => {
    setHistoryLoading(true)
    rdAPI.getHistory()
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  // AI 推荐配色状态：null=骨架, 有数据=展示
  const [aiSchemes, setAiSchemes] = useState(null)
  const [aiSchemesLoading, setAiSchemesLoading] = useState(false)

  // ColorPicker 颜色变化回调：同步到画布选中色块
  const handleColorChange = useCallback((hex, newOpacity) => {
    setSelectedColor(hex)
    if (newOpacity !== undefined) setOpacity(newOpacity)
    if (selectedId) {
      setPalette((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, color: hex } : p))
      )
    }
  }, [selectedId])

  // 从 URL 的 session_id 加载报告数据
  useEffect(() => {
    if (sessionIdFromUrl) {
      loadReportData(sessionIdFromUrl)
    }
  }, [sessionIdFromUrl])

  const loadReportData = async (sid) => {
    setReportLoading(true)
    try {
      const session = await agentAPI.getSession(sid)
      if (session?.final_report) {
        const finalReport = session.final_report
        const report = finalReport.dynamic_report || finalReport.report || {}
        
        // 提取色彩相关的分析数据
        const results = finalReport.results || []
        const colorAnalysis = results.filter(r => 
          r.section_id?.includes('color') || 
          r.title?.includes('色彩') ||
          r.title?.includes('色调') ||
          r.title?.includes('风格')
        )
        
        setReportData({
          title: report.report_title || '趋势分析报告',
          summary: report.summary || '',
          colorAnalysis: colorAnalysis,
          allResults: results,
          sessionId: sid,
          statistics: finalReport.statistics || {}
        })
        setShowReportPanel(true)
        message.success('已加载产品趋势报告数据')
      } else {
        message.warning('该报告暂无详细数据')
      }
    } catch (e) {
      message.error('加载报告数据失败')
    } finally {
      setReportLoading(false)
    }
  }

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
    if (!color || typeof color !== 'string') return
    const id = `swatch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setPalette((prev) => [...prev, { id, color, name, opacity: 100 }])
    setSelectedId(id)
    setSelectedColor(color)
    if (name) setColorName(name)
  }, [])

  const handleOpacityChange = useCallback((id, opacity) => {
    setPalette((prev) => prev.map((p) => (p.id === id ? { ...p, opacity } : p)))
  }, [])

  const handleColorMix = useCallback((blendedColor, color1, color2, ratio) => {
    // 混合后的颜色直接添加到画布
    addToPalette(blendedColor, `混合 ${ratio}:${100 - ratio}`)
  }, [addToPalette])

  const loadFromHistory = (item) => {
    addToPalette(item.color, item.name)
  }

  const handleSave = async () => {
    const name = colorName.trim() || `色号 ${history.length + 1}`
    try {
      const saved = await rdAPI.saveHistory({
        name,
        hex: selectedColor,
        texture: TEXTURES[textureIndex],
        opacity,
        note: '',
        session_id: sessionIdFromUrl || '',
      })
      setHistory((prev) => [saved, ...prev])
      message.success(`已保存「${name}」到研发历史`)
    } catch (e) {
      message.error('保存失败：' + (e.message || '请检查登录状态'))
    }
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    try {
      await rdAPI.deleteHistory(id)
      setHistory((prev) => prev.filter((h) => h.id !== id))
      message.success('已删除')
    } catch {
      message.error('删除失败')
    }
  }

  const updateSelectedInPalette = (newColor) => {
    setSelectedColor(newColor)
    if (!selectedId) return
    setPalette((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, color: newColor } : p))
    )
  }

  const handleAiColor = async () => {
    // 优先使用上传的文件，其次使用 session
    if (reportFile) {
      setAiSchemesLoading(true)
      try {
        const schemes = await rdAPI.generateSchemesFromFile(reportFile)
        if (!Array.isArray(schemes) || schemes.length === 0) {
          message.warning('未能生成配色，请确认报告内容有效')
          return
        }
        setAiSchemes(schemes)
        message.success(`AI 已根据报告生成 ${schemes.length} 组配色`)
      } catch (e) {
        message.error('配色生成失败：' + (e.message || '请检查文件格式或网络'))
      } finally {
        setAiSchemesLoading(false)
      }
      return
    }

    const sid = sessionIdFromUrl || reportData?.sessionId
    if (!sid) {
      message.warning('请先上传产品报告或从趋势报告页跳转')
      return
    }
    setAiSchemesLoading(true)
    try {
      const schemes = await rdAPI.generateSchemes(sid)
      if (!Array.isArray(schemes) || schemes.length === 0) {
        message.warning('未能生成配色，请确认报告包含色调分析数据')
        return
      }
      setAiSchemes(schemes)
      message.success(`AI 已根据色调分析生成 ${schemes.length} 组配色`)
    } catch (e) {
      message.error('配色生成失败：' + (e.message || '请检查网络或登录状态'))
    } finally {
      setAiSchemesLoading(false)
    }
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
            <p className="page-subtitle">
              {reportData ? `基于报告：${reportData.title}` : reportFile ? `基于文件：${reportFile.name}` : '上传产品报告，AI 智能生成配色方案'}
            </p>
          </div>
          <Space wrap size="middle" align="center">
            {reportData && (
              <Button
                icon={<BarChartOutlined />}
                onClick={() => setShowReportPanel(!showReportPanel)}
                style={{ borderColor: '#ff6b9d', color: '#ff6b9d' }}
              >
                {showReportPanel ? '隐藏' : '查看'}趋势数据
              </Button>
            )}
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={() => navigate('/rd/inspiration')}
              className="rd-btn-primary"
            >
              导入配色方案
            </Button>
          </Space>
        </div>
      </header>

      {/* 心形 Lottie：从左到右依次播放，播完消失，循环（区域无背景） */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <HeartLottieRow />
      </div>

      {/* 趋势数据面板 */}
      {showReportPanel && reportData && (
        <Card 
          className="card-hover" 
          style={{ marginBottom: 24, borderRadius: 20 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChartOutlined style={{ color: '#ff6b9d' }} />
              <span>产品趋势分析数据</span>
              <Tag color="pink">{reportData.colorAnalysis.length} 项色彩分析</Tag>
            </div>
          }
          extra={
            <Button type="link" onClick={() => setShowReportPanel(false)}>
              收起
            </Button>
          }
        >
          {reportLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin />
              <div style={{ marginTop: 16, color: '#999' }}>加载中...</div>
            </div>
          ) : (
            <div>
              <p style={{ color: '#666', marginBottom: 16 }}>{reportData.summary}</p>
              {reportData.colorAnalysis.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {reportData.colorAnalysis.map((item, idx) => (
                    <Col xs={24} md={12} key={idx}>
                      <Card size="small" style={{ borderRadius: 12, height: '100%' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
                          {item.content?.substring(0, 200)}{item.content?.length > 200 ? '...' : ''}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty description="暂无色彩分析数据" />
              )}
            </div>
          )}
        </Card>
      )}

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
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {historyLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin size="small" />
                </div>
              ) : history.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty
                    description={<span style={{ fontSize: 12, color: '#cbd5e1' }}>保存配方后显示于此</span>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{ height: 32 }}
                  />
                </div>
              ) : (
                history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadFromHistory({ ...item, color: item.hex })}
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
                      backgroundColor: item.hex
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.1em', marginTop: 2 }}>{item.texture} · {item.date}</div>
                  </div>
                  <Button
                    type="text" size="small" icon={<DeleteOutlined />}
                    style={{ color: '#cbd5e1' }}
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                  />
                </div>
              ))
              )}
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
              onAddColor={(hex) => hex ? addToPalette(hex) : addToPalette(selectedColor)}
              onClearAll={() => { setPalette([]); setSelectedId(null); setSelectedColor('#ff6b9d') }}
              onOpacityChange={handleOpacityChange}
              onColorMix={handleColorMix}
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
            bodyStyle={{ padding: 20, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 色号名称 */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 8 }}>色号名称</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Input
                    placeholder="如：桃夠"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    style={{ flex: 1, borderRadius: 20 }}
                  />
                  <Button type="primary" onClick={handleAiName} className="rd-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>AI 取名</Button>
                </div>
              </div>
      
              {/* Canvas 色谱面板 + 调色板 */}
              <div className="rd-panel-embed">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BgColorsOutlined style={{ color: 'var(--color-primary)', fontSize: 12 }} /> 调色板
                </div>
                <ColorPicker
                  color={selectedColor}
                  opacity={opacity}
                  onChange={handleColorChange}
                  onOpacityChange={(v) => setOpacity(v)}
                />
              </div>
      
              {/* 质地 */}
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
      
              <div style={{ width: '100%', marginTop: 4, display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} className="rd-btn-primary">
                  保存配方
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 底部装饰：静态心形动画 */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <HeartLottieStatic key={i} />
        ))}
      </div>
    </div>
  )
}

export default ColorDesign
