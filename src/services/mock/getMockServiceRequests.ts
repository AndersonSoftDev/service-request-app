import type { ServiceRequestFilters, ServiceRequestPage, ServiceRequestPriority } from '../../types/serviceRequest'
import { serviceRequestsMock } from './serviceRequestsMock'

const priorityRank: Record<ServiceRequestPriority, number> = {
  LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3,
}

export async function getMockServiceRequests(
  filters: ServiceRequestFilters = {},
): Promise<ServiceRequestPage> {
  const { search = '', status, priority, sort = '-createdAt', page = 1, pageSize = 10 } = filters
  if (!Number.isInteger(page) || page < 1) throw new RangeError('page must be a positive integer')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new RangeError('pageSize must be an integer from 1 to 100')
  }
  const query = search.toLowerCase()
  const matching = serviceRequestsMock.filter((request) =>
    (!query || request.title.toLowerCase().includes(query) || request.requesterName.toLowerCase().includes(query))
    && (!status || request.status === status)
    && (!priority || request.priority === priority),
  )
  const descending = sort.startsWith('-')
  matching.sort((a, b) => {
    const difference = sort === 'priority' || sort === '-priority'
      ? priorityRank[a.priority] - priorityRank[b.priority]
      : sort === 'updatedAt' || sort === '-updatedAt'
        ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
        : Date.parse(a.createdAt) - Date.parse(b.createdAt)
    return (descending ? -difference : difference) || a.id.localeCompare(b.id)
  })
  // Simulate transport latency without random failures or an external server.
  await new Promise((resolve) => setTimeout(resolve, 250))
  return {
    items: matching.slice((page - 1) * pageSize, page * pageSize).map((item) => ({ ...item })),
    page, pageSize, total: matching.length, totalPages: Math.ceil(matching.length / pageSize),
  }
}
