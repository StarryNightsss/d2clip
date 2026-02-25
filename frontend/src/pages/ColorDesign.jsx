import { Card } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'

const ColorDesign = () => {
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
          <ExperimentOutlined style={{ marginRight: '12px' }} />
          色号设计
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '16px',
          margin: 0,
          fontWeight: '400'
        }}>
          基于趋势分析生成色号配方、色板对比
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
          🎨
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
          此功能由研发部门使用，基于产品部门的趋势分析报告，生成口红色号配方建议和色板对比图。
        </p>
      </Card>
    </div>
  )
}

export default ColorDesign
