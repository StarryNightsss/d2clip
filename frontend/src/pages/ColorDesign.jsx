import { Card } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'

const ColorDesign = () => {
  return (
    <div className="page-wrap">
      <header className="page-header animate-fade-in">
        <h1 className="page-title">色号设计</h1>
        <p className="page-subtitle">基于趋势分析生成色号配方、色板对比</p>
      </header>

      <Card
        className="page-placeholder-card card-hover animate-slide-up"
        style={{ marginBottom: 24 }}
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
