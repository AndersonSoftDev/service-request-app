export type ServiceRequestValidation = 'transition' | 'note'

export class ServiceRequestError extends Error {
  readonly status: 404 | 409 | 422
  readonly validation?: ServiceRequestValidation

  constructor(status: 404 | 409 | 422, validation?: ServiceRequestValidation) {
    super('Service request operation failed')
    this.name = 'ServiceRequestError'
    this.status = status
    this.validation = validation
  }
}
