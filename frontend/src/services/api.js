// API 服务层
// 爬虫API: http://localhost:8080/api
// 分析API: http://localhost:8000/api
const CRAWLER_API_BASE = 'http://localhost:8080/api'
const ANALYSIS_API_BASE = 'http://localhost:8000/api'

// 通用请求封装
const request = async (url, options = {}, baseUrl = CRAWLER_API_BASE) => {
  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '请求失败' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API 请求错误:', error)
    throw error
  }
}

// 爬虫相关 API（爬虫后端）
export const crawlerAPI = {
  // 启动爬虫任务
  start: (params) => request('/crawler/start', {
    method: 'POST',
    body: JSON.stringify(params),
  }, CRAWLER_API_BASE),

  // 停止爬虫任务
  stop: () => request('/crawler/stop', { method: 'POST' }, CRAWLER_API_BASE),

  // 获取爬虫状态
  getStatus: () => request('/crawler/status', {}, CRAWLER_API_BASE),

  // 获取日志
  getLogs: (limit = 100) => request(`/crawler/logs?limit=${limit}`, {}, CRAWLER_API_BASE),
}

// 分析相关 API（新后端）
export const analysisAPI = {
  // 分析笔记
  analyze: (params) => request('/analysis/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  }, ANALYSIS_API_BASE),

  // 获取分析状态
  getStatus: () => request('/analysis/status', {}, ANALYSIS_API_BASE),

  // 获取指定分析任务的结果详情
  getResults: (analysisId) => request(`/analysis/results/${analysisId}`, {}, ANALYSIS_API_BASE),

  // 获取最近一次分析的结果列表
  getLatestResults: (limit = 100) => request(`/analysis/latest-results?limit=${limit}`, {}, ANALYSIS_API_BASE),

  // 获取当前分析任务进度
  getProgress: () => request('/analysis/progress', {}, ANALYSIS_API_BASE),

  // 获取分析历史记录
  getHistory: (limit = 10, offset = 0, platform = null) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit)
    if (offset) params.append('offset', offset)
    if (platform) params.append('platform', platform)
    return request(`/analysis/history?${params.toString()}`, {}, ANALYSIS_API_BASE)
  },

  // 更新报告内容
  updateReport: (analysisId, updatedReport) => request(`/analysis/report/${analysisId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedReport),
  }, ANALYSIS_API_BASE),
}

// 数据相关 API（爬虫后端）
export const dataAPI = {
  // 获取数据文件列表
  getFiles: (platform, fileType) => {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (fileType) params.append('file_type', fileType)
    return request(`/data/files${params.toString() ? '?' + params.toString() : ''}`, {}, CRAWLER_API_BASE)
  },

  // 获取文件内容
  getFileContent: (filePath, preview = true, limit = 100) =>
    request(`/data/files/${filePath}?preview=${preview}&limit=${limit}`, {}, CRAWLER_API_BASE),

  // 获取数据统计
  getStats: () => request('/data/stats', {}, CRAWLER_API_BASE),

  // 下载文件
  downloadFile: (filePath) => {
    window.open(`${CRAWLER_API_BASE}/data/download/${filePath}`, '_blank')
  },
}

// 配置相关 API（爬虫后端）
export const configAPI = {
  // 获取支持的平台
  getPlatforms: () => request('/config/platforms', {}, CRAWLER_API_BASE),

  // 获取配置选项
  getOptions: () => request('/config/options', {}, CRAWLER_API_BASE),
}

// 健康检查
export const healthCheck = {
  crawler: () => request('/health', {}, CRAWLER_API_BASE),
  analysis: () => request('/api/health', {}, ANALYSIS_API_BASE),
}
