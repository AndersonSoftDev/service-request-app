export function RequestDetailsSkeleton() {
  return <div className="request-detail detail-skeleton" role="status" aria-label="Loading request details">
    <span className="sr-only">Loading request details…</span>
    <div aria-hidden="true">
      <div className="detail-header"><div className="detail-skeleton-title"><span className="skeleton-line skeleton-short" /><span className="skeleton-line skeleton-title" /></div><span className="skeleton-pill" /></div>
      <div className="detail-columns">
        <div className="detail-description"><span className="skeleton-line skeleton-short" />
          <span className="skeleton-line skeleton-title" /><span className="skeleton-line skeleton-person" /><span className="skeleton-line skeleton-title" /></div>
        <div className="detail-sidebar">{[1, 2, 3].map((item) => <div key={item}><span className="skeleton-line skeleton-short" /><span className="skeleton-line skeleton-title" /></div>)}</div>
      </div>
    </div>
  </div>
}
