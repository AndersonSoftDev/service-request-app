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
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input id="request-search" type="search" placeholder="Search requests..."
          value={search} onChange={(event) => onSearchChange(event.target.value)}
          aria-describedby="search-hint" />
      </div>
      <span id="search-hint">Search by title or requester name</span>
    </div>
    <div className="filter-controls">
      <div className="filter-field">
        <label htmlFor="request-status">Status</label>
        <select id="request-status" value={filters.status ?? ''}
          onChange={(event) => onChange({ status: (event.target.value || undefined) as ServiceRequestFilters['status'] })}>
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="request-priority">Priority</label>
        <select id="request-priority" value={filters.priority ?? ''}
          onChange={(event) => onChange({ priority: (event.target.value || undefined) as ServiceRequestFilters['priority'] })}>
          <option value="">All priorities</option>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="filter-field filter-field-wide">
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
      <div className="filter-field filter-field-narrow">
        <label htmlFor="request-page-size">Per page</label>
        <select id="request-page-size" value={filters.pageSize}
          onChange={(event) => onChange({ pageSize: Number(event.target.value) })}>
          {[5, 10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
      <button className="text-button clear-filters" onClick={onClear} disabled={!canClear}>Clear filters</button>
    </div>
  </section>
}
