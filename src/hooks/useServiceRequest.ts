import { useEffect, useRef, useState } from 'react'
import { getServiceRequestById, updateServiceRequestStatus } from '../services/serviceRequestService'
import { ServiceRequestError } from '../services/ServiceRequestError'
import type { ServiceRequest, ServiceRequestStatus } from '../types/serviceRequest'

interface Result {
  key: string
  data: ServiceRequest | null
  error: 'not-found' | 'unavailable' | null
}
export type StatusUpdateError = 'conflict' | 'transition' | 'note' | 'unavailable'
interface Mutation {
  key: string
  submitting: boolean
  error: StatusUpdateError | null
  success: boolean
}

export function useServiceRequest(requestId: string) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [mutation, setMutation] = useState<Mutation | null>(null)
  const lifecycle = useRef<{ active: boolean; pending: boolean } | null>(null)
  const key = JSON.stringify([requestId, revision])

  useEffect(() => {
    const scope = { active: true, pending: false }
    lifecycle.current = scope
    getServiceRequestById(requestId)
      .then((data) => { if (scope.active) setResult({ key, data, error: null }) })
      .catch((cause: unknown) => {
        if (scope.active) setResult({
          key, data: null,
          error: cause instanceof ServiceRequestError && cause.status === 404 ? 'not-found' : 'unavailable',
        })
      })
    return () => { scope.active = false }
  }, [requestId, key])

  const loading = result?.key !== key
  const data = loading ? null : result.data
  const currentMutation = mutation?.key === key ? mutation : null

  async function updateStatus(status: ServiceRequestStatus, note: string): Promise<void> {
    const scope = lifecycle.current
    if (!data || !scope?.active || scope.pending || currentMutation?.error === 'conflict') return
    scope.pending = true
    setMutation({ key, submitting: true, error: null, success: false })
    try {
      const updated = await updateServiceRequestStatus(requestId, {
        status, version: data.version, ...(note ? { note } : {}),
      })
      if (scope.active) {
        setResult({ key, data: updated, error: null })
        setMutation({ key, submitting: false, error: null, success: true })
      }
    } catch (cause: unknown) {
      if (!scope.active) return
      if (cause instanceof ServiceRequestError && cause.status === 404) {
        setResult({ key, data: null, error: 'not-found' })
        setMutation(null)
      } else {
        const error: StatusUpdateError = cause instanceof ServiceRequestError
          ? cause.status === 409 ? 'conflict' : cause.validation ?? 'transition'
          : 'unavailable'
        setMutation({ key, submitting: false, error, success: false })
      }
    } finally {
      scope.pending = false
    }
  }

  return {
    data, loading,
    error: loading ? null : result.error,
    submitting: currentMutation?.submitting ?? false,
    updateError: currentMutation?.error ?? null,
    updateSuccess: currentMutation?.success ?? false,
    updateStatus,
    refetch: () => { if (!lifecycle.current?.pending) setRevision((value) => value + 1) },
  }
}
