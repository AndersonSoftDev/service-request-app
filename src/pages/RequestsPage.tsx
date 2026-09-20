import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RequestsLayout } from '../components/RequestsLayout'
import { RequestFilters } from '../components/RequestFilters'
import { RequestCard } from '../components/RequestCard'
import { Pagination } from '../components/Pagination'
import { RequestListSkeleton } from '../components/RequestListSkeleton'
import { useServiceRequests } from '../hooks/useServiceRequests'
import type { ServiceRequestFilters } from '../types/serviceRequest'

const initialFilters: ServiceRequestFilters = { sort: '-createdAt', page: 1, pageSize: 10 }

export function RequestsPage() {
  const [filters, setFilters] = useState<ServiceRequestFilters>(initialFilters)
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch } = useServiceRequests(filters)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) => (current.search ?? '') === search
        ? current : { ...current, search: search || undefined, page: 1 })
    }, 350)
    return () => clearTimeout(timeout)
  }, [search])

  function changeFilters(changes: Partial<ServiceRequestFilters>) {
    setFilters((current) => ({ ...current, ...changes, page: 1 }))
  }
  function clearFilters() {
    setSearch('')
    setFilters((current) => ({ ...initialFilters, pageSize: current.pageSize }))
  }
  const hasFilters = Boolean(filters.search || filters.status || filters.priority)
  const canClear = Boolean(search || hasFilters || filters.sort !== '-createdAt')
  const firstItem = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0
  const lastItem = data ? Math.min(data.page * data.pageSize, data.total) : 0

  return <RequestsLayout>
    <div className="requests-heading requests-heading-row">
      <div><h1>Service Requests</h1><p>Manage and track customer service requests.</p></div>
      <Link className="primary-button" to="/requests/new">Create request</Link>
    </div>
    <RequestFilters filters={filters} search={search} onSearchChange={setSearch}
      onChange={changeFilters} onClear={clearFilters} canClear={canClear} />
    <section aria-label="Service requests" aria-busy={loading} className="requests-results">
      <div className="results-toolbar">
        <p role="status" aria-live="polite">{loading ? 'Finding requests…' : error ? 'Requests unavailable' : data?.total === 0
          ? '0 requests' : 'Showing ' + firstItem + '–' + lastItem + ' of ' + data?.total + ' requests'}</p>
      </div>
      {loading ? <RequestListSkeleton /> : error ? <div className="request-state">
        <h2>Unable to load requests</h2><p role="alert">{error}</p><button className="secondary-button" onClick={refetch}>Try again</button>
      </div> : data?.total === 0 ? <div className="request-state">
        <span className="empty-symbol" aria-hidden="true">⌕</span>
        <h2>{hasFilters ? 'No matching requests' : 'No requests yet'}</h2>
        <p>{hasFilters ? 'Try a different search or clear your filters.' : 'Service requests will appear here when they are available.'}</p>
        {hasFilters && <button className="secondary-button" onClick={clearFilters}>Clear all filters</button>}
      </div> : <div className="request-list">{data?.items.map((request) => <RequestCard key={request.id} request={request} />)}</div>}
      {!loading && !error && data && <Pagination page={data.page} totalPages={data.totalPages}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    </section>
  </RequestsLayout>
}
