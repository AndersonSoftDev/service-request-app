import type { ServiceRequest, UpdateServiceRequestStatus } from '../../types/serviceRequest'
import { MAX_STATUS_NOTE_LENGTH, statusNoteLength, statusTransitions } from '../../domain/serviceRequestStatus'
import { ServiceRequestError } from '../ServiceRequestError'
import { ServiceRequestNotFoundError } from '../ServiceRequestNotFoundError'
import { mockDelay } from './mockDelay'
import { readMockRequest, writeMockRequest } from './serviceRequestStore'

export async function updateMockServiceRequestStatus(
  requestId: string,
  update: UpdateServiceRequestStatus,
): Promise<ServiceRequest> {
  const { status, version, note } = update
  await mockDelay()
  // Lookup, compare, and commit are synchronous after the simulated network wait.
  // Concurrent callers using the same version cannot both succeed.
  const request = readMockRequest(requestId)
  if (!request) throw new ServiceRequestNotFoundError()
  if (request.version !== version) throw new ServiceRequestError(409)
  if (!statusTransitions[request.status].includes(status)) {
    throw new ServiceRequestError(422, 'transition')
  }
  if (note !== undefined && (typeof note !== 'string' || statusNoteLength(note) > MAX_STATUS_NOTE_LENGTH)) {
    throw new ServiceRequestError(422, 'note')
  }

  const updated: ServiceRequest = {
    ...request,
    status,
    updatedAt: new Date(Math.max(Date.now(), Date.parse(request.updatedAt) + 1)).toISOString(),
    version: request.version + 1,
  }
  writeMockRequest(updated)
  // Notes are validated but no history is invented: ServiceRequest has no note field.
  return updated
}
