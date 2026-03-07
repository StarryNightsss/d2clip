/** 爬虫实时日志终端 - 优先 SSE 实时推送，失败时回退轮询 */
import { useState, useEffect, useRef } from 'react'
import { crawlerAPI } from '../services/api'

const levelColors = {
  error: '#ff4757',
  warning: '#ffa502',
  success: '#26de81',
  info: '#45aaf2',
  debug: '#a5b1c2',
}

// 轮询用：带 30s 超时的 getLogs
const fetchLogsWithTimeout = (ms = 30000) => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return crawlerAPI.getLogs(100, ctrl.signal).finally(() => clearTimeout(timer))
}

const CrawlerTerminal = ({ active = true }) => {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [hasConnected, setHasConnected] = useState(false)
  const [usePolling, setUsePolling] = useState(true) // 默认轮询更稳定，SSE 易卡在「正在连接」
  const containerRef = useRef(null)

  // 优先 SSE 实时推送；若 3 秒内未连接则回退轮询，避免一直「正在连接」
  useEffect(() => {
    if (!active || usePolling) return

    let es = null
    const url = crawlerAPI.getLogsStreamUrl()
    const fallbackTimer = setTimeout(() => {
      if (es && !es.readyState) setUsePolling(true)
      es?.close()
    }, 3000)

    try {
      es = new EventSource(url)
      es.onopen = () => {
        clearTimeout(fallbackTimer)
        setError(null)
        setHasConnected(true)
      }
      es.onmessage = (e) => {
        try {
          const log = JSON.parse(e.data)
          setLogs((prev) => [...prev.slice(-99), log])
        } catch (_) {}
      }
      es.onerror = () => {
        clearTimeout(fallbackTimer)
        es?.close()
        setUsePolling(true)
      }
    } catch (err) {
      clearTimeout(fallbackTimer)
      setUsePolling(true)
    }

    return () => {
      clearTimeout(fallbackTimer)
      es?.close()
    }
  }, [active, usePolling])

  // 轮询回退
  useEffect(() => {
    if (!active || !usePolling) return

    const fetchLogs = async () => {
      try {
        const res = await fetchLogsWithTimeout()
        setError(null)
        setHasConnected(true)
        if (res?.logs && Array.isArray(res.logs)) setLogs(res.logs)
      } catch (e) {
        const msg = e.name === 'AbortError'
          ? '后端响应较慢（爬虫运行中），正在重试…'
          : (e.message || '无法连接后端，请确认已启动: uv run python backend/main.py')
        setError(msg)
        setHasConnected(true)
      }
    }

    fetchLogs()
    const timer = setInterval(fetchLogs, 1000)
    return () => clearInterval(timer)
  }, [active, usePolling])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const emptyMessage = logs.length === 0
    ? (error
        ? `连接失败: ${error}，请检查后端是否启动及 VITE_ANALYSIS_API_BASE 配置`
        : hasConnected
          ? '暂无日志，爬虫运行中...'
          : '正在连接...')
    : null

  return (
    <div
      ref={containerRef}
      style={{
        background: '#1e1e1e',
        borderRadius: '8px',
        padding: '16px',
        maxHeight: '300px',
        overflowY: 'auto',
        fontFamily: 'Monaco, Menlo, Consolas, monospace',
        fontSize: '12px',
        lineHeight: '1.6',
      }}
    >
      {emptyMessage && (
        <div style={{ color: error ? '#ff4757' : '#95a5a6' }}>{emptyMessage}</div>
      )}
      {logs.map((log, idx) => {
        const color = levelColors[log.level] || '#ecf0f1'
        return (
          <div key={idx} style={{ marginBottom: '4px' }}>
            <span style={{ color: '#95a5a6' }}>[{log.timestamp?.slice(11, 19) ?? '--'}]</span>
            {' '}
            <span style={{ color, fontWeight: 'bold' }}>[{(log.level || 'info').toUpperCase()}]</span>
            {' '}
            <span style={{ color: '#ecf0f1' }}>{log.message}</span>
          </div>
        )
      })}
    </div>
  )
}

export default CrawlerTerminal
