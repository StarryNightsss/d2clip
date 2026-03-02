import { Card } from 'antd'
import { SmileOutlined } from '@ant-design/icons'

const VirtualTryOn = () => {
  return (
    <div>
      {/* 页面标题 */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
        padding: '40px 48px',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 8px 24px rgba(255, 107, 157, 0.3)'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '36px',
          fontWeight: '700',
          margin: 0,
          marginBottom: '12px',
          letterSpacing: '-0.5px'
        }}>
          <SmileOutlined style={{ marginRight: '12px' }} />
          虚拟试妆
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '16px',
          margin: 0,
          fontWeight: '400'
        }}>
          生成不同肤色模特的虚拟试妆效果图
        </p>
      </div>

      {/* 功能占位 */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: 'none'
        }}
        bodyStyle={{ padding: '80px 40px', textAlign: 'center' }}
      >
        <div style={{
          fontSize: '80px',
          marginBottom: '24px'
        }}>
          🤳
        </div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#2d3436',
          marginBottom: '12px'
        }}>
          功能开发中
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#636e72',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          此功能由市场部门使用，基于研发部门设计的色号，生成不同肤色（黄一白、黄二白等）模特的虚拟试妆效果图。
        </p>
      </Card>
    </div>
  )
}

export default VirtualTryOn
