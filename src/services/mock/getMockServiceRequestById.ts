import type { ServiceRequest } from '../../types/serviceRequest'
import { ServiceRequestNotFoundError } from '../ServiceRequestNotFoundError'
import { mockDelay } from './mockDelay'
import { readMockRequest } from './serviceRequestStore'

export async function getMockServiceRequestById(requestId: string): Promise<ServiceRequest> {
  await mockDelay()
  const request = readMockRequest(requestId)
  if (!request) throw new ServiceRequestNotFoundError()
  return { ...request }
}
