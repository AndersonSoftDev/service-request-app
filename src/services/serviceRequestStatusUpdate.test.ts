import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRequestById, getServiceRequests, updateServiceRequestStatus } from './serviceRequestService'
import { resetMockServiceRequests } from './mock/serviceRequestStore'
import { serviceRequestsMock } from './mock/serviceRequestsMock'
import { MAX_STATUS_NOTE_LENGTH, statusTransitions } from '../domain/serviceRequestStatus'
import type { ServiceRequest, ServiceRequestStatus } from '../types/serviceRequest'

beforeEach(() => { vi.useFakeTimers(); resetMockServiceRequests() })
afterEach(() => vi.useRealTimers())

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

// The expected table is written out here on purpose: deriving it from the
// implementation would let a wrong rule pass its own test.
const validTransitions: [ServiceRequestStatus, ServiceRequestStatus][] = [
  ['OPEN', 'IN_PROGRESS'], ['OPEN', 'CLOSED'],
  ['IN_PROGRESS', 'RESOLVED'], ['IN_PROGRESS', 'OPEN'],
  ['RESOLVED', 'CLOSED'], ['RESOLVED', 'IN_PROGRESS'],
]
const invalidTransitions: [ServiceRequestStatus, ServiceRequestStatus][] = [
  ['OPEN', 'RESOLVED'], ['OPEN', 'OPEN'],
  ['IN_PROGRESS', 'CLOSED'], ['IN_PROGRESS', 'IN_PROGRESS'],
  ['RESOLVED', 'OPEN'], ['RESOLVED', 'RESOLVED'],
  ['CLOSED', 'OPEN'], ['CLOSED', 'IN_PROGRESS'], ['CLOSED', 'RESOLVED'], ['CLOSED', 'CLOSED'],
]

async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}
function idWithStatus(status: ServiceRequestStatus): string {
  const seed = serviceRequestsMock.find((request) => request.status === status)
  if (!seed) throw new Error('No mock request seeded with status ' + status)
  return seed.id
}
// Always read before writing, exactly as the UI does.
function read(requestId: string): Promise<ServiceRequest> {
  return settle(getServiceRequestById(requestId))
}
async function expectStored(requestId: string, status: ServiceRequestStatus, version: number) {
  expect(await read(requestId)).toMatchObject({ status, version })
}

describe('PATCH /requests/{requestId}/status - transitions', () => {
  it('exposes a single documented transition table', () => {
    expect(statusTransitions).toEqual({
      OPEN: ['IN_PROGRESS', 'CLOSED'],
      IN_PROGRESS: ['RESOLVED', 'OPEN'],
      RESOLVED: ['CLOSED', 'IN_PROGRESS'],
      CLOSED: [],
    })
  })
  it('moves OPEN to IN_PROGRESS, increments the version, and refreshes updatedAt', async () => {
    const before = await read('REQ-1001')
    expect(before).toMatchObject({ status: 'OPEN', version: 1 })
    const updated = await settle(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version,
    }))
    expect(updated.status).toBe('IN_PROGRESS')
    expect(updated.version).toBe(before.version + 1)
    expect(updated.updatedAt).not.toBe(before.updatedAt)
    expect(updated.updatedAt).toMatch(ISO_UTC)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt))
    expect(updated.createdAt).toBe(before.createdAt)
    // Status, version and updatedAt are the only differences.
    expect({ ...updated, status: before.status, version: before.version, updatedAt: before.updatedAt })
      .toEqual(before)
  })
  it.each(validTransitions)('accepts %s to %s and increments the version by one', async (from, to) => {
    const requestId = idWithStatus(from)
    const before = await read(requestId)
    const updated = await settle(updateServiceRequestStatus(requestId, { status: to, version: before.version }))
    expect(updated).toMatchObject({ id: requestId, status: to, version: before.version + 1 })
    await expectStored(requestId, to, before.version + 1)
  })
  it.each(invalidTransitions)('rejects %s to %s with 422 and leaves the record untouched', async (from, to) => {
    const requestId = idWithStatus(from)
    const before = await read(requestId)
    const assertion = expect(updateServiceRequestStatus(requestId, { status: to, version: before.version }))
      .rejects.toMatchObject({ status: 422, validation: 'transition' })
    await vi.runAllTimersAsync()
    await assertion
    expect(await read(requestId)).toEqual(before)
  })
  it('offers no transition out of CLOSED', async () => {
    expect(statusTransitions.CLOSED).toHaveLength(0)
    const requestId = idWithStatus('CLOSED')
    const before = await read(requestId)
    await expectStored(requestId, 'CLOSED', before.version)
  })
})

describe('PATCH /requests/{requestId}/status - optimistic concurrency', () => {
  it('rejects a stale version with 409 without changing status or version', async () => {
    const stale = await read('REQ-1001')
    // Another client updates the same record first: the stored version becomes 2.
    const current = await settle(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: stale.version,
    }))
    expect(current.version).toBe(2)

    const assertion = expect(updateServiceRequestStatus('REQ-1001', { status: 'CLOSED', version: stale.version }))
      .rejects.toMatchObject({ status: 409 })
    await vi.runAllTimersAsync()
    await assertion
    expect(await read('REQ-1001')).toEqual(current)
  })
  it('rejects a version from the future as well', async () => {
    const before = await read('REQ-1001')
    const assertion = expect(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version + 5,
    })).rejects.toMatchObject({ status: 409 })
    await vi.runAllTimersAsync()
    await assertion
    expect(await read('REQ-1001')).toEqual(before)
  })
  it('lets only one of two concurrent updates on the same version win', async () => {
    const before = await read('REQ-1001')
    // Both outcomes are observed before the timers run, so the loser is never an unhandled rejection.
    const outcomes = Promise.allSettled([
      updateServiceRequestStatus('REQ-1001', { status: 'IN_PROGRESS', version: before.version }),
      updateServiceRequestStatus('REQ-1001', { status: 'CLOSED', version: before.version }),
    ])
    await vi.runAllTimersAsync()
    const results = await outcomes
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')?.reason).toMatchObject({ status: 409 })
    expect((await read('REQ-1001')).version).toBe(before.version + 1)
  })
  it('checks the version before the transition', async () => {
    const before = await read('REQ-1001')
    // Invalid transition and stale version at once: concurrency is reported first.
    const assertion = expect(updateServiceRequestStatus('REQ-1001', {
      status: 'RESOLVED', version: before.version + 1,
    })).rejects.toMatchObject({ status: 409 })
    await vi.runAllTimersAsync()
    await assertion
  })
})

describe('PATCH /requests/{requestId}/status - not found', () => {
  it.each(['REQ-9999', 'not-a-real-request', ''])('reports 404 for %j', async (requestId) => {
    const assertion = expect(updateServiceRequestStatus(requestId, { status: 'IN_PROGRESS', version: 1 }))
      .rejects.toMatchObject({ name: 'ServiceRequestNotFoundError', status: 404 })
    await vi.runAllTimersAsync()
    await assertion
  })
})

describe('PATCH /requests/{requestId}/status - note', () => {
  it.each([
    ['a short note', 'Escalated to the field team.'],
    ['an empty note', ''],
    ['exactly the maximum length', 'x'.repeat(MAX_STATUS_NOTE_LENGTH)],
    ['the maximum length in astral characters', '\u{1F600}'.repeat(MAX_STATUS_NOTE_LENGTH)],
  ])('accepts %s', async (_label, note) => {
    const before = await read('REQ-1001')
    const updated = await settle(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version, note,
    }))
    expect(updated).toMatchObject({ status: 'IN_PROGRESS', version: before.version + 1 })
  })
  it('accepts an omitted note without adding fields to the record', async () => {
    const before = await read('REQ-1001')
    const updated = await settle(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version,
    }))
    expect(updated.version).toBe(before.version + 1)
    expect(Object.keys(updated).sort()).toEqual(Object.keys(before).sort())
  })
  it.each([
    ['one character too many', 'x'.repeat(MAX_STATUS_NOTE_LENGTH + 1)],
    ['a long note', 'x'.repeat(2000)],
    ['too many astral characters', '\u{1F600}'.repeat(MAX_STATUS_NOTE_LENGTH + 1)],
  ])('rejects %s with 422 and leaves the record untouched', async (_label, note) => {
    const before = await read('REQ-1001')
    const assertion = expect(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version, note,
    })).rejects.toMatchObject({ status: 422, validation: 'note' })
    await vi.runAllTimersAsync()
    await assertion
    expect(await read('REQ-1001')).toEqual(before)
  })
})

describe('PATCH /requests/{requestId}/status - session persistence', () => {
  it('keeps the update visible to later reads and to the list', async () => {
    const before = await read('REQ-1001')
    await settle(updateServiceRequestStatus('REQ-1001', { status: 'IN_PROGRESS', version: before.version }))
    await expectStored('REQ-1001', 'IN_PROGRESS', before.version + 1)

    const page = await settle(getServiceRequests({ search: 'Internet connection drops' }))
    expect(page.items[0]).toMatchObject({ id: 'REQ-1001', status: 'IN_PROGRESS', version: before.version + 1 })
    expect((await settle(getServiceRequests({ status: 'OPEN' }))).items.map((item) => item.id))
      .not.toContain('REQ-1001')
  })
  it('does not let a returned record mutate the store', async () => {
    const before = await read('REQ-1001')
    const updated = await settle(updateServiceRequestStatus('REQ-1001', {
      status: 'IN_PROGRESS', version: before.version,
    }))
    updated.status = 'CLOSED'
    updated.version = 99
    await expectStored('REQ-1001', 'IN_PROGRESS', before.version + 1)
  })
  it('restores the seeded fixtures on reset', async () => {
    const before = await read('REQ-1001')
    await settle(updateServiceRequestStatus('REQ-1001', { status: 'IN_PROGRESS', version: before.version }))
    resetMockServiceRequests()
    expect(await read('REQ-1001')).toEqual(serviceRequestsMock[0])
  })
})
