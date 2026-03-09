import { Card, Row, Col, Statistic, Typography, Divider, Button, Space, message, Input, Spin, Progress, Select, InputNumber, Alert } from 'antd'
import ReactECharts from 'echarts-for-react'
import { FileTextOutlined, EditOutlined, SaveOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, LoadingOutlined, ArrowLeftOutlined, RocketOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { analysisAPI, dataAPI } from '../services/api'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const TrendReport = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAutoMode = searchParams.get('auto') === 'true' // 是否是从工作台自动跳转
  const analysisIdFromUrl = searchParams.get('analysis_id') // 从 URL 获取 analysis_id

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(isAutoMode || !!analysisIdFromUrl) // 自动模式或有 analysis_id 时直接加载
  const [loadingStep, setLoadingStep] = useState('正在初始化...') // 加载步骤提示
  const [loadingProgress, setLoadingProgress] = useState(0) // 分析进度
  const [reportData, setReportData] = useState(null)
  const [editableReport, setEditableReport] = useState(null) // 可编辑的报告副本

  // 文件选择相关状态
  const [showFileSelector, setShowFileSelector] = useState(!isAutoMode && !analysisIdFromUrl) // 只有手动模式且没有 analysis_id 时显示
  const [availableFiles, setAvailableFiles] = useState([]) // 可用文件列表
  const [selectedFile, setSelectedFile] = useState(null) // 选中的文件
  const [analysisLimit, setAnalysisLimit] = useState(10) // 分析数量
  const [loadingFiles, setLoadingFiles] = useState(false) // 加载文件列表中
  // 无报告时的后端诊断：null | 'checking' | 'no_connection' | 'no_files' | 'has_files'
  const [backendDiagnosis, setBackendDiagnosis] = useState(null)

  // 从 localStorage 读取分析数量配置
  const getAnalysisLimit = () => {
    try {
      const saved = localStorage.getItem('analysisLimit')
      return saved ? JSON.parse(saved) : 10  // 默认 10 条
    } catch {
      return 10
    }
  }

  // 加载可用的数据文件列表（手动模式）
  useEffect(() => {
    if (!isAutoMode && showFileSelector) {
      loadAvailableFiles()
    }
  }, [isAutoMode, showFileSelector])

  const loadAvailableFiles = async () => {
    try {
      setLoadingFiles(true)
      const filesResponse = await dataAPI.getFiles(null, 'json')

      if (!filesResponse.files || filesResponse.files.length === 0) {
        message.warning('没有找到可用的数据文件，请先在分析工作台运行爬虫采集数据')
        setAvailableFiles([])
        return
      }

      // 只筛选 contents 文件
      const contentsFiles = filesResponse.files.filter(f => {
        const path = f.path || f.file_path
        return path.includes('contents') || path.includes('content')
      })

      setAvailableFiles(contentsFiles)
      if (contentsFiles.length > 0) {
        setSelectedFile(contentsFiles[0].path || contentsFiles[0].file_path)
      }
    } catch (error) {
      console.error('加载文件列表失败:', error)
      message.error('加载文件列表失败: ' + error.message)
    } finally {
      setLoadingFiles(false)
    }
  }

  // 加载指定 ID 的报告（从历史记录查看）
  const loadReportById = async (analysisId) => {
    try {
      setLoading(true)
      setLoadingStep('加载历史报告...')

      const response = await analysisAPI.getResults(analysisId)

      if (!response) {
        message.error('无法加载该分析报告，可能已被删除')
        setLoading(false)
        setShowFileSelector(true)
        return
      }

      setLoadingStep('报告加载完成！')
      setReportData(response)
      setEditableReport(response.report)
      setLoading(false)

      console.log('📄 已加载历史报告:', analysisId)
    } catch (error) {
      console.error('加载报告失败:', error)
      message.error('加载报告失败: ' + error.message)
      setLoading(false)
      setShowFileSelector(true)
    }
  }

  // 轮询分析进度（组件级，供 handleStartAnalysis 和 useEffect 共用）
  const startProgressPolling = () => {
    const interval = setInterval(async () => {
      try {
        const progress = await analysisAPI.getProgress()
        if (progress.progress !== undefined) {
          setLoadingProgress(progress.progress)
          if (progress.progress < 20) {
            setLoadingStep('正在加载数据到向量数据库...')
          } else if (progress.progress < 50) {
            setLoadingStep('AI 正在提取妆容风格和色调...')
          } else if (progress.progress < 80) {
            setLoadingStep('正在生成统计分析和图表...')
          } else if (progress.progress < 100) {
            setLoadingStep('AI 正在撰写分析报告...')
          }
        }
        if (progress.status === 'completed') {
          clearInterval(interval)
          setLoadingStep('加载分析结果...')
          message.success('分析完成！正在加载结果...')
          const latestResults = await analysisAPI.getLatestResults(100)
          // 必须有 report（含骨架与图表）才视为有效结果，避免空结果覆盖
          if (latestResults && latestResults.report) {
            setReportData(latestResults)
            setEditableReport(latestResults.report)
          } else if (latestResults && latestResults.message) {
            message.warning(latestResults.message)
          }
          setLoading(false)
        } else if (progress.status === 'error') {
          clearInterval(interval)
          setLoadingStep('分析失败')
          message.error('分析任务失败，请重试')
          setLoading(false)
        }
      } catch (error) {
        console.error('获取进度失败:', error)
        clearInterval(interval)
        setLoadingStep('连接失败')
        setLoading(false)
      }
    }, 3000)
  }

  // 手动开始分析
  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      message.error('请选择要分析的数据文件')
      return
    }

    try {
      setShowFileSelector(false)
      setLoading(true)
      setLoadingStep('启动 AI 智能分析...')

      const platform = selectedFile.split('/')[0] || 'xhs'

      console.log('📁 使用数据文件:', selectedFile)
      console.log('🎯 平台:', platform)
      console.log('📊 分析数量:', analysisLimit)

      const response = await analysisAPI.analyze({
        data_file: selectedFile,
        platform: platform,
        limit: analysisLimit
      })

      if (response.status === 'running') {
        setLoadingStep('AI 正在分析数据...')
        message.info('分析任务已启动，正在处理...')
        startProgressPolling()
        return
      }

      setLoadingStep('报告生成完成！')
      setReportData(response)
      setEditableReport(response.report)
      setLoading(false)
    } catch (error) {
      console.error('启动分析失败:', error)
      message.error(`启动分析失败: ${error.message}`)
      setLoading(false)
      setShowFileSelector(true)
    }
  }

  // 无报告时做一次后端诊断（用于区分「连不上」和「没有文件」）
  useEffect(() => {
    if (reportData?.report || loading || showFileSelector) {
      setBackendDiagnosis(null)
      return
    }
    let cancelled = false
    setBackendDiagnosis('checking')
    dataAPI.check()
      .then((res) => {
        if (cancelled) return
        setBackendDiagnosis(res.files_count > 0 ? 'has_files' : 'no_files')
      })
      .catch(() => {
        if (cancelled) return
        setBackendDiagnosis('no_connection')
      })
    return () => { cancelled = true }
  }, [reportData, loading, showFileSelector])

  // 从后端加载分析数据（自动模式或查看历史报告）
  useEffect(() => {
    if (analysisIdFromUrl) {
      // 模式 1: 从历史记录查看特定报告
      loadReportById(analysisIdFromUrl)
      return
    }

    if (!isAutoMode) return // 手动模式不自动加载
    const loadAnalysisData = async () => {
      try {
        setLoading(true)
        setLoadingStep('检查分析任务状态...')

        // 1. 先检查是否有分析任务正在运行
        const progressResponse = await analysisAPI.getProgress()

        if (progressResponse.status === 'running') {
          // 有任务正在运行，轮询进度
          setLoadingStep('检测到分析任务正在进行中，等待完成...')
          setLoadingProgress(progressResponse.progress || 0)
          message.info(`分析任务进行中 (${progressResponse.progress || 0}%)`)
          startProgressPolling()
          return
        }

        // 如果之前的任务已完成，尝试加载缓存的结果
        if (progressResponse.status === 'completed') {
          setLoadingStep('加载缓存的分析结果...')
          const latestResults = await analysisAPI.getLatestResults(100)
          if (latestResults && latestResults.results && latestResults.results.length > 0) {
            // 有缓存结果，直接使用
            setLoadingStep('报告加载完成！')
            setReportData(latestResults)
            setEditableReport(latestResults.report)
            setLoading(false)
            return
          }
          // 如果没有缓存结果，继续执行新的分析
        }

        // 2. 没有任务运行（或没有缓存结果），获取最新的数据文件列表
        setLoadingStep('查找爬虫采集的数据文件...')
        const filesResponse = await dataAPI.getFiles(null, 'json')

        if (!filesResponse.files || filesResponse.files.length === 0) {
          throw new Error('没有找到可用的数据文件，请先在分析工作台运行爬虫采集数据')
        }

        // 3. 选择数据文件（必须选择 contents 文件，后端会自动关联 comments）
        setLoadingStep('解析数据文件格式...')
        let contentsFile = filesResponse.files.find(f => {
          const path = f.path || f.file_path
          return path.includes('contents') || path.includes('content')
        })

        if (!contentsFile) {
          throw new Error('没有找到 contents 数据文件，请先运行爬虫采集帖子内容')
        }

        const dataFilePath = contentsFile.path || contentsFile.file_path

        // 从文件路径推断平台（例如：xhs/json/xxx.json -> xhs）
        const platform = dataFilePath.split('/')[0] || 'xhs'

        const analysisLimit = getAnalysisLimit()

        console.log('📁 使用数据文件:', dataFilePath)
        console.log('🔗 后端会自动关联对应的评论文件')
        console.log('🎯 平台:', platform)
        console.log('📊 分析数量:', analysisLimit === null ? '全部' : `${analysisLimit} 条`)

        // 4. 调用分析API
        setLoadingStep('启动 AI 智能分析...')
        const response = await analysisAPI.analyze({
          data_file: dataFilePath,
          platform: platform,
          limit: analysisLimit
        })

        // 5. 如果返回的是"任务正在运行"的响应，开始轮询
        if (response.status === 'running') {
          setLoadingStep('AI 正在分析数据...')
          message.info('分析任务已启动，正在处理...')
          startProgressPolling()
          return
        }

        setLoadingStep('报告生成完成！')
        setReportData(response)
        setEditableReport(response.report)
        setLoading(false)
      } catch (error) {
        console.error('加载分析数据失败:', error)
        message.error(`后端服务调用失败: ${error.message}`)
        setLoading(false)
      }
    }

    loadAnalysisData()
  }, [])

  // 如果显示文件选择器（手动模式且未开始分析）
  if (showFileSelector) {
    return (
      <div className="page-wrap">
        <header className="page-header animate-fade-in">
          <h1 className="page-title">选择数据文件</h1>
          <p className="page-subtitle">选择历史采集数据，启动 AI 智能分析</p>
        </header>

        <div className="report-selector-row">
          <div className="report-selector-form-wrap">
            <Card className="glass card-hover animate-slide-up report-selector-card" style={{ borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%', flex: 1 }}>
              <Alert
                message="提示"
                description="请选择爬虫采集的数据文件进行分析。系统会自动关联对应的评论数据。"
                type="info"
                showIcon
              />

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2d3436' }}>
                  数据文件
                </label>
                <Select
                  placeholder="选择要分析的数据文件"
                  value={selectedFile}
                  onChange={setSelectedFile}
                  loading={loadingFiles}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {availableFiles.map(file => {
                    const path = file.path || file.file_path
                    const fileName = path.split('/').pop()
                    const fileDate = fileName.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ''
                    return (
                      <Select.Option key={path} value={path}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{fileName}</span>
                          {fileDate && <span style={{ color: '#636e72', fontSize: '12px' }}>{fileDate}</span>}
                        </div>
                      </Select.Option>
                    )
                  })}
                </Select>
                {availableFiles.length === 0 && !loadingFiles && (
                  <p style={{ color: '#636e72', fontSize: '14px', marginTop: '8px' }}>
                    未找到数据文件，请先在分析工作台运行爬虫采集数据
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2d3436' }}>
                  分析数量
                </label>
                <InputNumber
                  min={1}
                  max={1000}
                  value={analysisLimit}
                  onChange={setAnalysisLimit}
                  placeholder="输入要分析的笔记数量"
                  style={{ width: '100%' }}
                  size="large"
                  addonAfter="条"
                />
                <p style={{ color: '#636e72', fontSize: '14px', marginTop: '8px' }}>
                  建议测试时使用较小数量（如 10 条），正式分析时可增加数量
                </p>
              </div>

              <Divider />

              <div style={{ textAlign: 'center' }}>
                <Space size="large">
                  <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/')}
                  >
                    返回工作台
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={handleStartAnalysis}
                    disabled={!selectedFile || availableFiles.length === 0}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                      border: 'none',
                      height: '48px',
                      padding: '0 40px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    开始 AI 分析
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
          </div>

          <div className="report-selector-lottie-wrap animate-slide-up">
            <Card className="report-selector-lottie-card" bodyStyle={{ padding: 0, height: '100%' }}>
              <div className="report-selector-lottie-grid">
                {[
                  { src: '/lottie/Love Calender.lottie', speed: 0.4 },
                  { src: '/lottie/Love Lock.lottie', speed: 0.7 },
                  { src: '/lottie/Love Message.lottie', speed: 0.7 },
                  { src: '/lottie/Valentine Gift Box.lottie', speed: 0.7 }
                ].map((item, i) => (
                  <div key={i} className="report-selector-lottie-cell">
                    <iframe
                      title={`Lottie ${i + 1}`}
                      src={`/lottie/player.html?src=${encodeURIComponent(item.src)}&fill=1&speed=${item.speed}`}
                      className="report-selector-lottie-iframe"
                      style={{ border: 'none', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // 如果还在加载中，显示加载动画
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          background: 'white',
          padding: '60px 40px',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#ff6b9d' }} />} />
          <p style={{ marginTop: 24, fontSize: 20, color: '#2d3436', fontWeight: '600' }}>
            正在生成分析报告
          </p>
          <p style={{ marginTop: 12, fontSize: 15, color: '#636e72' }}>
            {loadingStep}
          </p>

          {/* 如果有进度数据，显示进度条 */}
          {loadingProgress > 0 && (
            <div style={{ marginTop: 32 }}>
              <Progress
                percent={Math.floor(loadingProgress)}
                status="active"
                strokeColor={{
                  '0%': '#ff6b9d',
                  '100%': '#c44569'
                }}
                strokeWidth={10}
              />
            </div>
          )}

          <div style={{ marginTop: 32, fontSize: 13, color: '#95a5a6' }}>
            <p style={{ margin: 0 }}>💡 正在使用 AI 大模型分析数据</p>
            <p style={{ margin: 0, marginTop: 8 }}>⏱️ 这可能需要几分钟时间，请耐心等待</p>
          </div>
        </div>
      </div>
    )
  }

  // 如果没有数据，返回错误提示（根据后端诊断区分原因）
  if (!reportData || !reportData.report) {
    const isNoConnection = backendDiagnosis === 'no_connection'
    const isNoFiles = backendDiagnosis === 'no_files'
    const isChecking = backendDiagnosis === 'checking' || backendDiagnosis === null
    return (
      <div style={{ textAlign: 'center', padding: '200px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 24, color: '#ff6b9d' }}>⚠️</div>
        <p style={{ fontSize: 24, color: '#2d3436', fontWeight: '600', marginBottom: 12 }}>
          无法加载分析报告
        </p>
        <p style={{ fontSize: 16, color: '#636e72', marginBottom: 16 }}>
          {isChecking && '正在检查后端…'}
          {isNoConnection && '无法连接后端。请确认：Vercel 已配置 VITE_ANALYSIS_API_BASE 指向 Railway 地址，并已重新部署（Redeploy）；或后端服务已启动。'}
          {isNoFiles && '后端连接正常，但当前没有可用的数据文件。'}
          {backendDiagnosis === 'has_files' && '后端有数据文件，但尚未生成报告。请先选择文件并完成一次分析。'}
        </p>
        {(isNoFiles || backendDiagnosis === 'has_files') && (
          <p style={{ fontSize: 14, color: '#95a5a6', marginBottom: 24 }}>
            Railway 部署时，爬虫依赖 Cookie：若未配置 <code>crawler_config/xhs_cookies_default.txt</code>，点击「启动爬虫」会失败且不会产生文件。
          </p>
        )}
        {!isChecking && (
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
              border: 'none'
            }}
          >
            去分析工作台选择文件并分析
          </Button>
        )}
      </div>
    )
  }

  const report = editableReport || reportData.report

  // 报告数据来源：reportData 来自 API getLatestResults / getResults(analysis_id)，
  // 对应后端 backend/data/analyses/<analysis_id>.json 与内存缓存

  // 数据概览统计
  const overview = {
    totalNotes: reportData.statistics?.total_notes || 0,
    styleTypes: reportData.statistics?.styles?.length || 0,
    colorTypes: reportData.statistics?.colors?.length || 0
  }

  const handleSave = async () => {
    if (!reportData || !reportData.analysis_id) {
      message.error('无法保存：缺少分析 ID')
      return
    }

    try {
      message.loading('正在保存报告...', 0)

      await analysisAPI.updateReport(reportData.analysis_id, editableReport)

      setIsEditing(false)
      message.destroy()
      message.success('报告已保存到服务器')

      console.log('✅ 报告已保存:', reportData.analysis_id)
    } catch (error) {
      console.error('保存报告失败:', error)
      message.destroy()
      message.error('保存失败: ' + error.message)
    }
  }

  const handleExport = async (format) => {
    if (!reportData || !editableReport) {
      message.error('没有可导出的报告数据')
      return
    }

    try {
      message.loading(`正在导出${format}格式报告...`, 0)

      switch (format) {
        case 'pdf':
          await exportToPDF()
          break
        case 'word':
          await exportToWord()
          break
        case 'data':
          await exportToJSON()
          break
        default:
          message.error('不支持的导出格式')
      }
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败: ' + error.message)
    } finally {
      message.destroy()
    }
  }

  // 导出为 PDF
  const exportToPDF = async () => {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default

    // 隐藏编辑按钮和导出按钮
    const reportElement = document.querySelector('.report-content')
    if (!reportElement) {
      throw new Error('找不到报告内容')
    }

    // 生成 canvas
    const canvas = await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      logging: false
    })

    // 转换为 PDF
    const imgWidth = 210 // A4 宽度 (mm)
    const pageHeight = 297 // A4 高度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`趋势报告_${editableReport.report_title}_${new Date().toISOString().slice(0, 10)}.pdf`)
    message.success('PDF 导出成功')
  }

  // 导出为 Word
  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const { saveAs } = await import('file-saver')

    // 构建 Word 文档
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: editableReport.report_title,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            text: editableReport.summary,
            spacing: { before: 200, after: 200 }
          }),
          ...editableReport.sections.flatMap(section => [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: section.content,
              spacing: { after: 200 }
            })
          ]),
          new Paragraph({
            text: `统计数据摘要`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: `总笔记数: ${reportData.statistics.total_notes}`,
          }),
          new Paragraph({
            text: `分析成功: ${reportData.statistics.analyzed_notes}`,
          }),
          new Paragraph({
            text: `分析失败: ${reportData.statistics.failed_notes}`,
          })
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `趋势报告_${editableReport.report_title}_${new Date().toISOString().slice(0, 10)}.docx`)
    message.success('Word 导出成功')
  }

  // 导出为 JSON 数据
  const exportToJSON = async () => {
    const dataToExport = {
      report: editableReport,
      statistics: reportData.statistics,
      results: reportData.results,
      exported_at: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `趋势报告数据_${editableReport.report_title}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    message.success('数据导出成功')
  }

  // 更新报告字段
  const updateReportField = (field, value) => {
    setEditableReport({
      ...editableReport,
      [field]: value
    })
  }

  // 更新章节字段
  const updateSectionField = (sectionIndex, field, value) => {
    const newSections = [...editableReport.sections]
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      [field]: value
    }
    setEditableReport({
      ...editableReport,
      sections: newSections
    })
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 1400 }}>
      {/* 工具栏 */}
      <Card
        className="card-hover page-module animate-slide-up"
        style={{
          marginBottom: 20,
          borderRadius: '20px'
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
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
              type={isEditing ? 'primary' : 'default'}
              icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              style={{
                background: isEditing ? '#00b894' : 'white',
                color: isEditing ? 'white' : '#2d3436',
                borderColor: isEditing ? '#00b894' : '#dfe6e9',
                fontWeight: '600',
                height: '40px',
                padding: '0 24px',
                fontSize: '15px'
              }}
            >
              {isEditing ? '保存报告' : '编辑报告'}
            </Button>
          </Space>

          <Space size="middle">
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('pdf')}
              style={{
                background: 'white',
                color: '#2d3436',
                borderColor: '#dfe6e9',
                fontWeight: '600',
                height: '40px',
                padding: '0 20px',
                fontSize: '15px'
              }}
            >
              导出PDF
            </Button>
            <Button
              icon={<FileWordOutlined />}
              onClick={() => handleExport('word')}
              style={{
                background: 'white',
                color: '#2d3436',
                borderColor: '#dfe6e9',
                fontWeight: '600',
                height: '40px',
                padding: '0 20px',
                fontSize: '15px'
              }}
            >
              导出Word
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => handleExport('data')}
              style={{
                background: 'white',
                color: '#2d3436',
                borderColor: '#dfe6e9',
                fontWeight: '600',
                height: '40px',
                padding: '0 20px',
                fontSize: '15px'
              }}
            >
              导出数据
            </Button>
          </Space>
        </div>
      </Card>

      {/* 报告主体 */}
      <div className="report-content card-hover page-module animate-slide-up" style={{
        padding: '50px 60px',
        borderRadius: '20px'
      }}>
        {/* 标题（AI 生成） */}
        <div style={{ textAlign: 'center', marginBottom: 50, borderBottom: '3px solid #ff6b9d', paddingBottom: 30 }}>
          {isEditing ? (
            <TextArea
              value={report.report_title}
              onChange={(e) => updateReportField('report_title', e.target.value)}
              autoSize
              style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', border: '2px dashed #ff6b9d' }}
            />
          ) : (
            <Title level={1} style={{ fontSize: 32, marginBottom: 10, color: '#1a1a1a' }}>
              {report.report_title}
            </Title>
          )}
          <Text type="secondary" style={{ fontSize: 14 }}>
            D2C口红实验室 产品部门 | 报告生成时间：{new Date().toLocaleDateString('zh-CN')}
          </Text>
        </div>

        {/* 摘要（AI 生成） */}
        <Card
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                #fff5f8,
                #fff5f8 10px,
                #ffe8f0 10px,
                #ffe8f0 20px
              )
            `,
            borderLeft: '5px solid #ff6b9d',
            marginBottom: 40,
            boxShadow: '0 4px 8px rgba(255, 107, 157, 0.2)'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Title level={4} style={{ marginBottom: 16, color: '#2d3436' }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            摘要
          </Title>
          {isEditing ? (
            <TextArea
              value={report.summary}
              onChange={(e) => updateReportField('summary', e.target.value)}
              rows={5}
              style={{ fontSize: 15, lineHeight: '1.8', background: 'white' }}
            />
          ) : (
            <Paragraph style={{ fontSize: 15, lineHeight: '1.8', marginBottom: 0, color: '#2d3436' }}>
              {report.summary}
            </Paragraph>
          )}
        </Card>

        {/* 数据概览 */}
        <Title level={2} style={{ fontSize: 24, marginTop: 50, marginBottom: 24, color: '#2d3436' }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          数据概览
        </Title>

        <Row gutter={24} style={{ marginBottom: 30 }}>
          <Col span={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%)',
                border: 'none',
                boxShadow: '0 4px 8px rgba(255, 107, 157, 0.15)'
              }}
            >
              <Statistic
                title={<span style={{ color: '#ff6b9d', fontWeight: 'bold' }}>采集笔记数</span>}
                value={overview.totalNotes}
                valueStyle={{ color: '#ff6b9d', fontSize: 36, fontWeight: 'bold' }}
                suffix="条"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #f3f0ff 0%, #e5dbff 100%)',
                border: 'none',
                boxShadow: '0 4px 8px rgba(95, 39, 205, 0.15)'
              }}
            >
              <Statistic
                title={<span style={{ color: '#5f27cd', fontWeight: 'bold' }}>妆容风格类型</span>}
                value={overview.styleTypes}
                valueStyle={{ color: '#5f27cd', fontSize: 36, fontWeight: 'bold' }}
                suffix="种"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #e0f9ff 0%, #b8ecff 100%)',
                border: 'none',
                boxShadow: '0 4px 8px rgba(0, 210, 211, 0.15)'
              }}
            >
              <Statistic
                title={<span style={{ color: '#00d2d3', fontWeight: 'bold' }}>口红色调类型</span>}
                value={overview.colorTypes}
                valueStyle={{ color: '#00d2d3', fontSize: 36, fontWeight: 'bold' }}
                suffix="种"
              />
            </Card>
          </Col>
        </Row>

        <Divider style={{ margin: '50px 0', borderColor: '#dfe6e9' }} />

        {/* 动态渲染章节（AI 决定数量和内容） */}
        {report.sections && report.sections
          .sort((a, b) => a.order - b.order)
          .map((section, sectionIndex) => (
            <div key={section.section_id}>
              {/* 章节标题 */}
              <Title level={2} style={{ fontSize: 24, marginBottom: 24, color: '#2d3436' }}>
                {section.order}. {section.title}
              </Title>

              {/* 章节内容（AI 撰写的分析文本） */}
              {isEditing ? (
                <TextArea
                  value={section.content}
                  onChange={(e) => updateSectionField(sectionIndex, 'content', e.target.value)}
                  rows={4}
                  style={{ fontSize: 15, marginBottom: 20, lineHeight: '1.8' }}
                />
              ) : (
                <Paragraph style={{ fontSize: 15, lineHeight: '1.8', color: '#636e72', marginBottom: 24, whiteSpace: 'pre-wrap' }}>
                  {section.content}
                </Paragraph>
              )}

              {/* 动态渲染该章节的图表（AI 决定数量和类型） */}
              {section.charts && section.charts.map((chart, chartIndex) => (
                <Card
                  key={chartIndex}
                  title={
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#2d3436' }}>
                      图 {section.order}.{chartIndex + 1}: {chart.chart_title}
                    </span>
                  }
                  style={{
                    marginTop: 20,
                    marginBottom: 30,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #dfe6e9'
                  }}
                  bodyStyle={{ padding: '24px' }}
                >
                  {chart.description && (
                    <Paragraph style={{ fontSize: 14, color: '#95a5a6', marginBottom: 16 }}>
                      {chart.description}
                    </Paragraph>
                  )}
                  <ReactECharts
                    option={chart.echarts_option}
                    style={{ height: 400 }}
                  />
                </Card>
              ))}

              <Divider style={{ margin: '50px 0', borderColor: '#dfe6e9' }} />
            </div>
          ))}

        {/* 页脚 */}
        <div style={{ textAlign: 'center', color: '#b2bec3', fontSize: 13, paddingBottom: 20 }}>
          <p style={{ marginBottom: 8 }}>本报告由 D2C 口红实验室 AI 自动生成</p>
          <p style={{ marginBottom: 0 }}>数据来源：小红书、抖音、微博等多平台 | 分析方法：AI大模型 + RAG 专业美妆知识库</p>
        </div>
      </div>
    </div>
  )
}

export default TrendReport
