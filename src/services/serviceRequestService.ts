import type { ServiceRequest, ServiceRequestFilters, ServiceRequestPage, UpdateServiceRequestStatus } from '../types/serviceRequest'
import { getMockServiceRequests } from './mock/getMockServiceRequests'
import { getMockServiceRequestById } from './mock/getMockServiceRequestById'
import { updateMockServiceRequestStatus } from './mock/updateMockServiceRequestStatus'

// Replace only this delegation with HTTP GET /requests when the API is available.
// Read VITE_API_BASE_URL and reuse authService.getAccessToken() in that adapter.
// The mock neither needs nor sends a token.
export function getServiceRequests(filters: ServiceRequestFilters = {}): Promise<ServiceRequestPage> {
  return getMockServiceRequests(filters)
}

export function getServiceRequestById(requestId: string): Promise<ServiceRequest> {
  return getMockServiceRequestById(requestId)
}

export function updateServiceRequestStatus(
  requestId: string,
  update: UpdateServiceRequestStatus,
): Promise<ServiceRequest> {
  return updateMockServiceRequestStatus(requestId, update)
}
