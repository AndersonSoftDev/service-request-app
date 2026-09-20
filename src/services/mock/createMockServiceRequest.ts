import type { CreateServiceRequest, ServiceRequest } from '../../types/serviceRequest'
import { validateCreateServiceRequest } from '../../domain/createServiceRequest'
import { ServiceRequestError } from '../ServiceRequestError'
import { mockDelay } from './mockDelay'
import { nextMockRequestId, writeMockRequest } from './serviceRequestStore'

export async function createMockServiceRequest(input: CreateServiceRequest): Promise<ServiceRequest> {
  await mockDelay()
  // The mock validates the contract too, so bypassing the form cannot store an invalid record.
  const errors = validateCreateServiceRequest(input)
  if (Object.keys(errors).length > 0) throw new ServiceRequestError(422, undefined, errors)

  const now = new Date().toISOString()
  // Server-assigned fields, exactly as the future API would return them with 201 Created.
  const created: ServiceRequest = {
    id: nextMockRequestId(),
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: 'OPEN',
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
  writeMockRequest(created)
  return { ...created }
}
