"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react"

type MatchStatus = "auto" | "needs_review" | "confirmed" | "rejected"

interface ReviewItem {
  id: string
  status: MatchStatus
  matchMethod: string
  matchScore: number
  reviewedAt: string | null
  reviewedBy: string | null
  updatedAt: string
  accRequest: {
    id: string
    sourceEntryId: string
    submittedAt: string | null
    disposition: string
    permitNumber: string | null
    ownerName: string | null
    ownerPhone: string | null
    ownerEmail: string | null
    addressRaw: string | null
    workType: string | null
    description: string | null
    notes: string | null
  }
  residentProfile: {
    id: string
    category: string | null
    addressFull: string | null
    entryCode: string | null
    primary: {
      firstName: string | null
      lastName: string | null
      phone: string | null
      email: string | null
    } | null
    secondary: {
      firstName: string | null
      lastName: string | null
      phone: string | null
      email: string | null
    } | null
  }
}

interface ReviewResponse {
  items: ReviewItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  counts: {
    auto: number
    needs_review: number
    confirmed: number
    rejected: number
  }
}

interface ErrorResponse {
  error?: string
  detail?: string
}

const STATUS_OPTIONS: Array<{ value: MatchStatus | "all"; label: string }> = [
  { value: "needs_review", label: "Needs Review" },
  { value: "auto", label: "Auto" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
]

interface AccMatchReviewTableProps {
  initialQ?: string
  initialStatus?: MatchStatus | "all"
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

function statusPillStyles(status: MatchStatus) {
  if (status === "confirmed") return { bg: "#d1fae5", fg: "#065f46", label: "Confirmed" }
  if (status === "rejected") return { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" }
  if (status === "auto") return { bg: "#dbeafe", fg: "#1d4ed8", label: "Auto" }
  return { bg: "#fef3c7", fg: "#92400e", label: "Needs Review" }
}

function personLine(person: ReviewItem["residentProfile"]["primary"]): string {
  if (!person) return "—"
  const name = `${person.firstName || ""} ${person.lastName || ""}`.trim()
  return name || "—"
}

export function AccMatchReviewTable({ initialQ = "", initialStatus = "needs_review" }: AccMatchReviewTableProps) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [counts, setCounts] = useState<ReviewResponse["counts"]>({
    auto: 0,
    needs_review: 0,
    confirmed: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qInput, setQInput] = useState(initialQ)
  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState<MatchStatus | "all">(initialStatus)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [actingId, setActingId] = useState<string | null>(null)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [bulkMinScore, setBulkMinScore] = useState(95)
  const [bulkMaxScore, setBulkMaxScore] = useState(40)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStatusMessage(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("status", status)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/acc/matches/review?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ErrorResponse
        const message = body.error || "Failed to load review queue"
        const detail = body.detail ? ` (${body.detail})` : ""
        throw new Error(`${message}${detail}`)
      }
      const json = (await res.json()) as ReviewResponse
      setItems(json.items || [])
      setCounts(json.counts)
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, q, status])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const handleSearch = () => {
    setPage(1)
    setQ(qInput)
  }

  const handleAction = async (id: string, action: "confirm" | "reject") => {
    setActingId(id)
    setError(null)
    setStatusMessage(null)
    try {
      const res = await fetch(`/api/acc/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("Failed to update match")
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update match")
    } finally {
      setActingId(null)
    }
  }

  const summary = useMemo(
    () => [
      { label: "Needs Review", value: counts.needs_review },
      { label: "Auto", value: counts.auto },
      { label: "Confirmed", value: counts.confirmed },
      { label: "Rejected", value: counts.rejected },
    ],
    [counts],
  )

  const eligibleBulkIds = useMemo(
    () =>
      items
        .filter((item) => item.status === "needs_review" && item.matchScore >= bulkMinScore)
        .map((item) => item.id),
    [items, bulkMinScore],
  )
  const eligibleBulkRejectIds = useMemo(
    () =>
      items
        .filter((item) => item.status === "needs_review" && item.matchScore <= bulkMaxScore)
        .map((item) => item.id),
    [items, bulkMaxScore],
  )

  const handleBulkConfirm = async () => {
    if (!eligibleBulkIds.length) return
    const confirm = window.confirm(
      `Confirm ${eligibleBulkIds.length} match(es) with score >= ${bulkMinScore} from the current page?`,
    )
    if (!confirm) return

    setBulkConfirming(true)
    setError(null)
    setStatusMessage(null)
    try {
      const res = await fetch("/api/acc/matches/bulk-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eligibleBulkIds, minScore: bulkMinScore }),
      })
      if (!res.ok) throw new Error("Bulk confirm failed")
      const body = (await res.json().catch(() => ({}))) as { updated?: number; eligible?: number }
      setStatusMessage(`Bulk confirm complete: ${body.updated ?? 0} updated (${body.eligible ?? 0} eligible).`)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk confirm failed")
    } finally {
      setBulkConfirming(false)
    }
  }

  const handleBulkReject = async () => {
    if (!eligibleBulkRejectIds.length) return
    const confirm = window.confirm(
      `Reject ${eligibleBulkRejectIds.length} match(es) with score <= ${bulkMaxScore} from the current page?`,
    )
    if (!confirm) return

    setBulkRejecting(true)
    setError(null)
    setStatusMessage(null)
    try {
      const res = await fetch("/api/acc/matches/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eligibleBulkRejectIds, maxScore: bulkMaxScore }),
      })
      if (!res.ok) throw new Error("Bulk reject failed")
      const body = (await res.json().catch(() => ({}))) as { updated?: number; eligible?: number }
      setStatusMessage(`Bulk reject complete: ${body.updated ?? 0} updated (${body.eligible ?? 0} eligible).`)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk reject failed")
    } finally {
      setBulkRejecting(false)
    }
  }

  const handleRerunMatching = async () => {
    const confirm = window.confirm(
      "Re-run ACC matching now with strict rule (address exact + last name exact)? This may take a few seconds.",
    )
    if (!confirm) return
    setRerunning(true)
    setError(null)
    setStatusMessage(null)
    try {
      const res = await fetch("/api/acc/matches/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoRule: "strict_name_address",
          minScore: 70,
          maxCandidates: 10,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        throw new Error(body.detail ? `${body.error || "Re-run failed"} (${body.detail})` : body.error || "Re-run failed")
      }
      const body = (await res.json()) as {
        requestsProcessed: number
        candidatesCreatedOrUpdated: number
        strictRulePromotedCount: number
        reviewCount: number
      }
      setStatusMessage(
        `Re-run complete: ${body.requestsProcessed} requests processed, ${body.candidatesCreatedOrUpdated} candidates updated, ${body.strictRulePromotedCount} strict auto-confirmed, ${body.reviewCount} needs review.`,
      )
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-run failed")
    } finally {
      setRerunning(false)
    }
  }

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
          gridTemplateColumns: "minmax(220px,1fr) auto auto auto auto auto auto auto auto",
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
            placeholder="Search owner, address, permit, resident..."
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
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MatchStatus | "all")
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
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
          onClick={handleSearch}
          style={{ minWidth: "5.2rem" }}
        >
          Search
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

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleRerunMatching}
          disabled={rerunning}
          style={{ minWidth: "10.5rem", opacity: rerunning ? 0.6 : 1 }}
        >
          {rerunning ? "Re-running..." : "Re-run Matching"}
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--pp-slate-700)",
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          Bulk score ≥
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={bulkMinScore}
            onChange={(e) => setBulkMinScore(Math.max(0, Math.min(100, Number.parseInt(e.target.value || "95", 10) || 95)))}
            style={{
              width: "4.2rem",
              padding: "0.4rem 0.45rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
              fontSize: "0.85rem",
            }}
          />
        </label>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBulkConfirm}
          disabled={bulkConfirming || !eligibleBulkIds.length}
          style={{ minWidth: "10rem", opacity: bulkConfirming || !eligibleBulkIds.length ? 0.6 : 1 }}
        >
          Bulk Confirm ({eligibleBulkIds.length})
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--pp-slate-700)",
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          Bulk score ≤
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={bulkMaxScore}
            onChange={(e) => setBulkMaxScore(Math.max(0, Math.min(100, Number.parseInt(e.target.value || "40", 10) || 40)))}
            style={{
              width: "4.2rem",
              padding: "0.4rem 0.45rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
              fontSize: "0.85rem",
            }}
          />
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBulkReject}
          disabled={bulkRejecting || !eligibleBulkRejectIds.length}
          style={{ minWidth: "9.5rem", opacity: bulkRejecting || !eligibleBulkRejectIds.length ? 0.6 : 1 }}
        >
          Bulk Reject ({eligibleBulkRejectIds.length})
        </button>
      </div>

      <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
        {total} matches
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
      {statusMessage ? (
        <div
          style={{
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: "var(--radius-md)",
            padding: "0.7rem 0.85rem",
            fontSize: "0.9rem",
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="stack" style={{ gap: "0.8rem" }}>
        {loading ? (
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
            Loading review queue...
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
            No matches found for this filter.
          </p>
        ) : null}

        {items.map((item) => {
          const pill = statusPillStyles(item.status)
          const isDecided = item.status === "confirmed" || item.status === "rejected"
          return (
            <article
              key={item.id}
              style={{
                border: "1px solid var(--pp-slate-200)",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-white)",
                padding: "0.9rem",
                display: "grid",
                gap: "0.8rem",
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Entry #{item.accRequest.sourceEntryId}</strong>
                  <span
                    style={{
                      padding: "0.2rem 0.55rem",
                      borderRadius: 999,
                      background: pill.bg,
                      color: pill.fg,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {pill.label}
                  </span>
                  <span
                    style={{
                      padding: "0.2rem 0.55rem",
                      borderRadius: 999,
                      border: "1px solid var(--pp-slate-300)",
                      color: "var(--pp-slate-700)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    Score {item.matchScore}
                  </span>
                </div>
                <span style={{ color: "var(--pp-slate-500)", fontSize: "0.78rem" }}>
                  Updated {formatDate(item.updatedAt)}
                </span>
              </header>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "0.8rem",
                }}
              >
                <section
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.7rem",
                    background: "var(--pp-slate-50)",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--pp-navy-dark)", fontSize: "0.95rem" }}>ACC Request</h3>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Owner:</strong> {item.accRequest.ownerName || "—"}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Address:</strong> {item.accRequest.addressRaw || "—"}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Permit #:</strong> {item.accRequest.permitNumber || "—"}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Work Type:</strong> {item.accRequest.workType || "—"}</p>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}><strong>Submitted:</strong> {formatDate(item.accRequest.submittedAt)}</p>
                </section>

                <section
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.7rem",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--pp-navy-dark)", fontSize: "0.95rem" }}>Matched Resident</h3>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Address:</strong> {item.residentProfile.addressFull || "—"}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Primary:</strong> {personLine(item.residentProfile.primary)}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Secondary:</strong> {personLine(item.residentProfile.secondary)}</p>
                  <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem" }}><strong>Category:</strong> {item.residentProfile.category || "—"}</p>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}><strong>Entry Code:</strong> {item.residentProfile.entryCode || "—"}</p>
                </section>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={actingId === item.id || isDecided}
                  onClick={() => handleAction(item.id, "reject")}
                  style={{ opacity: actingId === item.id || isDecided ? 0.6 : 1 }}
                >
                  <XCircle style={{ width: "0.95rem", height: "0.95rem" }} />
                  Reject
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={actingId === item.id || isDecided}
                  onClick={() => handleAction(item.id, "confirm")}
                  style={{ opacity: actingId === item.id || isDecided ? 0.6 : 1 }}
                >
                  <CheckCircle2 style={{ width: "0.95rem", height: "0.95rem" }} />
                  Confirm
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
          Page {page} of {Math.max(1, totalPages)}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
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
