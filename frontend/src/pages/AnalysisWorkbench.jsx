import { Card, Form, Input, Select, Button, Space, Alert, Row, Col, Divider, message, Table, Tag, Progress, Carousel } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, RocketOutlined, DatabaseOutlined, HistoryOutlined, ThunderboltOutlined, EyeOutlined, ReloadOutlined, DeleteOutlined, StopOutlined, MobileOutlined, SearchOutlined, CommentOutlined, LoginOutlined, FileTextOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crawlerAPI, dataAPI, agentAPI } from '../services/api'
import CrawlerTerminal from '../components/CrawlerTerminal'
import VtoDemoPanel from '../components/VtoDemoPanel'

const { TextArea } = Input

const AnalysisWorkbench = () => {
  const navigate = useNavigate()
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState('idle') // idle | analyzing | completed
  const [form] = Form.useForm()
  const [crawlerStatus, setCrawlerStatus] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [mockProgress, setMockProgress] = useState(0)  // Mock 进度
  const [progressInterval, setProgressInterval] = useState(null)  // Mock 进度定时器
  const [pollingInterval, setPollingInterval] = useState(null)  // 状态轮询定时器
  const [completedStats, setCompletedStats] = useState(null)  // 完成后的统计数据
  const [logs, setLogs] = useState([])  // 保留兼容（CrawlerTerminal 现独立轮询）

  // 检查爬虫状态（仅在组件加载时检查一次）
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const statusData = await crawlerAPI.getStatus()
        setCrawlerStatus(statusData)

        // 如果检测到爬虫正在运行，恢复状态并开始轮询
        if (statusData.status === 'running') {
          setAnalyzing(true)
          setStatus('analyzing')
          startMockProgress()  // 启动进度条动画
          startProgressPolling()  // 开始轮询
        }
      } catch (error) {
        console.error('获取爬虫状态失败:', error)
      }
    }

    checkInitialStatus()

    // 组件卸载时清理所有定时器
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [])

  // 加载 Agent 历史会话
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const response = await agentAPI.getSessions(10)
      setHistoryData(response.sessions || [])
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 启动 Mock 进度条动画
  const startMockProgress = () => {
    setMockProgress(0)

    const interval = setInterval(() => {
      setMockProgress(prev => {
        // 进度增长策略：越接近 100% 增长越慢
        if (prev < 30) {
          return prev + Math.random() * 5  // 0-30%: 快速增长
        } else if (prev < 60) {
          return prev + Math.random() * 3  // 30-60%: 中速增长
        } else if (prev < 85) {
          return prev + Math.random() * 2  // 60-85%: 慢速增长
        } else if (prev < 95) {
          return prev + Math.random() * 0.5  // 85-95%: 很慢
        } else {
          return prev  // 95% 后停止，等真实完成
        }
      })
    }, 1500)  // 每 1.5 秒增长一次

    setProgressInterval(interval)
  }

  // 停止 Mock 进度条
  const stopMockProgress = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      setProgressInterval(null)
    }
  }

  // 轮询爬虫状态（用于检测爬虫是否完成）
  const startProgressPolling = () => {
    // 先清除之前的轮询（防止重复启动）
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    console.log('✅ 开始轮询爬虫状态（每2秒检查一次）')

    const interval = setInterval(async () => {
      try {
        // 同时获取状态和日志
        const statusData = await crawlerAPI.getStatus()

        console.log('📡 爬虫状态:', statusData.status)

        if (statusData.status === 'idle') {
          // 爬虫已完成
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()
          setMockProgress(100)
          setAnalyzing(false)
          setStatus('completed')
          message.success('数据采集完成！')

          // 使用爬虫返回的本次统计数据
          if (statusData.current_stats) {
            console.log('📊 本次数据统计:', statusData.current_stats)
            setCompletedStats(statusData.current_stats)
          }

          // 刷新历史记录
          loadHistory()
        } else if (statusData.status === 'stopped') {
          // 用户手动停止
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()
          setAnalyzing(false)
          setStatus('idle')
          setMockProgress(0)
          message.info('采集已停止')
          if (statusData.current_stats) setCompletedStats(statusData.current_stats)
          loadHistory()
        } else if (statusData.status === 'stopped') {
          // 用户手动停止
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()
          setAnalyzing(false)
          setStatus('idle')
          setMockProgress(0)
          message.info('采集已停止')
          if (statusData.current_stats) setCompletedStats(statusData.current_stats)
          loadHistory()
        } else if (statusData.status === 'error') {
          // 爬虫出错
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()  // 停止 Mock 进度
          setAnalyzing(false)
          setStatus('idle')
          setMockProgress(0)
          message.error('采集失败: ' + (statusData.error_message || '未知错误'))
        } else if (statusData.status === 'stopped') {
          // 用户手动停止
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()
          setAnalyzing(false)
          setStatus('idle')
          message.info('采集已停止')
          if (statusData.current_stats) setCompletedStats(statusData.current_stats)
          loadHistory()
        }
        // status === 'running' 时继续轮询
      } catch (error) {
        console.error('❌ 获取状态失败:', error)
        clearInterval(interval)
        setPollingInterval(null)
        stopMockProgress()
      }
    }, 2000)  // 每2秒检查一次

    setPollingInterval(interval)
  }

  const handleStart = async () => {
    try {
      // 先取当前表单值（防止 validateFields 遗漏某些字段）
      const fieldsValue = form.getFieldsValue()
      const values = await form.validateFields()

      // ⚠️ 只支持单平台，如果选了多个，提示用户
      if (values.platforms && values.platforms.length > 1) {
        message.warning('当前版本只支持单平台采集，将使用第一个平台：' + values.platforms[0])
      }

      setAnalyzing(true)
      setStatus('analyzing')
      setLogs([])  // 清空旧日志

      // 启动 Mock 进度条
      startMockProgress()

      // 处理关键词：优先用 values，其次用 fieldsValue，确保用户输入被正确传递
      const rawKeywords = (values.keywords ?? fieldsValue.keywords ?? '').toString().trim()
      const processedKeywords = rawKeywords
        ? rawKeywords.replace(/，/g, ',').trim()
        : '口红试色'

      // 构建爬虫参数（完全对应后端 CrawlerStartRequest）
      const crawlerParams = {
        platform: values.platforms[0] || 'xhs',
        login_type: values.loginType || 'cookie',
        crawler_type: values.crawlerType || 'search',
        keywords: processedKeywords,
        specified_ids: values.specifiedIds || '',
        creator_ids: values.creatorIds || '',
        start_page: parseInt(values.startPage) || 1,
        max_notes_count: values.dataCount || 100,  // 控制爬虫采集数量
        enable_comments: values.enableComments !== false,  // 默认 true
        enable_sub_comments: values.enableSubComments || false,  // 默认 false
        save_option: values.saveOption || 'json',
        cookies: values.cookies || '',
        headless: values.headless || false
      }

      console.log('🚀 启动爬虫，参数:', crawlerParams)
      console.log('📝 关键词:', processedKeywords)

      await crawlerAPI.start(crawlerParams)

      // 保存分析数量配置到 localStorage，供 TrendReport 使用
      localStorage.setItem('analysisLimit', JSON.stringify(values.dataCount || 10))

      message.success(`爬虫已启动，正在采集「${processedKeywords}」...`)

      // 启动状态轮询，等待爬虫完成
      startProgressPolling()

    } catch (error) {
      setAnalyzing(false)
      setStatus('idle')
      stopMockProgress()
      setMockProgress(0)
      if (error.message) {
        message.error('启动失败: ' + error.message)
      } else {
        message.error('请完善配置信息')
      }
    }
  }

  const handleStop = async () => {
    try {
      await crawlerAPI.stop()
      stopMockProgress()
      setMockProgress(0)
      setAnalyzing(false)
      setStatus('idle')
      setLogs([])  // 清空日志
      message.success('已停止数据采集')
    } catch (error) {
      message.error('停止失败: ' + error.message)
    }
  }

  // Start AI analysis - navigate to Agent interface with latest data file
  const startAIAnalysis = async () => {
    try {
      message.loading('正在获取最新数据文件...', 0)
      
      // Get the list of data files
      const filesResponse = await dataAPI.getFiles()
      const files = filesResponse.files || []
      
      // Filter for contents files only (not comments)
      const contentsFiles = files.filter(file => {
        const path = file.path || ''
        return path.includes('contents') && !path.includes('comments')
      })
      
      if (contentsFiles.length === 0) {
        message.destroy()
        message.error('没有找到数据文件，请先完成数据采集')
        return
      }
      
      // Sort by created_at descending to get the latest file
      const sortedFiles = contentsFiles.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })
      
      const latestFile = sortedFiles[0]
      message.destroy()
      
      // Navigate to Agent interface with the file path
      navigate(`/agent?file=${encodeURIComponent(latestFile.path)}`)
      
    } catch (error) {
      message.destroy()
      console.error('获取数据文件失败:', error)
      message.error('获取数据文件失败: ' + (error.message || '未知错误'))
    }
  }

  return (
    <div className="workbench-page-wrap">
      {/* 页面标题：与 else Workbench 一致，列在最上面 */}
      <header className="workbench-page-header">
        <div>
          <h1 className="workbench-page-title">分析工作台</h1>
          <p className="workbench-page-subtitle">配置数据采集参数，启动AI智能分析，生成专业趋势报告</p>
        </div>
      </header>

      <Form form={form} layout="vertical" size="large">
        {/* 上部四卡片：采集平台、爬虫类型、采集数据量、采集评论（模仿 else Workbench） */}
        <div className="workbench-stats-row animate-fade-in">
          <div className="workbench-stat-card">
            <div className="workbench-stat-icon"><MobileOutlined style={{ fontSize: 26 }} /></div>
            <div className="workbench-stat-body">
              <div className="workbench-stat-label">采集平台</div>
              <div className="workbench-stat-control">
                <Form.Item name="platforms" initialValue={['xhs']} rules={[{ required: true, message: '请选择平台' }]} noStyle>
                  <Select
                    placeholder="请选择"
                    style={{ fontSize: '14px' }}
                    options={[{ value: 'xhs', label: '📱 小红书' }]}
                  />
                </Form.Item>
              </div>
            </div>
            <span className="workbench-stat-deco" aria-hidden="true">📱</span>
          </div>
          <div className="workbench-stat-card">
            <div className="workbench-stat-icon"><SearchOutlined style={{ fontSize: 26 }} /></div>
            <div className="workbench-stat-body">
              <div className="workbench-stat-label">爬取类型</div>
              <div className="workbench-stat-control">
                <Form.Item name="crawlerType" initialValue="search" noStyle>
                  <Select
                    style={{ fontSize: '14px' }}
                    options={[{ value: 'search', label: '🔍 关键词搜索' }]}
                  />
                </Form.Item>
              </div>
            </div>
            <span className="workbench-stat-deco" aria-hidden="true">🔍</span>
          </div>
          <div className="workbench-stat-card">
            <div className="workbench-stat-icon"><LoginOutlined style={{ fontSize: 26 }} /></div>
            <div className="workbench-stat-body">
              <div className="workbench-stat-label">登录方式</div>
              <div className="workbench-stat-control">
                <Form.Item name="loginType" initialValue="cookie" noStyle>
                  <Select
                    style={{ fontSize: '14px' }}
                    options={[
                      { value: 'cookie', label: '🍪 Cookie 登录（推荐）' },
                      { value: 'qrcode', label: '📱 二维码扫码登录' },
                      { value: 'phone', label: '📞 手机号登录' }
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
            <span className="workbench-stat-deco" aria-hidden="true">🔐</span>
          </div>
          <div className="workbench-stat-card">
            <div className="workbench-stat-icon"><CommentOutlined style={{ fontSize: 26 }} /></div>
            <div className="workbench-stat-body">
              <div className="workbench-stat-label">采集评论</div>
              <div className="workbench-stat-control">
                <Form.Item name="enableComments" initialValue={true} noStyle>
                  <Select
                    style={{ fontSize: '14px' }}
                    options={[
                      { value: true, label: '✅ 采集评论' },
                      { value: false, label: '❌ 不采集' }
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
            <span className="workbench-stat-deco" aria-hidden="true">💬</span>
          </div>
        </div>

        {/* 左右布局：左侧 数据采集配置 + 轮播图，右侧 AI 智能分析，两列等高 */}
        <div className="workbench-config-row">
          <div className="workbench-config-left">
            <div className="workbench-config-left-inner">
            <Card
              className="card-hover workbench-content-card"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                marginBottom: 0,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
              bodyStyle={{ padding: '40px' }}
            >
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#2d3436',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <DatabaseOutlined style={{ marginRight: '12px', color: '#ff6b9d' }} />
                数据采集配置
              </div>
          <p style={{ fontSize: '15px', color: '#636e72', marginBottom: '32px' }}>
            选择数据来源平台、配置关键词和采集参数
          </p>

          <Form.Item
            name="keywords"
            label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>搜索关键词</span>}
            initialValue=""
            rules={[{ required: true, message: '请输入搜索关键词' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入搜索关键词，多个关键词用逗号分隔（支持中文逗号和英文逗号）"
              style={{ fontSize: '15px', lineHeight: '1.6' }}
            />
          </Form.Item>
          <div style={{ fontSize: '13px', color: '#95a5a6', marginTop: '-16px', marginBottom: '24px' }}>
            💡 默认使用1个关键词，如需多个请用逗号分隔（如：口红推荐，妆容推荐，平价口红）
          </div>

          <Form.Item
            name="dataCount"
            label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>采集数据量</span>}
            initialValue={10}
          >
            <Select
              style={{ fontSize: '15px' }}
              options={[
                { value: 10, label: '10 条' },
                { value: 25, label: '25 条' },
                { value: 50, label: '50 条' },
                { value: 100, label: '100 条（推荐）' }
              ]}
            />
          </Form.Item>
            </Card>

            {/* 左侧轮播图卡片：填满与右侧 AI 智能分析的高度差 */}
            <div className="workbench-left-carousel-wrap">
              <Card
                className="workbench-left-carousel-card"
                bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Carousel autoplay autoplaySpeed={4000} effect="fade" dotPosition="bottom" className="workbench-left-carousel">
                  <div className="workbench-carousel-slide workbench-carousel-slide-1">
                    <span className="workbench-carousel-title">数据驱动 · 趋势洞察</span>
                    <span className="workbench-carousel-desc">配置采集参数，一键启动智能分析</span>
                  </div>
                  <div className="workbench-carousel-slide workbench-carousel-slide-2">
                    <span className="workbench-carousel-title">小红书笔记分析</span>
                    <span className="workbench-carousel-desc">关键词搜索，采集笔记与评论</span>
                  </div>
                  <div className="workbench-carousel-slide workbench-carousel-slide-3">
                    <span className="workbench-carousel-title">AI 报告生成</span>
                    <span className="workbench-carousel-desc">妆容风格、口红色调、用户关键词提取</span>
                  </div>
                </Carousel>
              </Card>
            </div>
            </div>
          </div>

          <div className="workbench-config-right">
            <Card
              className="workbench-content-card"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                marginBottom: 0,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
              bodyStyle={{ padding: '40px' }}
            >
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#2d3436',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <RocketOutlined style={{ marginRight: '12px', color: '#ff6b9d' }} />
                AI 智能分析
              </div>
              <p style={{ fontSize: '15px', color: '#636e72', marginBottom: '32px' }}>
                使用大模型提取妆容风格、口红特征、用户关键词等信息
              </p>

              {/* idle状态：两个步骤上下排列，卡片风格 + hover 右移 */}
              {status === 'idle' && (
                <Row gutter={[24, 32]} className="workbench-ai-steps-row">
                  <Col span={24} className="workbench-ai-step-first">
                    <div className="workbench-ai-step-card" onClick={handleStart}>
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap">🕷️</div>
                        <div className="workbench-ai-step-title">步骤1：采集数据</div>
                        <div className="workbench-ai-step-desc">从社交平台爬取笔记和评论数据</div>
                        <Button
                          type="primary"
                          size="large"
                          icon={<PlayCircleOutlined />}
                          onClick={(e) => { e.stopPropagation(); handleStart(); }}
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                            border: 'none',
                            boxShadow: '0 8px 24px rgba(253, 203, 110, 0.4)'
                          }}
                        >
                          启动爬虫
                        </Button>
                      </div>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div className="workbench-ai-step-card workbench-ai-step-card--disabled">
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap">🤖</div>
                        <div className="workbench-ai-step-title">步骤2：AI分析</div>
                        <div className="workbench-ai-step-desc">使用AI分析刚刚采集的数据，生成报告（需先完成步骤1采集）</div>
                        <Button
                          type="primary"
                          size="large"
                          icon={<RocketOutlined />}
                          disabled
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)',
                            opacity: 0.6
                          }}
                        >
                          AI智能分析（请先完成采集）
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              {/* analyzing状态：上侧爬虫运行中，下侧AI分析不可点 */}
              {status === 'analyzing' && (
                <Row gutter={[24, 32]} className="workbench-ai-steps-row">
                  <Col span={24} className="workbench-ai-step-first">
                    <div className="workbench-ai-step-card">
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap">⚡</div>
                        <div className="workbench-ai-step-title">正在采集数据中...</div>
                        <div className="workbench-ai-step-desc">爬虫正在运行，请保持浏览器打开</div>
                        <div style={{
                          background: 'rgba(255,255,255,0.8)',
                          padding: '20px',
                          borderRadius: '12px',
                          marginBottom: '20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}>
                          <Progress
                            percent={Math.floor(mockProgress)}
                            status="active"
                            strokeColor={{ '0%': '#fdcb6e', '100%': '#e17055' }}
                            strokeWidth={10}
                          />
                          <p style={{ marginTop: '12px', fontSize: '13px', color: '#636e72' }}>
                            {mockProgress < 30 && '正在初始化爬虫...'}
                            {mockProgress >= 30 && mockProgress < 60 && '正在采集数据...'}
                            {mockProgress >= 60 && mockProgress < 85 && '数据采集中...'}
                            {mockProgress >= 85 && mockProgress < 95 && '正在整理数据...'}
                            {mockProgress >= 95 && '等待爬虫完成...'}
                          </p>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                          <CrawlerTerminal active={true} />
                        </div>
                        <Button
                          danger
                          size="large"
                          icon={<StopOutlined />}
                          onClick={handleStop}
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px'
                          }}
                        >
                          停止采集
                        </Button>
                      </div>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div className="workbench-ai-step-card workbench-ai-step-card--disabled">
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap">🤖</div>
                        <div className="workbench-ai-step-title">AI智能分析</div>
                        <div className="workbench-ai-step-desc">请等待采集完成后再分析，将使用本次刚采集的数据</div>
                        <Button
                          type="primary"
                          size="large"
                          icon={<RocketOutlined />}
                          disabled
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)',
                            opacity: 0.6
                          }}
                        >
                          请先完成采集
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              {/* completed状态：上侧爬虫完成，下侧AI分析可点击 */}
              {status === 'completed' && (
                <Row gutter={[24, 32]} className="workbench-ai-steps-row">
                  <Col span={24} className="workbench-ai-step-first">
                    <div className="workbench-ai-step-card workbench-ai-step-card--success">
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap" style={{ color: '#00b894', background: 'rgba(0, 184, 148, 0.12)' }}>
                          <CheckCircleOutlined style={{ fontSize: 22 }} />
                        </div>
                        <div className="workbench-ai-step-title">数据采集完成！</div>
                        <div className="workbench-ai-step-desc">
                          {completedStats ? (
                            <>共采集 {completedStats.total_notes || 0} 条笔记{completedStats.total_comments > 0 && `，${completedStats.total_comments} 条评论`}</>
                          ) : (
                            '数据已保存到本地'
                          )}
                        </div>
                        <Button
                          size="large"
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            setStatus('idle')
                            setAnalyzing(false)
                            setMockProgress(0)
                            setCompletedStats(null)
                            message.info('可以重新配置参数并开始新的采集')
                          }}
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px'
                          }}
                        >
                          重新采集
                        </Button>
                      </div>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div
                      className="workbench-ai-step-card workbench-ai-step-card--highlight"
                      onClick={() => startAIAnalysis()}
                    >
                      <div className="workbench-ai-step-card-inner">
                        <div className="workbench-ai-step-icon-wrap">🤖</div>
                        <div className="workbench-ai-step-title">开始AI分析</div>
                        <div className="workbench-ai-step-desc">使用AI分析本次刚采集的数据，提取风格、色调并生成专业报告</div>
                        <Button
                          type="primary"
                          size="large"
                          icon={<RocketOutlined />}
                          onClick={(e) => { e.stopPropagation(); startAIAnalysis(); }}
                          style={{
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                            border: 'none',
                            boxShadow: '0 8px 24px rgba(255, 107, 157, 0.4)'
                          }}
                        >
                          AI智能分析（分析本次采集数据） →
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
            </Card>
          </div>
        </div>
      </Form>

      {/* Lottie 动画：放在分析历史模块上方 */}
      <div className="workbench-hero-wrap">
        <div className="workbench-lottie-inner">
          <iframe
            title="Kiss Lottie"
            src="/lottie-player.html"
            className="workbench-lottie-iframe"
          />
        </div>
      </div>

{/* 分析历史（已废弃：统一由 AI 报告助手管理，因此这里整体移除） */}
      {false && (
        <Card
          className="workbench-content-card"
          style={{
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            marginBottom: '24px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
          bodyStyle={{ padding: '40px' }}
        >
          {/* 原分析历史内容已禁用 */}
        </Card>
      )}

      {/* 关键词云图分析 */}
      <div className="workbench-wordcloud-card">
        <div className="workbench-wordcloud-bar" />
        <h3 className="workbench-wordcloud-title">关键词云图分析</h3>
        <div className="workbench-wordcloud-tags">
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--lg workbench-wordcloud-tag--primary">清冷感</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--md workbench-wordcloud-tag--purple">多巴胺</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--xl workbench-wordcloud-tag--rose">伪素颜</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--sm workbench-wordcloud-tag--muted">哑光</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--md workbench-wordcloud-tag--muted">玻色因</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--sm workbench-wordcloud-tag--muted">早C晚A</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--xl workbench-wordcloud-tag--primary">纯欲风</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--md workbench-wordcloud-tag--purple">美拉德</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--sm workbench-wordcloud-tag--muted">落日妆</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--xs workbench-wordcloud-tag--muted">极简</span>
          <span className="workbench-wordcloud-tag workbench-wordcloud-tag--md workbench-wordcloud-tag--light">高光</span>
        </div>
      </div>
    </div>
  )
}

export default AnalysisWorkbench
