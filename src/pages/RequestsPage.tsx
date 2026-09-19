import { useAuth } from '../auth/AuthContext'
import { PortalMark } from '../components/PortalMark'

export function RequestsPage() {
  const { user, logout, isBusy, error } = useAuth()
  return <main className="requests-page">
    <header><div className="brand"><PortalMark /><span>Customer Service Request Portal</span></div><button className="sign-in-button" disabled={isBusy} onClick={() => void logout()}>{isBusy ? 'Signing out…' : 'Sign out'}</button></header>
    <h1>Service requests</h1>
    <p>Welcome{user?.name ? ', ' + user.name : ''}.</p>
    <p>Your service request workspace will be available here.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
  </main>
}
