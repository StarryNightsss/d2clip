import { Form, Input, Button, Card, message, Select } from 'antd'
import { UserOutlined, LockOutlined, BarChartOutlined, ExperimentOutlined, SmileOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import loginBg from '../assets/login-bg.png'
import { communityAPI } from '../services/api'
import LipstickLottie from '../components/LipstickLottie'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (values) => {
    setLoading(true)
    const { username, password, department } = values

    try {
      // 简单模拟验证
      if (password !== '123456') {
        message.error('密码错误！')
        return
      }
      // 从后端员工列表取当前用户头像，统一与社区发帖/评论一致
      let avatar
      try {
        const users = await communityAPI.getUsers()
        const me = Array.isArray(users) ? users.find(u => u && (u.username === username || u.email === username)) : null
        avatar = me?.avatar || ((username === 'testsss@admin.com' || department === 'admin') ? '/kuromi-avatar.png' : undefined)
      } catch (_) {
        avatar = (username === 'testsss@admin.com' || department === 'admin') ? '/kuromi-avatar.png' : undefined
      }
      const userInfo = {
        username,
        department,
        departmentName: {
          product: '产品部门',
          rd: '研发部门',
          market: '市场部门',
          operation: '运营部门',
          admin: '管理员'
        }[department],
        avatar
      }
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      message.success('登录成功！')
      setTimeout(() => navigate('/'), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden'
    }}>
      {/* 半透明遮罩 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(5px)'
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        bodyStyle={{ padding: '48px 40px' }}
      >
        {/* Logo 和标题：口红 Lottie 动画 */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '90px',
            height: '90px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #F18EB2 0%, #c44569 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(255, 107, 157, 0.3)'
          }}>
            <LipstickLottie size={70} />
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #F18EB2 0%, #c44569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            D2C 口红实验室
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#636e72',
            margin: 0,
            fontWeight: '400'
          }}>
            欢迎回来，请登录您的账户
          </p>
        </div>

        {/* 登录表单 */}
        <Form
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label={<span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>用户名</span>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#ff6b9d', fontSize: '16px' }} />}
              placeholder="请输入用户名"
              style={{
                height: '48px',
                borderRadius: '12px',
                fontSize: '15px'
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>密码</span>}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#ff6b9d', fontSize: '16px' }} />}
              placeholder="请输入密码（测试密码：123456）"
              style={{
                height: '48px',
                borderRadius: '12px',
                fontSize: '15px'
              }}
            />
          </Form.Item>

          <Form.Item
            name="department"
            label={<span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>部门</span>}
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select
              placeholder="请选择您的部门"
              style={{ fontSize: '15px' }}
              options={[
                { value: 'product', label: <span><BarChartOutlined style={{ marginRight: 8 }} />产品部门</span> },
                { value: 'rd', label: <span><ExperimentOutlined style={{ marginRight: 8 }} />研发部门</span> },
                { value: 'market', label: <span><SmileOutlined style={{ marginRight: 8 }} />市场部门</span> },
                { value: 'operation', label: <span><EditOutlined style={{ marginRight: 8 }} />运营部门</span> },
                { value: 'admin', label: <span><TeamOutlined style={{ marginRight: 8 }} />管理员</span> }
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '32px', marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: '52px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(255, 107, 157, 0.3)'
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* 提示信息 */}
        <div style={{
          marginTop: '28px',
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.2) 0%, rgba(255, 192, 203, 0.2) 100%)',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#2d3436',
          lineHeight: '1.7',
          border: '1px solid rgba(255, 182, 193, 0.3)'
        }}>
          <div style={{
            fontWeight: '600',
            marginBottom: '10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            测试账号信息
          </div>
          <div style={{ paddingLeft: '24px', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', color: '#ff6b9d' }}>用户名：</span>任意
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', color: '#ff6b9d' }}>密码：</span>123456
            </div>
            <div>
              <span style={{ fontWeight: '600', color: '#ff6b9d' }}>部门：</span>选择您要测试的部门
            </div>
          </div>
        </div>

        {/* 底部版权 */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#95a5a6',
          fontSize: '12px'
        }}>
          © 2026 D2C 口红实验室 · Powered by AI
        </div>
      </Card>
    </div>
  )
}

export default Login
