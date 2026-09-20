import { Link } from 'react-router-dom'
import type { ServiceRequest } from '../types/serviceRequest'
import { PriorityBadge, StatusBadge } from './RequestBadges'
import { formatRequestDate } from '../utils/formatRequestDate'


export function RequestCard({ request }: { request: ServiceRequest }) {
  return <article className="request-card" aria-labelledby={request.id + '-title'}>
    <div className="request-card-main">
      <div className="request-card-meta"><span className="request-id">{request.id}</span><span className="request-category">{request.category}</span></div>
      <h2 id={request.id + '-title'}><Link to={'/requests/' + request.id}>{request.title}</Link></h2>
      <div className="request-person"><span>{request.requesterName}</span><span>{request.requesterEmail}</span></div>
    </div>
    <div className="request-card-status">
      <StatusBadge status={request.status} />
      <PriorityBadge priority={request.priority} />
    </div>
    <dl className="request-dates">
      <div><dt>Created</dt><dd><time dateTime={request.createdAt}>{formatRequestDate(request.createdAt)}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={request.updatedAt}>{formatRequestDate(request.updatedAt)}</time></dd></div>
    </dl>
    <Link className="request-open" to={'/requests/' + request.id} aria-label={'View request ' + request.id}>View <span aria-hidden="true">↗</span></Link>
  </article>
}
