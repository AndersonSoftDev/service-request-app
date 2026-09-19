import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  getUser: vi.fn(),
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  clearStaleState: vi.fn(),
  cleanup: vi.fn(),
  addUserLoaded: vi.fn(),
  addUserUnloaded: vi.fn(),
  addAccessTokenExpired: vi.fn(),
  addUserSignedOut: vi.fn(),
}))
vi.mock('oidc-client-ts', () => ({
  UserManager: class {
    getUser = sdk.getUser
    signinRedirect = sdk.signinRedirect
    signoutRedirect = sdk.signoutRedirect
    signinRedirectCallback = sdk.signinRedirectCallback
    clearStaleState = sdk.clearStaleState
    events = sdk
  },
  WebStorageStateStore: class {},
}))

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.stubGlobal('window', {
    location: { origin: 'https://portal.example' },
    sessionStorage: {},
  })
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'test-public-client')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://portal.example/auth/callback')
  vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'https://portal.example/login')
  for (const register of [sdk.addUserLoaded, sdk.addUserUnloaded, sdk.addAccessTokenExpired, sdk.addUserSignedOut]) {
    register.mockReturnValue(sdk.cleanup)
  }
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('OIDC configuration', () => {
  it('uses code flow, PKCE and OIDC scopes without a secret', async () => {
    const { getAuthConfig } = await import('./authConfig')
    const config = getAuthConfig()
    expect(config.response_type).toBe('code')
    expect(config.disablePKCE).toBe(false)
    expect(config.scope).toBe('openid profile email')
    expect(config).not.toHaveProperty('client_secret')
  })
  it('rejects a callback on another origin', async () => {
    vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://other.example/auth/callback')
    const { getAuthConfig, AuthNotConfiguredError } = await import('./authConfig')
    expect(getAuthConfig).toThrow(AuthNotConfiguredError)
  })
  it('rejects insecure remote authorities', async () => {
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://identity.example')
    const { getAuthConfig } = await import('./authConfig')
    expect(getAuthConfig).toThrow()
  })
})

describe('authentication service', () => {
  it('keeps the login page available without configuration, but refuses login', async () => {
    vi.stubEnv('VITE_OIDC_CLIENT_ID', '')
    const { authService, AuthNotConfiguredError } = await import('./authService')
    expect(await authService.getUser()).toBeNull()
    await expect(authService.login()).rejects.toBeInstanceOf(AuthNotConfiguredError)
    expect(sdk.signinRedirect).not.toHaveBeenCalled()
  })
  it('never exposes an expired session or token', async () => {
    sdk.getUser.mockResolvedValue({ expired: true, access_token: 'test-only-token', profile: { sub: 'test-user' } })
    const { authService } = await import('./authService')
    expect(await authService.getUser()).toBeNull()
    expect(await authService.isAuthenticated()).toBe(false)
    expect(await authService.getAccessToken()).toBeNull()
  })
  it('maps a valid user and exposes its token only through the service', async () => {
    sdk.getUser.mockResolvedValue({ expired: false, access_token: 'test-only-token', profile: { sub: 'test-user', name: 'Test User' } })
    const { authService } = await import('./authService')
    expect(await authService.getUser()).toEqual({ id: 'test-user', name: 'Test User' })
    expect(await authService.isAuthenticated()).toBe(true)
    expect(await authService.getAccessToken()).toBe('test-only-token')
  })
  it('redeems the callback only once for repeated StrictMode initialization', async () => {
    sdk.signinRedirectCallback.mockResolvedValue({ expired: false, access_token: 'test-only-token', profile: { sub: 'test-user' } })
    const { authService } = await import('./authService')
    const first = authService.completeLogin()
    const second = authService.completeLogin()
    expect(first).toBe(second)
    await expect(first).resolves.toMatchObject({ id: 'test-user' })
    expect(sdk.signinRedirectCallback).toHaveBeenCalledTimes(1)
  })
  it('propagates callback failure without creating a session', async () => {
    sdk.signinRedirectCallback.mockRejectedValue(new Error('invalid state'))
    const { authService } = await import('./authService')
    await expect(authService.completeLogin()).rejects.toThrow('invalid state')
  })
  it('delegates login and logout to the SDK', async () => {
    const { authService } = await import('./authService')
    await authService.login()
    await authService.logout()
    expect(sdk.clearStaleState).toHaveBeenCalledOnce()
    expect(sdk.signinRedirect).toHaveBeenCalledOnce()
    expect(sdk.signoutRedirect).toHaveBeenCalledOnce()
  })
  it('notifies consumers when the token expires and removes subscriptions', async () => {
    const { authService } = await import('./authService')
    const listener = vi.fn()
    const unsubscribe = authService.subscribe(listener)
    sdk.addAccessTokenExpired.mock.calls[0][0]()
    expect(listener).toHaveBeenCalledWith(null)
    unsubscribe()
    expect(sdk.cleanup).toHaveBeenCalledTimes(4)
  })
})
