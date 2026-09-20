// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { authService } from '../auth/authService'
import * as service from '../services/serviceRequestService'
import { resetMockServiceRequests } from '../services/mock/serviceRequestStore'
import { ServiceRequestError } from '../services/ServiceRequestError'
import { ServiceRequestNotFoundError } from '../services/ServiceRequestNotFoundError'
import { MAX_STATUS_NOTE_LENGTH } from '../domain/serviceRequestStatus'

// REQ-1001 OPEN v1, REQ-1002 IN_PROGRESS v2, REQ-1003 RESOLVED v3, REQ-1006 CLOSED v2.
let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.useFakeTimers()
  resetMockServiceRequests()
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
  resetMockServiceRequests()
})

function find<T extends HTMLElement>(selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error('Missing element: ' + selector)
  return element
}
const statusSelect = () => find<HTMLSelectElement>('.status-update select')
const noteField = () => find<HTMLTextAreaElement>('.status-update textarea')
const submitButton = () => find<HTMLButtonElement>('.status-update .primary-button')
const counterText = () => find('.status-update-counter').textContent ?? ''
const fieldValue = (label: string) =>
  [...container.querySelectorAll('dt')].find((term) => term.textContent === label)?.nextElementSibling?.textContent

async function advance() {
  await act(async () => { await vi.advanceTimersByTimeAsync(250) })
}
async function renderDetails(path = '/requests/REQ-1001') {
  window.history.replaceState(null, '', path)
  await act(async () => root.render(<App />))
  await advance()
}
async function click(element: HTMLElement) {
  await act(async () => element.click())
}
// React listens for 'change' on a select and 'input' on a textarea; the native
// setter is needed so the controlled value actually changes.
async function setValue(element: HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setter) throw new Error('No native value setter')
  await act(async () => {
    setter.call(element, value)
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}
async function chooseStatus(value: string) {
  await setValue(statusSelect(), value)
}
function optionValues() {
  return [...statusSelect().options].map((option) => option.value).filter(Boolean)
}

describe('status update form — available transitions', () => {
  it.each([
    ['/requests/REQ-1001', ['IN_PROGRESS', 'CLOSED']],
    ['/requests/REQ-1002', ['RESOLVED', 'OPEN']],
    ['/requests/REQ-1003', ['CLOSED', 'IN_PROGRESS']],
  ])('offers only the valid transitions for %s', async (path, expected) => {
    await renderDetails(path)
    expect(optionValues()).toEqual(expected)
  })
  it('never offers the current status as an update target', async () => {
    await renderDetails()
    expect(optionValues()).not.toContain('OPEN')
    expect(optionValues()).not.toContain('RESOLVED')
    expect(statusSelect().value).toBe('')
  })
  it('offers no controls for a closed request and explains why', async () => {
    await renderDetails('/requests/REQ-1006')
    expect(container.querySelector('.status-update')).not.toBeNull()
    expect(container.querySelectorAll('.status-update select, .status-update textarea, .status-update button'))
      .toHaveLength(0)
    expect(find('.status-update-locked').textContent)
      .toContain('closed and can no longer change status')
  })
  it('labels the controls and keeps them reachable by keyboard', async () => {
    await renderDetails()
    for (const control of [statusSelect(), noteField()]) {
      const label = container.querySelector<HTMLLabelElement>(`label[for="${control.id}"]`)
      expect(label?.textContent).toBeTruthy()
      expect(control.tabIndex).toBeGreaterThanOrEqual(0)
    }
    expect(noteField().getAttribute('aria-describedby')).toBe(find('.status-update-counter span').id)
    expect(find('.status-update').getAttribute('aria-labelledby'))
      .toBe(find('.status-update h2').id)
  })
})

describe('status update form — note', () => {
  it('counts characters as they are typed', async () => {
    await renderDetails()
    expect(counterText()).toContain(`0 / ${MAX_STATUS_NOTE_LENGTH}`)
    await setValue(noteField(), 'Escalated')
    expect(counterText()).toContain(`9 / ${MAX_STATUS_NOTE_LENGTH}`)
    await setValue(noteField(), '')
    expect(counterText()).toContain(`0 / ${MAX_STATUS_NOTE_LENGTH}`)
  })
  it('counts astral characters as single characters', async () => {
    await renderDetails()
    await setValue(noteField(), '\u{1F600}\u{1F600}\u{1F600}')
    expect(counterText()).toContain(`3 / ${MAX_STATUS_NOTE_LENGTH}`)
  })
  it('accepts exactly the maximum length', async () => {
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), 'x'.repeat(MAX_STATUS_NOTE_LENGTH))
    expect(counterText()).toContain(`${MAX_STATUS_NOTE_LENGTH} / ${MAX_STATUS_NOTE_LENGTH}`)
    expect(find('.status-update-counter').className).not.toContain('is-invalid')
    expect(submitButton().disabled).toBe(false)
  })
  it('blocks submission of an over-long note and says so', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), 'x'.repeat(MAX_STATUS_NOTE_LENGTH + 1))
    expect(submitButton().disabled).toBe(true)
    expect(noteField().getAttribute('aria-invalid')).toBe('true')
    const message = find('.status-update-counter [role="alert"]')
    expect(message.textContent).toContain(`exceeds the ${MAX_STATUS_NOTE_LENGTH} character limit`)
    await click(submitButton())
    expect(spy).not.toHaveBeenCalled()
  })
  it('does not send an empty note to the service', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), '   ')
    await click(submitButton())
    expect(spy).toHaveBeenCalledWith('REQ-1001', { status: 'IN_PROGRESS', version: 1 })
    await advance()
  })
  it('sends a trimmed note when one is written', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), '  Assigned to the field team.  ')
    await click(submitButton())
    expect(spy).toHaveBeenCalledWith('REQ-1001',
      { status: 'IN_PROGRESS', version: 1, note: 'Assigned to the field team.' })
    await advance()
  })
})

describe('status update form — submitting', () => {
  it('requires a status before the submit button becomes usable', async () => {
    await renderDetails()
    expect(submitButton().disabled).toBe(true)
    await chooseStatus('IN_PROGRESS')
    expect(submitButton().disabled).toBe(false)
  })
  it('updates status, version and updatedAt from the returned request', async () => {
    await renderDetails()
    const updatedAtBefore = find('time[datetime]:last-of-type').getAttribute('datetime')
    expect(fieldValue('Version')).toBe('1')
    expect(find('.request-detail .request-badge').textContent).toContain('Open')

    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), 'Picked up by support.')
    await click(submitButton())
    await advance()

    expect(find('.request-detail .request-badge').textContent).toContain('In Progress')
    expect(fieldValue('Version')).toBe('2')
    expect([...container.querySelectorAll('time')][1].getAttribute('datetime')).not.toBe(updatedAtBefore)
    const success = find('.status-update-feedback')
    expect(success.getAttribute('role')).toBe('status')
    expect(success.textContent).toContain('Status updated to In Progress')
    expect(success.textContent).toContain('version 2')
    // The confirmation is not colour-only.
    expect(success.textContent).toMatch(/updated/i)
  })
  it('resets the form and offers the transitions of the new status', async () => {
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await setValue(noteField(), 'Picked up by support.')
    await click(submitButton())
    await advance()
    expect(statusSelect().value).toBe('')
    expect(noteField().value).toBe('')
    expect(optionValues()).toEqual(['RESOLVED', 'OPEN'])
  })
  it('disables every control while the update is in flight and keeps the data visible', async () => {
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())

    expect(submitButton().disabled).toBe(true)
    expect(statusSelect().disabled).toBe(true)
    expect(noteField().disabled).toBe(true)
    expect(find('.status-update form').getAttribute('aria-busy')).toBe('true')
    expect(find('.status-update-feedback').textContent).toContain('Updating the request status')
    expect(submitButton().textContent).toContain('Updating')
    // Nothing is optimistic: the record still shows its loaded state.
    expect(container.textContent).toContain('Internet connection drops every evening')
    expect(find('.request-detail .request-badge').textContent).toContain('Open')
    expect(fieldValue('Version')).toBe('1')
    expect(container.querySelector('.detail-skeleton')).toBeNull()

    await advance()
    expect(fieldValue('Version')).toBe('2')
  })
  it('ignores repeated clicks while a submission is pending', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    const button = submitButton()
    await click(button)
    await click(button)
    await click(button)
    await advance()
    expect(spy).toHaveBeenCalledOnce()
    expect(fieldValue('Version')).toBe('2')
  })
  it('asks for confirmation before closing a request', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await renderDetails()
    await chooseStatus('CLOSED')
    await click(submitButton())
    expect(spy).not.toHaveBeenCalled()
    expect(find('.status-update-confirm').textContent).toContain('Closing is final')

    await click(find('.status-update-confirm .secondary-button'))
    expect(container.querySelector('.status-update-confirm')).toBeNull()
    expect(spy).not.toHaveBeenCalled()

    await click(submitButton())
    await click(find('.status-update-confirm .primary-button'))
    await advance()
    expect(spy).toHaveBeenCalledOnce()
    expect(find('.request-detail .request-badge').textContent).toContain('Closed')
    expect(fieldValue('Version')).toBe('2')
    expect(container.querySelector('.status-update select')).toBeNull()
  })
})

describe('status update form — failures', () => {
  it('reports a 409 conflict and reloads without resubmitting', async () => {
    await renderDetails()
    expect(fieldValue('Version')).toBe('1')

    // Another user updates the same request: the stored version becomes 2.
    await act(async () => {
      const other = service.updateServiceRequestStatus('REQ-1001', { status: 'IN_PROGRESS', version: 1 })
      await vi.advanceTimersByTimeAsync(250)
      await other
    })

    await chooseStatus('CLOSED')
    await click(submitButton())
    await click(find('.status-update-confirm .primary-button'))
    await advance()

    const alert = find('.status-update-error')
    expect(alert.getAttribute('role')).toBe('alert')
    expect(alert.textContent).toContain('This request was updated by another user.')
    expect(alert.textContent).toContain('Reload the request to get the latest version')
    // The stale view is preserved, never silently overwritten or locally incremented.
    expect(fieldValue('Version')).toBe('1')
    expect(find('.request-detail .request-badge').textContent).toContain('Open')

    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
    await click(find('.status-update-error button'))
    await advance()
    expect(spy).not.toHaveBeenCalled()
    expect(fieldValue('Version')).toBe('2')
    expect(find('.request-detail .request-badge').textContent).toContain('In Progress')
    expect(container.querySelector('.status-update-error')).toBeNull()
    expect(statusSelect().value).toBe('')
    expect(optionValues()).toEqual(['RESOLVED', 'OPEN'])
  })
  it('blocks further submissions until the conflict is resolved', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
      .mockRejectedValueOnce(new ServiceRequestError(409))
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()
    expect(find('.status-update-error').textContent).toContain('updated by another user')

    await click(submitButton())
    expect(spy).toHaveBeenCalledOnce()
    expect(submitButton().disabled).toBe(true)
    expect(statusSelect().disabled).toBe(true)
    expect(noteField().disabled).toBe(true)
  })
  it('reports a 422 invalid transition without exposing the exception', async () => {
    vi.spyOn(service, 'updateServiceRequestStatus')
      .mockRejectedValueOnce(new ServiceRequestError(422, 'transition'))
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()
    expect(find('.status-update-error').textContent).toBe('This status transition is not allowed.')
    expect(container.textContent).not.toContain('Service request operation failed')
    expect(fieldValue('Version')).toBe('1')
  })
  it('reports a 422 note rejection', async () => {
    vi.spyOn(service, 'updateServiceRequestStatus')
      .mockRejectedValueOnce(new ServiceRequestError(422, 'note'))
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()
    expect(find('.status-update-error').textContent)
      .toBe(`The note cannot exceed ${MAX_STATUS_NOTE_LENGTH} characters.`)
  })
  it('reports an unexpected failure and allows a retry', async () => {
    const spy = vi.spyOn(service, 'updateServiceRequestStatus')
      .mockRejectedValueOnce(new Error('private exception'))
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()
    expect(find('.status-update-error').textContent).toBe('Unable to update request. Please try again.')
    expect(container.textContent).not.toContain('private exception')
    expect(container.querySelector('.status-update-error button')).toBeNull()

    expect(submitButton().disabled).toBe(false)
    await click(submitButton())
    await advance()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(fieldValue('Version')).toBe('2')
    expect(container.querySelector('.status-update-error')).toBeNull()
  })
  it('falls back to the existing not-found view when the request disappears', async () => {
    vi.spyOn(service, 'updateServiceRequestStatus')
      .mockRejectedValueOnce(new ServiceRequestNotFoundError())
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()
    expect(container.textContent).toContain('Request not found')
    expect(container.textContent).not.toContain('Unable to update request')
    expect(container.querySelector('.status-update')).toBeNull()
  })
})

describe('status update — list regression', () => {
  it('shows the updated request when returning to the list', async () => {
    await renderDetails()
    await chooseStatus('IN_PROGRESS')
    await click(submitButton())
    await advance()

    await click(find('.detail-back'))
    await advance()
    // REQ-1001 is the oldest record, so sort by the change that just happened.
    await setValue(find<HTMLSelectElement>('#request-sort'), '-updatedAt')
    await advance()
    const card = find('.request-card')
    expect(card.textContent).toContain('REQ-1001')
    expect(card.textContent).toContain('In Progress')

    await click(find('a[aria-label="View request REQ-1001"]'))
    await advance()
    expect(fieldValue('Version')).toBe('2')
    expect(find('.request-detail .request-badge').textContent).toContain('In Progress')
  })
})
