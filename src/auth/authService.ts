import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import type { User } from 'oidc-client-ts'
import { getAuthConfig, AuthNotConfiguredError } from './authConfig'

export { AuthNotConfiguredError } from './authConfig'

export interface AuthUser {
  id: string
  name?: string
  email?: string
}
export interface AuthService {
  getUser(): Promise<AuthUser | null>
  isAuthenticated(): Promise<boolean>
  getAccessToken(): Promise<string | null>
  login(): Promise<void>
  logout(): Promise<void>
  completeLogin(): Promise<AuthUser>
  subscribe(listener: (user: AuthUser | null) => void): () => void
}

let manager: UserManager | undefined
function getManager() {
  if (!manager) {
    manager = new UserManager({
      ...getAuthConfig(),
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    })
  }
  return manager
}
function toAuthUser(user: User | null): AuthUser | null {
  if (!user || user.expired !== false || !user.access_token) return null
  return { id: user.profile.sub, name: user.profile.name, email: user.profile.email }
}
async function currentUser() {
  try {
    const user = await getManager().getUser()
    return toAuthUser(user) ? user : null
  } catch (error) {
    if (error instanceof AuthNotConfiguredError) return null
    throw error
  }
}

// Reuse the callback promise so React StrictMode cannot redeem a code twice.
let callback: Promise<AuthUser> | undefined
export const authService: AuthService = {
  async getUser() { return toAuthUser(await currentUser()) },
  async isAuthenticated() { return (await currentUser()) !== null },
  async getAccessToken() { return (await currentUser())?.access_token ?? null },
  async login() {
    callback = undefined
    await getManager().clearStaleState()
    await getManager().signinRedirect()
  },
  async logout() {
    // The SDK removes its local session and redirects to the provider's
    // end_session_endpoint. No application-specific logout state is needed.
    await getManager().signoutRedirect()
  },
  completeLogin() {
    callback ??= getManager().signinRedirectCallback().then((user) => {
      const profile = toAuthUser(user)
      if (!profile) throw new Error('No valid session returned')
      return profile
    })
    return callback
  },
  subscribe(listener) {
    let client: UserManager
    try { client = getManager() } catch { return () => {} }
    const cleanups = [
      client.events.addUserLoaded((user) => listener(toAuthUser(user))),
      client.events.addUserUnloaded(() => listener(null)),
      client.events.addAccessTokenExpired(() => listener(null)),
      client.events.addUserSignedOut(() => listener(null)),
    ]
    return () => cleanups.forEach((cleanup) => cleanup())
  },
}
