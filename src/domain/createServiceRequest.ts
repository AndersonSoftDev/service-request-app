import type { CreateServiceRequest, ServiceRequestPriority } from '../types/serviceRequest'
import { textLength } from './textLength'

export const priorities: readonly ServiceRequestPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

// Single source of truth for the POST /requests contract, shared by the form and the service.
export const createRequestLimits = {
  title: { min: 3, max: 120 },
  description: { min: 10, max: 2000 },
  category: { min: 2, max: 50 },
  requesterName: { min: 2, max: 100 },
  requesterEmail: { max: 254 },
} as const

export const createRequestLabels: Record<keyof CreateServiceRequest, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  priority: 'Priority',
  requesterName: 'Requester name',
  requesterEmail: 'Email',
}

export type CreateServiceRequestErrors = Partial<Record<keyof CreateServiceRequest, string>>
// The form holds a not-yet-chosen priority, so validation accepts unvalidated input.
export type CreateServiceRequestInput = Partial<Record<keyof CreateServiceRequest, unknown>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const textFields = ['title', 'description', 'category', 'requesterName'] as const

function textError(field: (typeof textFields)[number], value: unknown): string | undefined {
  const label = createRequestLabels[field]
  const { min, max } = createRequestLimits[field]
  if (typeof value !== 'string' || value.trim() === '') return `${label} is required.`
  const length = textLength(value.trim())
  if (length < min) return `${label} must be at least ${min} characters.`
  if (length > max) return `${label} cannot exceed ${max} characters.`
}

function emailError(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return 'Email is required.'
  const email = value.trim()
  if (textLength(email) > createRequestLimits.requesterEmail.max) {
    return `Email cannot exceed ${createRequestLimits.requesterEmail.max} characters.`
  }
  if (!emailPattern.test(email)) return 'Please enter a valid email address.'
}

export function validateCreateServiceRequest(input: CreateServiceRequestInput): CreateServiceRequestErrors {
  const errors: CreateServiceRequestErrors = {}
  for (const field of textFields) {
    const message = textError(field, input[field])
    if (message) errors[field] = message
  }
  const email = emailError(input.requesterEmail)
  if (email) errors.requesterEmail = email
  if (!priorities.some((priority) => priority === input.priority)) errors.priority = 'Select a priority.'
  return errors
}
