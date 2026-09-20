import type { CreateServiceRequestErrors } from '../domain/createServiceRequest'

export type ServiceRequestValidation = 'transition' | 'note'
export type ServiceRequestErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

export class ServiceRequestError extends Error {
  readonly status: ServiceRequestErrorStatus
  readonly validation?: ServiceRequestValidation
  // Field-level detail for a 422 the UI can map onto its inputs.
  readonly fields?: CreateServiceRequestErrors

  constructor(
    status: ServiceRequestErrorStatus,
    validation?: ServiceRequestValidation,
    fields?: CreateServiceRequestErrors,
  ) {
    super('Service request operation failed')
    this.name = 'ServiceRequestError'
    this.status = status
    this.validation = validation
    this.fields = fields
  }
}
