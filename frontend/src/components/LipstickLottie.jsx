/**
 * 口红 Logo：通过 iframe 加载 CDN 版 dotlottie 播放 Lipstick.lottie，无需安装 npm 包。
 */
const LOTTIE_SRC = '/lottie/Lipstick.lottie'

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style] 容器样式
 * @param {number} [props.size] 宽高（px），默认 90
 */
export default function LipstickLottie({ className, style = {}, size }) {
  const s = size ?? 90
  const playerUrl = `/lottie/player.html?src=${encodeURIComponent(LOTTIE_SRC)}&w=${s}&h=${s}`

  return (
    <div
      className={className}
      style={{
        width: s,
        height: s,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      <iframe
        src={playerUrl}
        title="Logo"
        width={s}
        height={s}
        style={{ border: 'none', display: 'block' }}
      />
    </div>
  )
}
