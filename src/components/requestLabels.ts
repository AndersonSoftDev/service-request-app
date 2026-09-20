import type { ServiceRequestPriority, ServiceRequestStatus } from '../types/serviceRequest'

export const statusLabels: Record<ServiceRequestStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
}
export const priorityLabels: Record<ServiceRequestPriority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
}
