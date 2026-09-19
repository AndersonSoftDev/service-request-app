import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'

function renderGuard(isLoading: boolean, authenticated: boolean) {
  return renderToString(
    <MemoryRouter>
      <AuthContext.Provider value={{
        user: authenticated ? { id: 'test-user' } : null,
        isAuthenticated: authenticated,
        isLoading,
        isBusy: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }}>
        <ProtectedRoute><p>Protected content</p></ProtectedRoute>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('protected routes', () => {
  it('does not reveal protected content while the session is loading', () => {
    const html = renderGuard(true, false)
    expect(html).toContain('Checking your session')
    expect(html).not.toContain('Protected content')
  })
  it('does not reveal protected content without a session', () => {
    expect(renderGuard(false, false)).not.toContain('Protected content')
  })
  it('renders children for an authenticated session', () => {
    expect(renderGuard(false, true)).toContain('Protected content')
  })
  it('disables sign-in while redirecting and renders safe errors', () => {
    const html = renderToString(
      <MemoryRouter>
        <AuthContext.Provider value={{
          user: null, isAuthenticated: false, isLoading: false,
          isBusy: true, error: 'Please try again.',
          login: vi.fn(), logout: vi.fn(),
        }}><LoginPage /></AuthContext.Provider>
      </MemoryRouter>,
    )
    expect(html).toContain('disabled=""')
    expect(html).toContain('Signing in')
    expect(html).toContain('role="alert"')
    expect(html).toContain('Please try again.')
  })
})
