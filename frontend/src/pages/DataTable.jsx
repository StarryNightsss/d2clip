import { Table, Tag, Space, Button, Spin, message, Input, Select, Card, Row, Col, Modal, Descriptions, Dropdown, Segmented } from 'antd'
import { EyeOutlined, DownloadOutlined, LoadingOutlined, ReloadOutlined, SearchOutlined, FilterOutlined, ArrowLeftOutlined, FileTextOutlined, HistoryOutlined, DatabaseOutlined, RobotOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dataAPI, agentAPI } from '../services/api'

const DataTable = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session_id')

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
  const [availableFiles, setAvailableFiles] = useState([]) // 可用的历史数据文件
  const [selectedFile, setSelectedFile] = useState(null) // 当前选中的文件
  const [agentSessions, setAgentSessions] = useState([]) // Agent 会话列表
  const [selectedSession, setSelectedSession] = useState(null) // 当前选中的 Agent 会话
  const [activeTab, setActiveTab] = useState(sessionIdFromUrl ? 'agent' : 'raw') // 当前标签页
  
  // 使用 ref 防止重复加载
  const isLoadingAgentData = useRef(false)
  const lastLoadedFilePath = useRef(null)

  // 加载可用的数据文件列表
  const loadAvailableFiles = async () => {
    try {
      const response = await dataAPI.getFiles()
      if (response.files && response.files.length > 0) {
        setAvailableFiles(response.files)
        return response.files
      }
      return []
    } catch (error) {
      console.error('加载文件列表失败:', error)
      return []
    }
  }

  // 加载 Agent 会话列表
  // filePath: 可选，只加载与特定数据文件关联的会话
  const loadAgentSessions = async (filePath = null) => {
    try {
      const response = await agentAPI.getSessions(20, filePath)
      const sessions = response.sessions || []
      setAgentSessions(sessions)
      return sessions
    } catch (error) {
      console.error('加载 Agent 会话失败:', error)
      return []
    }
  }

  // 加载 Agent 会话的分析数据
  const loadAgentSessionData = async (sessionId) => {
    try {
      setLoading(true)
      const response = await agentAPI.getSessionData(sessionId)
      console.log('[DataTable] 加载的原始数据:', response.results?.[0])
      if (response.results && response.results.length > 0) {
        // 直接使用分析后的数据
        const formattedData = response.results.map((item, index) => ({
          note_id: item.note_id || `note_${index}`,
          title: item.title || '无标题',
          content: item.content || '',
          style: item.makeup_style || item.style || [],
          color: item.lipstick_features?.color || item.color || '未知',
          scene: item.scene || [],
          keywords: item.keywords || [],
          likes: item.likes || 0,
          // comments 可能是数组（评论列表）或数字（评论数）
          comments: Array.isArray(item.comments) ? item.comments : [],
          comments_count: item.comments_count || (typeof item.comments === 'number' ? item.comments : 0),
          author: item.author || '未知',
          publish_time: item.publish_time || '',
          url: item.url || '',
          raw: item
        }))
        setDataList(formattedData)
        setFilteredData(formattedData)
        setTotal(formattedData.length)
      } else {
        message.warning('该会话暂无分析数据')
        setDataList([])
        setFilteredData([])
        setTotal(0)
      }
    } catch (error) {
      console.error('加载 Agent 会话数据失败:', error)
      message.error('加载分析数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载原始数据文件（未分析的数据）
  const loadRawData = async (filePath = null) => {
    try {
      setLoading(true)

      // 如果没有指定文件，先加载文件列表，然后使用最新的 contents 文件（笔记内容）
      if (!filePath) {
        const files = await loadAvailableFiles()
        // 筛选 contents 文件（笔记内容），排除 comments 文件
        const contentsFiles = files.filter(f => 
          f.path && (f.path.includes('contents') || f.path.includes('content')) && !f.path.includes('comment')
        )
        if (contentsFiles.length > 0) {
          const latestFile = contentsFiles.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
          )[0]
          filePath = latestFile.path
          setSelectedFile(latestFile)
        } else if (files.length > 0) {
          // 如果没有 contents 文件，使用最新的任意文件
          const latestFile = files.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
          )[0]
          filePath = latestFile.path
          setSelectedFile(latestFile)
        }
      } else {
        const file = availableFiles.find(f => f.path === filePath)
        if (file) setSelectedFile(file)
      }

      if (filePath) {
        try {
          const fileData = await dataAPI.previewFile(filePath, 100)
          if (fileData && fileData.content) {
            const rawData = Array.isArray(fileData.content) ? fileData.content : [fileData.content]
            const formattedData = rawData.map((item, index) => ({
              note_id: item.note_id || `note_${index}`,
              title: item.title || item.content?.slice(0, 50) || '无标题',
              content: item.content || '',
              style: item.makeup_style || item.style || [],
              color: item.lipstick_color || item.color || '未知',
              scene: item.scene || [],
              keywords: item.keywords || [],
              // 将字符串数字转换为数字（爬虫数据中的数字可能是字符串）
              likes: parseInt(item.likes || item.liked_count || 0, 10) || 0,
              // comments 字段可能是数组（评论列表）或数字/字符串（评论数）
              comments: parseInt(item.comment_count || item.comments_count || item.comments || 0, 10) || 0,
              // 同时保存原始评论列表供详情显示
              comments_list: Array.isArray(item.comments) ? item.comments : [],
              author: item.author || item.nickname || '未知',
              publish_time: item.publish_time || item.create_time || '',
              url: item.url || item.note_url || '',
              raw: item
            }))
            setDataList(formattedData)
            setFilteredData(formattedData)
            setTotal(formattedData.length)
          } else {
            message.warning('数据文件为空')
            setDataList([])
            setFilteredData([])
            setTotal(0)
          }
        } catch (err) {
          console.error('加载文件失败:', err)
          message.error('加载数据文件失败')
          setDataList([])
          setFilteredData([])
          setTotal(0)
        }
      } else {
        message.warning('请先选择数据文件')
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

  // 初始加载：根据 URL 参数或默认加载
  useEffect(() => {
    if (sessionIdFromUrl) {
      // URL 中有 session_id，加载 Agent 会话数据
      loadAgentSessionData(sessionIdFromUrl)
      setActiveTab('agent')
    } else {
      // 默认加载原始数据
      loadRawData()
    }
  }, [sessionIdFromUrl])

  // 当 selectedFile 变化且当前在 AI 分析结果标签页时，重新加载数据
  useEffect(() => {
    if (activeTab === 'agent' && selectedFile?.path) {
      // 防止重复加载
      if (isLoadingAgentData.current || lastLoadedFilePath.current === selectedFile.path) {
        return
      }
      
      (async () => {
        isLoadingAgentData.current = true
        try {
          lastLoadedFilePath.current = selectedFile.path
          const sessions = await loadAgentSessions(selectedFile.path)
          if (sessions.length > 0) {
            const latestSession = sessions[0]
            setSelectedSession(latestSession)
            await loadAgentSessionData(latestSession.id)
          } else {
            setDataList([])
            setFilteredData([])
            setTotal(0)
            setSelectedSession(null)
            setLoading(false)
          }
        } finally {
          isLoadingAgentData.current = false
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile?.path])

  // 标签页切换时加载对应数据
  useEffect(() => {
    // 只在 activeTab 或 sessionIdFromUrl 变化时触发，避免 selectedFile 变化导致的循环
    if (activeTab === 'agent') {
      // 防止重复加载
      if (isLoadingAgentData.current) {
        return
      }
      
      // 进入 AI 分析结果视图时：
      // 1）如果当前选中了数据文件，查找与该文件关联的会话
      // 2）如果找到关联会话，自动加载该会话的分析结果
      // 3）如果 URL 指定了会话，优先加载 URL 指定的会话
      (async () => {
        isLoadingAgentData.current = true
        
        try {
          if (sessionIdFromUrl) {
            // URL 已经指定了会话，加载该会话的数据
            await loadAgentSessionData(sessionIdFromUrl)
            return
          }
          
          // 如果当前选中了数据文件，查找关联的会话
          if (selectedFile && selectedFile.path) {
            // 检查是否已经加载过该文件的数据
            if (lastLoadedFilePath.current === selectedFile.path) {
              return
            }
            lastLoadedFilePath.current = selectedFile.path
            
            const sessions = await loadAgentSessions(selectedFile.path)
            if (sessions.length > 0) {
              // 找到关联的会话，自动选择最新的一个
              const latestSession = sessions[0] // 已经按时间倒序排列
              setSelectedSession(latestSession)
              await loadAgentSessionData(latestSession.id)
            } else {
              // 没有找到关联的会话，清空数据并提示
              setDataList([])
              setFilteredData([])
              setTotal(0)
              setSelectedSession(null)
              setLoading(false)
            }
          } else {
            // 没有选中数据文件，加载所有会话（供用户手动选择）
            await loadAgentSessions()
            if (selectedSession) {
              await loadAgentSessionData(selectedSession.id)
            } else {
              setLoading(false)
            }
          }
        } finally {
          isLoadingAgentData.current = false
        }
      })()
    } else {
      // 切换到原始数据标签页时，重置加载标志
      lastLoadedFilePath.current = null
      loadRawData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sessionIdFromUrl])

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

  const columns = activeTab === 'agent' ? [
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>笔记标题</span>,
      dataIndex: 'title',
      key: 'title',
      width: '25%',
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
      render: (style) => (
        <div>
          {style && Array.isArray(style) && style.length > 0 ? (
            style.map(s => <Tag key={s} color="#ff6b9d" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 13, marginBottom: 4 }}>{s}</Tag>)
          ) : <span style={{ color: '#95a5a6' }}>未分析</span>}
        </div>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>口红色调</span>,
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        color && color !== '未知'
          ? <Tag color="magenta" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>{color}</Tag>
          : <span style={{ color: '#95a5a6' }}>未分析</span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>关键词</span>,
      dataIndex: 'keywords',
      key: 'keywords',
      render: (keywords) => (
        <div>
          {keywords && Array.isArray(keywords) && keywords.length > 0
            ? keywords.slice(0, 3).map(k => <Tag key={k} style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, background: '#f0f2f5', color: '#636e72', border: 'none', marginBottom: 4 }}>{k}</Tag>)
            : <span style={{ color: '#95a5a6' }}>未分析</span>}
        </div>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>使用场景</span>,
      dataIndex: 'scene',
      key: 'scene',
      render: (scene) => (
        <div>
          {scene && Array.isArray(scene) && scene.length > 0
            ? scene.map(s => <Tag key={s} color="blue" style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, marginBottom: 4 }}>{s}</Tag>)
            : <span style={{ color: '#95a5a6' }}>未分析</span>}
        </div>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>高赞评论</span>,
      dataIndex: 'comments',
      key: 'comments',
      render: (comments, record) => {
        // comments 可能是数组（评论列表）或数字（评论数）
        const commentsList = Array.isArray(comments) ? comments : (record.raw?.comments || [])
        if (commentsList.length > 0) {
          const first = commentsList[0]
          const text = first?.content || first?.comment_content || first?.text || ''
          return (
            <div style={{ fontSize: 13, color: '#636e72' }}>
              <span>{text.slice(0, 20)}{text.length > 20 ? '...' : ''}</span>
              {commentsList.length > 1 && <span style={{ color: '#95a5a6', marginLeft: 4 }}>等{commentsList.length}条</span>}
            </div>
          )
        }
        // 如果没有评论列表，显示评论数
        const count = record.comments_count || (typeof comments === 'number' ? comments : 0)
        return count > 0 ? <span style={{ color: '#95a5a6' }}>{count}条评论</span> : <span style={{ color: '#95a5a6' }}>-</span>
      }
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>操作</span>,
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} style={{ fontWeight: '500' }} onClick={() => handleViewDetail(record)}>查看</Button>
      )
    }
  ] : [
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
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>作者</span>,
      dataIndex: 'author',
      key: 'author',
      render: (author) => (
        <span style={{ fontSize: '14px', color: '#636e72' }}>
          {author || '未知'}
        </span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>点赞</span>,
      dataIndex: 'likes',
      key: 'likes',
      width: 80,
      render: (likes) => (
        <span style={{ fontSize: '14px', color: '#ff6b9d', fontWeight: '500' }}>
          {likes || 0}
        </span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>评论</span>,
      dataIndex: 'comments',
      key: 'comments',
      width: 80,
      render: (comments, record) => {
        // 优先使用已处理的 comments 数字字段
        // 如果没有，尝试从 raw 数据中获取 comment_count
        const count = typeof comments === 'number' ? comments : 
                     (record.raw?.comment_count || 
                      (Array.isArray(record.raw?.comments) ? record.raw.comments.length : 0))
        return (
          <span style={{ fontSize: '14px', color: '#636e72' }}>
            {count || 0}
          </span>
        )
      }
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>发布时间</span>,
      dataIndex: 'publish_time',
      key: 'publish_time',
      render: (time) => (
        <span style={{ fontSize: '13px', color: '#95a5a6' }}>
          {time ? new Date(time).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      title: <span style={{ fontWeight: '600', fontSize: '15px' }}>操作</span>,
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} style={{ fontWeight: '500' }} onClick={() => handleViewDetail(record)}>查看</Button>
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
    <div className="page-wrap">
      <header className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">数据采集列表</h1>
          <p className="page-subtitle">
            {activeTab === 'agent'
              ? selectedSession
                ? `当前会话：${selectedSession.title || selectedSession.id} · 共 ${total} 条笔记（AI分析结果）`
                : `共 ${total} 条笔记（AI分析结果）`
              : selectedFile
                ? (() => {
                    const fileName = selectedFile.name || selectedFile.path.split('/').pop()
                    const displayName = fileName.replace('search_contents_', '').replace('.json', '')
                    return `当前数据：${displayName} · 共 ${total} 条笔记（原始数据，未经AI分析）`
                  })()
                : `共 ${total} 条笔记（原始数据，未经AI分析）`
            }
          </p>
        </div>
        <Space size="middle">
          {/* 数据视图切换：Raw / Agent */}
          <Segmented
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            options={[
              { label: '原始数据', value: 'raw', icon: <DatabaseOutlined /> },
              { label: 'AI分析结果', value: 'agent', icon: <RobotOutlined /> },
            ]}
            style={{ fontWeight: 600 }}
          />
          {/* 数据文件选择器（仅 raw 模式） */}
          {activeTab === 'raw' && (
          <Select
            placeholder="选择数据文件"
            style={{ width: 220 }}
            value={selectedFile?.path}
            onChange={(value) => loadRawData(value)}
            loading={loading}
            suffixIcon={<DatabaseOutlined />}
          >
            {availableFiles
              .filter(file => file.path && (file.path.includes('contents') || file.path.includes('content')) && !file.path.includes('comment'))
              .map(file => {
                // 提取文件名中的日期时间部分，去掉 search_contents_ 前缀
                const fileName = file.name || file.path.split('/').pop()
                const displayName = fileName.replace('search_contents_', '').replace('.json', '')
                // 安全处理日期显示
                let dateStr = ''
                if (file.created_at) {
                  try {
                    const date = new Date(file.created_at)
                    if (!isNaN(date.getTime())) {
                      dateStr = date.toLocaleDateString()
                    }
                  } catch (e) {
                    dateStr = ''
                  }
                }
                return (
                  <Select.Option key={file.path} value={file.path}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{displayName}</span>
                      {dateStr && (
                        <span style={{ fontSize: '12px', color: '#999', marginLeft: 8 }}>
                          {dateStr}
                        </span>
                      )}
                    </div>
                  </Select.Option>
                )
              })}
          </Select>
          )}
          {/* Agent 会话选择器（仅 agent 模式） */}
          {activeTab === 'agent' && (
          <Select
            placeholder="选择分析会话"
            style={{ width: 220 }}
            value={selectedSession?.id}
            onChange={(value) => {
              const session = agentSessions.find(s => s.id === value)
              setSelectedSession(session || null)
            }}
            loading={loading}
            suffixIcon={<RobotOutlined />}
          >
            {agentSessions.map(session => (
              <Select.Option key={session.id} value={session.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {session.title || session.id}
                  </span>
                  <span style={{ fontSize: '12px', color: '#999', marginLeft: 8, flexShrink: 0 }}>
                    {session.created_at ? new Date(session.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </Select.Option>
            ))}
          </Select>
          )}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{
              background: 'white',
              color: '#2d3436',
              borderColor: '#dfe6e9',
              fontWeight: '600',
              height: '40px',
              padding: '0 24px',
              fontSize: '15px'
            }}
          >
            返回工作台
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate('/report')}
            style={{
              background: 'white',
              color: '#2d3436',
              borderColor: '#dfe6e9',
              fontWeight: '600',
              height: '40px',
              padding: '0 24px',
              fontSize: '15px'
            }}
          >
            查看报告
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadRawData()}
            loading={loading}
            style={{
              background: 'white',
              color: '#2d3436',
              borderColor: '#dfe6e9',
              fontWeight: '600',
              height: '40px',
              padding: '0 24px',
              fontSize: '15px'
            }}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            style={{
              background: '#ff6b9d',
              color: 'white',
              borderColor: '#ff6b9d',
              fontWeight: '600',
              height: '40px',
              padding: '0 24px',
              fontSize: '15px'
            }}
            disabled={filteredData.length === 0}
          >
            导出Excel
          </Button>
        </Space>
      </header>

      {/* 筛选和搜索区域 */}
      <Card
        className="card-hover page-module animate-slide-up"
        style={{
          marginBottom: 20,
          borderRadius: '20px'
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
        <div className="card-hover page-module animate-slide-up" style={{
          padding: '100px 32px',
          borderRadius: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24, color: '#ff6b9d' }}>📊</div>
          <p style={{ fontSize: 24, color: '#2d3436', fontWeight: '600', marginBottom: 12 }}>
            {activeTab === 'agent' && !selectedSession 
              ? (selectedFile 
                ? `数据文件 "${(selectedFile.name || selectedFile.path.split('/').pop()).replace('search_contents_', '').replace('.json', '')}" 尚未进行AI分析` 
                : '请选择分析会话')
              : '暂无分析数据'}
          </p>
          <p style={{ fontSize: 16, color: '#636e72' }}>
            {activeTab === 'agent' && !selectedSession 
              ? (selectedFile 
                ? '该数据文件还没有进行AI分析。请前往"分析工作台"运行分析，或从上方下拉框选择其他已分析的会话。'
                : '请从上方下拉框选择一个历史分析会话，或前往"分析工作台"进行新的分析')
              : '请先在"分析工作台"运行分析，然后再查看数据列表'}
          </p>
        </div>
      ) : (
        <div className="card-hover page-module animate-slide-up" style={{
          padding: '32px',
          borderRadius: '20px'
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
                  {currentRecord.content || currentRecord.raw?.desc || '无内容'}
                </div>
              </Descriptions.Item>

              {/* agent tab 显示 LLM 分析字段 */}
              {activeTab === 'agent' && (<>
                <Descriptions.Item label="妆容风格">
                  {currentRecord.style && currentRecord.style.length > 0 ? (
                    currentRecord.style.map((style) => (
                      <Tag color="#ff6b9d" key={style} style={{ borderRadius: '12px', padding: '4px 12px', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{style}</Tag>
                    ))
                  ) : <span style={{ color: '#95a5a6' }}>未分析</span>}
                </Descriptions.Item>
                <Descriptions.Item label="口红色调">
                  {currentRecord.color && currentRecord.color !== '未知' ? (
                    <Tag color="magenta" style={{ borderRadius: '12px', padding: '4px 12px', fontSize: '13px', fontWeight: '500' }}>{currentRecord.color}</Tag>
                  ) : <span style={{ color: '#95a5a6' }}>未分析</span>}
                </Descriptions.Item>
                <Descriptions.Item label="关键词">
                  {currentRecord.keywords && currentRecord.keywords.length > 0 ? (
                    currentRecord.keywords.map((keyword) => (
                      <Tag key={keyword} style={{ borderRadius: '12px', padding: '4px 12px', fontSize: '13px', fontWeight: '500', background: '#f0f2f5', color: '#636e72', border: 'none', marginBottom: '4px' }}>{keyword}</Tag>
                    ))
                  ) : <span style={{ color: '#95a5a6' }}>未分析</span>}
                </Descriptions.Item>
                <Descriptions.Item label="使用场景">
                  {currentRecord.scene && currentRecord.scene.length > 0 ? (
                    currentRecord.scene.map((scene) => (
                      <Tag key={scene} color="blue" style={{ borderRadius: '12px', padding: '4px 12px', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>{scene}</Tag>
                    ))
                  ) : <span style={{ color: '#95a5a6' }}>未分析</span>}
                </Descriptions.Item>
              </>)}

              {/* raw tab 显示原始字段 */}
              {activeTab !== 'agent' && (<>
                <Descriptions.Item label="作者">{currentRecord.author || '未知'}</Descriptions.Item>
                <Descriptions.Item label="点赞数">
                  <span style={{ color: '#ff6b9d', fontWeight: '500' }}>{currentRecord.likes || 0}</span>
                </Descriptions.Item>
                <Descriptions.Item label="评论数">
                  {currentRecord.comments || parseInt(currentRecord.raw?.comment_count || 0, 10) || 0}
                </Descriptions.Item>
                <Descriptions.Item label="收藏数">
                  {currentRecord.raw?.collected_count || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="发布时间">
                  {currentRecord.publish_time ? new Date(currentRecord.publish_time).toLocaleString() : '-'}
                </Descriptions.Item>
                {currentRecord.raw?.tag_list && currentRecord.raw.tag_list.length > 0 && (
                  <Descriptions.Item label="标签">
                    {currentRecord.raw.tag_list.map(t => (
                      <Tag key={t.id || t.name} style={{ borderRadius: 12, marginBottom: 4 }}>{t.name || t}</Tag>
                    ))}
                  </Descriptions.Item>
                )}
              </>)}

              {currentRecord.url && (
                <Descriptions.Item label="原始链接">
                  <a href={currentRecord.url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b9d' }}>查看原文</a>
                </Descriptions.Item>
              )}
              {!currentRecord.url && currentRecord.raw?.note_url && (
                <Descriptions.Item label="原始链接">
                  <a href={currentRecord.raw.note_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff6b9d' }}>查看原文</a>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 高赞评论（agent 模式，且 comments 是数组） */}
            {activeTab === 'agent' && currentRecord.comments && Array.isArray(currentRecord.comments) && currentRecord.comments.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436', marginBottom: 12 }}>高赞评论</h4>
                {currentRecord.comments.map((comment, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 12, borderRadius: '8px', background: '#f8f9fa' }}>
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
