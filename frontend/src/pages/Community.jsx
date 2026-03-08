import { Card, List, Avatar, Space, Button, Tag, Input, Badge, Dropdown, message, Divider, Empty, Modal, Spin } from 'antd'
import { MessageOutlined, LikeOutlined, ShareAltOutlined, SendOutlined, MoreOutlined, UserOutlined, AimOutlined, ExperimentOutlined, SoundOutlined, EditOutlined, SearchOutlined, PlusOutlined, FileTextOutlined, ClockCircleOutlined, TeamOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { communityAPI, analysisAPI } from '../services/api'

const { TextArea } = Input
const { Search } = Input

// 部门/群 key -> 图标（保留原有界面风格）
const DEPT_ICONS = {
  product: <AimOutlined />,
  rd: <ExperimentOutlined />,
  market: <SoundOutlined />,
  operation: <EditOutlined />,
  product_small: <TeamOutlined />,
  product_rd: <MessageOutlined />,
  rd_small: <TeamOutlined />
}

function formatTime(createdAt) {
  if (createdAt == null || createdAt === '') return '刚刚'
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return '刚刚'
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
  return d.toLocaleDateString('zh-CN')
}

/** 完整日期时间（历史记录持久化，带日期时间）；无效日期返回 '-' 避免 NaN */
function formatDateTime(createdAt) {
  if (createdAt == null || createdAt === '') return '-'
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${h}:${min}`
}

/** 列表用日期分组标题：今天 / 昨天 / 2月25日 */
function formatDateGroup(createdAt) {
  if (createdAt == null || createdAt === '') return ''
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return '今天'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const Community = () => {
  const navigate = useNavigate()
  const commentsSectionRef = useRef(null)
  const [activeDept, setActiveDept] = useState('product')
  const [selectedPost, setSelectedPost] = useState(null)
  const [replyContent, setReplyContent] = useState('')

  // 后端数据
  const [groups, setGroups] = useState([])
  const [postsByGroup, setPostsByGroup] = useState({})
  const [userAvatarMap, setUserAvatarMap] = useState({}) // username -> avatar，用于评论/帖子作者头像展示
  const [searchKeyword, setSearchKeyword] = useState('') // 搜索关键词：左侧筛部门/群，右侧筛当前群内帖子
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  // 发布弹窗
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishType, setPublishType] = useState('text') // 'text' | 'report'
  const [publishTitle, setPublishTitle] = useState('')
  const [publishContent, setPublishContent] = useState('')
  const [publishSubmitting, setPublishSubmitting] = useState(false)
  // 发布报告：选择历史报告弹窗
  const [reportSelectModalOpen, setReportSelectModalOpen] = useState(false)
  const [analysisHistoryList, setAnalysisHistoryList] = useState([])
  const [analysisHistoryLoading, setAnalysisHistoryLoading] = useState(false)
  const [publishingReportId, setPublishingReportId] = useState(null)
  // 转发到群弹窗
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  // 编辑帖子弹窗
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // 当前用户部门（登录时选择的身份，用于过滤可见群组）
  const userDepartment = (() => {
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      return (info.department || 'product').toLowerCase()
    } catch {
      return 'product'
    }
  })()

  // 当前用户头像（优先 localStorage，其次从员工列表 userAvatarMap 取）
  const currentUserAvatar = (() => {
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      return info.avatar || undefined
    } catch {
      return undefined
    }
  })()

  // 当前登录用户身份（用于帖子编辑/删除权限：仅本人或 admin 可操作）
  const { currentUsername, currentUserName, isAdminUser } = (() => {
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      const username = (info.username || '').trim()
      const name = (info.name || '').trim()
      return {
        currentUsername: username,
        currentUserName: name,
        isAdminUser: username === 'admin@d2clip.com' || (info.department || '').toLowerCase() === 'admin'
      }
    } catch {
      return { currentUsername: '', currentUserName: '', isAdminUser: false }
    }
  })()

  // 按部门过滤后的群组，并分为「部门」与「小群」两块（左侧列表始终展示，不随搜索关键词隐藏）
  const { departmentList, smallGroupList } = useMemo(() => {
    const memberMatch = (g) => {
      const deps = g.member_departments || []
      return deps.length === 0 || deps.includes(userDepartment)
    }
    const list = groups.filter(memberMatch).map(g => ({
      ...g,
      icon: DEPT_ICONS[g.key] || (g.type === 'small' ? <MessageOutlined /> : <EditOutlined />)
    }))
    const departmentList = list.filter(g => g.type === 'department')
    const smallGroupList = list.filter(g => g.type === 'small')
    return { departmentList, smallGroupList }
  }, [groups, userDepartment])

  // 当前选中的群必须在可见列表里，否则切到第一个可见群
  const visibleGroupKeys = useMemo(() => [...departmentList.map(g => g.key), ...smallGroupList.map(g => g.key)], [departmentList, smallGroupList])
  useEffect(() => {
    if (visibleGroupKeys.length > 0 && !visibleGroupKeys.includes(activeDept)) {
      setActiveDept(visibleGroupKeys[0])
    }
  }, [visibleGroupKeys, activeDept])


  // 合并后的全部可见群（用于统一渲染列表）
  const departments = useMemo(() => [...departmentList, ...smallGroupList], [departmentList, smallGroupList])

  const currentDept = useMemo(() => {
    const g = departments.find(x => x.key === activeDept)
    if (!g) return { name: '', icon: null, color: '#999', description: '', posts: [], type: 'department' }
    const posts = postsByGroup[activeDept] || []
    const kw = (searchKeyword || '').trim().toLowerCase()
    const filteredPosts = kw
      ? posts.filter(p => {
          const title = (p.title || '').toLowerCase()
          const content = (p.content || '').toLowerCase()
          const author = (p.author || '').toLowerCase()
          const tags = (p.tags || []).join(' ').toLowerCase()
          return title.includes(kw) || content.includes(kw) || author.includes(kw) || tags.includes(kw)
        })
      : posts
    return {
      ...g,
      posts: filteredPosts
    }
  }, [departments, activeDept, postsByGroup, searchKeyword])

  const isSmallGroup = currentDept.type === 'small'

  // 小群：优先用群配置的 members，否则从帖子与评论中提取（去重）
  const groupMembers = useMemo(() => {
    if (!isSmallGroup) return []
    if (currentDept.members && currentDept.members.length > 0) {
      return currentDept.members
    }
    if (!currentDept.posts) return []
    const set = new Set()
    currentDept.posts.forEach(p => {
      if (p.author) set.add(p.author)
      ;(p.comment_list || []).forEach(c => { if (c.author) set.add(c.author) })
    })
    return Array.from(set).map(name => ({ name: String(name), role: '' }))
  }, [isSmallGroup, currentDept.members, currentDept.posts])

  // 小群：当前群内所有附件（带帖子引用，便于下载）
  const groupFiles = useMemo(() => {
    if (!isSmallGroup || !currentDept.posts) return []
    const list = []
    currentDept.posts.forEach(p => {
      ;(p.attachments || []).forEach((file, idx) => {
        list.push({ ...file, post: p, fileIndex: idx })
      })
    })
    return list
  }, [isSmallGroup, currentDept.posts])

  // 小群发消息：标题、内容、附件（附件先上传，存 file_id，下载时原格式）
  const [smallGroupNewTitle, setSmallGroupNewTitle] = useState('')
  const [smallGroupNewContent, setSmallGroupNewContent] = useState('')
  const [smallGroupNewAttachments, setSmallGroupNewAttachments] = useState([])
  const [smallGroupSending, setSmallGroupSending] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  // 发布弹窗附件
  const [publishAttachments, setPublishAttachments] = useState([])

  /** 选择文件后先上传，再加入附件列表（上传什么格式下载就什么格式，服务端持久化） */
  const handleAddFiles = async (files, setAttachments) => {
    if (!files?.length) return
    setUploadingAttachment(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const info = await communityAPI.uploadFile(files[i])
        setAttachments(prev => [...prev, info])
      }
      message.success('已上传 ' + files.length + ' 个文件')
    } catch (e) {
      message.error(e.message || '上传失败')
    } finally {
      setUploadingAttachment(false)
    }
  }

  // 拉取群组列表（带当前用户 id 时后端返回 has_unread 红点；部门用登录时选择的身份）
  const fetchGroups = useCallback(() => {
    let userId = ''
    let department = ''
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      userId = info.username || info.name || info.email || ''
      department = (info.department || '').trim()
    } catch (_) {}
    return communityAPI.getGroups(userId || undefined, department || undefined)
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {
        setGroups([])
        message.error('加载群组失败')
      })
  }, [])
  useEffect(() => {
    let cancelled = false
    setLoadingGroups(true)
    fetchGroups().finally(() => { if (!cancelled) setLoadingGroups(false) })
    return () => { cancelled = true }
  }, [fetchGroups])

  // 定期刷新群列表以更新「新消息」红点（别人发帖后无需手动刷新页面）
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGroups()
    }, 45000)
    return () => clearInterval(interval)
  }, [fetchGroups])

  // 拉取员工列表（name/username -> avatar），评论和帖子作者无论显示名还是登录名都能对上头像
  useEffect(() => {
    communityAPI.getUsers()
      .then(users => {
        if (Array.isArray(users)) {
          const map = {}
          users.forEach(u => {
            if (!u) return
            const av = u.avatar || undefined
            if (u.username) map[u.username] = av
            if (u.name) map[u.name] = av
          })
          setUserAvatarMap(map)
        }
      })
      .catch(() => {})
  }, [])

  // 进入某群时标记已读（持久化到后端）；先乐观更新角标，再请求后端；无 userId 时后端会从 JWT 取当前用户
  useEffect(() => {
    if (!activeDept) return
    setGroups(prev => prev.map(g => g.key === activeDept ? { ...g, has_unread: false } : g))
    let userId = ''
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      userId = (info.username || info.name || info.email || '').trim()
    } catch (_) {}
    communityAPI
      .markGroupRead(activeDept, userId)
      .then((res) => {
        if (res && res.ok === false && res.message) console.warn('标记已读:', res.message)
        else fetchGroups()
      })
      .catch((err) => {
        console.error('标记已读失败（红点可能不会持久化）', err)
      })
  }, [activeDept])

  // 一进来就拉取所有可见群的帖子，这样角标（有消息的群）在进页时就有，点进某群后该群角标消失
  useEffect(() => {
    if (visibleGroupKeys.length === 0) return
    let cancelled = false
    setLoadingPosts(true)
    Promise.all(visibleGroupKeys.map(key => communityAPI.getPosts(key)))
      .then(results => {
        if (cancelled) return
        setPostsByGroup(prev => {
          const next = {}
          visibleGroupKeys.forEach((key, i) => {
            const arr = Array.isArray(results[i]) ? results[i] : []
            const prevArr = prev[key]
            if (!Array.isArray(prevArr) || arr.length >= prevArr.length) {
              next[key] = arr
            } else {
              next[key] = prevArr
            }
          })
          return { ...prev, ...next }
        })
      })
      .catch(() => {
        if (!cancelled) message.error('加载部分群消息失败')
      })
      .finally(() => { if (!cancelled) setLoadingPosts(false) })
    return () => { cancelled = true }
  }, [visibleGroupKeys.join(',')])

  // 切换当前群时，若该群帖子尚未加载则拉取（例如刚加入的新群）。有可见群时由上面「拉取所有群」统一拉取，避免和第一条帖子竞态覆盖。
  useEffect(() => {
    if (!activeDept) return
    if (Array.isArray(postsByGroup[activeDept])) return
    if (visibleGroupKeys.length > 0) return
    let cancelled = false
    communityAPI.getPosts(activeDept)
      .then(data => {
        if (!cancelled) {
          setPostsByGroup(prev => ({ ...prev, [activeDept]: Array.isArray(data) ? data : [] }))
        }
      })
      .catch(() => {
        if (!cancelled) setPostsByGroup(prev => ({ ...prev, [activeDept]: [] }))
      })
    return () => { cancelled = true }
  }, [activeDept, postsByGroup, visibleGroupKeys.length])

  // 切换群组时选第一条；同一群内帖子列表更新时（点赞/评论/转发后）保留当前选中并同步最新数据，不跳到第一条
  useEffect(() => {
    const posts = postsByGroup[activeDept] || []
    const currentId = selectedPost?.id
    const found = posts.find(p => String(p.id) === String(currentId))
    if (found) {
      setSelectedPost(found)
    } else if (posts.length > 0) {
      setSelectedPost(posts[0])
    } else {
      setSelectedPost(null)
    }
  }, [activeDept, postsByGroup])

  const refreshCurrentPosts = () => {
    return communityAPI.getPosts(activeDept).then(data => {
      setPostsByGroup(prev => ({ ...prev, [activeDept]: Array.isArray(data) ? data : [] }))
      return data
    })
  }

  const currentUserId = (() => {
    try {
      const raw = localStorage.getItem('userInfo')
      const info = raw ? JSON.parse(raw) : {}
      return info.username || info.name || ''
    } catch { return '' }
  })()

  const handleLike = async () => {
    if (!selectedPost?.id) return
    try {
      const updated = await communityAPI.likePost(selectedPost.id, { user_id: currentUserId })
      const didLike = (updated.liked_by || []).includes(currentUserId)
      message.success(didLike ? '已点赞' : '已取消赞')
      const merged = { ...selectedPost, ...updated }
      setSelectedPost(merged)
      setPostsByGroup(prev => ({
        ...prev,
        [activeDept]: (prev[activeDept] || []).map(p => p.id === updated.id ? { ...p, ...updated } : p)
      }))
    } catch (e) {
      message.error(e.message || '操作失败')
    }
  }

  const handleShare = () => {
    setForwardModalOpen(true)
  }

  const handleEditOpen = () => {
    if (!selectedPost) return
    setEditTitle(selectedPost.title || '')
    setEditContent(selectedPost.content || '')
    setEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedPost?.id) return
    if (!editTitle.trim()) {
      message.warning('请输入标题')
      return
    }
    setEditSubmitting(true)
    try {
      const updated = await communityAPI.updatePost(selectedPost.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        preview: editContent.trim().slice(0, 120) + (editContent.length > 120 ? '...' : '')
      })
      message.success('已保存')
      setEditModalOpen(false)
      const merged = { ...selectedPost, ...updated }
      setSelectedPost(merged)
      setPostsByGroup(prev => ({
        ...prev,
        [activeDept]: (prev[activeDept] || []).map(p => p.id === updated.id ? { ...p, ...updated } : p)
      }))
      refreshCurrentPosts()
    } catch (e) {
      message.error(e.message || '保存失败')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeletePost = () => {
    if (!selectedPost?.id) return
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这条帖子吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await communityAPI.deletePost(selectedPost.id)
          message.success('已删除')
          setSelectedPost(null)
          refreshCurrentPosts()
        } catch (e) {
          message.error(e.message || '删除失败')
        }
      }
    })
  }

  const handleForwardToGroup = async (targetGroupKey) => {
    if (!selectedPost?.id) return
    const userInfo = (() => {
      try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : {}
      } catch { return {} }
    })()
    const author = userInfo.username || userInfo.name || '系统用户'
    const role = userInfo.departmentName || '成员'
    try {
      const newPost = await communityAPI.forwardPost(selectedPost.id, { target_group_key: targetGroupKey, author, role })
      const updatedOriginal = await communityAPI.sharePost(selectedPost.id)
      message.success('已转发到该群')
      setForwardModalOpen(false)
      setSelectedPost(prev => prev ? { ...prev, ...updatedOriginal } : null)
      setPostsByGroup(prev => ({
        ...prev,
        [activeDept]: (prev[activeDept] || []).map(p => p.id === selectedPost.id ? { ...p, ...updatedOriginal } : p),
        [targetGroupKey]: [newPost, ...(prev[targetGroupKey] || [])]
      }))
    } catch (e) {
      message.error(e.message || '转发失败')
    }
  }

  const handleDownloadAttachment = (file, fileIndex) => {
    const post = selectedPost
    if (!post) return
    if (post.type === 'report' && post.analysis_id) {
      window.open(`${window.location.origin}/#/report?analysis_id=${post.analysis_id}`, '_blank')
      message.success('已在新标签打开报告')
      return
    }
    if (file.file_id) {
      window.open(communityAPI.getFileDownloadUrl(file.file_id), '_blank')
      message.success('已开始下载，格式与上传时一致')
      return
    }
    const text = `${post.title || '帖子'}\n\n${post.content || ''}\n\n附件：${file.name || ''}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file.name || '附件').replace(/\.[^.]+$/, '') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 小群「当前文件」列表中下载（可传任意帖子）；有 file_id 则按原格式下载 */
  const downloadGroupFile = (post, file, fileIndex) => {
    if (!post) return
    if (post.type === 'report' && post.analysis_id) {
      window.open(`${window.location.origin}/#/report?analysis_id=${post.analysis_id}`, '_blank')
      message.success('已在新标签打开报告')
      return
    }
    if (file.file_id) {
      window.open(communityAPI.getFileDownloadUrl(file.file_id), '_blank')
      message.success('已开始下载，格式与上传时一致')
      return
    }
    const text = `${post.title || '帖子'}\n\n${post.content || ''}\n\n附件：${file.name || ''}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file.name || '附件').replace(/\.[^.]+$/, '') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteComment = async (commentIndex) => {
    if (!selectedPost?.id) return
    try {
      const updated = await communityAPI.deleteComment(selectedPost.id, commentIndex)
      message.success('已删除')
      const merged = { ...selectedPost, ...updated }
      setSelectedPost(merged)
      setPostsByGroup(prev => ({
        ...prev,
        [activeDept]: (prev[activeDept] || []).map(p => p.id === updated.id ? { ...p, ...updated } : p)
      }))
    } catch (e) {
      message.error(e.message || '删除失败')
    }
  }

  const handleSmallGroupSend = async () => {
    if (!smallGroupNewContent.trim() && smallGroupNewAttachments.length === 0) {
      message.warning('请输入内容或添加文件')
      return
    }
    const userInfo = (() => {
      try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : {}
      } catch { return {} }
    })()
    const author = userInfo.username || userInfo.name || '系统用户'
    const role = userInfo.departmentName || '成员'
    setSmallGroupSending(true)
    try {
      const title = smallGroupNewTitle.trim() || smallGroupNewContent.trim().slice(0, 50) || '消息'
      await communityAPI.createPost(activeDept, {
        title,
        content: smallGroupNewContent.trim() || '(附带文件)',
        preview: (smallGroupNewContent.trim() || '').slice(0, 120) + (smallGroupNewContent.length > 120 ? '...' : ''),
        author,
        role,
        avatar: currentUserAvatar,
        attachments: smallGroupNewAttachments.length > 0 ? smallGroupNewAttachments : undefined
      })
      message.success('已发送')
      setSmallGroupNewTitle('')
      setSmallGroupNewContent('')
      setSmallGroupNewAttachments([])
      const list = await refreshCurrentPosts()
      if (list && list.length > 0 && !selectedPost) setSelectedPost(list[0])
    } catch (e) {
      message.error(e.message || '发送失败')
    } finally {
      setSmallGroupSending(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容')
      return
    }
    if (!selectedPost?.id) return
    const userInfo = (() => {
      try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : {}
      } catch { return {} }
    })()
    const author = userInfo.username || userInfo.name || '系统用户'
    const role = userInfo.departmentName || '成员'
    const avatar = userInfo.avatar || currentUserAvatar || userAvatarMap[author] || undefined
    try {
      const updated = await communityAPI.addComment(selectedPost.id, { content: replyContent.trim(), author, role, avatar })
      message.success('回复成功')
      setReplyContent('')
      const merged = { ...selectedPost, ...updated }
      setSelectedPost(merged)
      setPostsByGroup(prev => ({
        ...prev,
        [activeDept]: (prev[activeDept] || []).map(p => p.id === updated.id ? { ...p, ...updated } : p)
      }))
    } catch (e) {
      message.error(e.message || '回复失败')
    }
  }

  const openPublishModal = (type) => {
    setPublishType(type)
    setPublishTitle('')
    setPublishContent('')
    setPublishAttachments([])
    setPublishModalOpen(true)
  }

  // 打开「选择报告」弹窗时拉取分析历史
  useEffect(() => {
    if (!reportSelectModalOpen) return
    let cancelled = false
    setAnalysisHistoryLoading(true)
    analysisAPI.getHistory(20, 0, null)
      .then(res => {
        if (!cancelled) setAnalysisHistoryList(res.items || [])
      })
      .catch(() => {
        if (!cancelled) message.error('加载分析历史失败')
      })
      .finally(() => { if (!cancelled) setAnalysisHistoryLoading(false) })
    return () => { cancelled = true }
  }, [reportSelectModalOpen])

  const handlePublishReport = async (analysisId) => {
    const userInfo = (() => {
      try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : {}
      } catch { return {} }
    })()
    const author = userInfo.username || userInfo.name || '系统用户'
    const role = userInfo.departmentName || '成员'
    setPublishingReportId(analysisId)
    try {
      await communityAPI.createReportPost(activeDept, { analysis_id: analysisId, author, role })
      message.success('报告已发布到当前群组')
      setReportSelectModalOpen(false)
      const list = await refreshCurrentPosts()
      if (list && list.length > 0) setSelectedPost(list[0])
    } catch (e) {
      message.error(e.message || '发布报告失败')
    } finally {
      setPublishingReportId(null)
    }
  }

  const handlePublishSubmit = async () => {
    const userInfo = (() => {
      try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
    }})()
    const author = userInfo.username || userInfo.name || '系统用户'
    const role = userInfo.departmentName || '成员'

    if (!publishTitle.trim()) {
      message.warning('请输入标题')
      return
    }
    if (!publishContent.trim()) {
      message.warning('请输入内容')
      return
    }
    setPublishSubmitting(true)
    try {
      await communityAPI.createPost(activeDept, {
        title: publishTitle.trim(),
        content: publishContent.trim(),
        preview: publishContent.trim().slice(0, 120) + (publishContent.length > 120 ? '...' : ''),
        author,
        role,
        avatar: currentUserAvatar,
        attachments: publishAttachments.length > 0 ? publishAttachments : undefined
      })
      message.success('发布成功')
      setPublishModalOpen(false)
      setPublishAttachments([])
      const list = await refreshCurrentPosts()
      if (list && list.length > 0) setSelectedPost(list[0])
    } catch (e) {
      message.error(e.message || '发布失败')
    } finally {
      setPublishSubmitting(false)
    }
  }

  const handleViewReport = (post) => {
    if (post.type === 'report' && post.analysis_id) {
      navigate(`/report?analysis_id=${post.analysis_id}`)
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      {/* 左侧：部门导航 */}
      <div style={{
        width: 240,
        background: 'white',
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <Search
            placeholder="搜索部门/群或当前群内帖子（标题、正文、作者、标签）"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            style={{ borderRadius: 6 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {loadingGroups ? (
            <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
          ) : (
            <>
              {departmentList.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#999', padding: '12px 12px 6px', fontWeight: 500 }}>部门</div>
                  {departmentList.map(dept => {
                    const postCount = (postsByGroup[dept.key] || []).length
                    const showBadge = !!dept.has_unread
                    return (
                      <div
                        key={dept.key}
                        onClick={() => setActiveDept(dept.key)}
                        style={{
                          padding: '12px 12px',
                          marginBottom: 4,
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: activeDept === dept.key ? (dept.color || '#ff6b9d') : 'transparent',
                          color: activeDept === dept.key ? 'white' : '#333',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: activeDept === dept.key ? 'rgba(255,255,255,0.2)' : (dept.color || '#999'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          color: 'white'
                        }}>
                          {dept.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '500', fontSize: 14 }}>{dept.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dept.description}
                          </div>
                        </div>
                        {showBadge && <Badge count={postCount} style={{ background: '#ff4d4f' }} />}
                      </div>
                    )
                  })}
                </>
              )}
              {smallGroupList.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#999', padding: '12px 12px 6px', fontWeight: 500, marginTop: 8 }}>小群</div>
                  {smallGroupList.map(dept => {
                    const postCount = (postsByGroup[dept.key] || []).length
                    const showBadge = !!dept.has_unread
                    return (
                      <div
                        key={dept.key}
                        onClick={() => setActiveDept(dept.key)}
                        style={{
                          padding: '12px 12px',
                          marginBottom: 4,
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: activeDept === dept.key ? (dept.color || '#a29bfe') : 'transparent',
                          color: activeDept === dept.key ? 'white' : '#333',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: activeDept === dept.key ? 'rgba(255,255,255,0.2)' : (dept.color || '#999'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          color: 'white'
                        }}>
                          {dept.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '500', fontSize: 14 }}>{dept.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dept.description}
                          </div>
                        </div>
                        {showBadge && <Badge count={postCount} style={{ background: '#ff4d4f' }} />}
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            style={{ background: currentDept.color || '#ff6b9d', borderColor: currentDept.color || '#ff6b9d', height: 40 }}
            onClick={() => openPublishModal('text')}
          >
            发布内容
          </Button>
          {(activeDept === 'product' || activeDept === 'product_small' || activeDept === 'product_rd') && userDepartment === 'product' && (
            <Button
              block
              icon={<FileTextOutlined />}
              style={{ marginTop: 8, height: 40 }}
              onClick={() => setReportSelectModalOpen(true)}
            >
              发布报告
            </Button>
          )}
        </div>
      </div>

      {/* 中间：帖子列表 */}
      <div style={{
        width: 360,
        background: 'white',
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, color: currentDept.color || '#999' }}>{currentDept.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>{currentDept.name}</span>
          </div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{currentDept.description}</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>记录已持久保存，刷新或关闭后仍可查看</div>
        </div>

        {isSmallGroup && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 8 }}>群成员</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groupMembers.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar size={28} icon={<UserOutlined />} style={{ background: currentDept.color || '#a29bfe' }} />
                  <div>
                    <span style={{ fontSize: 13 }}>{typeof m === 'string' ? m : m.name}</span>
                    {typeof m === 'object' && m.role && <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>{m.role}</span>}
                  </div>
                </div>
              ))}
              {groupMembers.length === 0 && <span style={{ fontSize: 13, color: '#999' }}>暂无成员</span>}
            </div>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginTop: 12, marginBottom: 8 }}>当前文件</div>
            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
              {groupFiles.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'white',
                    borderRadius: 6,
                    marginBottom: 6,
                    border: '1px solid #f0f0f0'
                  }}
                >
                  <Space size={8}>
                    <FileTextOutlined style={{ color: currentDept.color || '#999' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {item.file_id ? item.name : ((item.name || '附件').replace(/\.[^.]+$/, '') + '.txt')}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {item.size} · {item.post?.title}
                      </div>
                    </div>
                  </Space>
                  <Button type="link" size="small" style={{ padding: 0 }} onClick={() => downloadGroupFile(item.post, item, item.fileIndex)}>
                    下载
                  </Button>
                </div>
              ))}
              {groupFiles.length === 0 && <span style={{ fontSize: 13, color: '#999' }}>暂无文件</span>}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingPosts ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
          ) : (
            (() => {
              let lastDateGroup = null
              return currentDept.posts.map(post => {
                const dateGroup = formatDateGroup(post.created_at)
                const showDateHeader = dateGroup && dateGroup !== lastDateGroup
                if (showDateHeader) lastDateGroup = dateGroup
                return (
                  <div key={post.id}>
                    {showDateHeader && (
                      <div style={{ padding: '8px 20px', fontSize: 12, color: '#999', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        {dateGroup}
                      </div>
                    )}
                    <div
                      onClick={() => setSelectedPost(post)}
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        background: selectedPost?.id === post.id ? '#f7f8fa' : 'white',
                        borderLeft: selectedPost?.id === post.id ? `3px solid ${currentDept.color || '#999'}` : '3px solid transparent',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                        <Avatar src={post.avatar || userAvatarMap[post.author]} size={40} icon={!(post.avatar || userAvatarMap[post.author]) && <UserOutlined />} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: '500', fontSize: 14 }}>{post.author}</span>
                            <Tag color={currentDept.color || '#999'} style={{ fontSize: 11, padding: '0 6px' }}>{post.role}</Tag>
                            {post.type === 'report' && <Tag color="blue">报告</Tag>}
                          </div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }} title={formatDateTime(post.created_at)}>{formatDateTime(post.created_at)}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: '500', fontSize: 14, marginBottom: 6, color: '#1a1a1a' }}>
                        {post.title}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.5
                      }}>
                        {post.preview}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
                        <span>💬 {post.comments ?? 0}</span>
                        <span>👍 {post.likes ?? 0}</span>
                        <span>🔄 {post.shares ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()
          )}

          {!loadingPosts && currentDept.posts.length === 0 && (
            <Empty description="该部门暂无内容" style={{ marginTop: 60 }} />
          )}
        </div>
      </div>

      {/* 右侧：帖子详情 */}
      <div style={{ flex: 1, background: 'white', display: 'flex', flexDirection: 'column' }}>
        {selectedPost ? (
          <>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space size={12}>
                  <Avatar src={selectedPost.avatar || userAvatarMap[selectedPost.author]} size={48} icon={!(selectedPost.avatar || userAvatarMap[selectedPost.author]) && <UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedPost.author}</div>
                    <Space size={8}>
                      <Tag color={currentDept.color || '#999'}>{selectedPost.role}</Tag>
                      {selectedPost.type === 'report' && <Tag color="blue">报告</Tag>}
                      <span style={{ color: '#999', fontSize: 13 }}>
                        <ClockCircleOutlined /> {formatDateTime(selectedPost.created_at)}
                      </span>
                    </Space>
                  </div>
                </Space>
                <Dropdown
                  menu={{
                    items: (() => {
                      const canEditDelete = isAdminUser || selectedPost.author_username === currentUsername || selectedPost.author === currentUserName || selectedPost.author === currentUsername
                      const list = [
                        { key: 'forward', label: '转发到其他部门', icon: <ShareAltOutlined /> },
                        ...(canEditDelete ? [{ key: 'edit', label: '编辑', icon: <EditOutlined /> }, { key: 'delete', label: '删除', danger: true, icon: <DeleteOutlined /> }] : [])
                      ]
                      return list
                    })(),
                    onClick: ({ key }) => {
                      if (key === 'forward') handleShare()
                      else if (key === 'edit') handleEditOpen()
                      else if (key === 'delete') handleDeletePost()
                    }
                  }}
                >
                  <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' }}>
                {selectedPost.title}
              </h2>

              <div style={{ fontSize: 15, color: '#333', lineHeight: 1.8, marginBottom: 20, whiteSpace: 'pre-line' }}>
                {selectedPost.content}
              </div>

              {selectedPost.type === 'report' && selectedPost.analysis_id && (
                <div style={{ marginBottom: 20 }}>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={() => handleViewReport(selectedPost)}
                    style={{ background: currentDept.color || '#ff6b9d', borderColor: currentDept.color || '#ff6b9d' }}
                  >
                    查看完整报告
                  </Button>
                </div>
              )}

              {selectedPost.images && selectedPost.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                  {selectedPost.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                    />
                  ))}
                </div>
              )}

              {selectedPost.attachments && selectedPost.attachments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {selectedPost.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#f7f8fa',
                        padding: '14px 16px',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                      }}
                    >
                      <Space>
                        <FileTextOutlined style={{ fontSize: 22, color: currentDept.color || '#999' }} />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {file.file_id ? file.name : ((file.name || '附件').replace(/\.[^.]+$/, '') + '.txt')}
                          </div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            {file.size}
                          </div>
                        </div>
                      </Space>
                      <Button size="small" onClick={() => handleDownloadAttachment(file, idx)}>下载</Button>
                    </div>
                  ))}
                </div>
              )}

              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {selectedPost.tags.map((tag, idx) => (
                    <Tag key={idx} style={{ marginRight: 8, marginBottom: 8 }}>#{tag}</Tag>
                  ))}
                </div>
              )}

              <Divider />
              <Space size="large" style={{ marginBottom: 20 }}>
                <Button
                  type="text"
                  icon={<LikeOutlined />}
                  onClick={handleLike}
                  style={{
                    fontSize: 14,
                    color: (selectedPost.liked_by || []).includes(currentUserId) ? '#ff4d4f' : undefined
                  }}
                >
                  {(selectedPost.liked_by || []).includes(currentUserId) ? '已赞' : '点赞'} {selectedPost.likes ?? 0}
                </Button>
                <Button
                  type="text"
                  icon={<MessageOutlined />}
                  style={{ fontSize: 14 }}
                  onClick={() => commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  评论 {selectedPost.comments ?? 0}
                </Button>
                <Button type="text" icon={<ShareAltOutlined />} onClick={handleShare} style={{ fontSize: 14 }}>
                  转发 {selectedPost.shares ?? 0}
                </Button>
              </Space>

              <div ref={commentsSectionRef} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 12 }}>
                  评论 {selectedPost.comments ?? 0}
                </div>
                {selectedPost.comment_list && selectedPost.comment_list.length > 0 ? (
                  (selectedPost.comment_list || []).map((c, idx) => {
                    const commentAvatar = c.avatar || userAvatarMap[c.author] || undefined
                    return (
                    <div
                      key={idx}
                      style={{
                        background: '#f7f8fa',
                        padding: '12px 16px',
                        borderRadius: 8,
                        marginBottom: 8,
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Avatar src={commentAvatar} size={28} icon={!commentAvatar && <UserOutlined />} />
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{c.author}</span>
                        {c.role && <Tag style={{ fontSize: 11 }}>{c.role}</Tag>}
                        <span style={{ fontSize: 12, color: '#999' }}>{formatDateTime(c.created_at)}</span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ marginLeft: 'auto', fontSize: 12 }}
                          onClick={() => handleDeleteComment(idx)}
                        >
                          删除
                        </Button>
                      </div>
                      <div style={{ fontSize: 14, color: '#333', whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    </div>
                    )
                  })
                ) : (
                  <div style={{ fontSize: 14, color: '#999', padding: '12px 0' }}>暂无评论</div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar src={currentUserAvatar} icon={!currentUserAvatar && <UserOutlined />} />
                <div style={{ flex: 1 }}>
                  <TextArea
                    placeholder="输入回复内容..."
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleReply}
                      style={{ background: currentDept.color || '#ff6b9d', borderColor: currentDept.color || '#ff6b9d' }}
                    >
                      发送
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isSmallGroup && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', background: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>发消息 / 分享文件</div>
                <Input
                  placeholder="标题（可选）"
                  value={smallGroupNewTitle}
                  onChange={e => setSmallGroupNewTitle(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <TextArea
                  placeholder="输入内容..."
                  value={smallGroupNewContent}
                  onChange={e => setSmallGroupNewContent(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ marginBottom: 8 }}
                />
                {smallGroupNewAttachments.length > 0 && (
                  <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {smallGroupNewAttachments.map((f, i) => (
                      <Tag key={i} closable onClose={() => setSmallGroupNewAttachments(prev => prev.filter((_, j) => j !== i))}>
                        {f.name} {f.size ? `(${f.size})` : ''}
                      </Tag>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="file"
                    multiple
                    id="small-group-file-input"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const files = e.target.files
                      if (!files?.length) return
                      handleAddFiles(Array.from(files), setSmallGroupNewAttachments)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => document.getElementById('small-group-file-input')?.click()}
                    loading={uploadingAttachment}
                    disabled={uploadingAttachment}
                  >
                    添加文件
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={smallGroupSending}
                    onClick={handleSmallGroupSend}
                    style={{ background: currentDept.color || '#a29bfe', borderColor: currentDept.color || '#a29bfe' }}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请从左侧选择一条内容或在下方向群内发消息" />
            </div>
            {isSmallGroup && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', background: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>发消息 / 分享文件</div>
                <Input
                  placeholder="标题（可选）"
                  value={smallGroupNewTitle}
                  onChange={e => setSmallGroupNewTitle(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <TextArea
                  placeholder="输入内容..."
                  value={smallGroupNewContent}
                  onChange={e => setSmallGroupNewContent(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ marginBottom: 8 }}
                />
                {smallGroupNewAttachments.length > 0 && (
                  <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {smallGroupNewAttachments.map((f, i) => (
                      <Tag key={i} closable onClose={() => setSmallGroupNewAttachments(prev => prev.filter((_, j) => j !== i))}>
                        {f.name} {f.size ? `(${f.size})` : ''}
                      </Tag>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="file"
                    multiple
                    id="small-group-file-input-empty"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const files = e.target.files
                      if (!files?.length) return
                      handleAddFiles(Array.from(files), setSmallGroupNewAttachments)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => document.getElementById('small-group-file-input-empty')?.click()}
                    loading={uploadingAttachment}
                    disabled={uploadingAttachment}
                  >
                    添加文件
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={smallGroupSending}
                    onClick={handleSmallGroupSend}
                    style={{ background: currentDept.color || '#a29bfe', borderColor: currentDept.color || '#a29bfe' }}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 选择要发布的报告（从历史分析中选） */}
      <Modal
        title="选择要发布的报告"
        open={reportSelectModalOpen}
        onCancel={() => setReportSelectModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <p style={{ color: '#666', marginBottom: 16 }}>从下方选择一条分析报告，发布到「{currentDept.name}」，群成员可查看与跳转报告页。</p>
        {analysisHistoryLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
        ) : analysisHistoryList.length === 0 ? (
          <Empty description="暂无分析历史，请先在分析工作台完成一次分析" style={{ padding: '24px 0' }} />
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {analysisHistoryList.map(item => (
              <div
                key={item.analysis_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  marginBottom: 8
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '-'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.data_file || item.platform || item.analysis_id}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    笔记数 {item.analyzed_notes ?? item.total_notes ?? 0} · {item.status === 'success' ? '成功' : item.status || '-'}
                  </div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  loading={publishingReportId === item.analysis_id}
                  onClick={() => handlePublishReport(item.analysis_id)}
                  style={{ marginLeft: 12, flexShrink: 0, background: currentDept.color || '#ff6b9d', borderColor: currentDept.color || '#ff6b9d' }}
                >
                  发布
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 发布内容弹窗 */}
      <Modal
        title="发布内容"
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        onOk={handlePublishSubmit}
        okText="发布"
        confirmLoading={publishSubmitting}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: '#ff4d4f' }}>*</span> 标题
        </div>
        <Input
          placeholder="请输入标题"
          value={publishTitle}
          onChange={e => setPublishTitle(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: '#ff4d4f' }}>*</span> 内容
        </div>
        <TextArea
          placeholder="请输入正文"
          value={publishContent}
          onChange={e => setPublishContent(e.target.value)}
          rows={6}
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 8 }}>附件（可选）</div>
        {publishAttachments.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {publishAttachments.map((f, i) => (
              <Tag key={i} closable onClose={() => setPublishAttachments(prev => prev.filter((_, j) => j !== i))}>
                {f.name} {f.size ? `(${f.size})` : ''}
              </Tag>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="file"
            multiple
            id="publish-attachments-input"
            style={{ display: 'none' }}
            onChange={e => {
              const files = e.target.files
              if (!files?.length) return
              handleAddFiles(Array.from(files), setPublishAttachments)
              e.target.value = ''
            }}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => document.getElementById('publish-attachments-input')?.click()}
            loading={uploadingAttachment}
            disabled={uploadingAttachment}
          >
            添加文件
          </Button>
        </div>
      </Modal>

      {/* 转发到群弹窗 */}
      <Modal
        title="转发到群"
        open={forwardModalOpen}
        onCancel={() => setForwardModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {(departments || [])
            .filter(g => g.key !== activeDept)
            .map(g => (
              <div
                key={g.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  marginBottom: 8
                }}
              >
                <span style={{ fontWeight: 500 }}>{g.name || g.key}</span>
                <Button type="primary" size="small" onClick={() => handleForwardToGroup(g.key)}>
                  转发到这里
                </Button>
              </div>
            ))}
          {(departments || []).filter(g => g.key !== activeDept).length === 0 && (
            <Empty description="暂无其他可转发的群" style={{ padding: 24 }} />
          )}
        </div>
      </Modal>

      {/* 编辑帖子弹窗 */}
      <Modal
        title="编辑帖子"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditSubmit}
        okText="保存"
        confirmLoading={editSubmitting}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: '#ff4d4f' }}>*</span> 标题
        </div>
        <Input
          placeholder="请输入标题"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 12 }}>内容</div>
        <TextArea
          placeholder="请输入正文"
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          rows={6}
        />
      </Modal>
    </div>
  )
}


export default Community
