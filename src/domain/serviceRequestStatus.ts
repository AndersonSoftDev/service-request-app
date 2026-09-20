import type { ServiceRequestStatus } from '../types/serviceRequest'
import { textLength } from './textLength'

export const statusTransitions: Readonly<Record<ServiceRequestStatus, readonly ServiceRequestStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}

export const MAX_STATUS_NOTE_LENGTH = 500

export function statusNoteLength(note: string): number {
  return textLength(note)
}
