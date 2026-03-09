import { useState, useCallback } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const HEART_SRC = '/lottie/Heart.lottie'
/** 从左到右铺满的槽位总数 */
const SLOT_COUNT = 12
/** 同时展示的心形数量 */
const WINDOW_SIZE = 3
const SLOT_SIZE = 64
const SLOT_GAP = 16
/** 爱心视觉放大倍数（布局高度不变，用 scale + overflow 裁剪） */
const HEART_SCALE = 3.2

/**
 * 横向一排 Lottie 心形：铺满整行，每次展示 3 个，左起第一个播完后窗口右移一格（123→234→345…），到最右后循环。
 */
export default function HeartLottieRow () {
  const [startIndex, setStartIndex] = useState(0)

  const goNext = useCallback(() => {
    setStartIndex((s) => {
      const maxStart = SLOT_COUNT - WINDOW_SIZE
      return s >= maxStart ? 0 : s + 1
    })
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: SLOT_GAP,
        padding: '12px 20px',
        minHeight: SLOT_SIZE + 24,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const isInWindow = i >= startIndex && i < startIndex + WINDOW_SIZE
        const isLeftmost = i === startIndex
        return (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              height: SLOT_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isInWindow && (
              <div
                key={`${startIndex}-${i}`}
                style={{
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: SLOT_SIZE,
                    height: SLOT_SIZE,
                    transform: `scale(${HEART_SCALE})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <DotLottieReact
                    src={HEART_SRC}
                    loop={false}
                    autoplay
                    renderConfig={{ preserveAspectRatio: 'xMidYMid meet' }}
                    style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
                    dotLottieRefCallback={
                      isLeftmost
                        ? (dotLottie) => {
                            if (dotLottie) dotLottie.addEventListener('complete', goNext)
                          }
                        : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
