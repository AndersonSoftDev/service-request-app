export function RequestListSkeleton() {
  return <div role="status" aria-label="Loading service requests" className="request-skeletons">
    <span className="sr-only">Loading service requests…</span>
    {/* Mirrors the request row so the list does not jump when data arrives. */}
    {Array.from({ length: 8 }, (_, index) => <div className="request-skeleton" key={index} aria-hidden="true">
      <span className="skeleton-line skeleton-id" />
      <div className="skeleton-body">
        <span className="skeleton-line skeleton-title" />
        <span className="skeleton-line skeleton-person" />
      </div>
      <span className="skeleton-pill" />
      <span className="skeleton-line skeleton-date" />
    </div>)}
  </div>
}
