import type { ServiceRequest } from '../types/serviceRequest'
import { formatRequestDate } from '../utils/formatRequestDate'
import { PriorityBadge, StatusBadge } from './RequestBadges'
import { priorityLabels } from './requestLabels'

export function RequestDetails({ request }: { request: ServiceRequest }) {
  return <article className="request-detail" aria-labelledby="request-title">
    <header className="detail-header">
      <span className="request-id">{request.id}</span>
      <h1 id="request-title">{request.title}</h1>
      <div className="detail-badges">
        <StatusBadge status={request.status} />
        <PriorityBadge priority={request.priority} />
      </div>
    </header>
    <dl className="detail-meta">
      <div><dt>Created</dt><dd><time dateTime={request.createdAt}>{formatRequestDate(request.createdAt, true)}</time></dd></div>
      <div><dt>Last updated</dt><dd><time dateTime={request.updatedAt}>{formatRequestDate(request.updatedAt, true)}</time></dd></div>
      <div><dt>Version</dt><dd>{request.version}</dd></div>
    </dl>
    <div className="detail-columns">
      <section className="detail-description" aria-labelledby="description-heading">
        <h2 id="description-heading">Description</h2>
        <p>{request.description}</p>
        <dl className="detail-fields detail-attributes">
          <div><dt>Category</dt><dd>{request.category}</dd></div>
          <div><dt>Priority</dt><dd>{priorityLabels[request.priority]}</dd></div>
        </dl>
      </section>
      <aside className="detail-sidebar" aria-labelledby="requester-heading">
        <h2 id="requester-heading">Requester</h2>
        <dl className="detail-fields">
          <div><dt>Name</dt><dd>{request.requesterName}</dd></div>
          <div><dt>Email</dt><dd><a href={'mailto:' + request.requesterEmail}>{request.requesterEmail}</a></dd></div>
        </dl>
      </aside>
    </div>
  </article>
}
