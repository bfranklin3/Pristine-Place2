"use client"

import { useCallback, useEffect, useState } from "react"
import type { AccessCredentialStatus, AccessResidentsListResponse } from "@/lib/access/types"

interface UseAccessResidentsParams {
  q?: string
  phase?: string
  category?: string
  status?: AccessCredentialStatus
  page?: number
  pageSize?: number
}

export function useAccessResidents(initial: UseAccessResidentsParams = {}) {
  const [params, setParams] = useState<UseAccessResidentsParams>({
    page: initial.page ?? 1,
    pageSize: initial.pageSize ?? 25,
    ...initial,
  })
  const [data, setData] = useState<AccessResidentsListResponse>({
    items: [],
    total: 0,
    needsReviewCount: 0,
    page: params.page || 1,
    pageSize: params.pageSize || 25,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (nextParams: UseAccessResidentsParams) => {
    setLoading(true)
    setError(null)
    const search = new URLSearchParams()
    if (nextParams.q) search.set("q", nextParams.q)
    if (nextParams.phase) search.set("phase", nextParams.phase)
    if (nextParams.category) search.set("category", nextParams.category)
    if (nextParams.status) search.set("status", nextParams.status)
    if (nextParams.page) search.set("page", String(nextParams.page))
    if (nextParams.pageSize) search.set("pageSize", String(nextParams.pageSize))

    const res = await fetch(`/api/access/residents?${search.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || "Failed to load access residents")
      setLoading(false)
      return
    }

    const json = (await res.json()) as AccessResidentsListResponse
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(params)
  }, [fetchData, params])

  return {
    data,
    loading,
    error,
    params,
    setParams,
    refresh: () => fetchData(params),
  }
}
