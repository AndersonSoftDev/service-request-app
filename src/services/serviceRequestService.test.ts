import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRequests } from './serviceRequestService'
import { serviceRequestsMock } from './mock/serviceRequestsMock'
import type { ServiceRequestFilters } from '../types/serviceRequest'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function fetchPage(filters?: ServiceRequestFilters) {
  const pending = getServiceRequests(filters)
  await vi.runAllTimersAsync()
  return pending
}

describe('GET /requests mock contract', () => {
  it('returns the default one-based page with 28 deterministic records', async () => {
    const result = await fetchPage()
    expect(result).toMatchObject({ page: 1, pageSize: 10, total: 28, totalPages: 3 })
    expect(result.items).toHaveLength(10)
    expect(result.items[0].id).toBe('REQ-1028')
    expect(await fetchPage()).toEqual(result)
  })
  it('searches titles using case-insensitive substrings', async () => {
    const result = await fetchPage({ search: 'PAYMENT' })
    expect(result.items.map((item) => item.id)).toEqual(['REQ-1025', 'REQ-1015', 'REQ-1005'])
  })
  it('searches requester names using case-insensitive substrings', async () => {
    const result = await fetchPage({ search: 'jOhN sMi' })
    expect(result.items.map((item) => item.id)).toEqual(['REQ-1028', 'REQ-1001'])
  })
  it('does not search email, category, or description', async () => {
    expect((await fetchPage({ search: 'example.com' })).total).toBe(0)
    expect((await fetchPage({ search: 'Connectivity' })).total).toBe(0)
  })
  it.each(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)('filters status %s', async (status) => {
    const result = await fetchPage({ status })
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((item) => item.status === status)).toBe(true)
  })
  it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)('filters priority %s', async (priority) => {
    const result = await fetchPage({ priority })
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((item) => item.priority === priority)).toBe(true)
  })
  it('combines search, status, and priority before pagination', async () => {
    const result = await fetchPage({ search: 'payment', status: 'OPEN', priority: 'HIGH', pageSize: 1, page: 2 })
    expect(result).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 })
    expect(result.items.map((item) => item.id)).toEqual(['REQ-1005'])
  })
  it.each(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', '-priority'] as const)(
    'sorts by %s', async (sort) => {
      const result = await fetchPage({ sort, pageSize: 100 })
      const ranks = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
      const values = result.items.map((item) => sort.includes('priority') ? ranks[item.priority]
        : Date.parse(sort.includes('updatedAt') ? item.updatedAt : item.createdAt))
      const expected = [...values].sort((a, b) => sort.startsWith('-') ? b - a : a - b)
      expect(values).toEqual(expected)
    },
  )
  it('paginates without duplicate or skipped records and returns a short last page', async () => {
    const pages = await Promise.all([fetchPage({ page: 1 }), fetchPage({ page: 2 }), fetchPage({ page: 3 })])
    expect(pages.map((page) => page.items.length)).toEqual([10, 10, 8])
    expect(new Set(pages.flatMap((page) => page.items.map((item) => item.id))).size).toBe(28)
    expect((await fetchPage({ page: 4 })).items).toEqual([])
  })
  it('returns zero totalPages for no matches', async () => {
    expect(await fetchPage({ search: 'nonexistent' })).toEqual({
      items: [], page: 1, pageSize: 10, total: 0, totalPages: 0,
    })
  })
  it.each([{ page: 0 }, { page: -1 }, { page: 1.5 }, { page: Number.NaN },
    { pageSize: 0 }, { pageSize: 101 }, { pageSize: 2.5 }, { pageSize: Infinity }])(
    'rejects invalid pagination %j', async (filters) => {
      await expect(getServiceRequests(filters)).rejects.toThrow(RangeError)
    },
  )
  it('allows page sizes 1 and 100', async () => {
    expect((await fetchPage({ pageSize: 1 })).items).toHaveLength(1)
    expect((await fetchPage({ pageSize: 100 })).items).toHaveLength(28)
  })
  it('does not mutate the dataset or return mutable shared records', async () => {
    const ids = serviceRequestsMock.map((item) => item.id)
    const result = await fetchPage({ sort: 'priority' })
    result.items[0].title = 'Changed by consumer'
    expect(serviceRequestsMock.map((item) => item.id)).toEqual(ids)
    expect((await fetchPage({ sort: 'priority' })).items[0].title).not.toBe('Changed by consumer')
  })
  it('provides valid UTC timestamps, unique IDs, and all status/priority values', () => {
    expect(new Set(serviceRequestsMock.map((item) => item.id)).size).toBe(28)
    for (const item of serviceRequestsMock) {
      expect(item.id).toMatch(/^REQ-\d{4}$/)
      expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt)
      expect(Date.parse(item.updatedAt)).toBeGreaterThanOrEqual(Date.parse(item.createdAt))
    }
    expect(new Set(serviceRequestsMock.map((item) => item.status)).size).toBe(4)
    expect(new Set(serviceRequestsMock.map((item) => item.priority)).size).toBe(4)
  })
})
