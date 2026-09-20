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
