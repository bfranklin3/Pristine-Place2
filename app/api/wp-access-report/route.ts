import { NextRequest, NextResponse } from "next/server"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"

const WP_API = process.env.WORDPRESS_API_URL ?? "https://www.pristineplace.us/wp-json/wp/v2"
const WP_USER = process.env.WORDPRESS_USERNAME ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD ?? ""
const ACCESS_REPORT_URL =
  process.env.WORDPRESS_ACCESS_REPORT_URL?.trim() ||
  `${WP_API.replace(/\/wp\/v2\/?$/, "")}/pp/v1/resident-access-report`
const CACHE_TTL_MS = 30_000

function authHeaders() {
  if (!WP_USER || !WP_PASS) return { "Content-Type": "application/json" }
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function normalizeRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (!payload || typeof payload !== "object") return []

  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.rows)) return obj.rows as Record<string, unknown>[]
  if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[]
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[]
  if (Array.isArray(obj.entries)) return obj.entries as Record<string, unknown>[]

  return []
}

function extractTotal(payload: unknown, fallback: number): number {
  if (!payload || typeof payload !== "object") return fallback
  const obj = payload as Record<string, unknown>
  if (typeof obj.total === "number") return Number(obj.total)
  if (typeof obj.total_count === "number") return Number(obj.total_count)
  return fallback
}

function hasExplicitPagingParams(url: URL): boolean {
  return (
    url.searchParams.has("page") ||
    url.searchParams.has("limit") ||
    url.searchParams.has("per_page") ||
    url.searchParams.has("page_size") ||
    url.searchParams.has("paging[page_size]") ||
    url.searchParams.has("paging[offset]")
  )
}

function isGravityFormsEntriesEndpoint(url: URL): boolean {
  return /\/wp-json\/gf\/v2\/forms\/\d+\/entries\/?$/.test(url.pathname)
}

function rowKey(row: Record<string, unknown>): string {
  const candidate =
    row.id ??
    row.ID ??
    row.entry_id ??
    row.entryId ??
    row["sourceEntryId"] ??
    null
  if (typeof candidate === "string" || typeof candidate === "number") {
    return String(candidate)
  }
  return JSON.stringify(row)
}

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["access.view"])
  if (!access.ok) return access.response

  try {
    const inputUrl = new URL(req.url)
    const upstream = new URL(ACCESS_REPORT_URL)

    // Pass through filters/paging params to WordPress endpoint.
    inputUrl.searchParams.forEach((value, key) => {
      upstream.searchParams.set(key, value)
    })
    const cacheKey = upstream.toString()
    const cache = ((globalThis as Record<string, unknown>).__wpAccessReportCache ??
      new Map<string, { expiresAt: number; payload: Record<string, unknown> }>()) as Map<
      string,
      { expiresAt: number; payload: Record<string, unknown> }
    >
    ;(globalThis as Record<string, unknown>).__wpAccessReportCache = cache

    const hasExplicitPaging = hasExplicitPagingParams(inputUrl)
    const cached = cache.get(cacheKey)
    if (!hasExplicitPaging && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload)
    }

    const fetchUpstream = async (url: URL) => {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        const detail = await res.text()
        return {
          ok: false as const,
          status: res.status,
          detail: detail.slice(0, 500),
        }
      }
      const json = await res.json()
      return {
        ok: true as const,
        json,
      }
    }

    let pagesFetched = 0
    let paginationMode: "none" | "gf-current-page" | "page" | "offset" | "page+offset-fallback" = "none"
    const first = await fetchUpstream(upstream)
    pagesFetched += 1
    if (!first.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch resident access report from WordPress",
          status: first.status,
          detail: first.detail,
          upstream: upstream.toString(),
        },
        { status: first.status }
      )
    }

    const firstJson = first.json
    let rows = normalizeRows(firstJson)
    let total = extractTotal(firstJson, rows.length)

    // Fast path for GF form entries endpoint: use GF native paging params.
    if (!hasExplicitPaging && isGravityFormsEntriesEndpoint(upstream)) {
      const pageSize = 200
      const allRows: Record<string, unknown>[] = []
      let currentPage = 1
      let totalCount = Number.POSITIVE_INFINITY
      const maxPages = 200

      while (currentPage <= maxPages && allRows.length < totalCount) {
        const gfUpstream = new URL(upstream.toString())
        gfUpstream.searchParams.set("paging[page_size]", String(pageSize))
        gfUpstream.searchParams.set("paging[current_page]", String(currentPage))

        const pageResult = await fetchUpstream(gfUpstream)
        pagesFetched += 1
        if (!pageResult.ok) break

        const payload = pageResult.json
        const batch = normalizeRows(payload)
        const payloadObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null
        if (payloadObj && typeof payloadObj.total_count === "number") {
          totalCount = Number(payloadObj.total_count)
        }

        if (!batch.length) break
        allRows.push(...batch)
        if (batch.length < pageSize) break
        currentPage += 1
      }

      if (allRows.length) {
        rows = allRows
        total = allRows.length
        paginationMode = "gf-current-page"
      }
    }

    // Generic fallback for non-GF endpoints: probe page/offset patterns.
    if (!hasExplicitPaging && paginationMode === "none") {
      const allRows: Record<string, unknown>[] = [...rows]
      const seen = new Set(allRows.map((row) => rowKey(row)))
      const maxPages = 100
      const inferredPageSize = Math.max(1, rows.length || 10)
      let previousPageSignature = allRows.slice(0, 5).map((row) => rowKey(row)).join("|")
      let usedPageStrategy = false

      for (let page = 2; page <= maxPages; page += 1) {
        usedPageStrategy = true
        const pagedUpstream = new URL(upstream.toString())
        pagedUpstream.searchParams.set("limit", String(inferredPageSize))
        pagedUpstream.searchParams.set("page", String(page))
        pagedUpstream.searchParams.set("per_page", String(inferredPageSize))
        pagedUpstream.searchParams.set("page_size", String(inferredPageSize))

        const pageResult = await fetchUpstream(pagedUpstream)
        pagesFetched += 1
        if (!pageResult.ok) break
        const pageRows = normalizeRows(pageResult.json)
        if (!pageRows.length) break

        const pageSignature = pageRows.slice(0, 5).map((row) => rowKey(row)).join("|")
        if (pageSignature && pageSignature === previousPageSignature) break
        previousPageSignature = pageSignature

        let added = 0
        for (const row of pageRows) {
          const key = rowKey(row)
          if (seen.has(key)) continue
          seen.add(key)
          allRows.push(row)
          added += 1
        }

        if (added === 0) break
      }

      // Some endpoints ignore page/limit and require offset-style params.
      // If page strategy did not advance results, attempt offset fallback.
      if (usedPageStrategy && allRows.length <= rows.length && rows.length > 0) {
        const fallbackRows: Record<string, unknown>[] = [...rows]
        const fallbackSeen = new Set(fallbackRows.map((row) => rowKey(row)))
        const pageSize = Math.max(1, rows.length || 10)
        const concurrency = 8
        let usedOffset = false
        let reachedEnd = false

        for (let batchStart = 1; batchStart <= maxPages && !reachedEnd; batchStart += concurrency) {
          const jobs: Array<{ page: number; request: Promise<{ ok: false; status: number; detail: string } | { ok: true; json: unknown }> }> = []
          for (let i = 0; i < concurrency; i += 1) {
            const page = batchStart + i
            if (page > maxPages) break
            usedOffset = true
            const offset = page * pageSize
            const offsetUpstream = new URL(upstream.toString())
            offsetUpstream.searchParams.set("offset", String(offset))
            offsetUpstream.searchParams.set("page_size", String(pageSize))
            offsetUpstream.searchParams.set("limit", String(pageSize))
            offsetUpstream.searchParams.set("paging[offset]", String(offset))
            offsetUpstream.searchParams.set("paging[page_size]", String(pageSize))
            jobs.push({ page, request: fetchUpstream(offsetUpstream) })
          }

          const results = await Promise.all(jobs.map((j) => j.request))
          pagesFetched += results.length

          for (let i = 0; i < results.length; i += 1) {
            const result = results[i]
            if (!result.ok) {
              reachedEnd = true
              break
            }

            const offsetRows = normalizeRows(result.json)
            if (!offsetRows.length) {
              reachedEnd = true
              break
            }

            let added = 0
            for (const row of offsetRows) {
              const key = rowKey(row)
              if (fallbackSeen.has(key)) continue
              fallbackSeen.add(key)
              fallbackRows.push(row)
              added += 1
            }

            if (added === 0 || offsetRows.length < pageSize) {
              reachedEnd = true
              break
            }
          }
        }

        if (usedOffset && fallbackRows.length > allRows.length) {
          allRows.splice(0, allRows.length, ...fallbackRows)
          paginationMode = "page+offset-fallback"
        }
      }

      if (allRows.length) {
        rows = allRows
        total = allRows.length
        if (paginationMode === "none") paginationMode = "page"
      }
    }

    const payload = {
      rows,
      total,
      source: upstream.toString(),
      debug: {
        rowsReturned: rows.length,
        pagesFetched,
        paginationMode,
      },
    }
    if (!hasExplicitPaging) {
      cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      })
    }
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Resident access report proxy failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
