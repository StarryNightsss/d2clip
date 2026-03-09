// API 服务层：后端地址由环境变量配置，部署时在构建平台设置 VITE_ANALYSIS_API_BASE
// 爬虫已集成到主后端（xhs_simple），爬虫和数据分析使用同一 API 地址，不要设置 VITE_CRAWLER_API_BASE
const ANALYSIS_API_BASE = import.meta.env.VITE_ANALYSIS_API_BASE
  || (import.meta.env.DEV ? 'http://localhost:8000/api' : `${window.location.origin}/api`)
const CRAWLER_API_BASE = ANALYSIS_API_BASE

// 从本地存储读取 JWT（登录成功后写入）
const getToken = () => localStorage.getItem('token')

// 通用请求封装（注意：crawler/data 与 analysis 同端口）；带 token 时自动加 Authorization
const request = async (url, options = {}, baseUrl = ANALYSIS_API_BASE) => {
  try {
    const token = getToken()
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  // 获取日志（可选 signal 用于超时中断）
  getLogs: (limit = 100, signal) =>
    request(`/crawler/logs?limit=${limit}`, { signal }, CRAWLER_API_BASE),

  // SSE 日志流 URL（实时推送，无超时）
  getLogsStreamUrl: () => `${CRAWLER_API_BASE.replace(/\/$/, '')}/crawler/logs/stream`,
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

// 登录与用户信息（DB 配置时生效）
export const authAPI = {
  login: (username, password, department) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, department: department || undefined }),
    }),
}

// 职员管理 CRUD（仅当后端配置 DATABASE_URL 时存在 /api/users）
export const usersAPI = {
  getList: () => request('/users'),
  create: (body) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: (id) =>
    fetch(`${ANALYSIS_API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((err) => { throw new Error(err.detail || `HTTP ${res.status}`) })
      }
    }),
}

// 企业社群 API（与后端 community 路由对接）
export const communityAPI = {
  getUsers: () => request('/community/users', {}, ANALYSIS_API_BASE),
  getGroups: (userId, department) => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (department) params.append('department', department)
    return request(`/community/groups${params.toString() ? `?${params.toString()}` : ''}`, {}, ANALYSIS_API_BASE)
  },
  markGroupRead: (groupKey, userId) => request(`/community/groups/${groupKey}/read`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId || '' }),
  }, ANALYSIS_API_BASE),
  getPosts: (groupKey) => request(`/community/groups/${groupKey}/posts`, {}, ANALYSIS_API_BASE),
  createPost: (groupKey, body) => request(`/community/groups/${groupKey}/posts`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),
  createReportPost: (groupKey, body = {}) => request(`/community/groups/${groupKey}/posts/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),

  likePost: (postId, body = {}) => request(`/community/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),
  sharePost: (postId) => request(`/community/posts/${postId}/share`, { method: 'POST' }, ANALYSIS_API_BASE),
  addComment: (postId, body) => request(`/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),

  deleteComment: (postId, commentIndex) => request(`/community/posts/${postId}/comments/${commentIndex}`, {
    method: 'DELETE',
  }, ANALYSIS_API_BASE),

  forwardPost: (postId, body) => request(`/community/posts/${postId}/forward`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),

  updatePost: (postId, body) => request(`/community/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, ANALYSIS_API_BASE),

  deletePost: (postId) => request(`/community/posts/${postId}`, {
    method: 'DELETE',
  }, ANALYSIS_API_BASE),

  // 上传文件（原格式保存），返回 { file_id, name, size }，发帖时放入 attachments
  uploadFile: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${ANALYSIS_API_BASE}/community/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '上传失败' }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // 下载链接（上传什么格式就按什么格式下载，持久化存储）
  getFileDownloadUrl: (fileId) => `${ANALYSIS_API_BASE}/community/files/${fileId}/download`,
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

  // 诊断：后端是否可连、是否有数据文件（用于无报告时的错误提示）
  check: () => request('/data/check', {}, CRAWLER_API_BASE),

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
