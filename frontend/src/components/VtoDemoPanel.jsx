import { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, message, Tooltip } from 'antd';
import { CheckCircleOutlined, TeamOutlined, CameraOutlined, ShareAltOutlined } from '@ant-design/icons';
import { communityAPI } from '../services/api';

const { Text } = Typography;

const MANNEQUIN_IMG = '/mannequin-head.png';

// Skin tone CSS filter presets — sepia for warmth, brightness for depth, saturate for richness
const SKIN_TONES = [
  { id: 'yellow-1', name: '黄一白', bg: 'linear-gradient(135deg, #fef5ec 0%, #f9e7d9 100%)', filter: 'sepia(12%) brightness(1.02)' },
  { id: 'yellow-2', name: '黄二白', bg: 'linear-gradient(135deg, #f9e7d9 0%, #f0d5b8 100%)', filter: 'sepia(22%) brightness(0.98)' },
  { id: 'tan', name: '浅褐', bg: 'linear-gradient(135deg, #ecc5a0 0%, #ddb88c 100%)', filter: 'sepia(32%) brightness(0.94)' },
  { id: 'light-beige', name: '浅米', bg: 'linear-gradient(135deg, #d4a97a 0%, #c49a6c 100%)', filter: 'sepia(40%) brightness(0.90)' },
  { id: 'medium-beige', name: '中米', bg: 'linear-gradient(135deg, #c49a6c 0%, #b08a5e 100%)', filter: 'sepia(48%) brightness(0.86)' },
  { id: 'olive', name: '橄榄', bg: 'linear-gradient(135deg, #a88a60 0%, #917750 100%)', filter: 'sepia(42%) hue-rotate(12deg) brightness(0.82)' },
  { id: 'deep-brown', name: '深棕', bg: 'linear-gradient(135deg, #8a6e4e 0%, #735c3e 100%)', filter: 'sepia(55%) brightness(0.76)' },
  { id: 'dark-olive', name: '深橄榄', bg: 'linear-gradient(135deg, #735c3e 0%, #5e4c34 100%)', filter: 'sepia(50%) hue-rotate(18deg) brightness(0.70)' },
];

// Lipstick colors — hex values match Chinese color names
const COLOR_SWATCHES = [
  { id: 'rose', name: '豆沙玫瑰', hex: '#c8808a' },
  { id: 'brick', name: '砖红', hex: '#a0522d' },
  { id: 'coral', name: '珊瑚橘', hex: '#f08060' },
  { id: 'nude', name: '裸杏', hex: '#d4a574' },
  { id: 'plum', name: '梅子', hex: '#8e4585' },
  { id: 'berry', name: '浆果', hex: '#8b0045' },
  { id: 'peony', name: '芍药粉', hex: '#f48fb1' },
  { id: 'burgundy', name: '勃艮第', hex: '#800020' },
  { id: 'terracotta', name: '赤陶', hex: '#cc7722' },
  { id: 'mauve', name: '淡紫', hex: '#c8a2c8' },
  { id: 'cherry', name: '樱桃红', hex: '#de3163' },
  { id: 'wine', name: '酒红', hex: '#722f37' },
];

// Parse hex color to {r, g, b}
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

// Lip outline points from manual annotation (tkinter trace tool)
// Lip outlines from drag-trace annotation (107 upper + 125 lower points)
// Upper lip: stroke1 reversed (left peak→left corner) + stroke2 (left peak→right corner) + lip line
const UPPER_LIP_OUTLINE = [
  // left corner → left cupid's bow peak (stroke1 reversed)
  [204,422],[204,423],[205,423],[205,424],[206,424],[207,424],[208,424],[209,424],
  [210,424],[211,424],[212,424],[213,424],[214,424],[215,424],[216,424],[217,424],
  [218,424],[219,424],[220,424],[220,423],[221,423],[222,423],[223,423],[223,422],
  [224,422],[225,422],[226,422],[226,421],[227,421],[227,420],[228,420],[228,419],
  [229,419],[230,419],[230,418],[231,418],
  // left peak → center dip → right peak → right corner (stroke2)
  [233,417],[234,417],[234,418],[235,418],[235,419],[236,419],[237,419],[237,420],
  [238,420],[238,421],[239,421],[240,421],[240,422],[241,422],[242,422],[243,422],
  [243,423],[244,423],[245,423],[246,423],[247,423],[248,423],[249,423],[250,423],
  [251,422],[252,422],[253,421],[254,421],[255,421],[255,420],[256,420],[257,420],
  [257,419],[258,419],[259,419],[259,418],[260,418],[261,417],[261,416],[262,416],
  [263,416],[264,416],[264,417],[265,417],[265,418],[266,418],[266,419],[267,419],
  [268,419],[268,420],[268,421],[269,421],[269,422],[270,422],[271,422],[271,423],
  [272,423],[273,423],[274,423],[274,424],[275,424],[276,424],[277,424],[278,424],
  [279,424],[279,425],[280,425],[281,425],[282,425],[283,425],[284,425],[285,425],
  [286,425],[287,425],[288,425],[289,425],[290,425],[291,425],[292,425],[293,425],
  [294,425],[294,424],
  // lip line (right→left, interpolated from lower lip boundary)
  [291,428],[278,431],[265,432],[248,433],[232,432],[218,429],[208,427],[204,424],
];

const LOWER_LIP_OUTLINE = [
  // complete outline from drag-trace (left corner → bottom → right corner)
  [199,424],[200,424],[201,425],[202,426],[203,426],[204,427],[205,427],[206,427],
  [207,428],[208,429],[209,430],[210,431],[210,432],[211,432],[211,433],[211,434],
  [212,434],[213,434],[213,435],[213,436],[214,436],[214,437],[214,438],[215,438],
  [215,439],[216,439],[217,440],[218,441],[218,442],[219,442],[220,442],[220,443],
  [221,443],[222,443],[222,444],[223,444],[224,444],[224,445],[225,445],[226,445],
  [227,445],[227,446],[228,446],[229,446],[230,447],[231,447],[232,447],[233,447],
  [234,447],[234,448],[235,448],[236,448],[237,448],[238,448],[239,448],[240,448],
  [241,448],[242,448],[243,448],[244,448],[245,448],[246,448],[247,448],[248,448],
  [249,448],[250,448],[251,448],[252,448],[253,448],[254,448],[255,448],[256,448],
  [257,448],[258,448],[259,448],[261,448],[262,448],[263,448],[264,448],[265,448],
  [266,448],[267,448],[268,447],[269,447],[270,447],[271,447],[272,447],[272,446],
  [273,446],[273,445],[274,445],[275,445],[276,444],[277,443],[278,443],[278,442],
  [279,441],[280,441],[281,441],[281,440],[282,440],[283,439],[284,439],[284,438],
  [284,437],[285,437],[286,436],[287,436],[287,435],[288,435],[288,434],[288,433],
  [289,433],[289,432],[290,432],[290,431],[291,431],[291,430],[291,429],[292,429],
  [292,428],[293,427],[293,426],[294,426],[294,425],[294,424],[295,424],
];

// Draw a smooth closed lip shape: expand outline outward + Catmull-Rom spline interpolation
// tension: higher = smoother/rounder curves (6=standard, 10=very soft), lower = sharper
const drawLipShape = (ctx, pts, expand = 0, tension = 6) => {
  if (pts.length < 3) return;
  // Compute centroid for outward expansion
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= pts.length; cy /= pts.length;
  // Expand each point outward from centroid
  const ep = expand > 0
    ? pts.map(p => [cx + (p[0] - cx) * (1 + expand), cy + (p[1] - cy) * (1 + expand)])
    : pts;
  // Catmull-Rom spline → cubic Bézier (passes through every point exactly)
  ctx.beginPath();
  ctx.moveTo(ep[0][0], ep[0][1]);
  for (let i = 0; i < ep.length; i++) {
    const p0 = ep[(i - 1 + ep.length) % ep.length];
    const p1 = ep[i];
    const p2 = ep[(i + 1) % ep.length];
    const p3 = ep[(i + 2) % ep.length];
    const cp1x = p1[0] + (p2[0] - p0[0]) / tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) / tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) / tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) / tension;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }
  ctx.closePath();
};

const drawLips = (ctx, hex) => {
  const { r, g, b } = hexToRgb(hex);

  ctx.save();

  // ─── Upper lip ───
  drawLipShape(ctx, UPPER_LIP_OUTLINE, 0.02, 10);
  const upperGrad = ctx.createLinearGradient(248, 416, 248, 433);
  upperGrad.addColorStop(0, `rgba(${(r * 0.75) | 0}, ${(g * 0.75) | 0}, ${(b * 0.75) | 0}, 0.82)`);
  upperGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.88)`);
  upperGrad.addColorStop(1, `rgba(${(r * 0.88) | 0}, ${(g * 0.88) | 0}, ${(b * 0.88) | 0}, 0.85)`);
  ctx.fillStyle = upperGrad;
  ctx.fill();

  // ─── Lower lip ───
  drawLipShape(ctx, LOWER_LIP_OUTLINE, 0.02, 6);
  const lowerGrad = ctx.createLinearGradient(248, 424, 248, 448);
  lowerGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.88)`);
  lowerGrad.addColorStop(0.45, `rgba(${Math.min(255, (r * 1.18) | 0)}, ${Math.min(255, (g * 1.18) | 0)}, ${Math.min(255, (b * 1.18) | 0)}, 0.92)`);
  lowerGrad.addColorStop(1, `rgba(${(r * 0.82) | 0}, ${(g * 0.82) | 0}, ${(b * 0.82) | 0}, 0.85)`);
  ctx.fillStyle = lowerGrad;
  ctx.fill();

  // ─── Lip line (crease) ───
  ctx.beginPath();
  ctx.moveTo(204, 424);
  ctx.lineTo(218, 429);
  ctx.lineTo(248, 433);
  ctx.lineTo(278, 431);
  ctx.lineTo(294, 425);
  ctx.strokeStyle = `rgba(${(r * 0.55) | 0}, ${(g * 0.55) | 0}, ${(b * 0.55) | 0}, 0.35)`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ─── Glossy highlight on lower lip ───
  ctx.beginPath();
  ctx.ellipse(248, 438, 20, 8, 0, 0, Math.PI * 2);
  const hlGrad = ctx.createRadialGradient(248, 438, 0, 248, 438, 20);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hlGrad;
  ctx.fill();

  // ─── Cupid's bow highlight ───
  ctx.beginPath();
  ctx.ellipse(248, 420, 12, 3, 0, 0, Math.PI * 2);
  const bowGrad = ctx.createRadialGradient(248, 420, 0, 248, 420, 12);
  bowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  bowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = bowGrad;
  ctx.fill();

  ctx.restore();
};

const VtoDemoPanel = () => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [selectedSkin, setSelectedSkin] = useState(SKIN_TONES[0]);
  const [communityColors, setCommunityColors] = useState([]);

  // Load community color schemes (R&D posts)
  useEffect(() => {
    communityAPI.getPosts('rd')
      .then(posts => {
        const schemes = (posts || [])
          .filter(p => (p.tags || []).includes('色号方案') || (p.title || '').includes('色号方案'))
          .map(p => {
            // Parse HEX from content like "HEX：#cc2936"
            const hexMatch = (p.content || '').match(/HEX[：:]\s*(#[0-9a-fA-F]{6})/)
            const nameMatch = (p.content || '').match(/色号[：:]\s*(.+)/)
            return {
              id: `community-${p.id || p.post_id}`,
              name: nameMatch ? nameMatch[1].trim() : (p.title || '').replace('色号方案：', ''),
              hex: hexMatch ? hexMatch[1] : '#ff6b9d',
            }
          })
        setCommunityColors(schemes)
      })
      .catch(() => { /* community not available, just use built-in swatches */ })
  }, []);

  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const allSwatches = [...COLOR_SWATCHES, ...communityColors];

  // Load mannequin image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redraw();
    };
    img.src = MANNEQUIN_IMG;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever skin tone or lip color changes
  useEffect(() => {
    if (imgRef.current) redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkin, selectedColor]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 500;

    // 1) Pink-tinted background (shows through transparent areas of the image)
    const bgGrad = ctx.createLinearGradient(0, 0, 500, 500);
    bgGrad.addColorStop(0, '#fdf2f8');
    bgGrad.addColorStop(1, '#f5e6f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 500, 500);

    // 2) Draw mannequin head with skin-tone CSS filter
    ctx.filter = selectedSkin.filter;
    ctx.drawImage(img, 0, 0, 500, 500);
    ctx.filter = 'none';

    // 3) Draw refined lips on top
    drawLips(ctx, selectedColor.hex);
  };

  // Export VTO canvas as PNG
  const handleExportVto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `vto-${selectedColor.hex.slice(1)}-${selectedSkin.id}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    message.success('试妆效果图已导出');
  };

  // Share VTO result to community
  const handleShareToCommunity = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const author = userInfo.username || userInfo.name || '市场';
      const role = userInfo.departmentName || '市场';
      await communityAPI.createPost('market', {
        title: `试妆效果：${selectedColor.name}`,
        content: `色号：${selectedColor.name}\nHEX：${selectedColor.hex}\n肤色：${selectedSkin.name}\n效果描述：${selectedColor.name}口红在${selectedSkin.name}肤色上的试妆效果`,
        preview: `${selectedColor.name} · ${selectedColor.hex} · ${selectedSkin.name}`,
        author,
        role,
        tags: ['试妆效果', '虚拟试妆'],
      });
      message.success('试妆效果已分享到社群！');
    } catch (e) {
      message.error('分享失败：' + (e.message || '请检查网络'));
    }
  };

  return (
    <div className="vto-demo-panel" style={{ width: '100%' }}>
      {/* Skin Tone Selector (Top Row) */}
      <div style={{ marginBottom: 32 }}>
        <Text strong style={{ display: 'block', marginBottom: 12, color: '#0f172a', fontSize: 14 }}>
          请选择素体肤色
        </Text>
        <Row gutter={[12, 12]}>
          {SKIN_TONES.map((skin) => (
            <Col key={skin.id} xs={12} sm={8} md={6} lg={3}>
              <div
                onClick={() => setSelectedSkin(skin)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 12,
                  padding: '12px 8px',
                  textAlign: 'center',
                  background: skin.bg,
                  border: selectedSkin.id === skin.id ? '2px solid #ff6b9d' : '1px solid #e2e8f0',
                  transition: 'all 0.2s ease',
                  minHeight: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 157, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{skin.name}</div>
                {selectedSkin.id === skin.id && (
                  <CheckCircleOutlined style={{ color: '#ff6b9d', marginTop: 4 }} />
                )}
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Main Content Area (Face + Swatches) */}
      <Row gutter={[32, 32]}>
        {/* Left: Face Preview — single canvas for image + lips */}
        <Col xs={24} lg={12}>
          <Card
            title="模特面部预览"
            className="workbench-content-card card-hover"
            style={{
              borderRadius: 20,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 0 } }}
          >
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Card>
        </Col>

        {/* Right: Color Swatches */}
        <Col xs={24} lg={12}>
          <Card
            title="口红色卡"
            className="workbench-content-card card-hover"
            style={{
              borderRadius: 20,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            styles={{ body: { padding: 0, flex: 1 } }}
          >
            <div style={{ padding: 24, overflowY: 'auto', maxHeight: 520 }}>
              <Row gutter={[16, 16]}>
                {allSwatches.map((swatch) => (
                  <Col key={swatch.id} xs={12} sm={8} md={6}>
                    <div
                      onClick={() => setSelectedColor(swatch)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 12,
                        padding: '16px 12px',
                        textAlign: 'center',
                        background: '#fff',
                        border: selectedColor.id === swatch.id ? '2px solid #ff6b9d' : '1px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minHeight: 100,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 157, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          backgroundColor: swatch.hex,
                          marginBottom: 12,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                        {swatch.name}
                      </div>
                      {swatch.id.startsWith('community-') && (
                        <div style={{ fontSize: 10, color: '#8e4585', marginTop: 2 }}>
                          <TeamOutlined /> 来自社群
                        </div>
                      )}
                      {selectedColor.id === swatch.id && (
                        <Button size="small" type="primary" style={{ marginTop: 12, height: 28, fontSize: 12 }}>
                          已应用
                        </Button>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
            {/* ── VTO Action Buttons ── */}
            <div style={{ display: 'flex', gap: 10, padding: '0 24px 20px', justifyContent: 'center' }}>
              <Button
                icon={<CameraOutlined />}
                onClick={handleExportVto}
                className="rd-btn-default"
              >
                导出效果图
              </Button>
              <Button
                type="primary"
                icon={<ShareAltOutlined />}
                onClick={handleShareToCommunity}
                className="rd-btn-primary"
              >
                分享到社群
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VtoDemoPanel;
