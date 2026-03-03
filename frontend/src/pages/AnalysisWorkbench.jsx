import { Card, Form, Input, Select, Button, Space, Alert, Row, Col, Divider, message, Table, Tag, Progress } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, RocketOutlined, DatabaseOutlined, HistoryOutlined, ThunderboltOutlined, EyeOutlined, ReloadOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crawlerAPI, dataAPI, analysisAPI } from '../services/api'
import CrawlerTerminal from '../components/CrawlerTerminal'

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

  // 加载分析历史
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const response = await analysisAPI.getHistory(10, 0, null)
      setHistoryData(response.items || [])
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
        } else if (statusData.status === 'error') {
          // 爬虫出错
          clearInterval(interval)
          setPollingInterval(null)
          stopMockProgress()  // 停止 Mock 进度
          setAnalyzing(false)
          setStatus('idle')
          setMockProgress(0)
          message.error('采集失败: ' + (statusData.error_message || '未知错误'))
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

  return (
    <div>
      {/* 页面标题 */}
      <div style={{
        background: 'linear-gradient(135deg, #ffa6c1 0%, #ff6b9d 100%)',
        padding: '40px 48px',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 8px 24px rgba(255, 107, 157, 0.2)'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '36px',
          fontWeight: '700',
          margin: 0,
          marginBottom: '12px',
          letterSpacing: '-0.5px'
        }}>
          <ThunderboltOutlined style={{ marginRight: '12px' }} />
          分析工作台
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '16px',
          margin: 0,
          fontWeight: '400'
        }}>
          配置数据采集参数，启动AI智能分析，生成专业趋势报告
        </p>
      </div>

      {/* Lottie 动画：独立页面 iframe 嵌入，覆盖原步骤 1～3 整行 */}
      <div className="workbench-hero-wrap">
        <div className="workbench-lottie-inner">
          <iframe
            title="Kiss Lottie"
            src="/lottie-player.html"
            className="workbench-lottie-iframe"
          />
        </div>
      </div>

      {/* 配置表单 */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: 'none',
          marginBottom: '24px'
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

        <Form form={form} layout="vertical" size="large">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="platforms"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>采集平台</span>}
                initialValue={['xhs']}
                rules={[{ required: true, message: '请选择平台' }]}
              >
                <Select
                  placeholder="请选择采集平台"
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: 'xhs', label: '📱 小红书' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="crawlerType"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>爬取类型</span>}
                initialValue="search"
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: 'search', label: '🔍 关键词搜索' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

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
                { value: 10, label: '10 条数据' },
                { value: 25, label: '25 条数据' },
                { value: 50, label: '50 条数据' },
                { value: 100, label: '100 条数据（推荐）' }
              ]}
            />
          </Form.Item>
          <div style={{ fontSize: '13px', color: '#95a5a6', marginTop: '8px' }}>
            控制 AI 分析的数据条数，数量越多分析时间越长
          </div>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="loginType"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>登录方式</span>}
                initialValue="cookie"
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: 'cookie', label: '🍪 Cookie 登录（推荐）' },
                    { value: 'qrcode', label: '📱 二维码扫码登录' },
                    { value: 'phone', label: '📞 手机号登录' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="startPage"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>起始页</span>}
                initialValue={1}
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: 1, label: '第 1 页' },
                    { value: 2, label: '第 2 页' },
                    { value: 3, label: '第 3 页' },
                    { value: 5, label: '第 5 页' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="enableComments"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>采集评论</span>}
                initialValue={true}
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: true, label: '✅ 采集评论（推荐）' },
                    { value: false, label: '❌ 不采集评论' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="enableSubComments"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>采集子评论</span>}
                initialValue={false}
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: false, label: '❌ 不采集子评论（推荐）' },
                    { value: true, label: '✅ 采集子评论（耗时）' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="saveOption"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>保存格式</span>}
                initialValue="json"
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: 'json', label: '📄 JSON（推荐）' },
                    { value: 'csv', label: '📊 CSV' },
                    { value: 'excel', label: '📗 Excel' },
                    { value: 'db', label: '💾 数据库' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="headless"
                label={<span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436' }}>无头模式</span>}
                initialValue={false}
              >
                <Select
                  style={{ fontSize: '15px' }}
                  options={[
                    { value: false, label: '❌ 显示浏览器（推荐）' },
                    { value: true, label: '✅ 无头模式（后台运行）' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 分析执行 */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: 'none',
          marginBottom: '24px'
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

        {/* idle状态：两个独立按钮 */}
        {status === 'idle' && (
          <Row gutter={24}>
            {/* 左侧：启动爬虫 */}
            <Col span={12}>
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
                borderRadius: '12px',
                height: '100%'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🕷️</div>
                <p style={{
                  color: '#2d3436',
                  marginBottom: '24px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  步骤1：采集数据
                </p>
                <p style={{
                  color: '#636e72',
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  从社交平台爬取笔记和评论数据
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStart}
                  style={{
                    height: '56px',
                    padding: '0 48px',
                    fontSize: '18px',
                    fontWeight: '600',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(253, 203, 110, 0.4)'
                  }}
                >
                  启动爬虫
                </Button>
              </div>
            </Col>

            {/* 右侧：AI智能分析 */}
            <Col span={12}>
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                borderRadius: '12px',
                height: '100%'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🤖</div>
                <p style={{
                  color: '#2d3436',
                  marginBottom: '24px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  步骤2：AI分析
                </p>
                <p style={{
                  color: '#636e72',
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  使用AI分析刚刚采集的数据，生成报告（需先完成步骤1采集）
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/report?auto=true')}
                  disabled
                  style={{
                    height: '56px',
                    padding: '0 48px',
                    fontSize: '18px',
                    fontWeight: '600',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(255, 107, 157, 0.4)',
                    opacity: 0.6
                  }}
                >
                  AI智能分析（请先完成采集）
                </Button>
              </div>
            </Col>
          </Row>
        )}

        {/* analyzing状态：左侧爬虫运行中，右侧AI分析不可点 */}
        {status === 'analyzing' && (
          <Row gutter={24}>
            {/* 左侧：爬虫运行中 */}
            <Col span={12}>
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                padding: '40px 32px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#01579b', marginBottom: '12px' }}>
                  正在采集数据中...
                </div>
                <div style={{ fontSize: '14px', color: '#0277bd', marginBottom: '24px' }}>
                  爬虫正在运行，请保持浏览器打开
                </div>

                {/* Mock 进度条 */}
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <Progress
                    percent={Math.floor(mockProgress)}
                    status="active"
                    strokeColor={{
                      '0%': '#fdcb6e',
                      '100%': '#e17055'
                    }}
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

                {/* 实时日志显示 - CrawlerTerminal 直接轮询后端 */}
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
            </Col>

            {/* 右侧：采集未完成，AI分析不可点 */}
            <Col span={12}>
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
                borderRadius: '12px',
                height: '100%'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.6 }}>🤖</div>
                <p style={{
                  color: '#2d3436',
                  marginBottom: '24px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  AI智能分析
                </p>
                <p style={{
                  color: '#636e72',
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  请等待采集完成后再分析，将使用本次刚采集的数据
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  disabled
                  style={{
                    height: '56px',
                    padding: '0 48px',
                    fontSize: '18px',
                    fontWeight: '600',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(255, 107, 157, 0.4)',
                    opacity: 0.6
                  }}
                >
                  请先完成采集
                </Button>
              </div>
            </Col>
          </Row>
        )}

        {/* completed状态：左侧爬虫完成，右侧AI分析可点击，分析本次刚采集的数据 */}
        {status === 'completed' && (
          <Row gutter={24}>
            {/* 左侧：爬虫完成 */}
            <Col span={12}>
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                borderRadius: '12px'
              }}>
                <CheckCircleOutlined
                  style={{
                    fontSize: '72px',
                    color: '#00b894',
                    marginBottom: '20px',
                    display: 'block'
                  }}
                />
                <p style={{
                  fontSize: '20px',
                  marginBottom: '12px',
                  fontWeight: '600',
                  color: '#2d3436'
                }}>
                  数据采集完成！
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#636e72',
                  marginBottom: '24px'
                }}>
                  {completedStats ? (
                    <>
                      共采集 {completedStats.total_notes || 0} 条笔记
                      {completedStats.total_comments > 0 && `，${completedStats.total_comments} 条评论`}
                    </>
                  ) : (
                    '数据已保存到本地'
                  )}
                </p>
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
            </Col>

            {/* 右侧：AI分析 */}
            <Col span={12}>
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                background: 'linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%)',
                borderRadius: '12px',
                border: '2px solid #ff6b9d'
              }}>
                <div style={{ fontSize: '72px', marginBottom: '20px' }}>🤖</div>
                <p style={{
                  fontSize: '20px',
                  marginBottom: '12px',
                  fontWeight: '600',
                  color: '#2d3436'
                }}>
                  开始AI分析
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#636e72',
                  marginBottom: '24px'
                }}>
                  使用AI分析本次刚采集的数据，提取风格、色调并生成专业报告
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/report?auto=true')}
                  style={{
                    height: '56px',
                    padding: '0 48px',
                    fontSize: '18px',
                    fontWeight: '600',
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(255, 107, 157, 0.4)'
                  }}
                >
                  AI智能分析（分析本次采集数据） →
                </Button>
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* 分析历史 */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: 'none'
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#2d3436',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <HistoryOutlined style={{ marginRight: '12px', color: '#ff6b9d' }} />
            分析历史
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadHistory}
            loading={historyLoading}
          >
            刷新
          </Button>
        </div>
        <p style={{ fontSize: '15px', color: '#636e72', marginBottom: '32px' }}>
          查看历史分析记录，随时重新导出报告
        </p>

        {historyData.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
            background: 'linear-gradient(135deg, #f5f6fa 0%, #e4e6eb 100%)',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
              opacity: 0.5
            }}>
              📋
            </div>
            <p style={{
              fontSize: '18px',
              color: '#95a5a6',
              fontWeight: '500'
            }}>
              暂无历史记录
            </p>
            <p style={{
              fontSize: '14px',
              color: '#b2bec3',
              marginTop: '8px'
            }}>
              完成第一次分析后，历史记录会显示在这里
            </p>
          </div>
        ) : (
          <Table
            dataSource={historyData}
            loading={historyLoading}
            rowKey="analysis_id"
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '分析时间',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 180,
                render: (text) => new Date(text).toLocaleString('zh-CN')
              },
              {
                title: '平台',
                dataIndex: 'platform',
                key: 'platform',
                width: 100,
                render: (platform) => {
                  const platformMap = {
                    xhs: '📱 小红书',
                    dy: '🎵 抖音',
                    wb: '🐦 微博',
                    bili: '📺 B站',
                    ks: '⚡ 快手',
                    zhihu: '💡 知乎',
                    tieba: '💬 贴吧'
                  }
                  return platformMap[platform] || platform
                }
              },
              {
                title: '数据文件',
                dataIndex: 'data_file',
                key: 'data_file',
                ellipsis: true
              },
              {
                title: '总笔记数',
                dataIndex: 'total_notes',
                key: 'total_notes',
                width: 100,
                align: 'center'
              },
              {
                title: '成功/失败',
                key: 'result',
                width: 120,
                align: 'center',
                render: (_, record) => (
                  <span>
                    <Tag color="success">{record.analyzed_notes}</Tag>
                    /
                    <Tag color="error">{record.failed_notes}</Tag>
                  </span>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                align: 'center',
                render: (status) => (
                  <Tag color={status === 'success' ? 'success' : 'error'}>
                    {status === 'success' ? '成功' : '失败'}
                  </Tag>
                )
              },
              {
                title: '操作',
                key: 'action',
                width: 100,
                align: 'center',
                render: (_, record) => (
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      // 跳转到报告页面，携带 analysis_id
                      navigate(`/report?analysis_id=${record.analysis_id}`)
                    }}
                  >
                    查看
                  </Button>
                )
              }
            ]}
          />
        )}
      </Card>
    </div>
  )
}

export default AnalysisWorkbench
