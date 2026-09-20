import type { ServiceRequest } from '../types/serviceRequest'
import { formatRequestDate } from '../utils/formatRequestDate'
import { PriorityBadge, StatusBadge } from './RequestBadges'

export function RequestDetails({ request }: { request: ServiceRequest }) {
  return <article className="request-detail" aria-labelledby="request-title">
    <header className="detail-header">
      <div><span className="request-id">{request.id}</span><h2 id="request-title">{request.title}</h2></div>
      <div className="detail-badges"><StatusBadge status={request.status} /><PriorityBadge priority={request.priority} /></div>
    </header>
    <div className="detail-columns">
      <section className="detail-description" aria-labelledby="description-heading">
        <h3 id="description-heading">Description</h3>
        <p>{request.description}</p>
        <dl className="detail-fields"><div><dt>Category</dt><dd>{request.category}</dd></div></dl>
      </section>
      <aside className="detail-sidebar" aria-label="Request information">
        <section aria-labelledby="requester-heading">
          <h3 id="requester-heading">Requester</h3>
          <dl className="detail-fields">
            <div><dt>Name</dt><dd>{request.requesterName}</dd></div>
            <div><dt>Email</dt><dd><a href={'mailto:' + request.requesterEmail}>{request.requesterEmail}</a></dd></div>
          </dl>
        </section>
        <section aria-labelledby="record-heading">
          <h3 id="record-heading">Request record</h3>
          <dl className="detail-fields">
            <div><dt>Created at</dt><dd><time dateTime={request.createdAt}>{formatRequestDate(request.createdAt, true)}</time></dd></div>
            <div><dt>Updated at</dt><dd><time dateTime={request.updatedAt}>{formatRequestDate(request.updatedAt, true)}</time></dd></div>
            <div><dt>Version</dt><dd>{request.version}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </article>
}
