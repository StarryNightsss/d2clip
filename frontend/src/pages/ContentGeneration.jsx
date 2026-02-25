import { Card } from 'antd'
import { EditOutlined } from '@ant-design/icons'

const ContentGeneration = () => {
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
          <EditOutlined style={{ marginRight: '12px' }} />
          内容生成
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '16px',
          margin: 0,
          fontWeight: '400'
        }}>
          自动生成小红书种草文案和营销素材
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
