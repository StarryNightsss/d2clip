import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button, Input, message, Progress, Tag, Space, Collapse, Tooltip } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { agentAPI } from '../services/api'
import ReactECharts from 'echarts-for-react'

const { TextArea } = Input
const { Panel } = Collapse

// 手绘线条风格图标
const Icons = {
  analyze: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  ),
  chart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 17v-7M12 17v-4M16 17v-9" />
    </svg>
  ),
  content: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12H4" />
    </svg>
  ),
  plan: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  ),
  robot: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <path d="M8 15h.01M16 15h.01" />
      <path d="M9 19v2M15 19v2" />
    </svg>
  ),
  user: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  play: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  pause: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  skip: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  ),
  refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  more: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  ),
  expand: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  collapse: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

// 步骤状态标签
const StepStatusTag = ({ status }) => {
  // 确保 status 是字符串，处理 undefined 或 null
  const normalizedStatus = status || 'pending'
  const config = {
    pending: { color: '#95a5a6', bg: '#f5f6fa', text: '待执行' },
    running: { color: '#ff6b9d', bg: 'rgba(255, 107, 157, 0.1)', text: '执行中' },
    completed: { color: '#00b894', bg: 'rgba(0, 184, 148, 0.1)', text: '已完成' },
    skipped: { color: '#fdcb6e', bg: 'rgba(253, 203, 110, 0.1)', text: '已跳过' },
    error: { color: '#e17055', bg: 'rgba(225, 112, 85, 0.1)', text: '出错' }
  }
  const c = config[normalizedStatus] || config.pending
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      color: c.color,
      background: c.bg
    }}>
      {c.text}
    </span>
  )
}

// 单个步骤预览组件
const StepPreview = ({ step, result }) => {
  if (!result) return null

  // 根据 tool 判断类型（后端存的 step 没有 type 字段）
  const toolType = step.tool || step.type

  const renderPreview = () => {
    // 图表类型：generate_chart
    if (toolType === 'generate_chart') {
      // result 可能是 { echarts_option: {...} } 或直接是 echarts_option
      const chartOption = result.echarts_option || result
      return (
        <div style={{ height: 200 }}>
          <ReactECharts option={chartOption} style={{ height: '100%' }} />
        </div>
      )
    }

    // 分析结果：analyze_tone / analyze_style
    if (toolType === 'analyze_tone' || toolType === 'analyze_style') {
      // 显示配色色块
      const data = result.distribution || result.data || []
      return (
        <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.slice(0, 5).map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e0e0e0',
                fontSize: 12
              }}>
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: ['#ff6b9d', '#5f27cd', '#00d2d3', '#feca57', '#ee5a6f'][idx % 5]
                }} />
                <span>{item.name}</span>
                <span style={{ color: '#999' }}>{item.percentage || item.count}%</span>
              </div>
            ))}
          </div>
          {data.length > 5 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
              共 {data.length} 项数据
            </div>
          )}
        </div>
      )
    }

    // 文案类型：generate_text
    if (toolType === 'generate_text') {
      const text = typeof result === 'string' ? result : (result.content || JSON.stringify(result))
      return (
        <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
          {text.slice(0, 200)}{text.length > 200 ? '...' : ''}
        </div>
      )
    }

    // 报告类型：generate_report
    if (toolType === 'generate_report') {
      const report = result.data || result
      return (
        <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>📄 {report.report_title || report.title || '报告'}</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            {report.summary?.slice(0, 100)}...
          </div>
          <div style={{ fontSize: 11, color: '#ff6b9d' }}>
            共 {report.sections?.length || 0} 个板块
          </div>
        </div>
      )
    }

    // 默认显示
    return (
      <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
        <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px dashed #e0e0e0', paddingTop: 12 }}>
      <div style={{ fontSize: 12, color: '#636e72', marginBottom: 8 }}>执行结果预览</div>
      {renderPreview()}
    </div>
  )
}

const ReportAgent = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const analysisId = searchParams.get('analysis_id')
  const filePath = searchParams.get('file')
  const limit = searchParams.get('limit') || 10
  const tab = searchParams.get('tab') // 'history' 表示从历史记录入口进入

  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: filePath 
        ? `你好！我是报告生成助手。已选择数据文件：${filePath.split('/').pop()}\n\n你想生成什么样的分析报告？`
        : '你好！我是报告生成助手。请先选择要分析的数据文件，然后告诉我你想生成什么样的报告？',
      showSuggestions: true
    }
  ])
  
  // 快速建议选项 - 每个类型有特定的分析重点
  const quickSuggestions = [
    { 
      key: 'tone', 
      label: '分析口红色调趋势', 
      icon: 'tone',
      prompt: '请重点分析口红色调分布，包括：珊瑚橘、正红色、豆沙色、裸色、粉色等主要色调的占比趋势。生成色调分布饼图和柱状图。不需要分析妆容风格。'
    },
    { 
      key: 'style', 
      label: '对比不同妆容风格', 
      icon: 'style',
      prompt: '请重点分析妆容风格分布，包括：韩系、欧美、日系、复古、日常等主要风格的占比。生成风格对比图表。不需要详细分析口红色调。'
    },
    { 
      key: 'full', 
      label: '生成完整趋势报告', 
      icon: 'full',
      prompt: '请生成完整的趋势分析报告，包括：口红色调分析、妆容风格分析、关键词分析、使用场景分析等。生成完整的报告。'
    },
    { 
      key: 'custom', 
      label: '自定义分析', 
      icon: 'custom',
      prompt: ''  // 自定义不预设，让用户输入
    }
  ]
  const [inputValue, setInputValue] = useState('')
  const [agentMode, setAgentMode] = useState('agent') // 'ask' | 'plan' | 'agent'
  const [isPlanning, setIsPlanning] = useState(false)
  const [plan, setPlan] = useState(null)
  const [currentStep, setCurrentStep] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [stepResults, setStepResults] = useState({})
  const [expandedSteps, setExpandedSteps] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
  const [planCollapsed, setPlanCollapsed] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)

  // 初始化：拉取历史会话列表
  const fetchHistory = async () => {
    try {
      const res = await agentAPI.getSessions()
      console.log('[ReportAgent] 获取历史会话:', res?.sessions?.length, '条', res?.sessions)
      if (res?.sessions) {
        setHistoryList(res.sessions.map(s => ({
          id: s.id,
          title: s.title || '新对话',
          date: s.updated_at ? new Date(s.updated_at).toLocaleString('zh-CN') : '',
          status: s.status,
          mode: s.mode,
          final_report: s.final_report,
          has_report: s.has_report || (s.final_report?.title ? true : false),
        })))
      }
    } catch (e) {
      // 网络不通时静默失败，不影响新对话流程
      console.warn('获取历史列表失败:', e)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // 加载历史会话
  const loadHistorySession = async (historyId) => {
    try {
      const session = await agentAPI.getSession(historyId)
      if (!session) {
        message.error('历史会话不存在')
        return
      }

      // 加载会话数据到状态
      setSessionId(session.id)
      setMessages((session.messages || []).map(m => ({ ...m, showSuggestions: false })))

      // 将后端 plan（数组）转换为前端期望的 { steps: [...] } 格式
      if (session.plan && Array.isArray(session.plan)) {
        setPlan({ steps: session.plan })
      } else {
        setPlan(null)
      }

      // 从步骤结果中提取 stepResults
      const results = {}
      if (session.plan) {
        session.plan.forEach(step => {
          if (step.preview) results[step.id] = step.preview
        })
      }
      setStepResults(results)

      // 更新模式
      if (session.mode) setAgentMode(session.mode)

      // 如果有最终报告，添加报告完成消息
      const hasFinalReport = !!(session.final_report && (
        session.final_report.report ||
        session.final_report.report_title ||
        session.final_report.title
      ))
      if (hasFinalReport) {
        setMessages(prev => {
          // 检查是否已有报告完成消息
          const hasReportMsg = prev.some(m => m.role === 'agent' && m.content?.includes('报告生成完成'))
          if (!hasReportMsg) {
            return [...prev, {
              role: 'agent',
              content: '报告生成完成！你可以查看完整报告或继续调整。',
              actions: ['查看报告', '继续修改', '保存到历史']
            }]
          }
          return prev
        })
      }

      // 重连 WebSocket（如果会话仍在执行中）
      if (session.is_executing) {
        connectWebSocket(session.id)
      }

      message.success(`已加载: ${session.final_report?.title || session.messages?.[0]?.content?.slice(0, 20) || '历史会话'}`)
    } catch (error) {
      message.error('加载历史会话失败：' + error.message)
    }
  }

  // 从 TrendReport 点击"历史分析记录"进入时，自动加载最新历史会话
  // 注意：需要等 historyList 加载完成后才执行
  const [historyLoaded, setHistoryLoaded] = useState(false)
  useEffect(() => {
    if (tab === 'history' && historyList.length > 0 && !historyLoaded && !sessionId) {
      // 加载最新一条历史记录（按日期排序后的第一条）
      const latestHistory = historyList[0]
      loadHistorySession(latestHistory.id)
      setHistoryLoaded(true)
    }
  }, [tab, historyList, historyLoaded, sessionId])

  // 自动滚动消息区域到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.parentElement
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // 模式切换时自动调整执行计划面板
  useEffect(() => {
    if (agentMode === 'ask') {
      setPlanCollapsed(true)  // ASK 模式自动收缩
    } else {
      setPlanCollapsed(false) // PLAN/AGENT 模式自动展开
    }
  }, [agentMode])

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) return

    const userMsg = inputValue.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInputValue('')
    setIsPlanning(true)

    try {
      // 调用后端 Agent API
      const response = await agentAPI.chat({
        message: userMsg,
        mode: agentMode,
        session_id: sessionId,
        file_path: filePath
      })

      // 保存会话ID
      if (response.session_id) {
        setSessionId(response.session_id)
        // 连接 WebSocket
        connectWebSocket(response.session_id)
      }

      // 显示 Agent 回复
      setMessages(prev => [...prev, {
        role: 'agent',
        content: response.message,
        showPlan: !!response.plan
      }])

      // 如果有计划，显示计划
      if (response.plan) {
        setPlan({ steps: response.plan })
      }

      // 如果是 Agent 模式且不需要确认，自动开始执行
      if (agentMode === 'agent' && !response.requires_confirmation && response.plan) {
        // 后端会自动执行，前端设置执行状态并通过 WebSocket 接收状态更新
        setIsExecuting(true)
      }

    } catch (error) {
      message.error('发送消息失败：' + error.message)
      setMessages(prev => [...prev, {
        role: 'agent',
        content: '抱歉，处理消息时出错：' + error.message
      }])
    } finally {
      setIsPlanning(false)
    }
  }

  // 同步会话状态（用于 WebSocket 连接后获取完整状态）
  const syncSessionState = async (sid) => {
    try {
      const session = await agentAPI.getSession(sid)
      if (session && session.plan) {
        console.log('同步会话状态:', session.plan.map(s => ({ id: s.id, status: s.status })))
        setPlan(prev => ({
          ...prev,
          steps: session.plan.map(s => ({
            ...s,
            status: s.status || 'pending'
          }))
        }))
        // 如果会话正在执行中，设置 isExecuting 为 true
        if (session.is_executing) {
          setIsExecuting(true)
        }
      }
    } catch (error) {
      console.error('同步会话状态失败:', error)
    }
  }

  // 连接 WebSocket
  const connectWebSocket = (sid) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = agentAPI.createWebSocket(sid)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocket] 连接成功, sessionId:', sid)
      // 连接成功后，主动获取会话状态以同步步骤状态
      syncSessionState(sid)
    }

    ws.onmessage = (event) => {
      console.log('[WebSocket] 收到消息:', event.data)
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] 错误:', error)
    }

    ws.onclose = (event) => {
      console.log('[WebSocket] 连接关闭, code:', event.code, 'reason:', event.reason)
    }
  }

  // 处理 WebSocket 消息
  const handleWebSocketMessage = (data) => {
    console.log('[WebSocket] 处理消息:', data.type, data)
    switch (data.type) {
      case 'step_update':
        // 更新步骤状态
        console.log('更新步骤状态:', data.step_id, data.status)
        updateStepStatusById(data.step_id, data.status)
        // 如果有步骤正在执行，确保 isExecuting 为 true
        if (data.status === 'running') {
          setIsExecuting(true)
        }
        // 对于 generate_report 步骤，存储完整的 result 以便获取报告数据
        // 对于其他步骤，存储 preview
        if (data.result?.data && data.result.data.report_title) {
          // 这是 generate_report 的完整报告数据
          setStepResults(prev => ({ ...prev, [data.step_id]: data.result.data }))
        } else if (data.preview) {
          setStepResults(prev => ({ ...prev, [data.step_id]: data.preview }))
        }
        break
      case 'completed':
        setIsExecuting(false)
        // 找到 generate_report 步骤的结果
        setMessages(prev => [...prev, {
          role: 'agent',
          content: '报告生成完成！你可以查看完整报告或继续调整。',
          actions: ['查看报告', '继续修改', '保存到历史']
        }])
        break
      case 'error':
        message.error(data.error || '执行出错')
        setIsExecuting(false)
        break
    }
  }

  // 根据步骤ID更新状态
  const updateStepStatusById = (stepId, status) => {
    console.log('[WebSocket] 更新步骤状态:', stepId, '->', status)
    setPlan(prev => {
      if (!prev) {
        console.log('[WebSocket] 警告: plan 为 null，无法更新步骤状态')
        return prev
      }
      const newSteps = prev.steps.map(s => s.id === stepId ? { ...s, status } : s)
      console.log('[WebSocket] 更新后的步骤状态:', newSteps.map(s => ({ id: s.id, status: s.status })))
      return {
        ...prev,
        steps: newSteps
      }
    })
  }

  // 开始执行
  const startExecution = async () => {
    if (!sessionId || !plan) return

    setIsExecuting(true)
    setMessages(prev => [...prev, { role: 'agent', content: '开始执行计划...' }])

    try {
      await agentAPI.execute(sessionId)
    } catch (error) {
      message.error('启动执行失败：' + error.message)
      setIsExecuting(false)
    }
  }

  // 暂停执行
  const pauseExecution = async () => {
    if (!sessionId) return
    try {
      await agentAPI.pause(sessionId)
      setIsExecuting(false)
      setMessages(prev => [...prev, { role: 'agent', content: '已暂停执行，可点击“继续”恢复。' }])
    } catch (error) {
      message.error('暂停失败：' + error.message)
    }
  }

  // 同步计划到后端的通用方法
  const syncPlanToBackend = async (newSteps) => {
    if (!sessionId) return
    try {
      await agentAPI.updatePlan(sessionId, { steps: newSteps })
    } catch (error) {
      console.warn('同步计划到后端失败:', error.message)
    }
  }

  // 更新步骤状态
  const updateStepStatus = (index, status) => {
    setPlan(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, status } : s)
    }))
  }

  // 跳过步骤
  const skipStep = (index) => {
    const newSteps = plan.steps.map((s, i) => i === index ? { ...s, status: 'skipped' } : s)
    setPlan(prev => ({ ...prev, steps: newSteps }))
    syncPlanToBackend(newSteps)
    if (currentStep === index) setCurrentStep(index + 1)
  }

  // 回退步骤
  const rollbackStep = (index) => {
    const stepIds = plan.steps.slice(index).map(s => s.id)
    setStepResults(prev => {
      const newResults = { ...prev }
      stepIds.forEach(id => delete newResults[id])
      return newResults
    })
    const newSteps = plan.steps.map((s, i) => i >= index ? { ...s, status: 'pending' } : s)
    setPlan(prev => ({ ...prev, steps: newSteps }))
    setCurrentStep(index)
    syncPlanToBackend(newSteps)
  }

  // 调整步骤顺序
  const moveStep = (index, direction) => {
    if (isExecuting) return
    const newSteps = [...plan.steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSteps.length) return
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
    setPlan({ ...plan, steps: newSteps })
    syncPlanToBackend(newSteps)
  }

  // 重新规划（清除当前计划，重新输入）
  const replan = async () => {
    // 如果正在执行，先暂停
    if (isExecuting && sessionId) {
      try {
        await agentAPI.pause(sessionId)
      } catch (error) {
        console.warn('暂停执行失败:', error.message)
      }
    }
    
    setPlan(null)
    setStepResults({})
    setIsExecuting(false)
    setCurrentStep(0)
    setMessages(prev => [...prev, { role: 'agent', content: '计划已清除，请重新描述你的分析需求。' }])
  }

  // 单独执行指定工具按钮
  // 工具栏快捷按钮：填充预设提示词并自动发送
  const runSingleTool = async (tool) => {
    const presetMessages = {
      analyze: '帮我分析数据中的口红色调分布',
      content: '帮我生成口红色调分析文案',
      chart:   '帮我生成口红色调分布饥图',
      check:   '对当前分析结果做一次质量检查',
    }

    // 如果当前已有执行计划，尝试智能插入节点到 DAG
    if (plan && plan.steps && plan.steps.length > 0) {
      insertToolIntoDAG(tool)
      return
    }

    // 没有计划时，只填充输入框，不自动发送，让用户确认
    const text = presetMessages[tool]
    if (!text) return
    setInputValue(text)
    // 不再自动发送，需要用户点击发送按钮确认
  }

  // 工具到 DAG 节点的依赖规则表
  const TOOL_DAG_RULES = {
    // tool 名 => { requires: [必须在它前面的 tool], blocks: [必须在它后面的 tool] }
    load_data:     { requires: [],                                       blocks: ['analyze_tone', 'analyze_style', 'generate_chart', 'generate_text', 'critic', 'generate_report'] },
    analyze_tone:  { requires: ['load_data'],                            blocks: ['generate_chart', 'generate_text', 'critic', 'generate_report'] },
    analyze_style: { requires: ['load_data'],                            blocks: ['generate_chart', 'generate_text', 'critic', 'generate_report'] },
    generate_chart:{ requires: ['analyze_tone', 'analyze_style'],        blocks: ['critic', 'generate_report'] },
    generate_text: { requires: ['analyze_tone', 'analyze_style'],        blocks: ['critic', 'generate_report'] },
    critic:        { requires: ['generate_chart', 'generate_text'],      blocks: ['generate_report'] },
    generate_report:{ requires: ['generate_chart', 'generate_text'],     blocks: [] },
  }

  const TOOL_META = {
    analyze_tone:   { name: '分析色调', tool: 'analyze_tone' },
    analyze_style:  { name: '分析风格', tool: 'analyze_style' },
    generate_chart: { name: '生成图表', tool: 'generate_chart' },
    generate_text:  { name: '生成文案', tool: 'generate_text' },
    critic:         { name: '质量检查', tool: 'critic' },
    generate_report:{ name: '组装报告', tool: 'generate_report' },
  }

  // 工具键 → tool 名映射
  const TOOL_KEY_MAP = {
    analyze: 'analyze_tone',
    content: 'generate_text',
    chart:   'generate_chart',
    check:   'critic',
  }

  const insertToolIntoDAG = (toolKey) => {
    const toolName = TOOL_KEY_MAP[toolKey]
    if (!toolName) return

    const steps = plan.steps
    // 如果已存在该工具节点，不重复添加
    if (steps.find(s => s.tool === toolName)) {
      message.info(`计划中已包含「${TOOL_META[toolName]?.name || toolName}」`)
      return
    }

    const rules = TOOL_DAG_RULES[toolName] || { requires: [], blocks: [] }

    // 找到计划中已有的「前置节点」（requires 里有的）
    const prereqSteps = steps.filter(s => rules.requires.includes(s.tool))
    // 找到计划中已有的「后置节点」（blocks 里有的）
    const succSteps = steps.filter(s => rules.blocks.includes(s.tool))

    // 前置节点最后一个的下标
    const lastPrereqIdx = prereqSteps.length > 0
      ? Math.max(...prereqSteps.map(s => steps.indexOf(s)))
      : -1  // 没有前置节点

    // 后置节点最先一个的下标
    const firstSuccIdx = succSteps.length > 0
      ? Math.min(...succSteps.map(s => steps.indexOf(s)))
      : steps.length  // 没有后置节点，追加到末尾

    let insertIdx
    if (lastPrereqIdx >= 0) {
      // 有前置节点：插入到最后一个前置节点之后，且不超过最早的后置节点位置
      insertIdx = Math.min(lastPrereqIdx + 1, firstSuccIdx)
    } else if (firstSuccIdx < steps.length) {
      // 没有前置节点但有后置节点：插入到最早后置节点之前
      insertIdx = firstSuccIdx
    } else {
      // 计划中既没有前置也没有后置：追加到末尾
      insertIdx = steps.length
    }

    // 生成新节点
    const newId = `inject-${toolName}-${Date.now()}`
    const newStep = {
      id: newId,
      name: TOOL_META[toolName]?.name || toolName,
      tool: toolName,
      description: '',
      status: 'pending',
      dependencies: prereqSteps.length > 0
        ? [prereqSteps[prereqSteps.length - 1].id]  // 依赖最后一个前置节点
        : [],
    }

    const newSteps = [...steps]
    newSteps.splice(insertIdx, 0, newStep)

    // 更新紧接后置节点的依赖：如果它们依赖前置节点，改为依赖新节点
    const prereqIds = prereqSteps.map(p => p.id)
    const updatedSteps = newSteps.map(s => {
      if (succSteps.find(ss => ss.id === s.id) && prereqIds.length > 0) {
        const filteredDeps = (s.dependencies || []).filter(d => !prereqIds.includes(d))
        return { ...s, dependencies: [...filteredDeps, newId] }
      }
      return s
    })

    setPlan({ ...plan, steps: updatedSteps })
    syncPlanToBackend(updatedSteps)
    message.success(`已将「${TOOL_META[toolName]?.name}」插入计划第 ${insertIdx + 1} 步`)
  }

  // 带文本参数的发送（为快捷工具提供）
  const sendMessageWithText = async (text) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInputValue('')
    setIsPlanning(true)
    try {
      const response = await agentAPI.chat({
        message: text,
        mode: agentMode,
        session_id: sessionId,
        file_path: filePath
      })
      if (response.session_id) {
        setSessionId(response.session_id)
        connectWebSocket(response.session_id)
      }
      setMessages(prev => [...prev, { role: 'agent', content: response.message, showPlan: !!response.plan }])
      if (response.plan) setPlan({ steps: response.plan })
    } catch (error) {
      message.error('发送失败：' + error.message)
    } finally {
      setIsPlanning(false)
    }
  }

  // 从 AnalysisWorkbench 跳转过来时，自动开始对话
  useEffect(() => {
    // 使用 sessionStorage 来持久化 autoStarted 状态，防止组件重新挂载时重复触发
    const storageKey = `agent_auto_started_${filePath}`
    const hasAutoStarted = sessionStorage.getItem(storageKey)

    // 如果有 filePath 参数且还没有自动启动过，则自动发送初始消息
    if (filePath && !hasAutoStarted && !sessionId && !tab) {
      sessionStorage.setItem(storageKey, 'true')
      // 延迟一点执行，确保组件完全初始化
      setTimeout(() => {
        const autoMessage = `请分析数据文件 ${filePath.split('/').pop()}，生成完整的趋势分析报告`
        sendMessageWithText(autoMessage)
      }, 500)
    }
  }, [])  // 空依赖数组，只在组件挂载时执行一次

  // 渲染消息
  const renderMessage = (msg, index) => {
    const isAgent = msg.role === 'agent'
    return (
      <div
        key={index}
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexDirection: isAgent ? 'row' : 'row-reverse'
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: isAgent ? 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAgent ? '#fff' : '#64748b',
            flexShrink: 0,
            boxShadow: isAgent ? '0 4px 12px rgba(255, 107, 157, 0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
            border: isAgent ? 'none' : '1px solid #e2e8f0'
          }}
        >
          {isAgent ? <Icons.robot /> : <Icons.user />}
        </div>
        <div style={{ maxWidth: '70%' }}>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: isAgent ? '8px 20px 20px 20px' : '20px 8px 20px 20px',
              background: isAgent ? '#fff' : 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
              color: isAgent ? '#1e293b' : '#fff',
              boxShadow: isAgent ? '0 2px 12px rgba(0,0,0,0.06)' : '0 4px 12px rgba(255, 107, 157, 0.3)',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6',
              fontWeight: 400,
              border: isAgent ? '1px solid #f1f5f9' : 'none'
            }}
          >
            {msg.content}
          </div>
          
          {/* 建议选项 - 下拉菜单风格 */}
          {msg.suggestions && (
            <div style={{ marginTop: 12, position: 'relative' }}>
              {/* 下拉触发按钮 */}
              <div
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling
                  menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#64748b' }}>
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>选择分析类型</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: '4px' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              
              {/* 下拉菜单 */}
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '180px',
                  zIndex: 100
                }}
              >
                {msg.suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setInputValue(s)
                      const menu = document.getElementById('suggestion-menu')
                      if (menu) menu.style.display = 'none'
                    }}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#475569',
                      borderBottom: i < msg.suggestions.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* 手绘风格 SVG 图标 */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#ff6b9d', flexShrink: 0 }}>
                      {i === 0 && (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5-2 4-2 4 2 4 2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </>
                      )}
                      {i === 1 && (
                        <>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </>
                      )}
                      {i === 2 && (
                        <>
                          <path d="M3 3v18h18" />
                          <path d="M18 17V9" />
                          <path d="M13 17V5" />
                          <path d="M8 17v-3" />
                        </>
                      )}
                      {i === 3 && (
                        <>
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                        </>
                      )}
                    </svg>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 操作按钮 */}
          {msg.actions && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {msg.actions.map((a, i) => (
                <Button
                  key={i}
                  type={i === 0 ? 'primary' : 'default'}
                  size="small"
                  style={i === 0 ? {
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    border: 'none'
                  } : { borderRadius: 12 }}
                  onClick={() => {
                    if (a === '查看报告') {
                      // 从 plan 步骤里找 generate_report 的结果
                      const reportStep = plan?.steps?.find(s => s.tool === 'generate_report')
                      const reportResult = reportStep
                        ? (stepResults[reportStep.id] || reportStep.preview)
                        : null
                      // 报告结果可能在 data 字段里
                      const reportData = reportResult?.data || reportResult
                      // 使用 URL 参数传递 session_id，支持刷新页面
                      navigate(`/report?session_id=${sessionId}`)
                    } else if (a === '保存到历史') {
                      // 刷新历史记录列表
                      fetchHistory()
                      message.success('已刷新历史记录')
                    }
                  }}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="workbench-page-wrap report-agent-page">
      {/* 页面标题 */}
      <header className="workbench-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="workbench-page-title">AI 报告助手</h1>
          <p className="workbench-page-subtitle">通过对话生成定制化数据分析报告</p>
        </div>
        <button
          onClick={() => navigate('/report')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 107, 157, 0.3)',
            background: 'linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%)',
            color: '#ff6b9d',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 107, 157, 0.15)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)'
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 157, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%)'
            e.currentTarget.style.color = '#ff6b9d'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 157, 0.15)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10a6 6 0 010 12H4" />
          </svg>
          返回可视化报告
        </button>
      </header>

      <div className={`workbench-config-row ${historyCollapsed ? 'history-collapsed' : ''} ${planCollapsed ? 'plan-collapsed' : ''}`}>
        {/* 左侧：历史记录 */}
        <div className="workbench-config-history">
          <Card
            className="workbench-content-card"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 107, 157, 0.15)',
              background: 'rgba(255, 245, 247, 0.95)',
              backdropFilter: 'blur(12px)',
              height: '572px',
              minHeight: '572px',
              maxHeight: '572px',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ 
              padding: historyCollapsed ? '24px 12px' : '24px', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#2d3436',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              justifyContent: historyCollapsed ? 'center' : 'flex-start'
            }}>
              {!historyCollapsed && <Icons.plan />}
              <span style={{ display: historyCollapsed ? 'none' : 'block' }}>历史记录</span>
              <button
                onClick={() => setHistoryCollapsed(!historyCollapsed)}
                style={{
                  marginLeft: historyCollapsed ? '0' : 'auto',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: historyCollapsed ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                </svg>
              </button>
            </div>

            {!historyCollapsed && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {historyList.map((item) => {
                    const isActive = sessionId === item.id
                    // 优先使用报告标题，其次是第一条用户消息
                    const reportTitle = item.final_report?.title
                    const firstUserMsg = item.messages?.find?.(m => m.role === 'user')?.content
                    const displayTitle = reportTitle || firstUserMsg || item.title || '新对话'
                    // 截取前30个字符
                    const previewText = displayTitle.slice(0, 30) + (displayTitle.length > 30 ? '...' : '')
                    // 格式化日期
                    const dateStr = item.created_at
                      ? new Date(item.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : item.date || ''
                    // 是否有报告
                    const hasReport = item.has_report || item.final_report?.title
                    return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        background: isActive ? 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)' : '#fff',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: isActive ? '1px solid #ff6b9d' : '1px solid rgba(255, 107, 157, 0.1)',
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 4px 12px rgba(255, 107, 157, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#fff0f3'
                          e.currentTarget.style.borderColor = '#ff6b9d'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 157, 0.12)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#fff'
                          e.currentTarget.style.borderColor = 'rgba(255, 107, 157, 0.1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                      onClick={() => loadHistorySession(item.id)}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#fff' : '#2d3436',
                        marginBottom: 4,
                        lineHeight: 1.4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                          {hasReport && (
                            <FileTextOutlined style={{ fontSize: 12, opacity: 0.8, flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {previewText}
                          </span>
                        </div>
                        {hasReport && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/report?session_id=${item.id}`)
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: isActive ? 'rgba(255,255,255,0.2)' : '#ff6b9d',
                              color: '#fff',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            查看报告
                          </button>
                        )}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: isActive ? 'rgba(255,255,255,0.8)' : '#ff8fab'
                      }}>
                        {dateStr}
                        {hasReport && (
                          <span style={{ marginLeft: 8, opacity: 0.8 }}>
                            • 有报告
                          </span>
                        )}
                        {!hasReport && item.plan && (
                          <span style={{ marginLeft: 8, opacity: 0.8 }}>
                            • {item.plan.length} 步
                          </span>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 中间：对话区域 */}
        <div className="workbench-config-left">
          <Card
            className="workbench-content-card"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              height: '572px',
              minHeight: '572px',
              maxHeight: '572px',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ 
              padding: '24px', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
              {messages.map((msg, i) => renderMessage(msg, i))}
              
              {isPlanning && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Icons.robot />
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '4px 16px 16px 16px',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <Space>
                      <span>正在规划分析步骤</span>
                      <span className="loading-dots">...</span>
                    </Space>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 快速建议按钮 */}
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 8 }}>快速选择分析类型</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {quickSuggestions.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      // 使用预设的 prompt，如果没有则使用 label
                      const message = s.prompt || s.label
                      setInputValue(message)
                      // 自动发送消息
                      if (message) {
                        setTimeout(() => handleSendMessage(message), 100)
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                      {/* 手绘 SVG 图标 */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#ff6b9d', flexShrink: 0 }}>
                        {s.icon === 'tone' && (
                          <>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5-2 4-2 4 2 4 2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                          </>
                        )}
                        {s.icon === 'style' && (
                          <>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </>
                        )}
                        {s.icon === 'full' && (
                          <>
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                          </>
                        )}
                        {s.icon === 'custom' && (
                          <>
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                          </>
                        )}
                      </svg>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

            {/* 输入区域 */}
            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                {/* 模式选择下拉 */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => {
                      const menu = e.currentTarget.nextElementSibling
                      menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
                    }}
                    style={{
                      padding: '0 16px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: '#475569',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '120px',
                      height: '52px',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* 根据模式显示不同图标 */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#64748b' }}>
                        {agentMode === 'ask' && (
                          <>
                            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                          </>
                        )}
                        {agentMode === 'plan' && (
                          <>
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                          </>
                        )}
                        {agentMode === 'agent' && (
                          <>
                            <rect x="3" y="11" width="18" height="10" rx="2" />
                            <circle cx="12" cy="5" r="2" />
                            <path d="M12 7v4" />
                            <path d="M8 15h.01M16 15h.01" />
                          </>
                        )}
                      </svg>
                      <span style={{ width: '40px', textAlign: 'left' }}>
                        {agentMode === 'ask' ? '问答' : agentMode === 'plan' ? '规划' : 'Agent'}
                      </span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  
                  {/* 下拉菜单 */}
                  <div
                    style={{
                      display: 'none',
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '4px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                      minWidth: '120px',
                      zIndex: 100
                    }}
                  >
                    {[
                      { key: 'ask', label: '问答' },
                      { key: 'plan', label: '规划' },
                      { key: 'agent', label: 'Agent' }
                    ].map((mode) => (
                      <div
                        key={mode.key}
                        onClick={() => {
                          setAgentMode(mode.key)
                          const menu = document.querySelector('.mode-dropdown-menu')
                          if (menu) menu.style.display = 'none'
                        }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: agentMode === mode.key ? '#ff6b9d' : '#475569',
                          background: agentMode === mode.key ? 'rgba(255, 107, 157, 0.05)' : 'transparent',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => {
                          if (agentMode !== mode.key) e.currentTarget.style.background = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                          if (agentMode !== mode.key) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {mode.label}
                      </div>
                    ))}
                  </div>
                </div>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={agentMode === 'ask' ? '输入你的问题...' : agentMode === 'plan' ? '描述你想完成的分析任务...' : '告诉 Agent 你想生成什么报告...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  style={{
                    borderRadius: '14px',
                    flex: 1,
                    padding: '0 18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
                    fontSize: '14px',
                    background: '#fff',
                    height: '52px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isPlanning}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: (!inputValue.trim() || isPlanning) ? '#f1f5f9' : 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    color: (!inputValue.trim() || isPlanning) ? '#94a3b8' : '#fff',
                    border: 'none',
                    cursor: (!inputValue.trim() || isPlanning) ? 'not-allowed' : 'pointer',
                    boxShadow: (!inputValue.trim() || isPlanning) ? 'none' : '0 8px 24px rgba(255, 107, 157, 0.35)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧：执行计划与状态 */}
        <div className="workbench-config-right">
          <Card
            className="workbench-content-card"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              height: '572px',
              minHeight: '572px',
              maxHeight: '572px',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ 
              padding: planCollapsed ? '24px 12px' : '24px', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#2d3436',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              justifyContent: planCollapsed ? 'center' : 'space-between'
            }}>
              {!planCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.plan />
                  执行计划
                </div>
              )}
              <button
                onClick={() => setPlanCollapsed(!planCollapsed)}
                style={{
                  marginLeft: planCollapsed ? '0' : 'auto',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: planCollapsed ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: '#636e72' }}>
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                </svg>
              </button>
            </div>

            {!planCollapsed && !plan && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#95a5a6',
                textAlign: 'center',
                overflow: 'auto'
              }}>
                <div>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📝</div>
                  <div>在左侧对话中描述你的分析需求</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Agent 将为你规划执行步骤</div>
                </div>
              </div>
            )}
            {!planCollapsed && plan && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {/* 执行控制按钮 */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button
                    type="primary"
                    icon={<Icons.play />}
                    onClick={startExecution}
                    disabled={isExecuting}
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                      border: 'none'
                    }}
                  >
                    {isExecuting ? '执行中...' : '开始执行'}
                  </Button>
                  {isExecuting && (
                    <Button
                      icon={<Icons.pause />}
                      onClick={pauseExecution}
                      style={{ borderRadius: '12px' }}
                    >
                      暂停
                    </Button>
                  )}
                </div>

                {/* 步骤列表 */}
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0, maxHeight: 'calc(576px - 140px)' }}>
                  <Collapse
                    accordion
                    expandIcon={({ isActive }) => isActive ? <Icons.collapse /> : <Icons.expand />}
                    style={{ background: 'transparent', border: 'none' }}
                  >
                    {plan.steps.map((step, index) => (
                      <Panel
                        key={step.id}
                        header={
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12,
                            opacity: step.status === 'skipped' ? 0.5 : 1
                          }}>
                            <span style={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: '50%',
                              background: step.status === 'completed' ? '#00b894' : 
                                         step.status === 'running' ? '#ff6b9d' : '#e0e0e0',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12
                            }}>
                              {step.status === 'completed' ? '✓' : index + 1}
                            </span>
                            <span style={{ flex: 1 }}>{step.name}</span>
                            <StepStatusTag status={step.status} />
                          </div>
                        }
                        style={{
                          marginBottom: 8,
                          borderRadius: 12,
                          border: '1px solid #f0f0f0',
                          overflow: 'hidden',
                          background: step.status === 'running' ? 'rgba(255, 107, 157, 0.05)' : '#fff'
                        }}
                      >
                        {/* 步骤操作 */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          <Tooltip title="上移">
                            <Button
                              size="small"
                              icon={<Icons.expand style={{ transform: 'rotate(180deg)' }} />}
                              onClick={() => moveStep(index, 'up')}
                              disabled={isExecuting || index === 0}
                              style={{ borderRadius: 8 }}
                            />
                          </Tooltip>
                          <Tooltip title="下移">
                            <Button
                              size="small"
                              icon={<Icons.expand />}
                              onClick={() => moveStep(index, 'down')}
                              disabled={isExecuting || index === plan.steps.length - 1}
                              style={{ borderRadius: 8 }}
                            />
                          </Tooltip>
                          <Tooltip title="跳过">
                            <Button
                              size="small"
                              icon={<Icons.skip />}
                              onClick={() => skipStep(index)}
                              disabled={isExecuting || step.status !== 'pending'}
                              style={{ borderRadius: 8 }}
                            />
                          </Tooltip>
                          <Tooltip title="回退">
                            <Button
                              size="small"
                              icon={<Icons.back />}
                              onClick={() => rollbackStep(index)}
                              disabled={isExecuting || step.status === 'pending'}
                              style={{ borderRadius: 8 }}
                            />
                          </Tooltip>
                        </div>

                        {/* 步骤结果预览 */}
                        {stepResults[step.id] && (
                          <StepPreview step={step} result={stepResults[step.id]} />
                        )}
                      </Panel>
                    ))}
                  </Collapse>
                </div>
              </div>
            )}
            {!planCollapsed && (
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                flexShrink: 0
              }}>
                <Tooltip title="分析色调">
                  <Button icon={<Icons.analyze />} style={{ borderRadius: 8 }} onClick={() => runSingleTool('analyze')} />
                </Tooltip>
                <Tooltip title="生成文案">
                  <Button icon={<Icons.content />} style={{ borderRadius: 8 }} onClick={() => runSingleTool('content')} />
                </Tooltip>
                <Tooltip title="生成图表">
                  <Button icon={<Icons.chart />} style={{ borderRadius: 8 }} onClick={() => runSingleTool('chart')} />
                </Tooltip>
                <Tooltip title="质量检查">
                  <Button icon={<Icons.check />} style={{ borderRadius: 8 }} onClick={() => runSingleTool('check')} />
                </Tooltip>
                <Tooltip title="回退">
                  <Button icon={<Icons.back />} style={{ borderRadius: 8 }} onClick={() => rollbackStep(Math.max(0, currentStep - 1))} disabled={isExecuting || !plan} />
                </Tooltip>
                <Tooltip title="重新规划">
                  <Button icon={<Icons.refresh />} style={{ borderRadius: 8 }} onClick={replan} disabled={isExecuting} />
                </Tooltip>
              </div>
            )}
          </Card>
        </div>

        {/* ASK 模式且收缩时的提示 */}
        {planCollapsed && agentMode === 'ask' && (
          <div style={{
            position: 'absolute',
            right: '40px',
            top: '180px',
            padding: '8px 16px',
            background: 'rgba(255, 107, 157, 0.1)',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#ff6b9d',
            border: '1px solid rgba(255, 107, 157, 0.2)'
          }}>
            问答模式无需执行计划
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportAgent
