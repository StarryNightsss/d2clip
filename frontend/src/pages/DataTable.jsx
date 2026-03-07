import { Table, Tag, Space, Button, Spin, message, Input, Select, Card, Row, Col, Modal, Descriptions } from 'antd'
import { EyeOutlined, DownloadOutlined, LoadingOutlined, ReloadOutlined, SearchOutlined, FilterOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { analysisAPI } from '../services/api'

const DataTable = () => {
  const navigate = useNavigate()
  const [dataList, setDataList] = useState([])
  const [filteredData, setFilteredData] = useState([]) // 筛选后的数据
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchText, setSearchText] = useState('') // 搜索关键词
  const [filterStyle, setFilterStyle] = useState(null) // 风格筛选
  const [filterColor, setFilterColor] = useState(null) // 色调筛选
  const [filterScene, setFilterScene] = useState(null) // 场景筛选
  const [detailModalVisible, setDetailModalVisible] = useState(false) // 详情弹窗
  const [currentRecord, setCurrentRecord] = useState(null) // 当前查看的记录

  // 加载最新分析结果
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await analysisAPI.getLatestResults(100)

      if (response.results && response.results.length > 0) {
        setDataList(response.results)
        setFilteredData(response.results)
        setTotal(response.total)
      } else {
        message.warning('暂无分析数据，请先在分析工作台运行分析')
        setDataList([])
        setFilteredData([])
        setTotal(0)
      }

      setLoading(false)
    } catch (error) {
      console.error('加载数据失败:', error)
      message.error(`加载数据失败: ${error.message}`)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 筛选选项：基于当前数据列表（即本次报告的分析结果）动态生成，保证筛选条件与报告一致
  const filterOptions = useMemo(() => {
    const styles = new Set()
    const colors = new Set()
    const scenes = new Set()
    dataList.forEach(item => {
      if (item.style && Array.isArray(item.style)) item.style.forEach(s => s && styles.add(s))
      if (item.color && item.color !== '未知') colors.add(item.color)
      if (item.scene && Array.isArray(item.scene)) item.scene.forEach(s => s && scenes.add(s))
    })
    return {
      styles: [...styles].sort(),
      colors: [...colors].sort(),
      scenes: [...scenes].sort()
    }
  }, [dataList])

  // 筛选和搜索逻辑
  useEffect(() => {
    let result = [...dataList]

    // 搜索标题
    if (searchText) {
      result = result.filter(item =>
        item.title && item.title.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    // 风格筛选（兼容 style / makeup_style，确保为数组再调用 includes）
    if (filterStyle) {
      const styleArr = (item) => Array.isArray(item?.style) ? item.style : (Array.isArray(item?.makeup_style) ? item.makeup_style : [])
      result = result.filter(item => styleArr(item).includes(filterStyle))
    }

    // 色调筛选（兼容 color / lipstick_features.color）
    if (filterColor) {
      const colorVal = (item) => item?.color ?? item?.lipstick_features?.color ?? ''
      result = result.filter(item => colorVal(item) === filterColor)
    }

    // 场景筛选（确保为数组再调用 includes）
    if (filterScene) {
      result = result.filter(item =>
        Array.isArray(item?.scene) && item.scene.includes(filterScene)
      )
    }

    setFilteredData(result)
  }, [searchText, filterStyle, filterColor, filterScene, dataList])

  // 重置筛选
  const handleReset = () => {
    setSearchText('')
    setFilterStyle(null)
    setFilterColor(null)
    setFilterScene(null)
    message.success('已重置筛选条件')
  }

  // 查看详情
  const handleViewDetail = (record) => {
    setCurrentRecord(record)
    setDetailModalVisible(true)
  }

  // 安全转为字符串（支持数字、数组、对象等，避免 value.includes is not a function）
  const safeStr = (v) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.join(', ')
    return String(v)
  }

  // 导出Excel
  const handleExportExcel = () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        message.warning('暂无数据可导出')
        return
      }
      // 准备导出数据（确保所有字段为字符串，避免 .includes 报错；兼容 style/makeup_style、color/lipstick_features）
      const exportData = filteredData.map((item, index) => {
        const comments = item.comments || []
        const commentsText = Array.isArray(comments)
          ? comments.map(c => c?.content || c?.comment_content || '').filter(Boolean).join(' | ')
          : ''
        return {
          '序号': index + 1,
          '笔记标题': safeStr(item.title),
          '妆容风格': safeStr(item.style ?? item.makeup_style),
          '口红色调': safeStr(item.color ?? item?.lipstick_features?.color),
          '关键词': safeStr(item.keywords),
          '使用场景': safeStr(item.scene),
          '高赞评论': commentsText,
          '笔记内容': safeStr(item.content ?? item.desc).substring(0, 200)
        }
      })

      // 转换为CSV格式
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => {
          const value = safeStr(row[header])
          // 如果包含逗号、换行或引号，需要用引号包裹并转义
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(','))
      ].join('\n')

      // 添加BOM以支持中文
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `笔记数据_${new Date().toLocaleDateString('zh-CN')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      message.success(`成功导出 ${filteredData.length} 条数据`)
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败，请重试')
    }
  }

  const columns = [
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>笔记标题</span>,
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (text) => (
        <span style={{ fontSize: '14px', fontWeight: '500', color: text ? '#2d3436' : '#95a5a6' }}>
          {text || '（无标题）'}
        </span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>妆容风格</span>,
      dataIndex: 'style',
      key: 'style',
      render: (styles) => (
        <>
          {styles && styles.length > 0 ? (
            styles.map((style) => (
              <Tag
                color="#ff6b9d"
                key={style}
                style={{
                  borderRadius: '12px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {style}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#95a5a6', fontSize: '13px' }}>未识别</span>
          )}
        </>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>口红色调</span>,
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        color && color !== '未知' ? (
          <Tag
            color="magenta"
            style={{
              borderRadius: '12px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {color}
          </Tag>
        ) : (
          <span style={{ color: '#95a5a6', fontSize: '13px' }}>未识别</span>
        )
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>关键词</span>,
      dataIndex: 'keywords',
      key: 'keywords',
      render: (keywords) => (
        <>
          {keywords && keywords.length > 0 ? (
            keywords.map((keyword) => (
              <Tag
                key={keyword}
                style={{
                  borderRadius: '12px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: '#f0f2f5',
                  color: '#636e72',
                  border: 'none'
                }}
              >
                {keyword}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#95a5a6', fontSize: '13px' }}>未提取</span>
          )}
        </>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>使用场景</span>,
      dataIndex: 'scene',
      key: 'scene',
      render: (scenes) => (
        <>
          {scenes && scenes.length > 0 ? (
            scenes.map((scene) => (
              <Tag
                key={scene}
                color="blue"
                style={{
                  borderRadius: '12px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {scene}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#95a5a6', fontSize: '13px' }}>未识别</span>
          )}
        </>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>高赞评论</span>,
      dataIndex: 'comments',
      key: 'comments',
      width: '22%',
      render: (comments) => {
        if (!comments || !Array.isArray(comments) || comments.length === 0) {
          return <span style={{ color: '#95a5a6', fontSize: '13px' }}>暂无</span>
        }
        const first = comments[0]
        const text = first?.content || first?.comment_content || ''
        const preview = text.length > 25 ? text.slice(0, 25) + '...' : text
        return (
          <span style={{ fontSize: '13px', color: '#636e72' }} title={text}>
            {preview || '（空）'}
            {comments.length > 1 && (
              <span style={{ color: '#95a5a6', marginLeft: 4 }}>等{comments.length}条</span>
            )}
          </span>
        )
      }
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>操作</span>,
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            style={{ fontWeight: '500' }}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
        </Space>
      )
    }
  ]

  // 加载中显示
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '200px 0' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#ff6b9d' }} />} />
        <p style={{ marginTop: 24, fontSize: 18, color: '#636e72' }}>正在加载分析数据...</p>
      </div>
    )
  }

  return (
    <div>
      {/* 顶部标题栏 */}
      <div
        style={{
          marginBottom: 20,
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)'
        }}
      >
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: 24 }}>原始数据列表</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0 0', fontSize: 14 }}>
            与当前报告为同一次分析 · 共 {total} 条笔记，当前显示 {filteredData.length} 条
          </p>
        </div>
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ background: 'white', color: '#2d3436', fontWeight: '600' }}
          >
            返回工作台
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate('/report')}
            style={{ background: 'white', color: '#2d3436', fontWeight: '600' }}
          >
            查看报告
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
            style={{ background: 'white', color: '#2d3436', fontWeight: '600' }}
          >
            刷新
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            style={{ background: 'white', color: '#ff6b9d', borderColor: 'white', fontWeight: 'bold' }}
            disabled={filteredData.length === 0}
          >
            导出Excel
          </Button>
        </Space>
      </div>

      {/* 筛选和搜索区域 */}
      <Card
        style={{
          marginBottom: 20,
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Input
              placeholder="搜索笔记标题"
              prefix={<SearchOutlined style={{ color: '#95a5a6' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ fontSize: '14px' }}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="筛选妆容风格（来自本次分析）"
              value={filterStyle}
              onChange={setFilterStyle}
              allowClear
              style={{ width: '100%', fontSize: '14px' }}
              suffixIcon={<FilterOutlined />}
              options={filterOptions.styles.map(v => ({ label: v, value: v }))}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="筛选口红色调（来自本次分析）"
              value={filterColor}
              onChange={setFilterColor}
              allowClear
              style={{ width: '100%', fontSize: '14px' }}
              suffixIcon={<FilterOutlined />}
              options={filterOptions.colors.map(v => ({ label: v, value: v }))}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="筛选使用场景（来自本次分析）"
              value={filterScene}
              onChange={setFilterScene}
              allowClear
              style={{ width: '100%', fontSize: '14px' }}
              suffixIcon={<FilterOutlined />}
              options={filterOptions.scenes.map(v => ({ label: v, value: v }))}
            />
          </Col>
        </Row>
        {(searchText || filterStyle || filterColor || filterScene) && (
          <div style={{ marginTop: 16 }}>
            <Button type="link" onClick={handleReset} style={{ padding: 0, fontSize: '13px' }}>
              重置所有筛选条件
            </Button>
          </div>
        )}
      </Card>

      {dataList.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '100px 32px',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24, color: '#ff6b9d' }}>📊</div>
          <p style={{ fontSize: 24, color: '#2d3436', fontWeight: '600', marginBottom: 12 }}>
            暂无分析数据
          </p>
          <p style={{ fontSize: 16, color: '#636e72' }}>
            请先在"分析工作台"运行分析，然后再查看数据列表
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
        }}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey={(record) => record.note_id || record.id || Math.random()}
            pagination={{
              total: filteredData.length,
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => (
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#636e72' }}>
                  共 {total} 条数据
                </span>
              ),
              style: { marginTop: 24 }
            }}
            rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : ''}
          />
        </div>
      )}

      {/* 详情弹窗 */}
      <Modal
        title={
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#2d3436' }}>
            笔记详情
          </span>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {currentRecord && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="笔记标题">
                <span style={{ fontSize: '15px', fontWeight: '500' }}>{currentRecord.title}</span>
              </Descriptions.Item>
              <Descriptions.Item label="笔记内容">
                <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#636e72', whiteSpace: 'pre-wrap' }}>
                  {currentRecord.content || '无内容'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="妆容风格">
                {currentRecord.style && currentRecord.style.length > 0 ? (
                  currentRecord.style.map((style) => (
                    <Tag
                      color="#ff6b9d"
                      key={style}
                      style={{
                        borderRadius: '12px',
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}
                    >
                      {style}
                    </Tag>
                  ))
                ) : (
                  <span style={{ color: '#95a5a6' }}>未识别</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="口红色调">
                {currentRecord.color && currentRecord.color !== '未知' ? (
                  <Tag
                    color="magenta"
                    style={{
                      borderRadius: '12px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    {currentRecord.color}
                  </Tag>
                ) : (
                  <span style={{ color: '#95a5a6' }}>未识别</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="关键词">
                {currentRecord.keywords && currentRecord.keywords.length > 0 ? (
                  currentRecord.keywords.map((keyword) => (
                    <Tag
                      key={keyword}
                      style={{
                        borderRadius: '12px',
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        background: '#f0f2f5',
                        color: '#636e72',
                        border: 'none',
                        marginBottom: '4px'
                      }}
                    >
                      {keyword}
                    </Tag>
                  ))
                ) : (
                  <span style={{ color: '#95a5a6' }}>未提取</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="使用场景">
                {currentRecord.scene && currentRecord.scene.length > 0 ? (
                  currentRecord.scene.map((scene) => (
                    <Tag
                      key={scene}
                      color="blue"
                      style={{
                        borderRadius: '12px',
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}
                    >
                      {scene}
                    </Tag>
                  ))
                ) : (
                  <span style={{ color: '#95a5a6' }}>未识别</span>
                )}
              </Descriptions.Item>
              {currentRecord.note_url && (
                <Descriptions.Item label="原始链接">
                  <a href={currentRecord.note_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b9d' }}>
                    查看原文
                  </a>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 高赞评论（如果有） */}
            {currentRecord.comments && currentRecord.comments.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436', marginBottom: 12 }}>
                  高赞评论
                </h4>
                {currentRecord.comments.map((comment, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{
                      marginBottom: 12,
                      borderRadius: '8px',
                      background: '#f8f9fa'
                    }}
                  >
                    <p style={{ fontSize: '14px', color: '#636e72', marginBottom: 8 }}>
                      {comment.content || comment.comment_content}
                    </p>
                    <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                      👍 {comment.likes || comment.like_count || 0} 赞
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DataTable
