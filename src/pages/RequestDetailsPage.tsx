import { Link, useParams } from 'react-router-dom'
import { RequestsLayout } from '../components/RequestsLayout'
import { RequestDetails } from '../components/RequestDetails'
import { RequestDetailsSkeleton } from '../components/RequestDetailsSkeleton'
import { RequestStatusUpdate } from '../components/RequestStatusUpdate'
import { useServiceRequest } from '../hooks/useServiceRequest'
import './RequestDetailsPage.css'

export function RequestDetailsPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const { data, loading, error, submitting, updateError, updateSuccess, updateStatus, refetch }
    = useServiceRequest(requestId ?? '')

  return <RequestsLayout>
    <Link className="detail-back" to="/requests"><span aria-hidden="true">←</span> Back to requests</Link>
    <div className="requests-heading"><span className="workspace-eyebrow">YOUR WORKSPACE</span>
      <h1>Service Request</h1>
    </div>
    {loading ? <RequestDetailsSkeleton /> : error === 'not-found' ? <section className="request-state" aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Request not found</h2>
      <p role="status">The service request you’re looking for could not be found.</p>
      <Link className="secondary-button" to="/requests">Back to requests</Link>
    </section> : error ? <section className="request-state" aria-labelledby="error-heading">
      <h2 id="error-heading">Unable to load request</h2>
      <p role="alert">We could not load this request. Please try again.</p>
      <button className="secondary-button" onClick={refetch}>Retry</button>
    </section> : data && <>
      <RequestDetails request={data} />
      <RequestStatusUpdate request={data} submitting={submitting} error={updateError}
        success={updateSuccess} onSubmit={updateStatus} onReload={refetch} />
    </>}
  </RequestsLayout>
}
