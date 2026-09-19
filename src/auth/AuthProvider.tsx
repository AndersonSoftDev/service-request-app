import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import { authService, AuthNotConfiguredError } from './authService'
import type { AuthService, AuthUser } from './authService'

export function AuthProvider({ children, service = authService }: {
  children: ReactNode
  service?: AuthService
}) {
  const { pathname } = useLocation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [resolvedPath, setResolvedPath] = useState<string | null>(null)
  const isLoading = resolvedPath !== pathname
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    let active = true
    // Subscribe first so session expiry or logout cannot be missed.
    let changed = false
    const unsubscribe = service.subscribe((currentUser) => {
      changed = true
      if (active) setUser(currentUser)
    })
    async function initialize() {
      try {
        const currentUser = pathname === '/auth/callback'
          ? await service.completeLogin()
          : await service.getUser()
        if (active && !changed) setUser(currentUser)
      } catch {
        if (active) {
          setUser(null)
          setError('We could not complete sign-in. Please return to login and try again.')
        }
      } finally {
        if (active) setResolvedPath(pathname)
      }
    }
    void initialize()
    return () => { active = false; unsubscribe() }
  }, [service, pathname])

  async function authenticate(action: 'login' | 'logout') {
    if (pending.current || isLoading) return
    pending.current = true
    setIsBusy(true)
    setError(null)
    try {
      await service[action]()
      // Keep the button disabled until the browser leaves for the provider.
    } catch (cause) {
      setError(cause instanceof AuthNotConfiguredError
        ? 'Sign-in is not available yet. Please contact your administrator for access.'
        : action === 'login'
          ? 'We could not sign you in. Please try again.'
          : 'We could not sign you out. Please try again.')
      pending.current = false
      setIsBusy(false)
    }
  }

  return <AuthContext.Provider value={{
    user, isAuthenticated: user !== null, isLoading, isBusy, error,
    login: () => authenticate('login'), logout: () => authenticate('logout'),
  }}>{children}</AuthContext.Provider>
}
