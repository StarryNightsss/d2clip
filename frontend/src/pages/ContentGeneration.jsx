import { Card } from 'antd'
import { EditOutlined } from '@ant-design/icons'

const ContentGeneration = () => {
  return (
    <div className="page-wrap">
      <header className="page-header animate-fade-in">
        <h1 className="page-title">内容生成</h1>
        <p className="page-subtitle">自动生成小红书种草文案和营销素材</p>
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
          ✍️
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
          此功能由运营部门使用，基于趋势分析和虚拟试妆效果，自动生成小红书种草文案、营销话术和推广素材。
        </p>
      </Card>
    </div>
  )
}

export default ContentGeneration
