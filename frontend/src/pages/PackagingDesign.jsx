import { useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Button, Input, Space, Select, message, Tooltip } from 'antd'
import {
  ExperimentOutlined,
  SendOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { communityAPI } from '../services/api'

const TEXTURES = [
  { id: 'matte', name: '哑光', filter: '' },
  { id: 'satin', name: '缎面', filter: 'url(#satinSheen)' },
  { id: 'glossy', name: '镜面', filter: 'url(#glossySheen)' },
  { id: 'metallic', name: '金属', filter: 'url(#metallicSheen)' },
]

const PRESET_COLORS = [
  { name: '经典红', hex: '#cc2936' },
  { name: '豆沙粉', hex: '#c8808a' },
  { name: '裸杏', hex: '#d4a574' },
  { name: '梅子', hex: '#8e4585' },
  { name: '珊瑚橘', hex: '#f08060' },
  { name: '浆果', hex: '#8b0045' },
  { name: '酒红', hex: '#722f37' },
  { name: '赤陶', hex: '#cc7722' },
]

const LABEL_FONTS = [
  { value: 'serif', label: '衬线体' },
  { value: 'sans-serif', label: '无衬线' },
  { value: 'cursive', label: '手写体' },
]

const PackagingDesign = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const colorFromRd = searchParams.get('color')
  // Also check localStorage for the current R&D selected color (shared from ColorDesign)
  const storedRdColor = (() => {
    try { return localStorage.getItem('d2c-rd-selected-color') || '' } catch { return '' }
  })()

  const [lipColor, setLipColor] = useState(colorFromRd || storedRdColor || '#c8808a')
  const [tubeColor, setTubeColor] = useState('#1a1a2e')
  const [capColor, setCapColor] = useState('#2d2d4e')
  const [labelText, setLabelText] = useState('D2C LAB')
  const [subLabel, setSubLabel] = useState('N° 01')
  const [textureIndex, setTextureIndex] = useState(0)
  const [labelFont, setLabelFont] = useState('serif')
  const [opacity, setOpacity] = useState(100)

  const currentTexture = TEXTURES[textureIndex]

  const handleExportPng = useCallback(() => {
    const svg = document.querySelector('#lipstick-packaging-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 700
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = `packaging-${lipColor.slice(1)}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
      message.success('包装图已导出')
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [lipColor])

  const handlePublishToCommunity = async () => {
    const name = subLabel || labelText || lipColor
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const author = userInfo.username || userInfo.name || '研发'
      const role = userInfo.departmentName || '研发'
      await communityAPI.createPost('rd', {
        title: `包装色号方案：${name}`,
        content: `色号：${name}\n膏体颜色：${lipColor}\n管身颜色：${tubeColor}\n盖子颜色：${capColor}\n质地：${currentTexture.name}`,
        preview: `${name} · ${lipColor} · ${currentTexture.name}`,
        author,
        role,
        tags: ['包装设计', '色号方案'],
      })
      message.success('已发布到研发社群！市场部可在社群中查看并应用到虚拟试妆')
    } catch (e) {
      message.error('发布失败：' + (e.message || '请检查网络'))
    }
  }

  return (
    <div className="page-wrap" style={{ padding: '24px 32px' }}>
      <header className="page-header animate-fade-in">
        <h1 className="page-title">口红包装设计</h1>
        <p className="page-subtitle">设计口红外包装，实时预览效果并导出</p>
      </header>

      <Row gutter={24} style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* ── Left: SVG Preview ── */}
        <Col xs={24} lg={14} style={{ display: 'flex' }}>
          <Card
            className="page-placeholder-card card-hover animate-slide-up"
            style={{ marginBottom: 24, flex: 1 }}
            styles={{ body: { padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 600, background: 'linear-gradient(180deg, #faf5f8 0%, #f0e4ef 100%)' } }}
          >
            <svg
              id="lipstick-packaging-svg"
              width="240"
              height="540"
              viewBox="0 0 240 540"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Glossy sheen overlay */}
                <linearGradient id="glossySheen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="35%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
                  <stop offset="65%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                {/* Satin sheen */}
                <linearGradient id="satinSheen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="40%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="60%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                {/* Metallic sheen */}
                <linearGradient id="metallicSheen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="25%" stopColor="rgba(255,255,255,0.45)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="75%" stopColor="rgba(255,255,255,0.45)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
                {/* Tube body gradient */}
                <linearGradient id="tubeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={tubeColor} stopOpacity={0.85} />
                  <stop offset="30%" stopColor={tubeColor} />
                  <stop offset="70%" stopColor={tubeColor} />
                  <stop offset="100%" stopColor={tubeColor} stopOpacity={0.7} />
                </linearGradient>
                {/* Cap gradient */}
                <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={capColor} stopOpacity={0.85} />
                  <stop offset="30%" stopColor={capColor} />
                  <stop offset="70%" stopColor={capColor} />
                  <stop offset="100%" stopColor={capColor} stopOpacity={0.7} />
                </linearGradient>
                {/* Lipstick bullet gradient */}
                <linearGradient id="bulletGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={lipColor} stopOpacity={0.8} />
                  <stop offset="20%" stopColor={lipColor} />
                  <stop offset="80%" stopColor={lipColor} />
                  <stop offset="100%" stopColor={lipColor} stopOpacity={0.7} />
                </linearGradient>
                {/* Shadow */}
                <filter id="dropShadow" x="-20%" y="-5%" width="140%" height="110%">
                  <feDropShadow dx="4" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
                </filter>
              </defs>

              <g filter="url(#dropShadow)">
                {/* ── Tube body (bottom, drawn first = back layer) ── */}
                <rect x="63" y="238" width="114" height="250" rx="6" ry="6" fill="url(#tubeGrad)" />
                {currentTexture.filter && <rect x="63" y="238" width="114" height="250" rx="6" ry="6" fill={currentTexture.filter} />}
                {/* Tube top rim */}
                <rect x="58" y="230" width="124" height="14" rx="3" fill={tubeColor} />
                {/* Tube highlight line */}
                <rect x="88" y="248" width="2" height="226" rx="1" fill="rgba(255,255,255,0.12)" />
                {/* Tube bottom */}
                <rect x="63" y="482" width="114" height="10" rx="3" fill={tubeColor} />

                {/* ── Lipstick bullet (visible above tube opening) ── */}
                <g>
                  {/* Bullet base (cylinder) */}
                  <rect x="72" y="192" width="96" height="44" rx="2" fill="url(#bulletGrad)" />
                  {/* Bullet tip (angled, pointy top) */}
                  <path d="M72 192 L72 176 Q120 140 168 176 L168 192 Z" fill="url(#bulletGrad)" />
                  {/* Bullet sheen */}
                  {currentTexture.filter && <path d="M72 192 L72 176 Q120 140 168 176 L168 192 Z" fill={currentTexture.filter} />}
                  {/* Bullet highlight */}
                  <ellipse cx="105" cy="170" rx="14" ry="24" fill="rgba(255,255,255,0.18)" />
                </g>

                {/* ── Cap (shown open, next to tube top) — drawn last = front layer ── */}
                <rect x="58" y="16" width="124" height="145" rx="8" ry="8" fill="url(#capGrad)" />
                {currentTexture.filter && <rect x="58" y="16" width="124" height="145" rx="8" ry="8" fill={currentTexture.filter} />}
                {/* Cap bottom rim */}
                <rect x="52" y="153" width="136" height="12" rx="3" fill={capColor} />
                {/* Cap highlight line */}
                <rect x="82" y="28" width="2" height="125" rx="1" fill="rgba(255,255,255,0.15)" />
                {/* Gap indicator between cap and tube (thin shadow) */}
                <rect x="65" y="161" width="110" height="4" rx="1" fill="rgba(0,0,0,0.06)" />

                {/* ── Label on tube ── */}
                <text
                  x="120" y="375"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.85)"
                  fontSize="14"
                  fontFamily={labelFont}
                  fontWeight="600"
                  letterSpacing="2"
                >
                  {labelText}
                </text>
                <text
                  x="120" y="398"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="10"
                  fontFamily="sans-serif"
                  letterSpacing="1"
                >
                  {subLabel}
                </text>
              </g>
            </svg>
          </Card>
        </Col>

        {/* ── Right: Controls ── */}
        <Col xs={24} lg={10} style={{ display: 'flex' }}>
          <Card
            className="page-placeholder-card card-hover animate-slide-up"
            style={{ marginBottom: 24, flex: 1 }}
            styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '100%' } }}
          >
            <Space orientation="vertical" size="middle" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>

              {/* ── Lip color ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>膏体颜色</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <input
                    type="color"
                    value={lipColor}
                    onChange={e => setLipColor(e.target.value)}
                    style={{ width: 40, height: 32, border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                  />
                  <Input
                    value={lipColor}
                    onChange={e => setLipColor(e.target.value)}
                    style={{ width: 120 }}
                    maxLength={7}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <Tooltip key={c.hex} title={c.name}>
                      <div
                        onClick={() => setLipColor(c.hex)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                          background: c.hex, border: lipColor === c.hex ? '2px solid #ff6b9d' : '2px solid #e8e8e8',
                          transition: 'border-color 0.2s',
                        }}
                      />
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* ── Tube color ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>管身颜色</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['#1a1a2e', '#2d2d4e', '#f5f0eb', '#c9b99a', '#cc2936', '#1b4332', '#3d405b', '#e76f51'].map(c => (
                    <div
                      key={c}
                      onClick={() => setTubeColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                        background: c, border: tubeColor === c ? '2px solid #ff6b9d' : '2px solid #e8e8e8',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Cap color ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>盖子颜色</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['#2d2d4e', '#1a1a2e', '#f5f0eb', '#c9b99a', '#cc2936', '#1b4332', '#3d405b', '#e76f51'].map(c => (
                    <div
                      key={c}
                      onClick={() => setCapColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                        background: c, border: capColor === c ? '2px solid #ff6b9d' : '2px solid #e8e8e8',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Texture ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>质感</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TEXTURES.map((t, i) => (
                    <button
                      key={t.id}
                      className={`rd-texture-chip ${textureIndex === i ? 'rd-texture-chip--selected' : ''}`}
                      onClick={() => setTextureIndex(i)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Label ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>标签文字</div>
                <Input
                  value={labelText}
                  onChange={e => setLabelText(e.target.value)}
                  placeholder="品牌名称"
                  maxLength={20}
                  style={{ marginBottom: 8 }}
                />
                <Input
                  value={subLabel}
                  onChange={e => setSubLabel(e.target.value)}
                  placeholder="色号/编号"
                  maxLength={15}
                />
              </div>

              {/* ── Font ── */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>字体</div>
                <Select value={labelFont} onChange={setLabelFont} style={{ width: '100%' }} options={LABEL_FONTS} />
              </div>

              {/* ── Actions — pinned to bottom ── */}
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16, justifyContent: 'center' }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handlePublishToCommunity}
                  className="rd-btn-primary"
                >
                  发布到社群
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportPng}
                  className="rd-btn-default"
                >
                  导出 PNG
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setLipColor('#c8808a'); setTubeColor('#1a1a2e'); setCapColor('#2d2d4e')
                    setLabelText('D2C LAB'); setSubLabel('N\u00b0 01')
                    setTextureIndex(0); setLabelFont('serif')
                  }}
                  className="rd-btn-default"
                >
                  重置
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default PackagingDesign
