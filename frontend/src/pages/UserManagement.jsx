import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Card } from 'antd'
import { UserAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'

const UserManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    usersAPI
      .getList()
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const departmentColors = {
    product: 'blue',
    rd: 'green',
    market: 'orange',
    operation: 'purple',
    admin: 'red'
  }

  const columns = [
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>用户名</span>,
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#2d3436' }}>{text}</span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>姓名</span>,
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#2d3436' }}>{text}</span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>部门</span>,
      dataIndex: 'departmentName',
      key: 'departmentName',
      render: (text, record) => (
        <Tag
          color={departmentColors[record.department]}
          style={{
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          {text}
        </Tag>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>邮箱</span>,
      dataIndex: 'email',
      key: 'email',
      render: (text) => (
        <span style={{ fontSize: '14px', color: '#636e72' }}>{text}</span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>角色</span>,
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag
          color={role === 'admin' ? 'red' : 'default'}
          style={{
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>状态</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag
          color={status === 'active' ? 'green' : 'default'}
          style={{
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>操作</span>,
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ fontWeight: '500', padding: 0 }}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            style={{ fontWeight: '500', padding: 0 }}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (record) => {
    setEditingUser(record)
    form.setFieldsValue(record)
    setIsModalOpen(true)
  }

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户 "${record.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        usersAPI
          .delete(record.id)
          .then(() => {
            setUsers((prev) => prev.filter((u) => u.id !== record.id))
            message.success('删除成功')
          })
          .catch((err) => message.error(err?.message || '删除失败'))
      }
    })
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const departmentNameMap = {
        product: '产品部门',
        rd: '研发部门',
        market: '市场部门',
        operation: '运营部门',
        admin: '管理员'
      }

      if (editingUser) {
        usersAPI
          .update(editingUser.id, {
            name: values.name,
            department: values.department,
            email: values.email,
            role: values.role,
            ...(values.password ? { password: values.password } : {}),
          })
          .then((updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u))
            )
            message.success('修改成功')
            setIsModalOpen(false)
            form.resetFields()
          })
          .catch((err) => message.error(err?.message || '修改失败'))
      } else {
        usersAPI
          .create({
            username: values.username,
            name: values.name,
            department: values.department,
            email: values.email,
            role: values.role || 'user',
            password: values.password || '123456',
          })
          .then((newUser) => {
            setUsers((prev) => [...prev, newUser])
            message.success('添加成功')
            setIsModalOpen(false)
            form.resetFields()
          })
          .catch((err) => message.error(err?.message || '添加失败'))
      }
    })
  }

  return (
    <div className="page-wrap">
      <header className="page-header animate-fade-in">
        <h1 className="page-title">职员管理</h1>
        <p className="page-subtitle">管理系统用户、分配部门权限</p>
      </header>

      <Card
        className="card-hover page-module animate-slide-up"
        style={{
          borderRadius: '20px',
          marginBottom: '24px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>
              共 {users.length} 名职员
            </span>
          </div>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAdd}
            style={{
              height: '40px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)'
            }}
          >
            添加职员
          </Button>
        </div>
      </Card>

      {/* 用户列表 */}
      <div className="card-hover page-module animate-slide-up" style={{
        padding: '32px',
        borderRadius: '20px'
      }}>
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={users}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => (
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#636e72' }}>
                共 {total} 名职员
              </span>
            )
          }}
          rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : ''}
        />
      </div>

      {/* 添加/编辑模态框 */}
      <Modal
        title={
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#2d3436' }}>
            {editingUser ? '编辑职员' : '添加职员'}
          </span>
        }
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText="确定"
        cancelText="取消"
        width={600}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
            border: 'none',
            fontWeight: '600'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="username"
            label={<span style={{ fontSize: '15px', fontWeight: '600' }}>用户名</span>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              disabled={!!editingUser}
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label={<span style={{ fontSize: '15px', fontWeight: '600' }}>姓名</span>}
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input
              placeholder="请输入姓名"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="department"
            label={<span style={{ fontSize: '15px', fontWeight: '600' }}>部门</span>}
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select
              placeholder="请选择部门"
              style={{ height: '40px' }}
              options={[
                { value: 'product', label: '🎯 产品部门' },
                { value: 'rd', label: '🔬 研发部门' },
                { value: 'market', label: '📢 市场部门' },
                { value: 'operation', label: '✍️ 运营部门' },
                { value: 'admin', label: '👑 管理员' }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ fontSize: '15px', fontWeight: '600' }}>邮箱</span>}
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              placeholder="请输入邮箱"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span style={{ fontSize: '15px', fontWeight: '600' }}>角色</span>}
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              placeholder="请选择角色"
              style={{ height: '40px' }}
              options={[
                { value: 'user', label: '普通用户' },
                { value: 'admin', label: '管理员' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
