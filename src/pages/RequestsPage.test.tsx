// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { RequestsPage } from './RequestsPage'
import * as service from '../services/serviceRequestService'
import { serviceRequestsMock } from '../services/mock/serviceRequestsMock'
import type { ServiceRequestPage } from '../types/serviceRequest'

let container: HTMLDivElement
let root: Root
const logout = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  logout.mockReset()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function renderPage() {
  await act(async () => root.render(
    <MemoryRouter>
      <AuthContext.Provider value={{
        user: { id: 'test-user', name: 'Test User' }, isAuthenticated: true,
        isLoading: false, isBusy: false, error: null, login: vi.fn(), logout,
      }}><RequestsPage /></AuthContext.Provider>
    </MemoryRouter>,
  ))
}
async function advance(ms = 250) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}
function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((element) => element.textContent === label)
  if (!found) throw new Error('Button not found: ' + label)
  return found
}
async function click(label: string) {
  await act(async () => button(label).click())
}
async function select(id: string, value: string) {
  const element = container.querySelector<HTMLSelectElement>('#' + id)!
  await act(async () => {
    element.value = value
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function search(value: string) {
  const input = container.querySelector<HTMLInputElement>('#request-search')!
  await act(async () => {
    // Use the native setter so React receives a genuine value change.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
function ids() {
  return [...container.querySelectorAll('.request-id')].map((element) => element.textContent)
}

describe('RequestsPage', () => {
  it('shows skeletons, then request cards and all required metadata', async () => {
    await renderPage()
    expect(container.querySelector('[aria-label="Loading service requests"]')).not.toBeNull()
    await advance()
    expect(ids()).toHaveLength(10)
    expect(ids()[0]).toBe('REQ-1028')
    expect(container.textContent).toContain('john.smith@example.com')
    expect(container.textContent).toContain('Equipment')
    expect(container.textContent).toContain('In Progress')
    expect(container.textContent).toContain('High priority')
    expect(container.querySelectorAll('time')).toHaveLength(20)
    expect(button('Previous').disabled).toBe(true)
  })
  it('debounces search and resets the current page', async () => {
    const spy = vi.spyOn(service, 'getServiceRequests')
    await renderPage()
    await advance()
    await click('Next')
    await advance()
    expect(ids()[0]).toBe('REQ-1018')
    spy.mockClear()
    await search('pay')
    await advance(200)
    expect(spy).not.toHaveBeenCalled()
    await search('payment')
    await advance(349)
    expect(spy).not.toHaveBeenCalled()
    await advance(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'payment', page: 1 }))
    await advance()
    expect(ids()).toEqual(['REQ-1025', 'REQ-1015', 'REQ-1005'])
    expect(container.querySelector('[aria-label="Request pages"]')).toBeNull()
  })
  it('combines filters and clears them', async () => {
    await renderPage()
    await advance()
    await search('payment')
    await advance(350)
    await advance()
    await select('request-status', 'OPEN')
    await advance()
    await select('request-priority', 'HIGH')
    await advance()
    expect(ids()).toEqual(['REQ-1015', 'REQ-1005'])
    await click('Clear filters')
    await advance()
    expect(ids()).toHaveLength(10)
    expect(container.querySelector<HTMLInputElement>('#request-search')!.value).toBe('')
    expect(container.querySelector<HTMLSelectElement>('#request-status')!.value).toBe('')
  })
  it('preserves filters during pagination and resets on sort or page size changes', async () => {
    const spy = vi.spyOn(service, 'getServiceRequests')
    await renderPage()
    await advance()
    await select('request-status', 'OPEN')
    await advance()
    await select('request-page-size', '5')
    await advance()
    await click('Next')
    await advance()
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'OPEN', pageSize: 5, page: 2 }))
    expect(button('Next').disabled).toBe(true)
    await select('request-sort', 'createdAt')
    await advance()
    expect(ids()[0]).toBe('REQ-1001')
    expect(button('Previous').disabled).toBe(true)
    await select('request-page-size', '25')
    await advance()
    expect(container.querySelector('[aria-label="Request pages"]')).toBeNull()
    expect(container.querySelector('#request-page-size')).not.toBeNull()
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'OPEN', sort: 'createdAt', page: 1, pageSize: 25 }))
  })
  it('shows a filtered empty state with a clear action', async () => {
    await renderPage()
    await advance()
    await search('nonexistent')
    await advance(350)
    await advance()
    expect(container.textContent).toContain('No matching requests')
    expect(container.querySelector('[aria-label="Request pages"]')).toBeNull()
    await click('Clear all filters')
    await advance()
    expect(ids()).toHaveLength(10)
  })
  it('distinguishes an empty dataset from filtered results', async () => {
    vi.spyOn(service, 'getServiceRequests').mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 })
    await renderPage()
    expect(container.textContent).toContain('No requests yet')
    expect(container.textContent).not.toContain('Clear all filters')
  })
  it('shows a safe error and retries successfully', async () => {
    vi.spyOn(service, 'getServiceRequests').mockRejectedValueOnce(new Error('private transport details'))
    await renderPage()
    expect(container.textContent).toContain('Unable to load requests')
    expect(container.textContent).not.toContain('private transport details')
    await click('Try again')
    expect(container.querySelector('[aria-label="Loading service requests"]')).not.toBeNull()
    await advance()
    expect(ids()).toHaveLength(10)
  })
  it('ignores stale responses after filters change', async () => {
    let resolveOld!: (page: ServiceRequestPage) => void
    const oldRequest = new Promise<ServiceRequestPage>((resolve) => { resolveOld = resolve })
    vi.spyOn(service, 'getServiceRequests').mockReturnValueOnce(oldRequest)
    await renderPage()
    await select('request-priority', 'CRITICAL')
    await advance()
    const currentIds = ids()
    expect(currentIds).toHaveLength(4)
    await act(async () => resolveOld({
      items: [serviceRequestsMock[0]], total: 1, totalPages: 1, page: 1, pageSize: 10,
    }))
    expect(ids()).toEqual(currentIds)
  })
  it('delegates logout to the existing auth context and links to the existing placeholder', async () => {
    await renderPage()
    await advance()
    expect(container.querySelector('a[aria-label="View request REQ-1028"]')?.getAttribute('href')).toBe('/requests/REQ-1028')
    await click('Sign out')
    expect(logout).toHaveBeenCalledOnce()
  })
})
