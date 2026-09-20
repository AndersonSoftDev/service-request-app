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
    {loading ? <RequestDetailsSkeleton /> : error === 'not-found' ? <section className="request-state" aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Request not found</h1>
      <p role="status">The request you are looking for does not exist or is no longer available.</p>
      <Link className="secondary-button" to="/requests">Back to requests</Link>
    </section> : error ? <section className="request-state" aria-labelledby="error-heading">
      <h1 id="error-heading">Unable to load request</h1>
      <p role="alert">Something went wrong while loading this request.</p>
      <button className="secondary-button" onClick={refetch}>Retry</button>
    </section> : data && <>
      <RequestDetails request={data} />
      <RequestStatusUpdate request={data} submitting={submitting} error={updateError}
        success={updateSuccess} onSubmit={updateStatus} onReload={refetch} />
    </>}
  </RequestsLayout>
}
