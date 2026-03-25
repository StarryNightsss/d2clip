import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Button, Upload, Space, message, Spin, Empty, Tag } from 'antd'
import {
  UploadOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  ImportOutlined,
  FileTextOutlined,
  LoadingOutlined,
  BookOutlined,
  HeartOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { dataAPI, agentAPI } from '../services/api'

// 取名风格配置 - 中国古典文学（不同粉色系）
const NAMING_STYLES = [
  { 
    id: 'shijing', 
    name: '诗经', 
    subtitle: '先秦·诗歌总集', 
    bookColor: { bg: '#ffd1dc', spine: '#ff9eb5', dark: '#e8889a' },
    intro: '中国最早的诗歌总集，收录西周至春秋诗歌305篇',
    names: ['桃夭', '蒹葭', '采薇', '鹿鸣', '子衿'],
    quotes: [
      '「桃之夭夭，灼灼其华」',
      '「蒹葭苍苍，白露为霜」',
      '「关关雎鸠，在河之洲」'
    ]
  },
  { 
    id: 'tangshi', 
    name: '唐诗', 
    subtitle: '唐代·诗歌巅峰', 
    bookColor: { bg: '#ffcce0', spine: '#ff99bb', dark: '#e87aa8' },
    intro: '唐代诗歌总集，代表中华诗歌最高成就',
    names: ['云裳', '露华', '孤烟', '明月', '春潮'],
    quotes: [
      '「云想衣裳花想容，春风拂槛露华浓」',
      '「大漠孤烟直，长河落日圆」',
      '「春江潮水连海平，海上明月共潮生」'
    ]
  },
  { 
    id: 'songci', 
    name: '宋词', 
    subtitle: '宋代·词牌精华', 
    bookColor: { bg: '#ffe0f0', spine: '#ffb3d9', dark: '#e89ac4' },
    intro: '宋代词作精选，婉约豪放两派并盛',
    names: ['绿肥', '婵娟', '东风', '暗香', '疏影'],
    quotes: [
      '「知否知否，应是绿肥红瘦」',
      '「但愿人长久，千里共婵娟」',
      '「众里寻他千百度，蓦然回首」'
    ]
  }
]

const ColorInspiration = () => {
  const navigate = useNavigate()
  const [selectedStyle, setSelectedStyle] = useState('shijing')
  const [reportFile, setReportFile] = useState(null)
  const [aiSchemes, setAiSchemes] = useState(null)
  const [aiSchemesLoading, setAiSchemesLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [showSessionSelector, setShowSessionSelector] = useState(false)

  // 加载会话列表
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await agentAPI.getSessions()
      setSessions(data || [])
    } catch (err) {
      console.error('加载会话失败:', err)
    }
  }

  // 处理文件上传
  const handleFileChange = (info) => {
    const { file } = info
    if (file.status === 'done' || file.status === 'uploading') {
      setReportFile(file.originFileObj || file)
      message.success(`已选择文件：${file.name}`)
    }
  }

  // AI 生成配色
  const handleAiColor = useCallback(async () => {
    if (!reportFile) {
      message.warning('请先上传产品报告')
      return
    }

    setAiSchemesLoading(true)
    try {
      // 这里调用实际的 AI 配色 API
      // const result = await dataAPI.generateColorSchemes(reportFile, selectedStyle)
      // 模拟数据
      await new Promise(r => setTimeout(r, 2000))
      const mockSchemes = [
        {
          name: '桃夭·朱砂·暮山紫',
          colors: ['#FF6B9D', '#DC143C', '#8B4789'],
          style: selectedStyle
        },
        {
          name: '天青·月白·鸦青',
          colors: ['#87CEEB', '#F0F8FF', '#4A5568'],
          style: selectedStyle
        },
        {
          name: '胭脂·藤黄·石青',
          colors: ['#FF1493', '#FFD700', '#4169E1'],
          style: selectedStyle
        }
      ]
      setAiSchemes(mockSchemes)
      message.success('配色方案生成成功！')
    } catch (err) {
      message.error('生成配色方案失败')
      console.error(err)
    } finally {
      setAiSchemesLoading(false)
    }
  }, [reportFile, selectedStyle])

  // 导入配色到色号设计
  const importToDesign = (scheme) => {
    // 将配色方案传递到色号设计页面
    navigate('/rd', { state: { importedScheme: scheme } })
    message.success('已导入到色号设计')
  }

  return (
    <div className="color-inspiration-page" style={{ padding: '24px 32px' }}>
      {/* 页面标题 */}
      <header style={{ marginBottom: 32 }}>
        <h1 className="page-title">配色灵感</h1>
        <p className="page-subtitle">
          上传产品报告，选择取名风格，AI 智能生成配色方案
        </p>
      </header>

      <Row gutter={[24, 24]}>
        {/* 左侧：报告输入区域 */}
        <Col xs={24} lg={10}>
          <Card
            className="card-hover"
            style={{ borderRadius: 20, height: '100%' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: '#ff6b9d' }} />
                <span>报告来源</span>
              </div>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 上传文件 */}
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 500 }}>
                  方式一：上传产品报告
                </div>
                <Upload.Dragger
                  accept=".pdf,.doc,.docx,.xlsx"
                  onChange={handleFileChange}
                  showUploadList={false}
                  beforeUpload={() => false}
                  style={{
                    borderRadius: 16,
                    border: '2px dashed rgba(255,107,157,0.3)',
                    background: 'rgba(255,107,157,0.02)',
                    padding: '24px 0'
                  }}
                >
                  <UploadOutlined style={{ fontSize: 32, color: '#ff6b9d' }} />
                  <div style={{ marginTop: 12, color: '#64748b' }}>
                    点击或拖拽文件到此处上传
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    支持 PDF、Word、Excel 格式
                  </div>
                </Upload.Dragger>
                {reportFile && (
                  <Tag color="pink" style={{ marginTop: 12 }}>
                    <FileTextOutlined /> {reportFile.name}
                  </Tag>
                )}
              </div>

              <div style={{ textAlign: 'center', color: '#cbd5e1' }}>— 或 —</div>

              {/* 从会话选择 */}
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 500 }}>
                  方式二：从会话选择报告
                </div>
                <div
                  onClick={() => setShowSessionSelector(!showSessionSelector)}
                  style={{
                    borderRadius: 16,
                    border: '2px dashed rgba(255,107,157,0.3)',
                    background: 'rgba(255,107,157,0.02)',
                    padding: '16px 0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,107,157,0.5)'
                    e.currentTarget.style.background = 'rgba(255,107,157,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,107,157,0.3)'
                    e.currentTarget.style.background = 'rgba(255,107,157,0.02)'
                  }}
                >
                  <MessageOutlined style={{ fontSize: 24, color: '#ff6b9d' }} />
                  <div style={{ marginTop: 8, color: '#64748b' }}>
                    选择会话报告
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    从已有分析会话中选择
                  </div>
                </div>
                
                {showSessionSelector && (
                  <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
                    {sessions.length > 0 ? (
                      sessions.map(session => (
                        <div
                          key={session.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 12,
                            background: '#f8fafc',
                            marginBottom: 8,
                            cursor: 'pointer',
                            border: '1px solid transparent',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            setReportFile({ name: session.title || '未命名报告', sessionId: session.id })
                            setShowSessionSelector(false)
                            message.success(`已选择：${session.title || '未命名报告'}`)
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#ff6b9d'
                            e.currentTarget.style.background = '#fff0f3'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.background = '#f8fafc'
                          }}
                        >
                          <div style={{ 
                            fontWeight: 500, 
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {session.title || '未命名报告'}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                            {new Date(session.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无可用会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </div>
                )}
              </div>

              {/* 生成按钮 */}
              <Button
                type="primary"
                icon={aiSchemesLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
                onClick={handleAiColor}
                disabled={!reportFile || aiSchemesLoading}
                className="rd-btn-primary"
                style={{ width: '100%' }}
              >
                {aiSchemesLoading ? '生成中...' : 'AI 智能配色'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：配色方案展示 */}
        <Col xs={24} lg={14}>
          <Card
            className="card-hover"
            style={{ borderRadius: 20, height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartOutlined style={{ color: '#ff6b9d' }} />
                <span>配色方案</span>
                {aiSchemes && (
                  <Tag color="pink">{aiSchemes.length} 个方案</Tag>
                )}
              </div>
            }
          >
            {aiSchemes ? (
              <Row gutter={[16, 16]}>
                {aiSchemes.map((scheme, idx) => (
                  <Col xs={24} key={idx}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card
                        className="scheme-card"
                        style={{
                          borderRadius: 16,
                          cursor: 'pointer',
                          border: '1.5px solid transparent',
                          transition: 'all 0.3s'
                        }}
                        bodyStyle={{ padding: 20 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff6b9d'
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,157,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {/* 色块展示 */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          {scheme.colors.map((color, cidx) => (
                            <motion.div
                              key={cidx}
                              whileHover={{ scale: 1.05 }}
                              style={{
                                flex: 1,
                                height: 80,
                                borderRadius: 12,
                                backgroundColor: color,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                position: 'relative'
                              }}
                            >
                              <div style={{
                                position: 'absolute',
                                bottom: 8,
                                left: 8,
                                fontSize: 11,
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                fontWeight: 600
                              }}>
                                {color}
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* 方案信息 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                              {scheme.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                              基于《{NAMING_STYLES.find(s => s.id === scheme.style)?.name || '诗经'}》风格命名
                            </div>
                          </div>
                          <Button
                            type="primary"
                            icon={<ImportOutlined />}
                            onClick={() => importToDesign(scheme)}
                            className="rd-btn-primary"
                          >
                            导入设计
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            ) : (
              // 未生成：占位卡片（自适应高度填满）
              <div
                className="workbench-carousel-slide workbench-carousel-slide-1 rd-scheme-placeholder"
                style={{
                  flex: 1,
                  borderRadius: 20,
                  position: 'relative',
                  overflow: 'visible',
                  clipPath: 'inset(0 round 20px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  border: '1.5px dashed rgba(255,107,157,0.3)',
                  minHeight: 0
                }}
              >
                {/* 浮动色块装饰动画 */}
                <div className="rd-scheme-blob rd-scheme-blob-1" />
                <div className="rd-scheme-blob rd-scheme-blob-2" />
                <div className="rd-scheme-blob rd-scheme-blob-3" />

                <span className="workbench-carousel-title" style={{ position: 'relative', zIndex: 1 }}>色彩驱动 · 灵感无限</span>
                <span className="workbench-carousel-desc" style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
                  上传产品报告并点击「AI 智能配色」生成方案
                </span>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 底部：取名风格书架 - 磨砂玻璃效果 */}
      <div style={{ marginTop: 40 }}>
        <div className="page-section-label" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#ff6b9d' }} />
          <span>选择取名风格</span>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
            · 点击选择，AI 将据此风格为您的色号命名
          </span>
        </div>

        <Row gutter={[6, 6]}>
          {NAMING_STYLES.map((style) => (
            <Col xs={24} md={8} key={style.id}>
              <motion.div
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedStyle(style.id)
                  message.success(`已选择「${style.name}」风格`)
                }}
                style={{
                  borderRadius: 20,
                  background: '#fff',
                  border: `2px solid ${selectedStyle === style.id ? '#ff6b9d' : '#f1f5f9'}`,
                  boxShadow: selectedStyle === style.id 
                    ? '0 8px 30px rgba(255,107,157,0.2)' 
                    : '0 2px 12px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%'
                }}
              >
                {/* Framer Motion 漂浮花瓣 */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -15 - i * 5, 0],
                      x: [0, (i % 2 === 0 ? 1 : -1) * (5 + i * 2), 0],
                      rotate: [0, 180 + i * 90, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 4 + i * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.3
                    }}
                    style={{
                      position: 'absolute',
                      width: 6 + i,
                      height: 6 + i,
                      borderRadius: i % 2 === 0 ? '50% 0 50% 0' : '0 50% 0 50%',
                      background: 'linear-gradient(135deg, #ffb6c1, #ff69b4)',
                      top: 20 + i * 25,
                      right: 20 + (i % 2) * 30,
                      opacity: 0.3 + i * 0.08,
                      transform: 'rotate(45deg)'
                    }}
                  />
                ))}

                <div style={{ padding: '24px', position: 'relative', zIndex: 1, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  {/* 右上角选中状态 */}
                  {selectedStyle === style.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ 
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 10,
                        background: '#ff6b9d',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        zIndex: 2
                      }}
                    >
                      <span>✓</span>
                      <span>已选</span>
                    </motion.div>
                  )}

                  {/* 左侧：书本 - 不同粉色系 */}
                  <div style={{
                    width: 80,
                    height: 110,
                    borderRadius: '3px 8px 8px 3px',
                    background: `linear-gradient(180deg, ${style.bookColor.bg} 0%, ${style.bookColor.spine} 100%)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 5px 12px',
                    borderLeft: `4px solid ${style.bookColor.dark}`,
                    boxShadow: `0 3px 10px ${style.bookColor.dark}40`,
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    {/* 顶部装饰线 */}
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      left: 8,
                      right: 8,
                      height: 1,
                      background: 'rgba(255,255,255,0.35)'
                    }} />
                    
                    {/* 底部装饰线 */}
                    <div style={{
                      position: 'absolute',
                      bottom: 6,
                      left: 8,
                      right: 8,
                      height: 1,
                      background: 'rgba(255,255,255,0.35)'
                    }} />

                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 700, 
                      color: '#fff',
                      fontFamily: '"Noto Serif SC", "SimSun", serif',
                      letterSpacing: 4,
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright',
                      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      zIndex: 1
                    }}>
                      {style.name}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.85)',
                      textAlign: 'center',
                      zIndex: 1
                    }}>
                      {style.subtitle}
                    </div>
                  </div>

                  {/* 右侧：卡片内容 - 与书同高 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: 110, justifyContent: 'space-between' }}>
                    {/* 书籍介绍 */}
                    <div style={{
                      fontSize: 10,
                      color: '#94a3b8',
                      lineHeight: 1.4
                    }}>
                      {style.intro}
                    </div>

                    {/* 取名标签 */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {style.names.slice(0, 4).map((name, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: `${style.bookColor.spine}30`,
                            border: `1px solid ${style.bookColor.spine}60`,
                            fontSize: 10,
                            color: style.bookColor.dark,
                            fontWeight: 500
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>

                    {/* 诗句展示 - 3句 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {style.quotes.map((quote, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: 11,
                            color: idx === 0 ? '#475569' : '#64748b',
                            fontWeight: idx === 0 ? 500 : 400,
                            fontFamily: '"Noto Serif SC", "SimSun", serif',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {quote}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}

export default ColorInspiration
