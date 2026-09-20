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

const validForm = {
  title: 'Fibre line down at the branch office',
  description: 'The branch office has had no connectivity since 08:00 today.',
  category: 'Connectivity',
  priority: 'HIGH',
  requesterName: 'Ana Pereira',
  requesterEmail: 'ana.pereira@example.com',
}

function find<T extends HTMLElement>(selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error('Missing element: ' + selector)
  return element
}
const submitButton = () => find<HTMLButtonElement>('.create-form .primary-button')
const errorMessages = () => [...container.querySelectorAll('.field-error')].map((node) => node.textContent ?? '')
const fieldErrorFor = (field: string) => container.querySelector('#' + field + '-error')?.textContent ?? null

async function advance() {
  await act(async () => { await vi.advanceTimersByTimeAsync(250) })
}
async function renderApp(path = '/requests/new') {
  window.history.replaceState(null, '', path)
  await act(async () => root.render(<App />))
}
async function click(element: HTMLElement) {
  await act(async () => element.click())
}
// React listens for 'change' on a select and 'input' on the other controls.
async function setValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setter) throw new Error('No native value setter')
  await act(async () => {
    setter.call(element, value)
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}
async function fill(values: Partial<typeof validForm>) {
  for (const [field, value] of Object.entries(values)) {
    await setValue(find<HTMLInputElement>('#' + field), value)
  }
}
async function fillValidForm(overrides: Partial<typeof validForm> = {}) {
  await fill({ ...validForm, ...overrides })
}

describe('create request page — rendering', () => {
  it('renders the heading and every contract field', async () => {
    await renderApp()
    expect(container.textContent).toContain('Create Service Request')
    for (const field of Object.keys(validForm)) {
      const control = find<HTMLElement>('#' + field)
      expect(container.querySelector<HTMLLabelElement>(`label[for="${field}"]`)?.textContent).toBeTruthy()
      expect(control.hasAttribute('required')).toBe(true)
    }
    expect(find<HTMLInputElement>('#requesterEmail').type).toBe('email')
    expect(find<HTMLInputElement>('#requesterName').autocomplete).toBe('name')
    expect(find<HTMLInputElement>('#requesterEmail').autocomplete).toBe('email')
    expect([...find<HTMLSelectElement>('#priority').options].map((option) => option.value))
      .toEqual(['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    expect(errorMessages()).toHaveLength(0)
  })
  it('counts title and description characters as they are typed', async () => {
    await renderApp()
    expect(find('#title-counter').textContent).toContain('0 / 120')
    expect(find('#description-counter').textContent).toContain('0 / 2000')
    await fill({ title: 'Printer offline', description: 'The shared printer cannot be reached.' })
    expect(find('#title-counter').textContent).toContain('15 / 120')
    expect(find('#description-counter').textContent).toContain('37 / 2000')
  })
  it('is protected by the existing authentication guard', async () => {
    vi.mocked(authService.getUser).mockResolvedValue(null)
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    expect(window.location.pathname).toBe('/login')
    expect(spy).not.toHaveBeenCalled()
  })
  it('is reachable from the requests list', async () => {
    await renderApp('/requests')
    await advance()
    await click(find('.requests-heading .primary-button'))
    expect(window.location.pathname).toBe('/requests/new')
    expect(container.querySelector('.create-form')).not.toBeNull()
  })
})

describe('create request page — client-side validation', () => {
  it('reports every empty field and sends nothing', async () => {
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    await click(submitButton())
    expect(spy).not.toHaveBeenCalled()
    expect(fieldErrorFor('title')).toContain('Title is required.')
    expect(fieldErrorFor('description')).toContain('Description is required.')
    expect(fieldErrorFor('category')).toContain('Category is required.')
    expect(fieldErrorFor('priority')).toContain('Select a priority.')
    expect(fieldErrorFor('requesterName')).toContain('Requester name is required.')
    expect(fieldErrorFor('requesterEmail')).toContain('Email is required.')
    const summary = find('.form-error')
    expect(summary.getAttribute('role')).toBe('alert')
    expect(summary.textContent).toContain('Please correct the highlighted fields')
  })
  it.each([
    ['title', 'ab', 'Title must be at least 3 characters.'],
    ['title', 'x'.repeat(121), 'Title cannot exceed 120 characters.'],
    ['description', 'too short', 'Description must be at least 10 characters.'],
    ['description', 'x'.repeat(2001), 'Description cannot exceed 2000 characters.'],
    ['category', 'a', 'Category must be at least 2 characters.'],
    ['requesterName', 'A', 'Requester name must be at least 2 characters.'],
    ['requesterEmail', 'not-an-email', 'Please enter a valid email address.'],
    ['requesterEmail', 'a'.repeat(245) + '@example.com', 'Email cannot exceed 254 characters.'],
  ])('rejects %s value %# before submitting', async (field, value, message) => {
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    await fillValidForm({ [field]: value })
    await click(submitButton())
    expect(spy).not.toHaveBeenCalled()
    expect(fieldErrorFor(field)).toContain(message)
    expect(find('#' + field).getAttribute('aria-invalid')).toBe('true')
    expect(find('#' + field).getAttribute('aria-describedby')).toContain(field + '-error')
  })
  it('does not truncate an over-long value and keeps what was typed', async () => {
    await renderApp()
    const title = 'x'.repeat(121)
    await fillValidForm({ title })
    await click(submitButton())
    expect(find<HTMLInputElement>('#title').value).toBe(title)
    expect(find('#title-counter').textContent).toContain('121 / 120')
  })
  it('clears a field error as soon as the field is edited', async () => {
    await renderApp()
    await click(submitButton())
    expect(fieldErrorFor('title')).toContain('Title is required.')
    await fill({ title: 'Printer offline' })
    expect(fieldErrorFor('title')).toBeNull()
    expect(find('#title').getAttribute('aria-invalid')).toBeNull()
  })
})

describe('create request page — submission', () => {
  it('sends trimmed values and opens the created request', async () => {
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    await fillValidForm({ title: '  ' + validForm.title + '  ' })
    await click(submitButton())
    expect(spy).toHaveBeenCalledWith(validForm)

    await advance()
    expect(window.location.pathname).toBe('/requests/REQ-1029')
    await advance()
    expect(container.textContent).toContain(validForm.title)
    expect(container.textContent).toContain(validForm.description)
    expect(container.querySelector('.request-detail .request-badge')?.textContent).toContain('Open')
    const version = [...container.querySelectorAll('dt')].find((term) => term.textContent === 'Version')
    expect(version?.nextElementSibling?.textContent).toBe('1')
  })
  it('shows a submitting state and keeps the entered data visible', async () => {
    await renderApp()
    await fillValidForm()
    await click(submitButton())

    expect(submitButton().disabled).toBe(true)
    expect(submitButton().textContent).toContain('Creating request')
    expect(find('.create-form').getAttribute('aria-busy')).toBe('true')
    expect(find('.create-form-status').getAttribute('role')).toBe('status')
    expect(find('.create-form-status').textContent).toContain('Creating request')
    for (const field of Object.keys(validForm)) {
      expect(find<HTMLInputElement>('#' + field).disabled).toBe(true)
    }
    expect(find<HTMLInputElement>('#title').value).toBe(validForm.title)
    await advance()
  })
  it('prevents duplicate submissions', async () => {
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    await fillValidForm()
    const button = submitButton()
    await click(button)
    await click(button)
    await click(button)
    expect(spy).toHaveBeenCalledOnce()
    await advance()
    expect(window.location.pathname).toBe('/requests/REQ-1029')
    await advance()
  })
  it('lists the created request on the requests page', async () => {
    await renderApp()
    await fillValidForm()
    await click(submitButton())
    await advance()
    await advance()

    await click(find('.detail-back'))
    await advance()
    const card = find('.request-card')
    expect(card.textContent).toContain('REQ-1029')
    expect(card.textContent).toContain(validForm.title)
    expect(card.textContent).toContain('Open')
  })
})

describe('create request page — failures', () => {
  it.each([
    [400, 'We could not send this request. Please check the form and try again.'],
    [401, 'Your session has expired. Please sign in again.'],
    [403, 'You do not have permission to create service requests.'],
    [500, 'The service is temporarily unavailable. Please try again.'],
  ] as const)('reports a %i without exposing the exception', async (status, message) => {
    vi.spyOn(service, 'createServiceRequest').mockRejectedValueOnce(new ServiceRequestError(status))
    await renderApp()
    await fillValidForm()
    await click(submitButton())
    await advance()
    expect(find('.form-error').textContent).toBe(message)
    expect(container.textContent).not.toContain('Service request operation failed')
    expect(container.textContent).not.toContain('undefined')
    expect(container.textContent).not.toContain('[object Object]')
  })
  it('keeps the form usable so the user can retry', async () => {
    const spy = vi.spyOn(service, 'createServiceRequest')
      .mockRejectedValueOnce(new ServiceRequestError(500))
    await renderApp()
    await fillValidForm()
    await click(submitButton())
    await advance()
    expect(find('.form-error').textContent).toContain('temporarily unavailable')
    expect(find<HTMLInputElement>('#title').value).toBe(validForm.title)
    expect(find<HTMLInputElement>('#title').disabled).toBe(false)
    expect(submitButton().disabled).toBe(false)

    await click(submitButton())
    await advance()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(window.location.pathname).toBe('/requests/REQ-1029')
    await advance()
  })
  it('maps server field errors onto the matching inputs', async () => {
    vi.spyOn(service, 'createServiceRequest').mockRejectedValueOnce(
      new ServiceRequestError(422, undefined, { category: 'Category is not recognised.' }),
    )
    await renderApp()
    await fillValidForm()
    await click(submitButton())
    await advance()
    expect(fieldErrorFor('category')).toContain('Category is not recognised.')
    expect(find('#category').getAttribute('aria-invalid')).toBe('true')
    expect(find('.form-error').textContent).toContain('Please correct the highlighted fields')
  })
  it('reports an unexpected failure generically', async () => {
    vi.spyOn(service, 'createServiceRequest').mockRejectedValueOnce(new Error('private exception'))
    await renderApp()
    await fillValidForm()
    await click(submitButton())
    await advance()
    expect(find('.form-error').textContent).toBe('Unable to create the request. Please try again.')
    expect(container.textContent).not.toContain('private exception')
  })
})

describe('create request page — cancel', () => {
  it('returns to the list without submitting', async () => {
    const spy = vi.spyOn(service, 'createServiceRequest')
    await renderApp()
    await fillValidForm()
    await click(find('.create-form-actions .secondary-button'))
    expect(spy).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/requests')
    await advance()
    expect(container.querySelectorAll('.request-card')).toHaveLength(10)
  })
})
