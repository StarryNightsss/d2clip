import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Modal, message } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { BarChartOutlined, FileTextOutlined, TableOutlined, UserOutlined, LogoutOutlined, TeamOutlined, ExperimentOutlined, SmileOutlined, EditOutlined, CommentOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import LipstickLottie from './LipstickLottie'
import { useState, useEffect } from 'react'

const { Header, Content, Sider } = AntLayout

const Layout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(null)
  const [siderCollapsed, setSiderCollapsed] = useState(false)

  useEffect(() => {
    const info = localStorage.getItem('userInfo')
    if (info) {
      setUserInfo(JSON.parse(info))
    }
  }, [])

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem('userInfo')
        localStorage.removeItem('token')
        message.success('已退出登录')
        navigate('/login')
      }
    })
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  // 根据部门显示不同菜单
  const getMenuItems = () => {
    if (!userInfo) return []

    const baseItems = [
      {
        key: '/',
        icon: <BarChartOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>分析工作台</span>,
        departments: ['product', 'admin']
      },
      {
        key: '/report',
        icon: <FileTextOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>可视化报告</span>,
        departments: ['product', 'admin']
      },
      {
        key: '/data',
        icon: <TableOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>数据列表</span>,
        departments: ['product', 'admin']
      },
      {
        key: '/rd',
        icon: <ExperimentOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>色号设计</span>,
        departments: ['rd', 'admin']
      },
      {
        key: '/market',
        icon: <SmileOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>虚拟试妆</span>,
        departments: ['market', 'admin']
      },
      {
        key: '/operation',
        icon: <EditOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>内容生成</span>,
        departments: ['operation', 'admin']
      },
      {
        key: '/community',
        icon: <CommentOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>企业社群</span>,
        departments: ['product', 'rd', 'market', 'operation', 'admin']
      },
      {
        key: '/users',
        icon: <TeamOutlined style={{ fontSize: '18px' }} />,
        label: <span style={{ fontSize: '15px', fontWeight: '500' }}>职员管理</span>,
        departments: ['admin']
      }
    ]

    return baseItems.filter(item =>
      item.departments.includes(userInfo.department)
    )
  }

  const menuItems = getMenuItems()
  const isWorkbench = location.pathname === '/'
  const sidebarBallCount = isWorkbench ? 16 : 6

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: 'linear-gradient(135deg, rgba(255, 105, 150, 0.78) 0%, rgba(255, 182, 193, 0.88) 50%, rgba(255, 218, 224, 0.92) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxShadow: '0 4px 20px rgba(255, 107, 157, 0.15)',
        zIndex: 1
      }}>
        <div style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {userInfo && (
            <span style={{
              fontSize: '12px',
              fontWeight: 'normal',
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              {userInfo.departmentName}
            </span>
          )}
          <span style={{ fontSize: '15px', fontWeight: '500', opacity: 0.95, letterSpacing: '0.05em' }}>
          世界上只有一种真正的英雄主义，那就是在认清生活的真相后依然热爱生活
          </span>
        </div>

        {userInfo && (
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Space
              style={{
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <Avatar
                src={userInfo.avatar || (userInfo.username === 'testsss@admin.com' ? '/kuromi-avatar.png' : undefined)}
                style={{
                  backgroundColor: (userInfo.avatar || userInfo.username === 'testsss@admin.com') ? 'transparent' : '#ff8fab',
                  fontWeight: '600'
                }}
                icon={!userInfo.avatar && userInfo.username !== 'testsss@admin.com' ? <UserOutlined /> : undefined}
              />
              <span style={{
                color: 'white',
                fontSize: '15px',
                fontWeight: '500'
              }}>
                {userInfo.username}
              </span>
            </Space>
          </Dropdown>
        )}
      </Header>

      <AntLayout>
        <Sider
          width={280}
          collapsedWidth={80}
          collapsible
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
          trigger={null}
          className="sidebar-else"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '2px 0 24px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* 侧栏背景：工作台 16 个球，其它页 6 个 */}
          <div className="sidebar-balls-float" aria-hidden="true">
            {[...Array(sidebarBallCount)].map((_, i) => (
              <div
                key={i}
                className={`sidebar-ball-item sidebar-ball-item--${['primary', 'purple', 'rose'][i % 3]}`}
                style={{
                  left: `${5 + (i * 7) % 90}%`,
                  top: `${5 + (i * 11) % 88}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${8 + (i % 5)}s`
                }}
              />
            ))}
          </div>
          <div className="sidebar-inner">
            {/* Logo 区：参考 else */}
            <div
              className={`sidebar-logo ${siderCollapsed ? 'sidebar-logo--collapsed' : ''}`}
              onClick={() => navigate('/')}
            >
              <div className="sidebar-logo-icon">
                <LipstickLottie size={28} style={{ display: 'block' }} />
              </div>
              {!siderCollapsed && (
                <span className="sidebar-logo-text">D2C 实验室</span>
              )}
            </div>

            {/* 导航菜单 */}
            <div className="sidebar-menu-wrap">
              <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                onClick={({ key }) => navigate(key)}
                inlineCollapsed={siderCollapsed}
                style={{
                  height: 'auto',
                  borderRight: 0,
                  background: 'transparent',
                  padding: '8px 12px'
                }}
                className="sidebar-menu-else"
              />
            </div>

            {/* 收缩按钮：参考 else 右侧圆钮 */}
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={() => setSiderCollapsed(!siderCollapsed)}
              aria-label={siderCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {siderCollapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            </button>
          </div>
        </Sider>

        <Content style={{
          padding: '32px',
          background: 'var(--page-bg, #FFF9FB)',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
