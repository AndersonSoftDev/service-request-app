import { Link } from 'react-router-dom'
import type { ServiceRequest } from '../types/serviceRequest'
import { priorityLabels, statusLabels } from './requestLabels'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function RequestCard({ request }: { request: ServiceRequest }) {
  return <article className="request-card" aria-labelledby={request.id + '-title'}>
    <div className="request-card-main">
      <div className="request-card-meta"><span className="request-id">{request.id}</span><span className="request-category">{request.category}</span></div>
      <h2 id={request.id + '-title'}><Link to={'/requests/' + request.id}>{request.title}</Link></h2>
      <div className="request-person"><span>{request.requesterName}</span><span>{request.requesterEmail}</span></div>
    </div>
    <div className="request-card-status">
      <span className={'request-badge status-' + request.status.toLowerCase()}><span aria-hidden="true" />{statusLabels[request.status]}</span>
      <span className={'priority-label priority-' + request.priority.toLowerCase()}><span aria-hidden="true">●</span>{priorityLabels[request.priority]} priority</span>
    </div>
    <dl className="request-dates">
      <div><dt>Created</dt><dd><time dateTime={request.createdAt}>{dateFormat.format(new Date(request.createdAt))}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={request.updatedAt}>{dateFormat.format(new Date(request.updatedAt))}</time></dd></div>
    </dl>
    <Link className="request-open" to={'/requests/' + request.id} aria-label={'View request ' + request.id}>View <span aria-hidden="true">↗</span></Link>
  </article>
}
