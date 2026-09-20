import { ServiceRequestError } from './ServiceRequestError'

export class ServiceRequestNotFoundError extends ServiceRequestError {
  constructor() {
    super(404)
    this.message = 'Service request not found'
    this.name = 'ServiceRequestNotFoundError'
  }
}
