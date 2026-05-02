import VtoDemoPanel from '../components/VtoDemoPanel'

const VirtualTryOn = () => {
  return (
    <div className="page-wrap" style={{ padding: '24px 32px' }}>
      <header className="page-header animate-fade-in">
        <h1 className="page-title">虚拟试妆</h1>
        <p className="page-subtitle">生成不同肤色模特的虚拟试妆效果图</p>
      </header>

      <VtoDemoPanel />
    </div>
  )
}

export default VirtualTryOn
