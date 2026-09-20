import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRequestById, getServiceRequests } from './serviceRequestService'
import { ServiceRequestNotFoundError } from './ServiceRequestNotFoundError'
import { serviceRequestsMock } from './mock/serviceRequestsMock'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('GET /requests/{requestId}', () => {
  it.each(['REQ-1001', 'REQ-1002', 'REQ-1003'])('returns the exact record for %s after mock latency', async (id) => {
    let resolved = false
    const pending = getServiceRequestById(id).then((data) => { resolved = true; return data })
    await vi.advanceTimersByTimeAsync(249)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await pending).toEqual(serviceRequestsMock.find((request) => request.id === id))
  })
  it.each(['REQ-9999', 'not-a-real-request', ''])('reports a distinguishable 404 for %j', async (id) => {
    const assertion = expect(getServiceRequestById(id)).rejects.toMatchObject({
      name: 'ServiceRequestNotFoundError', status: 404,
    })
    await vi.runAllTimersAsync()
    await assertion
    expect(new ServiceRequestNotFoundError()).toBeInstanceOf(Error)
  })
  it('returns a copy consistent with the list without mutating the mock', async () => {
    const pending = getServiceRequestById('REQ-1001')
    const list = getServiceRequests({ search: 'Internet connection drops' })
    await vi.runAllTimersAsync()
    const detail = await pending
    expect(detail).toEqual((await list).items[0])
    detail.title = 'Changed'
    const fresh = getServiceRequestById('REQ-1001')
    await vi.runAllTimersAsync()
    expect((await fresh).title).not.toBe('Changed')
  })
})
