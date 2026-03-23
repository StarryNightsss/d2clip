import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const SIZE = 60
/** 缓动系数：越小跟随越慢、延迟越明显，0.08～0.15 较自然 */
const LERP = 0.15

/** 登录页 + 五部门各一张：鼠标跟随用图，按场景切换（未知场景兜底用 login） */
const FOLLOW_IMAGE_BY_CONTEXT = {
  login: '/login.png',
  product: '/product.png',
  rd: '/rd.png',
  market: '/market.png',
  operation: '/operation.png',
  admin: '/admin.png'
}

function getFollowImageSrc (pathname, userInfo) {
  if (pathname === '/login') return FOLLOW_IMAGE_BY_CONTEXT.login
  const dept = (userInfo?.department || '').toLowerCase()
  return FOLLOW_IMAGE_BY_CONTEXT[dept] ?? FOLLOW_IMAGE_BY_CONTEXT.login
}

export default function MouseFollowRabbit () {
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(null)
  const followImageSrc = getFollowImageSrc(location.pathname, userInfo)

  useEffect(() => {
    const raw = localStorage.getItem('userInfo')
    setUserInfo(raw ? JSON.parse(raw) : null)
  }, [location.pathname])
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0
  }))
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    let current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    mouseRef.current = current

    const tick = () => {
      const target = mouseRef.current
      current = {
        x: current.x + (target.x - current.x) * LERP,
        y: current.y + (target.y - current.y) * LERP
      }
      setPos({ x: current.x, y: current.y })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      className="mouse-follow-rabbit"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: SIZE,
        height: SIZE,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      <img
        src={followImageSrc}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
