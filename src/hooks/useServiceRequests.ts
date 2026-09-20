import { useEffect, useState } from 'react'
import { getServiceRequests } from '../services/serviceRequestService'
import type { ServiceRequestFilters, ServiceRequestPage } from '../types/serviceRequest'

interface Result {
  key: string
  data: ServiceRequestPage | null
  error: string | null
}

export function useServiceRequests(filters: ServiceRequestFilters = {}) {
  const { search, status, priority, sort = '-createdAt', page = 1, pageSize = 10 } = filters
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = JSON.stringify([search, status, priority, sort, page, pageSize, revision])

  useEffect(() => {
    let active = true
    getServiceRequests({ search, status, priority, sort, page, pageSize })
      .then((data) => { if (active) setResult({ key, data, error: null }) })
      .catch(() => {
        if (active) setResult({ key, data: null, error: 'We could not load your requests. Please try again.' })
      })
    // Ignore late responses from superseded filters and unmounted pages.
    return () => { active = false }
  }, [search, status, priority, sort, page, pageSize, key])

  const loading = result?.key !== key
  return {
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    loading,
    refetch: () => setRevision((value) => value + 1),
  }
}
