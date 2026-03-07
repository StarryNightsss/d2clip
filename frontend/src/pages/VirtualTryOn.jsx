import { Card } from 'antd'
import { SmileOutlined } from '@ant-design/icons'

const VirtualTryOn = () => {
  return (
    <div className="page-wrap">
      <header className="page-header animate-fade-in">
        <h1 className="page-title">虚拟试妆</h1>
        <p className="page-subtitle">生成不同肤色模特的虚拟试妆效果图</p>
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
