"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, RefreshCw, Search } from "lucide-react"

interface AccPermitLookupListItem {
  id: string
  address: string
  accHistoryCount: number
  latestAccSubmittedAt: string | null
}

interface AccPermitLookupListResponse {
  items: AccPermitLookupListItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

interface AccPermitLookupDetail {
  id: string
  addressFull: string | null
  nativeAccRequests: Array<{
    id: string
    requestNumber: string
    permitNumber: string | null
    submittedAt: string | null
    status: string
    finalDecision: string | null
    finalDecisionAt: string | null
    reviewCycle: number
    isVerified: boolean
    workType: string | null
    title: string | null
    description: string | null
    decisionNote: string | null
    residentActionNote: string | null
    attachments: Array<{
      id: string
      filename: string | null
      url: string
      mimeType: string | null
      scope: string | null
    }>
  }>
  confirmedAccRequests: Array<{
    matchId: string
    sourceEntryId: string
    permitNumber: string | null
    submittedAt: string | null
    processDate: string | null
    disposition: string
    workType: string | null
    addressRaw: string | null
    description: string | null
    notes: string | null
    attachments: Array<{
      id: string
      fieldId: string
      url: string
      filename: string | null
      mimeType: string | null
    }>
  }>
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly
    return `${month}/${day}/${year}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

function nativeAccStatusLabel(status: string, finalDecision: string | null): string {
  if (finalDecision === "approve") return "Approved"
  if (finalDecision === "reject") return "Rejected"
  if (status === "initial_review") return "Initial Review"
  if (status === "needs_more_info") return "Needs More Info"
  if (status === "committee_vote") return "Committee Vote"
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  return status || "—"
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function slugifyFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "acc-permit-lookup"
}

function escapeHtml(value: unknown): string {
  const text = String(value ?? "")
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function AccPermitLookupTable() {
  const [items, setItems] = useState<AccPermitLookupListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AccPermitLookupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qInput, setQInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/acc-permit-lookup?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load ACC permit lookup list")
      }
      const json = (await res.json()) as AccPermitLookupListResponse
      setItems(json.items || [])
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
      if (!selectedId && json.items?.length) setSelectedId(json.items[0].id)
      if (selectedId && !json.items?.some((item) => item.id === selectedId)) {
        setSelectedId(json.items?.[0]?.id || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ACC permit lookup list")
      setItems([])
      setTotal(0)
      setTotalPages(1)
      setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, q, selectedId])

  const fetchDetail = useCallback(async (residentProfileId: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/acc-permit-lookup/${residentProfileId}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load ACC permit lookup detail")
      }
      setDetail((await res.json()) as AccPermitLookupDetail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ACC permit lookup detail")
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    fetchDetail(selectedId)
  }, [fetchDetail, selectedId])

  const onSearch = (nextValue?: string) => {
    const resolvedValue = (nextValue ?? searchInputRef.current?.value ?? qInput).trim()
    setPage(1)
    setQInput(resolvedValue)
    setQ(resolvedValue)
  }

  const onClear = () => {
    setQInput("")
    setQ("")
    setPage(1)
  }

  const selectedSummary = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId])
  const exportBaseName = useMemo(() => {
    const base = detail?.addressFull || selectedSummary?.address || detail?.id || "acc-permit-lookup"
    return slugifyFilePart(base)
  }, [detail?.addressFull, detail?.id, selectedSummary?.address])

  const exportCsv = () => {
    if (!detail) return
    const lines: string[] = []
    lines.push([csvEscape("Section"), csvEscape("Field"), csvEscape("Value")].join(","))

    const pushRow = (section: string, field: string, value: unknown) => {
      lines.push([csvEscape(section), csvEscape(field), csvEscape(value ?? "")].join(","))
    }

    pushRow("Property", "Address", detail.addressFull || "—")

    detail.nativeAccRequests.forEach((request, index) => {
      const section = `Native ACC Request ${index + 1}`
      pushRow(section, "Request Number", request.requestNumber)
      pushRow(section, "Permit Number", request.permitNumber || "")
      pushRow(section, "Status", nativeAccStatusLabel(request.status, request.finalDecision))
      pushRow(section, "Submitted", formatDate(request.submittedAt))
      pushRow(section, "Final Decision Date", formatDate(request.finalDecisionAt))
      pushRow(section, "Review Cycle", request.reviewCycle)
      pushRow(section, "Verified", request.isVerified ? "Yes" : "No")
      pushRow(section, "Work Type", request.workType || "")
      pushRow(section, "Title", request.title || "")
      pushRow(section, "Description", request.description || "")
      pushRow(section, "Decision Note", request.decisionNote || "")
      pushRow(section, "Resident Action Note", request.residentActionNote || "")
      request.attachments.forEach((attachment, attachmentIndex) => {
        pushRow(section, `Attachment ${attachmentIndex + 1} Name`, attachment.filename || "")
        pushRow(section, `Attachment ${attachmentIndex + 1} URL`, attachment.url)
      })
    })

    detail.confirmedAccRequests.forEach((request, index) => {
      const section = `Legacy ACC Request ${index + 1}`
      pushRow(section, "Source Entry", request.sourceEntryId)
      pushRow(section, "Permit Number", request.permitNumber || "")
      pushRow(section, "Disposition", request.disposition)
      pushRow(section, "Submitted", formatDate(request.submittedAt))
      pushRow(section, "Process Date", formatDate(request.processDate))
      pushRow(section, "Work Type", request.workType || "")
      pushRow(section, "Address", request.addressRaw || "")
      pushRow(section, "Description", request.description || "")
      pushRow(section, "Notes", request.notes || "")
      request.attachments.forEach((attachment, attachmentIndex) => {
        pushRow(section, `Attachment ${attachmentIndex + 1} Name`, attachment.filename || "")
        pushRow(section, `Attachment ${attachmentIndex + 1} URL`, attachment.url)
      })
    })

    const csv = `${lines.join("\n")}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `acc-permit-lookup-${exportBaseName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    if (!detail) return

    const nativeAccRows = detail.nativeAccRequests
      .map((request) => {
        const attachmentList =
          request.attachments.length > 0
            ? `<ul>${request.attachments
                .map(
                  (attachment) =>
                    `<li><a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attachment.filename || attachment.url)}</a></li>`,
                )
                .join("")}</ul>`
            : "—"

        return `
          <div class="card">
            <h4>${escapeHtml(request.requestNumber)}${request.permitNumber ? ` · Permit ${escapeHtml(request.permitNumber)}` : ""}</h4>
            <p><strong>Status:</strong> ${escapeHtml(nativeAccStatusLabel(request.status, request.finalDecision))} | <strong>Submitted:</strong> ${escapeHtml(formatDate(request.submittedAt))}</p>
            <p><strong>Work Type:</strong> ${escapeHtml(request.workType || request.title || "—")} | <strong>Review Cycle:</strong> ${escapeHtml(request.reviewCycle)}</p>
            <p><strong>Description:</strong> ${escapeHtml(request.description || "—")}</p>
            <p><strong>Decision Note:</strong> ${escapeHtml(request.decisionNote || "—")}</p>
            <p><strong>Resident Action Note:</strong> ${escapeHtml(request.residentActionNote || "—")}</p>
            <p><strong>Attachments:</strong></p>
            ${attachmentList}
          </div>
        `
      })
      .join("")

    const legacyAccRows = detail.confirmedAccRequests
      .map((request) => {
        const attachmentList =
          request.attachments.length > 0
            ? `<ul>${request.attachments
                .map(
                  (attachment) =>
                    `<li><a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attachment.filename || attachment.url)}</a></li>`,
                )
                .join("")}</ul>`
            : "—"

        return `
          <div class="card">
            <h4>${request.permitNumber ? `Permit ${escapeHtml(request.permitNumber)}` : `Legacy Entry ${escapeHtml(request.sourceEntryId)}`}</h4>
            <p><strong>Disposition:</strong> ${escapeHtml(request.disposition)} | <strong>Submitted:</strong> ${escapeHtml(formatDate(request.submittedAt))} | <strong>Process:</strong> ${escapeHtml(formatDate(request.processDate))}</p>
            <p><strong>Work Type:</strong> ${escapeHtml(request.workType || "—")} | <strong>Address:</strong> ${escapeHtml(request.addressRaw || "—")}</p>
            <p><strong>Description:</strong> ${escapeHtml(request.description || "—")}</p>
            <p><strong>Notes:</strong> ${escapeHtml(request.notes || "—")}</p>
            <p><strong>Attachments:</strong></p>
            ${attachmentList}
          </div>
        `
      })
      .join("")

    const printableHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ACC Permit Lookup Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { margin: 0 0 8px 0; }
      h2 { margin: 20px 0 8px 0; }
      h4 { margin: 0 0 6px 0; }
      p { margin: 4px 0; font-size: 13px; }
      .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
      .muted { color: #6b7280; }
      @media print { a { color: #111827; text-decoration: none; } }
    </style>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          try { window.print(); } catch (_) {}
        }, 300);
      });
    </script>
  </head>
  <body>
    <h1>ACC Permit Lookup Report</h1>
    <p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
    <h2>${escapeHtml(detail.addressFull || "Property")}</h2>

    <h2>ACC History</h2>
    ${nativeAccRows || ""}
    ${legacyAccRows || ""}
    ${nativeAccRows || legacyAccRows ? "" : "<p>No ACC history available.</p>"}
  </body>
</html>`

    const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, "_blank")
    if (!win) {
      URL.revokeObjectURL(url)
      return
    }
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60_000)
  }

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,1fr) auto auto auto auto",
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
            ref={searchInputRef}
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                onSearch(event.currentTarget.value)
              }
            }}
            placeholder="Search by name, address, permit, request, or work type"
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
          value={String(pageSize)}
          onChange={(event) => {
            setPageSize(Number.parseInt(event.target.value, 10))
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

        <button type="button" className="btn btn-primary" onClick={() => onSearch()}>
          Search
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClear}
          disabled={!qInput.trim() && !q.trim() && page === 1}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchList}
          style={{ minWidth: "2.5rem", paddingInline: "0.6rem" }}
          aria-label="Refresh"
        >
          <RefreshCw style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>

      <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
        {total} property records
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
          display: "grid",
          gridTemplateColumns: "minmax(320px, 0.95fr) minmax(420px, 1.35fr)",
          gap: "0.9rem",
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "var(--radius-md)",
            background: "var(--pp-white)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.7rem 0.8rem", borderBottom: "1px solid var(--pp-slate-200)", fontWeight: 700 }}>
            Properties
          </div>
          <div style={{ maxHeight: "60vh", overflow: "auto" }}>
            {loading ? (
              <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>Loading...</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>No properties found.</p>
            ) : null}
            {items.map((item) => {
              const selected = item.id === selectedId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    display: "grid",
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    background: selected ? "var(--pp-slate-100)" : "var(--pp-white)",
                    borderBottom: "1px solid var(--pp-slate-100)",
                    padding: "0.75rem 0.8rem",
                    gap: "0.2rem",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ color: "var(--pp-navy-dark)" }}>{item.address}</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--pp-slate-600)" }}>
                    ACC History: {item.accHistoryCount} · Latest: {formatDate(item.latestAccSubmittedAt)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "var(--radius-md)",
            background: "var(--pp-white)",
            padding: "0.8rem",
          }}
        >
          {detailLoading ? <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>Loading property detail...</p> : null}
          {!detailLoading && !detail ? (
            <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>Select a property to view ACC permit history.</p>
          ) : null}
          {!detailLoading && detail ? (
            <div className="stack" style={{ gap: "0.8rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                  {detail.addressFull || selectedSummary?.address || "Property"}
                </h3>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-secondary" onClick={exportCsv}>
                  Export CSV
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportPdf}>
                  Export PDF
                </button>
              </div>

              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.65rem" }}>
                <strong style={{ color: "var(--pp-navy-dark)" }}>ACC History</strong>

                {!detail.nativeAccRequests.length && !detail.confirmedAccRequests.length ? (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--pp-slate-600)" }}>
                    No ACC history available.
                  </p>
                ) : (
                  <div className="stack" style={{ gap: "0.45rem", marginTop: "0.55rem" }}>
                    {detail.nativeAccRequests.map((request) => (
                      <div key={request.id} style={{ borderTop: "1px solid var(--pp-slate-100)", paddingTop: "0.4rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          <strong>Request:</strong> {request.requestNumber}
                          {request.permitNumber ? <> · <strong>Permit:</strong> {request.permitNumber}</> : null}
                          {" · "}
                          <strong>Type:</strong> {request.workType || request.title || "—"} · <strong>Submitted:</strong>{" "}
                          {formatDate(request.submittedAt)} · <strong>Status:</strong>{" "}
                          {nativeAccStatusLabel(request.status, request.finalDecision)}
                        </p>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>
                          {request.description || request.decisionNote || request.residentActionNote || "No additional description"}
                        </p>
                      </div>
                    ))}
                    {detail.confirmedAccRequests.map((request) => (
                      <div key={request.matchId} style={{ borderTop: "1px solid var(--pp-slate-100)", paddingTop: "0.4rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          <strong>Permit:</strong> {request.permitNumber || "—"} · <strong>Entry:</strong> {request.sourceEntryId} ·{" "}
                          <strong>Type:</strong> {request.workType || "—"} · <strong>Submitted:</strong> {formatDate(request.submittedAt)} ·{" "}
                          <strong>Disposition:</strong> {request.disposition}
                        </p>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>
                          {request.description || request.notes || "No additional description"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
          Page {page} of {Math.max(1, totalPages)}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Prev
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
