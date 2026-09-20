export function RequestListSkeleton() {
  return <div role="status" aria-label="Loading service requests" className="request-skeletons">
    <span className="sr-only">Loading service requests…</span>
    {Array.from({ length: 5 }, (_, index) => <div className="request-skeleton" key={index} aria-hidden="true">
      <div><span className="skeleton-line skeleton-short" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line skeleton-person" /></div>
      <span className="skeleton-pill" /><span className="skeleton-line skeleton-date" />
    </div>)}
  </div>
}
