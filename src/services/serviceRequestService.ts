import type { ServiceRequestFilters, ServiceRequestPage } from '../types/serviceRequest'
import { getMockServiceRequests } from './mock/getMockServiceRequests'

// Replace only this delegation with HTTP GET /requests when the API is available.
// Read VITE_API_BASE_URL and reuse authService.getAccessToken() in that adapter.
// The mock neither needs nor sends a token.
export function getServiceRequests(filters: ServiceRequestFilters = {}): Promise<ServiceRequestPage> {
  return getMockServiceRequests(filters)
}
