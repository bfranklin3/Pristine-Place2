"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, RefreshCw, Search } from "lucide-react"

type PriorityFilter = "all" | "address_exact" | "other"
type AgeBucketFilter = "all" | "0_7" | "8_30" | "31_90" | "91_plus"

interface UnmatchedItem {
  id: string
  sourceEntryId: string
  permitNumber: string | null
  submittedAt: string | null
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
  addressRaw: string | null
  addressCanonical: string
  workType: string | null
  disposition: string
  priority: "address_exact" | "other"
  ageDays: number | null
  ageBucket: "0_7" | "8_30" | "31_90" | "91_plus"
  candidateCount: number
  candidates: Array<{
    residentProfileId: string
    address: string
    status: string
    score: number
  }>
}

interface ApiResponse {
  items: UnmatchedItem[]
  counts: {
    total: number
    address_exact: number
    other: number
    age_0_7: number
    age_8_30: number
    age_31_90: number
    age_91_plus: number
  }
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

export function AccUnmatchedQueueTable() {
  const [items, setItems] = useState<UnmatchedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qInput, setQInput] = useState("")
  const [q, setQ] = useState("")
  const [priority, setPriority] = useState<PriorityFilter>("address_exact")
  const [ageBucket, setAgeBucket] = useState<AgeBucketFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({
    total: 0,
    address_exact: 0,
    other: 0,
    age_0_7: 0,
    age_8_30: 0,
    age_31_90: 0,
    age_91_plus: 0,
  })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("priority", priority)
      params.set("ageBucket", ageBucket)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/acc/unmatched?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load unmatched queue")
      }
      const json = (await res.json()) as ApiResponse
      setItems(json.items || [])
      setCounts(json.counts)
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load unmatched queue")
      setItems([])
      setCounts({
        total: 0,
        address_exact: 0,
        other: 0,
        age_0_7: 0,
        age_8_30: 0,
        age_31_90: 0,
        age_91_plus: 0,
      })
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [ageBucket, page, pageSize, priority, q])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const summary = useMemo(
    () => [
      { label: "Unmatched Total", value: counts.total },
      { label: "Address-Exact Priority", value: counts.address_exact },
      { label: "Other", value: counts.other },
      { label: "0-7 days", value: counts.age_0_7 },
      { label: "8-30 days", value: counts.age_8_30 },
      { label: "31-90 days", value: counts.age_31_90 },
      { label: "91+ days", value: counts.age_91_plus },
    ],
    [counts],
  )

  const exportCsv = () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    params.set("priority", priority)
    params.set("ageBucket", ageBucket)
    params.set("export", "csv")
    window.open(`/api/acc/unmatched?${params.toString()}`, "_blank")
  }

  const tableColumns = "110px 110px 70px minmax(170px,0.9fr) minmax(230px,1.1fr) 120px 90px 190px"

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {summary.map((item) => (
          <span
            key={item.label}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: 999,
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-slate-50)",
              color: "var(--pp-slate-700)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {item.label}: {item.value}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px,1fr) auto auto auto auto auto auto",
          gap: "0.6rem",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: "0.6rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "0.9rem",
              height: "0.9rem",
              color: "var(--pp-slate-500)",
            }}
          />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setPage(1)
                setQ(qInput.trim())
              }
            }}
            placeholder="Search permit, owner, address..."
            style={{
              width: "100%",
              padding: "0.5rem 0.6rem 0.5rem 2rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as PriorityFilter)
            setPage(1)
          }}
          style={{
            padding: "0.5rem 0.6rem",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--pp-slate-200)",
            fontSize: "0.9rem",
            background: "var(--pp-white)",
          }}
        >
          <option value="address_exact">Address-Exact Priority</option>
          <option value="other">Other</option>
          <option value="all">All</option>
        </select>
        <select
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(Number.parseInt(e.target.value, 10))
            setPage(1)
          }}
          style={{
            padding: "0.5rem 0.6rem",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--pp-slate-200)",
            fontSize: "0.9rem",
            background: "var(--pp-white)",
          }}
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              Rows: {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setPage(1)
            setQ(qInput.trim())
          }}
        >
          Search
        </button>
        <select
          value={ageBucket}
          onChange={(e) => {
            setAgeBucket(e.target.value as AgeBucketFilter)
            setPage(1)
          }}
          style={{
            padding: "0.5rem 0.6rem",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--pp-slate-200)",
            fontSize: "0.9rem",
            background: "var(--pp-white)",
          }}
        >
          <option value="all">All ages</option>
          <option value="0_7">0-7 days</option>
          <option value="8_30">8-30 days</option>
          <option value="31_90">31-90 days</option>
          <option value="91_plus">91+ days</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchRows}
          style={{ minWidth: "2.5rem", paddingInline: "0.6rem" }}
          aria-label="Refresh"
        >
          <RefreshCw style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>

      <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
        {total} unmatched requests in current filter
      </p>

      {error ? (
        <div
          style={{
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: "var(--radius-md)",
            padding: "0.8rem 0.9rem",
            display: "flex",
            gap: "0.6rem",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle style={{ width: "1rem", height: "1rem", marginTop: "0.1rem" }} />
          <span>{error}</span>
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid var(--pp-slate-200)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--pp-white)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: tableColumns,
            gap: "0.6rem",
            padding: "0.7rem 0.8rem",
            background: "var(--pp-navy-dark)",
            color: "var(--pp-white)",
            fontSize: "0.78rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span>Permit #</span>
          <span>Submitted</span>
          <span>Age</span>
          <span>Owner</span>
          <span>Address</span>
          <span>Priority</span>
          <span>Candidates</span>
          <span>Action</span>
        </div>
        {loading ? <p style={{ margin: 0, padding: "0.9rem", color: "var(--pp-slate-600)" }}>Loading...</p> : null}
        {!loading && items.length === 0 ? (
          <p style={{ margin: 0, padding: "0.9rem", color: "var(--pp-slate-600)" }}>No unmatched requests found.</p>
        ) : null}
        {!loading &&
          items.map((row, idx) => {
            const matchReviewQuery = row.permitNumber || row.sourceEntryId || row.addressRaw || ""
            return (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: tableColumns,
                gap: "0.6rem",
                padding: "0.7rem 0.8rem",
                borderTop: idx === 0 ? "none" : "1px solid var(--pp-slate-100)",
                background: idx % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                fontSize: "0.85rem",
                alignItems: "start",
              }}
            >
              <div>
                <strong>{row.permitNumber || "—"}</strong>
                <div style={{ color: "var(--pp-slate-500)", fontSize: "0.78rem" }}>#{row.sourceEntryId}</div>
              </div>
              <span>{formatDate(row.submittedAt)}</span>
              <span>{row.ageDays ?? "—"}</span>
              <span>{row.ownerName || "—"}</span>
              <div>
                <strong>{row.addressRaw || "—"}</strong>
                {row.candidates.length > 0 ? (
                  <div style={{ marginTop: "0.2rem", color: "var(--pp-slate-600)", fontSize: "0.78rem" }}>
                    Top candidate: {row.candidates[0].address} (score {row.candidates[0].score || 0})
                  </div>
                ) : null}
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  background: row.priority === "address_exact" ? "#fef3c7" : "var(--pp-slate-200)",
                  color: row.priority === "address_exact" ? "#92400e" : "var(--pp-slate-700)",
                }}
              >
                {row.priority === "address_exact" ? "Address Exact" : "Other"}
              </span>
              <span>{row.candidateCount}</span>
              <div>
                <Link
                  href={`/resident-portal/management/acc-match-review?status=all&q=${encodeURIComponent(matchReviewQuery)}`}
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    whiteSpace: "nowrap",
                    padding: "0.35rem 0.55rem",
                    fontSize: "0.78rem",
                  }}
                >
                  Open in Match Review
                </Link>
              </div>
            </div>
            )
          })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
          Page {page} of {Math.max(1, totalPages)}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
