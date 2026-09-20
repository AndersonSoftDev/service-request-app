import type { ServiceRequestStatus } from '../types/serviceRequest'

export const statusTransitions: Readonly<Record<ServiceRequestStatus, readonly ServiceRequestStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}

export const MAX_STATUS_NOTE_LENGTH = 500

// OpenAPI string lengths count Unicode code points, not UTF-16 code units.
export function statusNoteLength(note: string): number {
  return Array.from(note).length
}
