import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MouseFollowRabbit from './components/MouseFollowRabbit'
import Login from './pages/Login'
import AnalysisWorkbench from './pages/AnalysisWorkbench'
import TrendReport from './pages/TrendReport'
import DataTable from './pages/DataTable'
import UserManagement from './pages/UserManagement'
import ColorDesign from './pages/ColorDesign'
import ColorInspiration from './pages/ColorInspiration'
import PackagingDesign from './pages/PackagingDesign'
import VirtualTryOn from './pages/VirtualTryOn'
import ContentGeneration from './pages/ContentGeneration'
import Community from './pages/Community'
import ReportAgent from './pages/ReportAgent'
import { getDefaultPath } from './utils/defaultRoute'

/** 路由与允许访问的部门（与 Layout 侧栏一致，路由级隔离） */
const ROUTE_DEPARTMENTS = {
  '/': ['product', 'admin'],
  '/report': ['product', 'rd', 'market', 'operation', 'admin'], // 所有部门只读查看，产品/管理员可编辑
  '/data': ['product', 'admin'],
  '/agent': ['product', 'admin'],
  '/rd': ['rd', 'admin'],
  '/rd/inspiration': ['rd', 'admin'],
  '/rd/packaging': ['rd', 'admin'],
  '/market': ['market', 'admin'],
  '/operation': ['operation', 'admin'],
  '/community': ['product', 'rd', 'market', 'operation', 'admin'],
  '/users': ['admin']
}

const ProtectedRoute = ({ children }) => {
  const userInfo = localStorage.getItem('userInfo')
  if (!userInfo) return <Navigate to="/login" replace />
  return children
}

/** 部门隔离：当前路径不允许当前部门访问则重定向到该部门默认页 */
const DepartmentGuard = ({ path, children }) => {
  try {
    const raw = localStorage.getItem('userInfo')
    const userInfo = raw ? JSON.parse(raw) : null
    const department = (userInfo?.department || '').toLowerCase()
    const allowed = ROUTE_DEPARTMENTS[path]
    if (allowed && !allowed.includes(department)) {
      return <Navigate to={getDefaultPath(department)} replace />
    }
    return children
  } catch (_) {
    return <Navigate to="/login" replace />
  }
}

// 根路径 "/"：仅产品/管理员显示分析工作台，其他部门重定向到本部门默认页
const HomeOrRedirect = () => {
  try {
    const raw = localStorage.getItem('userInfo')
    const userInfo = raw ? JSON.parse(raw) : null
    const department = (userInfo && userInfo.department) ? userInfo.department.toLowerCase() : ''
    if (department === 'product' || department === 'admin') {
      return (
        <Layout>
          <AnalysisWorkbench />
        </Layout>
      )
    }
    return <Navigate to={getDefaultPath(department)} replace />
  } catch (_) {
    return <Navigate to="/login" replace />
  }
}

function App() {
  return (
    <BrowserRouter>
      <MouseFollowRabbit />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <HomeOrRedirect />
          </ProtectedRoute>
        } />

        <Route path="/report" element={
          <ProtectedRoute>
            <DepartmentGuard path="/report">
              <Layout><TrendReport /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/data" element={
          <ProtectedRoute>
            <DepartmentGuard path="/data">
              <Layout><DataTable /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <DepartmentGuard path="/users">
              <Layout><UserManagement /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/rd" element={
          <ProtectedRoute>
            <DepartmentGuard path="/rd">
              <Layout><ColorDesign /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/rd/inspiration" element={
          <ProtectedRoute>
            <DepartmentGuard path="/rd/inspiration">
              <Layout><ColorInspiration /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/rd/packaging" element={
          <ProtectedRoute>
            <DepartmentGuard path="/rd/packaging">
              <Layout><PackagingDesign /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/market" element={
          <ProtectedRoute>
            <DepartmentGuard path="/market">
              <Layout><VirtualTryOn /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/operation" element={
          <ProtectedRoute>
            <DepartmentGuard path="/operation">
              <Layout><ContentGeneration /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/community" element={
          <ProtectedRoute>
            <DepartmentGuard path="/community">
              <Layout><Community /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />

        <Route path="/agent" element={
          <ProtectedRoute>
            <DepartmentGuard path="/agent">
              <Layout><ReportAgent /></Layout>
            </DepartmentGuard>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
