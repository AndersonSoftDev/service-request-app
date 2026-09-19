import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { authService, AuthNotConfiguredError } from './authService'
import type { AuthService, AuthUser } from './authService'

export function AuthProvider({ children, service = authService }: {
  children: ReactNode
  service?: AuthService
}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    let active = true
    service.getUser()
      .then((currentUser) => { if (active) setUser(currentUser) })
      .catch(() => {
        if (active) setError('We could not check your session. Please try signing in again.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [service])

  async function authenticate(action: 'login' | 'logout') {
    if (pending.current || isLoading) return
    pending.current = true
    setIsBusy(true)
    setError(null)
    try {
      await service[action]()
      const currentUser = await service.getUser()
      setUser(currentUser)
      if (action === 'login' && !currentUser) {
        setError('Sign-in was not completed. Please try again.')
      }
    } catch (cause) {
      setError(cause instanceof AuthNotConfiguredError
        ? 'Sign-in is not available yet. Please contact your administrator for access.'
        : action === 'login'
          ? 'We could not sign you in. Please try again.'
          : 'We could not sign you out. Please try again.')
    } finally {
      pending.current = false
      setIsBusy(false)
    }
  }

  return <AuthContext.Provider value={{
    user, isAuthenticated: user !== null, isLoading, isBusy, error,
    login: () => authenticate('login'), logout: () => authenticate('logout'),
  }}>{children}</AuthContext.Provider>
}
