import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createServiceRequest, getServiceRequestById, getServiceRequests, updateServiceRequestStatus,
} from './serviceRequestService'
import { resetMockServiceRequests } from './mock/serviceRequestStore'
import { serviceRequestsMock } from './mock/serviceRequestsMock'
import { createRequestLimits, priorities } from '../domain/createServiceRequest'
import type { CreateServiceRequest, ServiceRequest } from '../types/serviceRequest'

beforeEach(() => { vi.useFakeTimers(); resetMockServiceRequests() })
afterEach(() => vi.useRealTimers())

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const REQUEST_ID = /^REQ-\d{4}$/

const validInput: CreateServiceRequest = {
  title: 'Fibre line down at the branch office',
  description: 'The branch office has had no connectivity since 08:00 today.',
  category: 'Connectivity',
  priority: 'HIGH',
  requesterName: 'Ana Pereira',
  requesterEmail: 'ana.pereira@example.com',
}

async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}
function create(input: CreateServiceRequest = validInput): Promise<ServiceRequest> {
  return settle(createServiceRequest(input))
}
// A rejected payload is what an unvalidated caller would send, so the types are deliberately bypassed.
function payload(overrides: Record<string, unknown>): CreateServiceRequest {
  return { ...validInput, ...overrides } as unknown as CreateServiceRequest
}

describe('POST /requests - successful creation', () => {
  it('returns the submitted data plus the server-assigned fields', async () => {
    const created = await create()
    expect(created).toMatchObject(validInput)
    expect(created.id).toMatch(REQUEST_ID)
    expect(created.status).toBe('OPEN')
    expect(created.version).toBe(1)
    expect(created.createdAt).toMatch(ISO_UTC)
    expect(created.updatedAt).toMatch(ISO_UTC)
    expect(created.updatedAt).toBe(created.createdAt)
    expect(Object.keys(created).sort()).toEqual(Object.keys(serviceRequestsMock[0]).sort())
  })
  it('waits for the shared mock latency', async () => {
    let resolved = false
    const pending = createServiceRequest(validInput).then((data) => { resolved = true; return data })
    await vi.advanceTimersByTimeAsync(249)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect((await pending).id).toMatch(REQUEST_ID)
  })
  it('generates an ID that no seeded request already uses', async () => {
    const created = await create()
    expect(serviceRequestsMock.map((request) => request.id)).not.toContain(created.id)
    expect(created.id).toBe('REQ-1029')
  })
  it('keeps generated IDs unique across a session', async () => {
    const ids = [(await create()).id, (await create()).id, (await create()).id]
    expect(new Set(ids).size).toBe(3)
    expect(ids.every((id) => REQUEST_ID.test(id))).toBe(true)
  })
  it.each(priorities)('accepts priority %s', async (priority) => {
    expect((await create({ ...validInput, priority })).priority).toBe(priority)
  })
  it.each([
    ['the shortest allowed values', {
      title: 'abc', description: 'x'.repeat(10), category: 'ab', requesterName: 'Al', requesterEmail: 'a@b.co',
    }],
    ['the longest allowed values', {
      title: 'x'.repeat(createRequestLimits.title.max),
      description: 'x'.repeat(createRequestLimits.description.max),
      category: 'x'.repeat(createRequestLimits.category.max),
      requesterName: 'x'.repeat(createRequestLimits.requesterName.max),
      requesterEmail: 'a'.repeat(242) + '@example.com',
    }],
  ])('accepts %s', async (_label, overrides) => {
    const created = await create({ ...validInput, ...overrides })
    expect(created).toMatchObject(overrides)
    expect(created.version).toBe(1)
  })
})

describe('POST /requests - shared store persistence', () => {
  it('makes the new request readable by ID', async () => {
    const created = await create()
    expect(await settle(getServiceRequestById(created.id))).toEqual(created)
  })
  it('adds the new request to the list without disturbing the seeded data', async () => {
    const before = await settle(getServiceRequests({ pageSize: 100 }))
    const created = await create()
    const after = await settle(getServiceRequests({ pageSize: 100 }))
    expect(after.total).toBe(before.total + 1)
    expect(after.items.map((item) => item.id)).toContain(created.id)
    for (const seed of serviceRequestsMock) {
      expect(after.items.find((item) => item.id === seed.id)).toEqual(seed)
    }
  })
  it('is found by search and status filters like any other request', async () => {
    const created = await create()
    expect((await settle(getServiceRequests({ search: 'Fibre line down' }))).items).toEqual([created])
    const open = await settle(getServiceRequests({ status: 'OPEN', pageSize: 100 }))
    expect(open.items.map((item) => item.id)).toContain(created.id)
  })
  it('can then be moved through the status workflow', async () => {
    const created = await create()
    const updated = await settle(updateServiceRequestStatus(created.id, {
      status: 'IN_PROGRESS', version: created.version,
    }))
    expect(updated).toMatchObject({ id: created.id, status: 'IN_PROGRESS', version: 2 })
  })
  it('returns a copy that cannot mutate the store', async () => {
    const created = await create()
    created.title = 'Changed'
    created.version = 99
    expect((await settle(getServiceRequestById(created.id))).title).toBe('Fibre line down at the branch office')
  })
  it('drops created requests when the fixtures are reset', async () => {
    const created = await create()
    resetMockServiceRequests()
    const assertion = expect(getServiceRequestById(created.id)).rejects.toMatchObject({ status: 404 })
    await vi.runAllTimersAsync()
    await assertion
  })
})

describe('POST /requests - validation', () => {
  const invalidInputs: [string, Record<string, unknown>, string, string][] = [
    ['a blank title', { title: '   ' }, 'title', 'Title is required.'],
    ['a title below the minimum', { title: 'ab' }, 'title', 'Title must be at least 3 characters.'],
    ['a title above the maximum', { title: 'x'.repeat(121) }, 'title', 'Title cannot exceed 120 characters.'],
    ['a description below the minimum', { description: 'too short' }, 'description',
      'Description must be at least 10 characters.'],
    ['a description above the maximum', { description: 'x'.repeat(2001) }, 'description',
      'Description cannot exceed 2000 characters.'],
    ['a category below the minimum', { category: 'a' }, 'category', 'Category must be at least 2 characters.'],
    ['a category above the maximum', { category: 'x'.repeat(51) }, 'category',
      'Category cannot exceed 50 characters.'],
    ['a requester name below the minimum', { requesterName: 'A' }, 'requesterName',
      'Requester name must be at least 2 characters.'],
    ['a requester name above the maximum', { requesterName: 'x'.repeat(101) }, 'requesterName',
      'Requester name cannot exceed 100 characters.'],
    ['a missing email', { requesterEmail: '' }, 'requesterEmail', 'Email is required.'],
    ['an invalid email', { requesterEmail: 'not-an-email' }, 'requesterEmail', 'Please enter a valid email address.'],
    ['an email above the maximum', { requesterEmail: 'a'.repeat(245) + '@example.com' }, 'requesterEmail',
      'Email cannot exceed 254 characters.'],
    ['a missing priority', { priority: undefined }, 'priority', 'Select a priority.'],
    ['an unknown priority', { priority: 'URGENT' }, 'priority', 'Select a priority.'],
  ]

  it.each(invalidInputs)('rejects %s with 422 naming the field', async (_label, overrides, field, message) => {
    const assertion = expect(createServiceRequest(payload(overrides)))
      .rejects.toMatchObject({ status: 422, fields: { [field]: message } })
    await vi.runAllTimersAsync()
    await assertion
  })
  it('stores nothing when validation fails', async () => {
    const before = await settle(getServiceRequests({ pageSize: 100 }))
    const assertion = expect(createServiceRequest(payload({ title: '' }))).rejects.toMatchObject({ status: 422 })
    await vi.runAllTimersAsync()
    await assertion
    expect((await settle(getServiceRequests({ pageSize: 100 }))).total).toBe(before.total)
  })
  it('reports every invalid field at once', async () => {
    const assertion = expect(createServiceRequest(payload({
      title: '', description: '', category: '', priority: '', requesterName: '', requesterEmail: '',
    }))).rejects.toMatchObject({
      status: 422,
      fields: {
        title: 'Title is required.',
        description: 'Description is required.',
        category: 'Category is required.',
        priority: 'Select a priority.',
        requesterName: 'Requester name is required.',
        requesterEmail: 'Email is required.',
      },
    })
    await vi.runAllTimersAsync()
    await assertion
  })
})
