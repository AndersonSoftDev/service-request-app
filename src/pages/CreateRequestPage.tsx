import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RequestsLayout } from '../components/RequestsLayout'
import { priorityLabels } from '../components/requestLabels'
import {
  createRequestLimits, priorities, validateCreateServiceRequest,
} from '../domain/createServiceRequest'
import type { CreateServiceRequestErrors } from '../domain/createServiceRequest'
import { textLength } from '../domain/textLength'
import { createServiceRequest } from '../services/serviceRequestService'
import { ServiceRequestError } from '../services/ServiceRequestError'
import type { CreateServiceRequest, ServiceRequestPriority } from '../types/serviceRequest'
import './CreateRequestPage.css'

type FormValues = Omit<CreateServiceRequest, 'priority'> & { priority: ServiceRequestPriority | '' }

const emptyForm: FormValues = {
  title: '', description: '', category: '', priority: '', requesterName: '', requesterEmail: '',
}

// One message per documented API failure; raw exceptions never reach the user.
const submitErrors: Partial<Record<number, string>> = {
  400: 'We could not send this request. Please check the form and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to create service requests.',
  422: 'Please correct the highlighted fields and try again.',
  500: 'The service is temporarily unavailable. Please try again.',
}
const genericError = 'Unable to create the request. Please try again.'

export function CreateRequestPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [errors, setErrors] = useState<CreateServiceRequestErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Guards against a second submit landing before the submitting state has rendered.
  const pending = useRef(false)

  function change<Field extends keyof FormValues>(field: Field, value: FormValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const input = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      priority: values.priority,
      requesterName: values.requesterName.trim(),
      requesterEmail: values.requesterEmail.trim(),
    }
    // The same rules the service applies, checked before anything is sent.
    const found = validateCreateServiceRequest(input)
    setErrors(found)
    if (Object.keys(found).length > 0 || input.priority === '') {
      setFormError(submitErrors[422] ?? genericError)
      return
    }

    setFormError(null)
    pending.current = true
    setSubmitting(true)
    try {
      const created = await createServiceRequest({ ...input, priority: input.priority })
      navigate('/requests/' + created.id)
    } catch (cause: unknown) {
      if (cause instanceof ServiceRequestError) {
        if (cause.fields) setErrors(cause.fields)
        setFormError(submitErrors[cause.status] ?? genericError)
      } else {
        setFormError(genericError)
      }
      setSubmitting(false)
    } finally {
      pending.current = false
    }
  }

  function describedBy(field: keyof CreateServiceRequest, counter = false) {
    const parts = [counter ? `${field}-counter` : '', errors[field] ? `${field}-error` : ''].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : undefined
  }
  function fieldError(field: keyof CreateServiceRequest) {
    return errors[field] && <p className="field-error" id={`${field}-error`} role="alert">
      <span aria-hidden="true">!</span>{errors[field]}
    </p>
  }
  function counter(field: 'title' | 'description') {
    return <p className="field-counter" id={`${field}-counter`}>
      {textLength(values[field].trim())} / {createRequestLimits[field].max}
    </p>
  }

  return <RequestsLayout>
    <Link className="detail-back" to="/requests"><span aria-hidden="true">←</span> Back to requests</Link>
    <div className="requests-heading"><span className="workspace-eyebrow">YOUR WORKSPACE</span>
      <h1>Create Service Request</h1><p>Describe the issue and we will open a request for it.</p>
    </div>

    <form className="create-form" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
      <p className="create-form-legend">Fields marked <span aria-hidden="true">*</span> are required.</p>
      {formError && <p className="form-error" role="alert">{formError}</p>}

      <div className="create-form-grid">
        <div className="form-field form-field-wide">
          <label htmlFor="title">Title <span className="required" aria-hidden="true">*</span></label>
          <input id="title" name="title" type="text" required autoComplete="off" disabled={submitting}
            value={values.title} onChange={(event) => change('title', event.target.value)}
            aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy('title', true)} />
          {counter('title')}
          {fieldError('title')}
        </div>

        <div className="form-field form-field-wide">
          <label htmlFor="description">Description <span className="required" aria-hidden="true">*</span></label>
          <textarea id="description" name="description" rows={6} required disabled={submitting}
            value={values.description} onChange={(event) => change('description', event.target.value)}
            aria-invalid={errors.description ? true : undefined} aria-describedby={describedBy('description', true)} />
          {counter('description')}
          {fieldError('description')}
        </div>

        <div className="form-field">
          <label htmlFor="category">Category <span className="required" aria-hidden="true">*</span></label>
          <input id="category" name="category" type="text" required autoComplete="off" disabled={submitting}
            value={values.category} onChange={(event) => change('category', event.target.value)}
            aria-invalid={errors.category ? true : undefined} aria-describedby={describedBy('category')} />
          {fieldError('category')}
        </div>

        <div className="form-field">
          <label htmlFor="priority">Priority <span className="required" aria-hidden="true">*</span></label>
          <select id="priority" name="priority" required disabled={submitting}
            value={values.priority} onChange={(event) => change('priority', event.target.value as FormValues['priority'])}
            aria-invalid={errors.priority ? true : undefined} aria-describedby={describedBy('priority')}>
            <option value="">Select a priority</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
          </select>
          {fieldError('priority')}
        </div>

        <div className="form-field">
          <label htmlFor="requesterName">Requester name <span className="required" aria-hidden="true">*</span></label>
          <input id="requesterName" name="requesterName" type="text" required autoComplete="name" disabled={submitting}
            value={values.requesterName} onChange={(event) => change('requesterName', event.target.value)}
            aria-invalid={errors.requesterName ? true : undefined} aria-describedby={describedBy('requesterName')} />
          {fieldError('requesterName')}
        </div>

        <div className="form-field">
          <label htmlFor="requesterEmail">Email <span className="required" aria-hidden="true">*</span></label>
          <input id="requesterEmail" name="requesterEmail" type="email" required autoComplete="email" disabled={submitting}
            value={values.requesterEmail} onChange={(event) => change('requesterEmail', event.target.value)}
            aria-invalid={errors.requesterEmail ? true : undefined} aria-describedby={describedBy('requesterEmail')} />
          {fieldError('requesterEmail')}
        </div>
      </div>

      <div className="create-form-status" role="status">
        {submitting && <p>Creating request…</p>}
      </div>
      <div className="create-form-actions">
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Creating request…' : 'Create request'}
        </button>
        <Link className="secondary-button" to="/requests">Cancel</Link>
      </div>
    </form>
  </RequestsLayout>
}
