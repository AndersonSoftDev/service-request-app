import { Link } from 'react-router-dom'
import type { ServiceRequest } from '../types/serviceRequest'
import { PriorityBadge, StatusBadge } from './RequestBadges'
import { formatRequestDate } from '../utils/formatRequestDate'

export function RequestCard({ request }: { request: ServiceRequest }) {
  const path = '/requests/' + request.id
  return <article className="request-card" aria-labelledby={request.id + '-title'}>
    <span className="request-id">{request.id}</span>
    <div className="request-card-body">
      {/* The title link is stretched over the row, so the whole row is the target. */}
      <h2 className="request-card-title" id={request.id + '-title'}><Link to={path}>{request.title}</Link></h2>
      <p className="request-person">
        <span className="request-category">{request.category}</span>
        <span>{request.requesterName}</span>
        <span>{request.requesterEmail}</span>
      </p>
    </div>
    <div className="request-card-badges">
      <StatusBadge status={request.status} />
      <PriorityBadge priority={request.priority} />
    </div>
    <dl className="request-dates">
      <div><dt>Created</dt><dd><time dateTime={request.createdAt}>{formatRequestDate(request.createdAt)}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={request.updatedAt}>{formatRequestDate(request.updatedAt)}</time></dd></div>
    </dl>
    <Link className="request-open" to={path} aria-label={'View request ' + request.id}>
      <span aria-hidden="true">›</span>
    </Link>
  </article>
}
