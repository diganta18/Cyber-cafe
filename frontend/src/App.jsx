import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stations from './pages/Stations'
import ActiveSessions from './pages/ActiveSessions'
import Customers from './pages/Customers'
import Bills from './pages/Bills'
import Invoice from './pages/Invoice'
import Services from './pages/Services'
import Reports from './pages/Reports'
import Staff from './pages/Staff'

function AppRoutes() {
  const { toasts, removeToast, toast } = useToast()

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      <Routes>
        <Route path="/login" element={<Login toast={toast} />} />

        {/* Admin + Staff routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout><Dashboard toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/stations" element={
          <ProtectedRoute>
            <Layout><Stations toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/sessions" element={
          <ProtectedRoute>
            <Layout><ActiveSessions toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute>
            <Layout><Customers toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/bills" element={
          <ProtectedRoute>
            <Layout><Bills toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/bills/:id" element={
          <ProtectedRoute>
            <Layout><Invoice toast={toast} /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin-only routes */}
        <Route path="/services" element={
          <ProtectedRoute roles={['admin']}>
            <Layout><Services toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute roles={['admin']}>
            <Layout><Reports toast={toast} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/staff" element={
          <ProtectedRoute roles={['admin']}>
            <Layout><Staff toast={toast} /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
