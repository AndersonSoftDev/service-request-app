import type { UserManagerSettings } from 'oidc-client-ts'

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('OIDC configuration is missing or invalid.')
    this.name = 'AuthNotConfiguredError'
  }
}

export function getAuthConfig(): UserManagerSettings {
  const authority = import.meta.env.VITE_OIDC_AUTHORITY?.trim()
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID?.trim()
  const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI?.trim()
  const logoutUri = import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI?.trim()
  if (!authority || !clientId || !redirectUri || !logoutUri) {
    throw new AuthNotConfiguredError()
  }
  try {
    for (const value of [authority, redirectUri, logoutUri]) {
      const url = new URL(value)
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error()
      if (url.username || url.password || url.hash || url.search) throw new Error()
    }
    const callback = new URL(redirectUri)
    const logout = new URL(logoutUri)
    if (callback.origin !== window.location.origin || callback.pathname !== '/auth/callback') throw new Error()
    if (logout.origin !== window.location.origin || logout.pathname !== '/login') throw new Error()
  } catch {
    throw new AuthNotConfiguredError()
  }
  return {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    post_logout_redirect_uri: logoutUri,
    response_type: 'code',
    scope: 'openid profile email',
    disablePKCE: false,
    // Explicit reauthentication on expiry; no iframe/refresh-token setup required.
    automaticSilentRenew: false,
    loadUserInfo: false,
  }
}
