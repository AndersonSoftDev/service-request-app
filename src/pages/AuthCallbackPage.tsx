import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PortalMark } from '../components/PortalMark'

export function AuthCallbackPage() {
  const { isLoading, isAuthenticated, error } = useAuth()
  if (!isLoading && isAuthenticated) return <Navigate to="/requests" replace />
  return <main className="session-loading">
    <section className="callback-card" aria-labelledby="callback-title">
      <PortalMark />
      <h1 id="callback-title">{isLoading ? 'Completing sign-in' : 'Unable to sign in'}</h1>
      {isLoading
        ? <p role="status">Please wait while we check your session…</p>
        : <><p role="alert">{error ?? 'Your sign-in could not be completed. Please try again.'}</p>
          <Link className="sign-in-button" to="/login" replace>Return to login</Link></>}
    </section>
  </main>
}
