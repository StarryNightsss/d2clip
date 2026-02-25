import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Modal, message } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { BarChartOutlined, FileTextOutlined, TableOutlined, UserOutlined, LogoutOutlined, TeamOutlined, ExperimentOutlined, RocketOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'

const { Header, Content, Sider } = AntLayout

const Layout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(null)

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
        icon: <RocketOutlined style={{ fontSize: '18px' }} />,
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

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1
      }}>
        <div style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '28px' }}>💄</span>
          D2C 口红实验室
          {userInfo && (
            <span style={{
              fontSize: '12px',
              fontWeight: 'normal',
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '12px',
              marginLeft: '12px'
            }}>
              {userInfo.departmentName}
            </span>
          )}
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
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <Avatar
                style={{
                  backgroundColor: '#ff8fab',
                  fontWeight: '600'
                }}
                icon={<UserOutlined />}
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
          width={240}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              height: '100%',
              borderRight: 0,
              paddingTop: '24px',
              paddingLeft: '12px',
              paddingRight: '12px'
            }}
            className="custom-menu"
          />
        </Sider>

        <Content style={{
          padding: '32px',
          background: '#f5f6fa',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
