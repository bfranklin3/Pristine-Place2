"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import * as Dialog from "@radix-ui/react-dialog"

type SourceFilter = "all" | "native" | "legacy"
type StatusFilter =
  | "all"
  | "initial_review"
  | "needs_more_info"
  | "committee_vote"
  | "approved"
  | "rejected"
  | "pending"
  | "conditional"
  | "duplicate"
  | "canceled"
type ViewMode = "full" | "redacted"

type Entry = {
  id: string
  source: "native" | "legacy"
  sourceRecordId: string
  displayId: string
  residentName: string
  residentAddress: string | null
  title: string | null
  description: string | null
  permitNumber: string | null
  statusKey: Exclude<StatusFilter, "all">
  statusLabel: string
  processedAt: string | null
  updatedAt: string | null
  reviewCycle: number | null
  isVerified: boolean
  sourceHref: string
  sourceLabel: string
}

type ResponseBody = {
  entries: Entry[]
  total: number
  totalPages: number
  page: number
  perPage: number
  counts: {
    all: number
    native: number
    legacy: number
  }
  statusCounts: Record<string, number>
  error?: string
  detail?: string
}

type DetailBody = {
  detail?: {
    residentName: string | null
    residentAddress: string | null
    title: string | null
    description: string | null
    permitNumber: string | null
    workType: string | null
    phase: string | null
    lot: string | null
    reviewCycle: number | null
    isVerified: boolean
    locationDetails: string | null
    residentActionNote: string | null
    decisionNote: string | null
    verificationNote: string | null
    submittedAt: string
    updatedAt: string | null
    attachments: Array<{
      name: string
      url: string
      scope?: string | null
    }>
    facts: Array<{
      label: string
      value: string
    }>
  }
  error?: string
  message?: string
}

const STATUS_OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "initial_review", label: "Initial Review" },
  { key: "needs_more_info", label: "Needs More Info" },
  { key: "committee_vote", label: "Committee Vote" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "pending", label: "Pending" },
  { key: "conditional", label: "Conditional" },
  { key: "duplicate", label: "Duplicate" },
  { key: "canceled", label: "Canceled" },
]

function formatDateTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function formatDateOnly(value: string | null) {
  if (!value) return "—"

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly
    return `${month}/${day}/${year}`
  }

  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy
    return `${month}/${day}/${year}`
  }

  const isoDate = new Date(value)
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toLocaleDateString()
  }

  return value
}

function statusBadgeStyles(status: Entry["statusKey"]) {
  if (status === "approved") return { background: "#dcfce7", color: "#166534" }
  if (status === "rejected") return { background: "#fee2e2", color: "#991b1b" }
  if (status === "committee_vote") return { background: "#dbeafe", color: "#1d4ed8" }
  if (status === "needs_more_info") return { background: "#ffedd5", color: "#9a3412" }
  if (status === "pending") return { background: "#e0f2fe", color: "#075985" }
  if (status === "conditional") return { background: "#fef3c7", color: "#92400e" }
  if (status === "duplicate") return { background: "#e0e7ff", color: "#3730a3" }
  if (status === "canceled") return { background: "#f3f4f6", color: "#4b5563" }
  return { background: "#f3f4f6", color: "#334155" }
}

function StatusBadge({ status, label }: { status: Entry["statusKey"]; label: string }) {
  const styles = statusBadgeStyles(status)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.25rem 0.7rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: styles.background,
        color: styles.color,
      }}
    >
      {label}
    </span>
  )
}

export function AccCombinedDashboardTable({ viewMode = "full" }: { viewMode?: ViewMode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [counts, setCounts] = useState({ all: 0, native: 0, legacy: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [source, setSource] = useState<SourceFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailBody["detail"] | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("view", viewMode)
      params.set("source", source)
      params.set("status", status)
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (query.trim()) params.set("q", query.trim())

      const res = await fetch(`/api/acc/dashboard?${params.toString()}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as ResponseBody
      if (!res.ok) throw new Error(body.error || body.detail || "Failed to load combined ACC dashboard.")

      setEntries(body.entries || [])
      setCounts(body.counts || { all: 0, native: 0, legacy: 0 })
      setStatusCounts(body.statusCounts || {})
      setTotal(body.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load combined ACC dashboard.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, query, source, status, viewMode])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const openDetail = useCallback(async (entry: Entry) => {
    setActiveEntry(entry)
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)

    try {
      const params = new URLSearchParams({
        source: entry.source,
        id: entry.sourceRecordId,
        view: viewMode,
      })
      const res = await fetch(`/api/acc/dashboard/detail?${params.toString()}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as DetailBody
      if (!res.ok || !body.detail) {
        throw new Error(body.error || body.message || "Failed to load ACC submission detail.")
      }
      setDetail(body.detail)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load ACC submission detail.")
    } finally {
      setDetailLoading(false)
    }
  }, [viewMode])

  const closeDetail = useCallback((open: boolean) => {
    if (open) return
    setActiveEntry(null)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(false)
  }, [])

  const clearFilters = useCallback(() => {
    setQueryInput("")
    setQuery("")
    setSource("all")
    setStatus("all")
    setPage(1)
  }, [])

  const pageStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const pageEnd = Math.min(total, page * perPage)

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
        <div className="card" style={{ padding: "0.9rem 1rem" }}>
          <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>All Sources</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pp-navy-dark)" }}>{counts.all}</div>
        </div>
        <div className="card" style={{ padding: "0.9rem 1rem" }}>
          <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>Native</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pp-navy-dark)" }}>{counts.native}</div>
        </div>
        <div className="card" style={{ padding: "0.9rem 1rem" }}>
          <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>WordPress Legacy</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pp-navy-dark)" }}>{counts.legacy}</div>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                setQuery(queryInput.trim())
                setPage(1)
              }
            }}
            placeholder="Search source, resident, address, request, permit"
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          />
          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value as SourceFilter)
              setPage(1)
            }}
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          >
            <option value="all">All sources</option>
            <option value="native">Native workflow</option>
            <option value="legacy">WordPress legacy</option>
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter)
              setPage(1)
            }}
            style={{ width: "100%", border: "1.5px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.8rem" }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
                {option.key !== "all" ? ` (${statusCounts[option.key] || 0})` : ""}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => { setQuery(queryInput); setPage(1) }}>
            Filter
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
            disabled={!queryInput && !query && source === "all" && status === "all"}
          >
            Clear
          </button>
        </div>
      </div>

      {viewMode === "redacted" ? (
        <div className="card" style={{ padding: "0.9rem 1rem", background: "#fffef8" }}>
          <strong style={{ color: "var(--pp-navy-dark)" }}>Redacted mode:</strong>{" "}
          <span style={{ color: "var(--pp-slate-700)" }}>
            resident identity fields are hidden while addresses, request summaries, statuses, and source links remain visible.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ padding: "1rem", borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--pp-slate-100)", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ color: "var(--pp-slate-700)" }}>
            {loading ? "Loading..." : `${pageStart}-${pageEnd} of ${total}`}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
            <button type="button" className="btn btn-secondary" disabled={pageEnd >= total || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {["Submit ID", "Resident / Property", "Request", "Status", "Processed", "Permit #", "Action"].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "0.8rem 1rem",
                      fontSize: "0.8rem",
                      color: "var(--pp-slate-600)",
                      whiteSpace: "nowrap",
                      width:
                        heading === "Submit ID"
                          ? "10rem"
                          : heading === "Resident / Property"
                            ? "18rem"
                            : heading === "Processed"
                              ? "8rem"
                              : heading === "Permit #"
                                ? "7rem"
                                : heading === "Action"
                                  ? "7rem"
                                  : undefined,
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderTop: "1px solid var(--pp-slate-100)" }}>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)", fontFamily: "monospace" }}>{entry.displayId}</div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", minWidth: "18rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{entry.residentName}</div>
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{entry.residentAddress || "No address"}</div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700 }}>{entry.title || "ACC Request"}</div>
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{entry.description || "No description provided."}</div>
                    <div className="text-fluid-sm" style={{ marginTop: "0.35rem", color: "var(--pp-slate-500)" }}>
                      Permit: {entry.permitNumber || "—"}
                      {entry.reviewCycle ? ` • Review cycle ${entry.reviewCycle}` : ""}
                      {entry.isVerified ? " • Verified complete" : ""}
                    </div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                    <StatusBadge status={entry.statusKey} label={entry.statusLabel} />
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", color: "var(--pp-slate-600)", whiteSpace: "nowrap" }}>
                    {formatDateOnly(entry.processedAt)}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", color: "var(--pp-slate-600)", whiteSpace: "nowrap" }}>
                    {entry.permitNumber || "—"}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                    <button
                      type="button"
                      onClick={() => void openDetail(entry)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--pp-slate-200)",
                        background: "var(--pp-white)",
                        color: "var(--pp-slate-700)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "var(--pp-slate-600)" }}>
                    No ACC submissions match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog.Root open={!!activeEntry} onOpenChange={closeDetail}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.55)",
              zIndex: 80,
            }}
          />
          <Dialog.Content
            style={{
              position: "fixed",
              inset: "50% auto auto 50%",
              transform: "translate(-50%, -50%)",
              width: "min(92vw, 58rem)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "var(--pp-white)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
              padding: "1.1rem",
              zIndex: 81,
            }}
          >
            {activeEntry ? (
              <div className="stack" style={{ gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <Dialog.Title style={{ margin: 0, color: "var(--pp-navy-dark)", fontSize: "1.3rem", fontWeight: 800 }}>
                      {detail?.title || activeEntry.title || "ACC Submission"}
                    </Dialog.Title>
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.3rem" }}>
                      {activeEntry.sourceLabel} #{activeEntry.sourceRecordId}
                    </div>
                  </div>
                  <StatusBadge status={activeEntry.statusKey} label={activeEntry.statusLabel} />
                </div>

                {detailLoading ? (
                  <div className="card" style={{ padding: "1rem", color: "var(--pp-slate-700)" }}>
                    Loading submission detail...
                  </div>
                ) : detailError ? (
                  <div className="card" style={{ padding: "1rem", borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
                    {detailError}
                  </div>
                ) : detail ? (
                  <>
                    <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
                      <div><strong>Resident</strong><div>{detail.residentName || activeEntry.residentName || "—"}</div></div>
                      <div><strong>Property</strong><div>{detail.residentAddress || activeEntry.residentAddress || "—"}</div></div>
                      <div><strong>Submitted</strong><div>{formatDateTime(detail.submittedAt)}</div></div>
                      <div><strong>Updated</strong><div>{formatDateTime(detail.updatedAt)}</div></div>
                      <div><strong>Permit</strong><div>{detail.permitNumber || activeEntry.permitNumber || "—"}</div></div>
                      <div><strong>Review Cycle</strong><div>{detail.reviewCycle ? String(detail.reviewCycle) : "—"}</div></div>
                      <div><strong>Work Type</strong><div>{detail.workType || "—"}</div></div>
                      <div><strong>Phase / Lot</strong><div>{detail.phase || "—"} / {detail.lot || "—"}</div></div>
                    </div>

                    <div>
                      <strong>Description</strong>
                      <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>
                        {detail.description || activeEntry.description || "No description provided."}
                      </p>
                    </div>

                    {detail.locationDetails ? (
                      <div>
                        <strong>Additional Details</strong>
                        <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-700)" }}>{detail.locationDetails}</p>
                      </div>
                    ) : null}

                    {detail.residentActionNote ? (
                      <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#fff7ed", color: "#9a3412" }}>
                        <strong>Resident Action Note:</strong> {detail.residentActionNote}
                      </div>
                    ) : null}

                    {detail.decisionNote ? (
                      <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#f8fafc", color: "var(--pp-slate-700)" }}>
                        <strong>Decision Note:</strong> {detail.decisionNote}
                      </div>
                    ) : null}

                    {detail.verificationNote || detail.isVerified ? (
                      <div style={{ padding: "0.85rem 0.9rem", borderRadius: "var(--radius-sm)", background: "#f0fdf4", color: "#166534" }}>
                        <strong>Verification:</strong> {detail.verificationNote || "Verified complete"}
                      </div>
                    ) : null}

                    {detail.facts.length > 0 ? (
                      <div>
                        <strong>Additional Facts</strong>
                        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", marginTop: "0.6rem" }}>
                          {detail.facts.map((fact) => (
                            <div key={fact.label} style={{ padding: "0.75rem 0.8rem", borderRadius: "var(--radius-sm)", background: "#f8fafc" }}>
                              <div className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>{fact.label}</div>
                              <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-800)" }}>{fact.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <strong>Attachments</strong>
                      {detail.attachments.length > 0 ? (
                        <div className="stack" style={{ gap: "0.5rem", marginTop: "0.6rem" }}>
                          {detail.attachments.map((attachment) => (
                            <div
                              key={`${attachment.scope || "file"}-${attachment.url}`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "1rem",
                                alignItems: "center",
                                padding: "0.75rem 0.8rem",
                                borderRadius: "var(--radius-sm)",
                                background: "#f8fafc",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--pp-slate-800)" }}>{attachment.name}</div>
                                <div className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                                  {(attachment.scope || "attachment").toUpperCase()}
                                </div>
                              </div>
                              <a href={attachment.url} target="_blank" rel="noreferrer" style={{ color: "var(--pp-navy)", fontWeight: 600 }}>
                                Open file
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-600)" }}>No attachments.</p>
                      )}
                    </div>
                  </>
                ) : null}

                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href={activeEntry.sourceHref} className="btn btn-secondary">
                    {activeEntry.source === "native" ? "Open in Native Queue" : "Open in WP Queue"}
                  </Link>
                  <Dialog.Close asChild>
                    <button type="button" className="btn btn-primary">Close</button>
                  </Dialog.Close>
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
