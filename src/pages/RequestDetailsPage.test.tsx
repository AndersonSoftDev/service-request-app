// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { authService } from '../auth/authService'
import * as service from '../services/serviceRequestService'
import { serviceRequestsMock } from '../services/mock/serviceRequestsMock'
import type { ServiceRequest } from '../types/serviceRequest'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  vi.spyOn(authService, 'getUser').mockResolvedValue({ id: 'test-user', name: 'Test User' })
  vi.spyOn(authService, 'subscribe').mockReturnValue(() => {})
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
async function renderApp(path = '/requests/REQ-1001') {
  window.history.replaceState(null, '', path)
  await act(async () => root.render(<App />))
}
async function advance() {
  await act(async () => { await vi.advanceTimersByTimeAsync(250) })
}
async function click(selector: string) {
  const element = container.querySelector<HTMLElement>(selector)
  if (!element) throw new Error('Missing element: ' + selector)
  await act(async () => element.click())
}
async function navigate(path: string) {
  await act(async () => {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

describe('request details and protected navigation', () => {
  it('loads a direct URL and renders all fields as read-only', async () => {
    await renderApp()
    expect(container.querySelector('[aria-label="Loading request details"]')).not.toBeNull()
    await advance()
    const request = serviceRequestsMock[0]
    for (const text of [request.id, request.title, request.description, request.category,
      request.requesterName, request.requesterEmail, 'Open', 'High priority', 'Version']) {
      expect(container.textContent).toContain(text)
    }
    const version = [...container.querySelectorAll('dt')].find((element) => element.textContent === 'Version')
    expect(version?.nextElementSibling?.textContent).toBe(String(request.version))
    expect(container.querySelector('a[href="mailto:john.smith@example.com"]')).not.toBeNull()
    expect([...container.querySelectorAll('time')].map((time) => time.dateTime)).toEqual([request.createdAt, request.updatedAt])
    expect(container.textContent).toContain('UTC')
    expect(container.querySelector('.request-detail')?.querySelectorAll('input, select, textarea')).toHaveLength(0)
  })
  it.each(['/requests/REQ-9999', '/requests/not-a-real-request'])('shows not-found for %s', async (path) => {
    await renderApp(path)
    await advance()
    expect(container.textContent).toContain('Request not found')
    expect(container.textContent).not.toContain('Unable to load request')
    expect(container.querySelector('.request-state a')?.getAttribute('href')).toBe('/requests')
  })
  it('shows a safe generic error and retries', async () => {
    const spy = vi.spyOn(service, 'getServiceRequestById').mockRejectedValueOnce(new Error('private exception'))
    await renderApp()
    expect(container.textContent).toContain('Unable to load request')
    expect(container.textContent).not.toContain('private exception')
    await click('.request-state button')
    expect(container.querySelector('[aria-label="Loading request details"]')).not.toBeNull()
    await advance()
    expect(container.textContent).toContain(serviceRequestsMock[0].title)
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('navigates from the real list to details and back, and retains logout', async () => {
    const logout = vi.spyOn(authService, 'logout').mockResolvedValue()
    await renderApp('/requests')
    await advance()
    await click('a[aria-label="View request REQ-1028"]')
    expect(window.location.pathname).toBe('/requests/REQ-1028')
    await advance()
    expect(container.textContent).toContain(serviceRequestsMock[27].description)
    await click('.detail-back')
    expect(window.location.pathname).toBe('/requests')
    await advance()
    expect(container.querySelectorAll('.request-card')).toHaveLength(10)
    await click('.workspace-account button')
    expect(logout).toHaveBeenCalledOnce()
  })
  it('redirects unauthenticated direct access to login without fetching details', async () => {
    vi.mocked(authService.getUser).mockResolvedValue(null)
    const spy = vi.spyOn(service, 'getServiceRequestById')
    await renderApp()
    expect(window.location.pathname).toBe('/login')
    expect(container.textContent).toContain('Welcome back')
    expect(spy).not.toHaveBeenCalled()
  })
  it('waits for session initialization before rendering protected data', async () => {
    let resolveSession!: (value: null) => void
    vi.mocked(authService.getUser).mockReturnValue(new Promise((resolve) => { resolveSession = resolve }))
    await renderApp()
    expect(container.textContent).toContain('Checking your session')
    expect(window.location.pathname).toBe('/requests/REQ-1001')
    vi.mocked(authService.getUser).mockResolvedValue(null)
    await act(async () => resolveSession(null))
    expect(window.location.pathname).toBe('/login')
  })
  it('keeps the creation route as a placeholder', async () => {
    await renderApp('/requests/new')
    expect(container.textContent).toContain('This page is not available yet.')
    expect(container.querySelector('.request-detail')).toBeNull()
  })
  it('renders the complete multiline description and long requester information', async () => {
    const description = 'First line\n\n' + 'Long content '.repeat(200) + '\nFinal line'
    const email = 'long.address.'.repeat(15) + '@example.com'
    vi.spyOn(service, 'getServiceRequestById').mockResolvedValue({
      ...serviceRequestsMock[0], description, requesterEmail: email,
    })
    await renderApp()
    expect(container.querySelector('.detail-description > p')?.textContent).toBe(description)
    expect(container.querySelector('a[href^="mailto:"]')?.textContent).toBe(email)
  })
  it('ignores a late response after navigation to another request', async () => {
    let resolveOld!: (value: ServiceRequest) => void
    vi.spyOn(service, 'getServiceRequestById').mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
    await renderApp()
    await navigate('/requests/REQ-1002')
    await advance()
    expect(container.textContent).toContain(serviceRequestsMock[1].title)
    await act(async () => resolveOld(serviceRequestsMock[0]))
    expect(container.textContent).not.toContain(serviceRequestsMock[0].title)
    expect(container.textContent).toContain(serviceRequestsMock[1].title)
  })
})
