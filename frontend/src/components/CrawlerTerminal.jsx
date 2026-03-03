/** 爬虫实时日志终端 - 直接轮询后端 /api/crawler/logs */
import { useState, useEffect, useRef } from 'react'
import { crawlerAPI } from '../services/api'

const levelColors = {
  error: '#ff4757',
  warning: '#ffa502',
  success: '#26de81',
  info: '#45aaf2',
  debug: '#a5b1c2',
}

const CrawlerTerminal = ({ active = true }) => {
  const [logs, setLogs] = useState([])
  const containerRef = useRef(null)

  // 当 active 时，每 1 秒轮询后端日志
  useEffect(() => {
    if (!active) return

    const fetchLogs = async () => {
      try {
        const res = await crawlerAPI.getLogs(100)
        if (res?.logs && Array.isArray(res.logs)) {
          setLogs(res.logs)
        }
      } catch (e) {
        console.warn('CrawlerTerminal 获取日志失败:', e)
      }
    }

    fetchLogs()
    const timer = setInterval(fetchLogs, 1000)
    return () => clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

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
      {logs.length === 0 && (
        <div style={{ color: '#95a5a6' }}>等待爬虫启动...</div>
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
