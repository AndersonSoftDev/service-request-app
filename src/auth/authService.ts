export interface AuthUser {
  id: string
  name?: string
  email?: string
}

// Implement with an OIDC SDK that owns redirects, callback handling,
// token validation, and session renewal. No local authentication is performed.
export interface AuthService {
  getUser(): Promise<AuthUser | null>
  login(): Promise<void>
  logout(): Promise<void>
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('An OIDC provider has not been configured.')
    this.name = 'AuthNotConfiguredError'
  }
}

export const authService: AuthService = {
  async getUser() { return null },
  async login() { throw new AuthNotConfiguredError() },
  async logout() { throw new AuthNotConfiguredError() },
}
