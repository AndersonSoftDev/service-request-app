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
        <p className="intro-description">Manage and track customer service<br className="desktop-break" /> requests in one place.</p>
        <div className="request-illustration" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="illustration-card">
            <div className="mock-header"><span className="mock-icon">↗</span><span>Service request<small>Everything in its place</small></span><span className="mock-dots">•••</span></div>
            <div className="mock-line long" /><div className="mock-line short" />
            <div className="mock-progress"><span /><span /><span /></div>
            <div className="mock-footer"><span className="mock-avatars"><i>JD</i><i>AK</i><i>+2</i></span><span className="mock-status"><span /> In progress</span></div>
          </div>
          <div className="resolved-badge"><span className="resolved-check">✓</span><span>Request resolved<small>A little progress. A better day.</small></span></div>
          <span className="spark spark-one">✦</span><span className="spark spark-two">✧</span>
        </div>
        <p className="intro-footnote"><span /> Stay connected. Keep things moving.</p>
      </section>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand"><PortalMark /><span>Customer Service<br /><strong>Request Portal</strong></span></div>
        <div className="auth-content">
          <span className="auth-eyebrow">YOUR SERVICE WORKSPACE</span>
          <h2 id="login-title">Welcome back</h2>
          <p className="auth-description">Sign in to access your service requests.</p>
          <div className="account-notice"><span className="account-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h2m2 0h2M9 11h2m2 0h2m-5 10v-5h4v5" /></svg></span><div><strong>Your work. Your account.</strong><p>Use your organization’s account to continue.</p></div></div>
          <button className="sign-in-button" onClick={() => void login()} disabled={isLoading || isBusy} aria-busy={isLoading || isBusy}>
            {isLoading || isBusy ? <><span className="spinner" aria-hidden="true" />{isLoading ? 'Checking session…' : 'Signing in…'}</> : <>Sign in <span aria-hidden="true">→</span></>}
          </button>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <p className="sign-in-note">One account for all your service requests.</p>
          <div className="help-note"><span>Need access?</span> Contact your administrator.</div>
        </div>
        <p className="auth-footer">Customer Service Request Portal</p>
      </section>
    </div>
    <footer className="page-footer">A simpler way to keep service moving.</footer>
  </main>
}
