/**
 * 按部门返回默认首页路径（与 Layout 侧栏权限一致）
 * product / admin → 分析工作台；rd → 色号设计；market → 虚拟试妆；operation → 内容生成
 */
export function getDefaultPath(department) {
  const d = (department || '').toLowerCase()
  if (d === 'product' || d === 'admin') return '/'
  if (d === 'rd') return '/rd'
  if (d === 'market') return '/market'
  if (d === 'operation') return '/operation'
  return '/community'
}
