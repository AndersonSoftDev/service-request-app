import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PortalMark } from './PortalMark'
import '../pages/RequestsPage.css'

export function RequestsLayout({ children }: { children: ReactNode }) {
  const { user, logout, isBusy, error } = useAuth()
  return <div className="requests-workspace">
    <a className="skip-link" href="#requests-main">Skip to content</a>
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <Link to="/requests" className="brand workspace-brand"><PortalMark /><span>Customer Service<br /><strong>Request Portal</strong></span></Link>
        <div className="workspace-account"><span className="account-name">{user?.name ?? user?.email ?? 'My account'}</span>
          <button className="secondary-button" disabled={isBusy} onClick={() => void logout()}>{isBusy ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </div>
    </header>
    <main id="requests-main" className="requests-content" tabIndex={-1}>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {children}
    </main>
  </div>
}
