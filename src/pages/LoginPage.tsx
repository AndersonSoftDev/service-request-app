import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PortalMark } from '../components/PortalMark'

export function LoginPage() {
  const { isAuthenticated, isLoading, isBusy, error, login } = useAuth()
  if (!isLoading && isAuthenticated) return <Navigate to="/requests" replace />

  return <main className="login-layout">
    <div className="login-shell">
      <section className="intro-panel" aria-labelledby="intro-title">
        <div className="intro-eyebrow"><span /> EVERY REQUEST MATTERS</div>
        <h1 id="intro-title">Great service.<br />One place to<br /><span>make it happen.</span></h1>
        <div className="request-illustration" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="illustration-card">
            <div className="mock-header"><span className="mock-icon">↗</span><span>Service request</span><span className="mock-dots">•••</span></div>
            <div className="mock-line long" /><div className="mock-line short" />
            <div className="mock-progress"><span /><span /><span /></div>
            <div className="mock-footer"><span className="mock-avatars"><i>JD</i><i>AK</i><i>+2</i></span><span className="mock-status"><span /> In progress</span></div>
          </div>
          <div className="resolved-badge"><span className="resolved-check">✓</span><span>Request resolved</span></div>
          <span className="spark spark-one">✦</span><span className="spark spark-two">✧</span>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand"><PortalMark /><span>Customer Service<br /><strong>Request Portal</strong></span></div>
        <div className="auth-content">
          <h2 id="login-title">Welcome back</h2>
          <p className="auth-description">Sign in to access your service requests.</p>
          <button className="sign-in-button" onClick={() => void login()} disabled={isLoading || isBusy} aria-busy={isLoading || isBusy}>
            {isLoading || isBusy ? <><span className="spinner" aria-hidden="true" />{isLoading ? 'Checking session…' : 'Signing in…'}</> : <>Sign in <span aria-hidden="true">→</span></>}
          </button>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="help-note"><span>Need access?</span> Contact your administrator.</div>
        </div>
      </section>
    </div>
  </main>
}
