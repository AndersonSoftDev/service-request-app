import type { ServiceRequestPriority, ServiceRequestStatus } from '../types/serviceRequest'
import { priorityLabels, statusLabels } from './requestLabels'

export function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  return <span className={'request-badge status-' + status.toLowerCase()}>
    <span aria-hidden="true" />{statusLabels[status]}
  </span>
}
export function PriorityBadge({ priority }: { priority: ServiceRequestPriority }) {
  return <span className={'priority-label priority-' + priority.toLowerCase()}>
    <span aria-hidden="true">●</span>{priorityLabels[priority]} priority
  </span>
}
