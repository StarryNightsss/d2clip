import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import AnalysisWorkbench from './pages/AnalysisWorkbench'
import TrendReport from './pages/TrendReport'
import DataTable from './pages/DataTable'
import UserManagement from './pages/UserManagement'
import ColorDesign from './pages/ColorDesign'
import VirtualTryOn from './pages/VirtualTryOn'
import ContentGeneration from './pages/ContentGeneration'
import Community from './pages/Community'

// 权限控制组件
const ProtectedRoute = ({ children }) => {
  const userInfo = localStorage.getItem('userInfo')

  if (!userInfo) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <AnalysisWorkbench />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/report" element={
          <ProtectedRoute>
            <Layout>
              <TrendReport />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/data" element={
          <ProtectedRoute>
            <Layout>
              <DataTable />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/rd" element={
          <ProtectedRoute>
            <Layout>
              <ColorDesign />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/market" element={
          <ProtectedRoute>
            <Layout>
              <VirtualTryOn />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/operation" element={
          <ProtectedRoute>
            <Layout>
              <ContentGeneration />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/community" element={
          <ProtectedRoute>
            <Layout>
              <Community />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
