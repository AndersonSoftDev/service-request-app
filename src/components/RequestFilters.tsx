import type { ServiceRequestFilters } from '../types/serviceRequest'
import { priorityLabels, statusLabels } from './requestLabels'

interface Props {
  filters: ServiceRequestFilters
  search: string
  onSearchChange(value: string): void
  onChange(filters: Partial<ServiceRequestFilters>): void
  onClear(): void
  canClear: boolean
}

export function RequestFilters({ filters, search, onSearchChange, onChange, onClear, canClear }: Props) {
  return <section className="request-filters" aria-label="Filter service requests">
    <div className="filter-search">
      <label htmlFor="request-search">Search</label>
      <input id="request-search" type="search" placeholder="Search requests..."
        value={search} onChange={(event) => onSearchChange(event.target.value)}
        aria-describedby="search-hint" />
      <span id="search-hint">Search by title or requester name</span>
    </div>
    <div>
      <label htmlFor="request-status">Status</label>
      <select id="request-status" value={filters.status ?? ''}
        onChange={(event) => onChange({ status: (event.target.value || undefined) as ServiceRequestFilters['status'] })}>
        <option value="">All statuses</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div>
      <label htmlFor="request-priority">Priority</label>
      <select id="request-priority" value={filters.priority ?? ''}
        onChange={(event) => onChange({ priority: (event.target.value || undefined) as ServiceRequestFilters['priority'] })}>
        <option value="">All priorities</option>
        {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div>
      <label htmlFor="request-sort">Sort by</label>
      <select id="request-sort" value={filters.sort ?? '-createdAt'}
        onChange={(event) => onChange({ sort: event.target.value as ServiceRequestFilters['sort'] })}>
        <option value="-createdAt">Newest first</option>
        <option value="createdAt">Oldest first</option>
        <option value="-updatedAt">Recently updated</option>
        <option value="updatedAt">Least recently updated</option>
        <option value="priority">Priority: Low to Critical</option>
        <option value="-priority">Priority: Critical to Low</option>
      </select>
    </div>
    <button className="text-button clear-filters" onClick={onClear} disabled={!canClear}>Clear filters</button>
  </section>
}
