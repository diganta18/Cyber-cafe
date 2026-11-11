import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Toast from './components/Toast'
import Spinner from './components/Spinner'
import ErrorBoundary from './components/ErrorBoundary'
import { useToast } from './hooks/useToast'

// Code-split pages for performance
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Stations = lazy(() => import('./pages/Stations'))
const ActiveSessions = lazy(() => import('./pages/ActiveSessions'))
const Customers = lazy(() => import('./pages/Customers'))
const Bills = lazy(() => import('./pages/Bills'))
const Invoice = lazy(() => import('./pages/Invoice'))
const Services = lazy(() => import('./pages/Services'))
const Reports = lazy(() => import('./pages/Reports'))
const Staff = lazy(() => import('./pages/Staff'))
const BookingsAndQueue = lazy(() => import('./pages/BookingsAndQueue'))
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'))

function PageFallback() {
  return (
    <div className="flex justify-center items-center py-24 min-h-[40vh]">
      <Spinner size="lg" />
    </div>
  )
}

function AppRoutes() {
  const { toasts, removeToast, toast } = useToast()

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Customer Self-Service Portal */}
          <Route path="/portal" element={<CustomerPortal toast={toast} />} />
          <Route path="/book" element={<Navigate to="/portal" replace />} />

          {/* Staff & Admin Auth */}
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
          <Route path="/bookings" element={
            <ProtectedRoute>
              <Layout><BookingsAndQueue toast={toast} /></Layout>
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

          <Route path="/services" element={
            <ProtectedRoute>
              <Layout><Services toast={toast} /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin-only routes */}
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
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
