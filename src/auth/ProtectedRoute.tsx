import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) return <main className="session-loading" role="status">Checking your session…</main>
  return isAuthenticated ? (children ?? <Outlet />) : <Navigate to="/login" replace />
}
