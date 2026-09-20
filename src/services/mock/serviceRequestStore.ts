import type { ServiceRequest } from '../../types/serviceRequest'
import { serviceRequestsMock } from './serviceRequestsMock'

const requests = new Map<string, ServiceRequest>()

// Test setup can restore deterministic fixtures without affecting the seed data.
export function resetMockServiceRequests(): void {
  requests.clear()
  for (const request of serviceRequestsMock) requests.set(request.id, { ...request })
}
resetMockServiceRequests()

export function readMockRequests(): ServiceRequest[] {
  return [...requests.values()].map((request) => ({ ...request }))
}
export function readMockRequest(id: string): ServiceRequest | undefined {
  const request = requests.get(id)
  return request ? { ...request } : undefined
}
export function writeMockRequest(request: ServiceRequest): void {
  requests.set(request.id, { ...request })
}

// Creation reuses this store, so generated IDs stay unique for the whole session.
export function nextMockRequestId(): string {
  const highest = [...requests.keys()].reduce((max, id) => {
    const value = Number(id.slice('REQ-'.length))
    return Number.isSafeInteger(value) && value > max ? value : max
  }, 1000)
  return 'REQ-' + (highest + 1)
}
