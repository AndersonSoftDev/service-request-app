import { useId, useState } from 'react'
import { MAX_STATUS_NOTE_LENGTH, statusNoteLength, statusTransitions } from '../domain/serviceRequestStatus'
import type { StatusUpdateError } from '../hooks/useServiceRequest'
import type { ServiceRequest, ServiceRequestStatus } from '../types/serviceRequest'
import { StatusBadge } from './RequestBadges'
import { statusLabels } from './requestLabels'

// One message per failure the service can report; raw exceptions never reach the user.
const errorMessages: Record<StatusUpdateError, string> = {
  conflict: 'This request was updated by another user. Reload the request to get the latest version before making changes.',
  transition: 'This status transition is not allowed.',
  note: `The note cannot exceed ${MAX_STATUS_NOTE_LENGTH} characters.`,
  unavailable: 'Unable to update request. Please try again.',
}

interface Props {
  request: ServiceRequest
  submitting: boolean
  error: StatusUpdateError | null
  success: boolean
  onSubmit: (status: ServiceRequestStatus, note: string) => void
  onReload: () => void
}

export function RequestStatusUpdate({ request, submitting, error, success, onSubmit, onReload }: Props) {
  const [status, setStatus] = useState<ServiceRequestStatus | ''>('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [editedVersion, setEditedVersion] = useState(request.version)
  const id = useId()
  // A different record — a successful update or a reload — always starts from a clean form.
  if (editedVersion !== request.version) {
    setEditedVersion(request.version)
    setStatus('')
    setNote('')
    setConfirming(false)
  }

  // The single source of truth decides what can be offered; no rules are restated here.
  const options = statusTransitions[request.status]
  const selected = options.find((option) => option === status) ?? ''
  const noteLength = statusNoteLength(note)
  const noteTooLong = noteLength > MAX_STATUS_NOTE_LENGTH
  const blocked = submitting || error === 'conflict'

  function selectStatus(value: string) {
    setStatus(options.find((option) => option === value) ?? '')
    setConfirming(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || blocked || noteTooLong) return
    // Closing is terminal, so it gets one lightweight inline confirmation instead of a dialog.
    if (selected === 'CLOSED' && !confirming) { setConfirming(true); return }
    onSubmit(selected, note.trim())
  }

  return <section className="status-update" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>Update status</h2>
    <p className="status-update-current">
      <span>Current status</span>
      <StatusBadge status={request.status} />
    </p>
    {options.length === 0
      ? <p className="status-update-locked">
          This request is {statusLabels[request.status].toLowerCase()} and can no longer change status.
        </p>
      : <form onSubmit={handleSubmit} aria-busy={submitting} noValidate>
          <div className="status-update-fields">
            <div>
              <label htmlFor={`${id}-status`}>New status</label>
              <select id={`${id}-status`} value={selected} disabled={blocked}
                onChange={(event) => selectStatus(event.target.value)}>
                <option value="">Select a status</option>
                {options.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-note`}>Note (optional)</label>
              <textarea id={`${id}-note`} value={note} rows={3} disabled={blocked}
                aria-describedby={`${id}-counter`} aria-invalid={noteTooLong || undefined}
                onChange={(event) => setNote(event.target.value)} />
              <p className={noteTooLong ? 'status-update-counter is-invalid' : 'status-update-counter'}>
                <span id={`${id}-counter`}>{noteLength} / {MAX_STATUS_NOTE_LENGTH}</span>
                {noteTooLong && <span role="alert">Note exceeds the {MAX_STATUS_NOTE_LENGTH} character limit.</span>}
              </p>
            </div>
          </div>
          <div className="status-update-feedback" role="status">
            {submitting && <p>Updating the request status…</p>}
            {!submitting && success && <p className="feedback-success">
              <span aria-hidden="true">✓</span>
              <span>Status updated to {statusLabels[request.status]}. The request is now at version {request.version}.</span>
            </p>}
          </div>
          {error && <div className="status-update-error" role="alert">
            <p>{errorMessages[error]}</p>
            {error === 'conflict'
              && <button type="button" className="secondary-button" onClick={onReload}>Reload request</button>}
          </div>}
          {confirming
            ? <div className="status-update-confirm">
                <p>Closing is final — a closed request can no longer change status.</p>
                <div className="status-update-actions">
                  <button type="submit" className="primary-button" disabled={blocked}>
                    {submitting ? 'Updating…' : 'Confirm and close request'}
                  </button>
                  <button type="button" className="secondary-button" disabled={blocked}
                    onClick={() => setConfirming(false)}>Cancel</button>
                </div>
              </div>
            : <div className="status-update-actions">
                <button type="submit" className="primary-button" disabled={blocked || !selected || noteTooLong}>
                  {submitting ? 'Updating…' : 'Update status'}
                </button>
              </div>}
        </form>}
  </section>
}
