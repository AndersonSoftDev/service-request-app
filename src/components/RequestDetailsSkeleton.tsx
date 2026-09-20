export function RequestDetailsSkeleton() {
  return <div className="request-detail detail-skeleton" role="status" aria-label="Loading request details">
    <span className="sr-only">Loading request details…</span>
    {/* Mirrors the details layout so the page does not shift when data arrives. */}
    <div aria-hidden="true">
      <div className="detail-header">
        <span className="skeleton-line skeleton-short" />
        <span className="skeleton-line skeleton-title" />
        <div className="detail-badges"><span className="skeleton-pill" /><span className="skeleton-pill" /></div>
      </div>
      <div className="detail-meta">
        {[1, 2, 3].map((item) => <div key={item}>
          <span className="skeleton-line skeleton-label" /><span className="skeleton-line skeleton-value" />
        </div>)}
      </div>
      <div className="detail-columns">
        <div className="detail-description">
          <span className="skeleton-line skeleton-label" />
          <span className="skeleton-line skeleton-body" />
          <span className="skeleton-line skeleton-body" />
          <span className="skeleton-line skeleton-body skeleton-body-end" />
        </div>
        <div className="detail-sidebar">
          <span className="skeleton-line skeleton-label" />
          <span className="skeleton-line skeleton-value" />
          <span className="skeleton-line skeleton-value" />
        </div>
      </div>
    </div>
  </div>
}
