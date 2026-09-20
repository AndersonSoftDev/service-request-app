import { Link } from 'react-router-dom'
import { RequestsLayout } from '../components/RequestsLayout'

export function RequestPlaceholderPage() {
  return <RequestsLayout>
    <div className="request-state">
      <h1>Service requests</h1>
      <p>This page is not available yet.</p>
      <Link className="secondary-button" to="/requests">Back to requests</Link>
    </div>
  </RequestsLayout>
}
