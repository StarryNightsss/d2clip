import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const HEART_SRC = '/lottie/Heart.lottie'
const SIZE = 80

/**
 * 静态心形动画：不移动，一直循环播放
 */
export default function HeartLottieStatic() {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <DotLottieReact
        src={HEART_SRC}
        loop
        autoplay
        renderConfig={{ preserveAspectRatio: 'xMidYMid meet' }}
        style={{ width: SIZE, height: SIZE }}
      />
    </div>
  )
}
