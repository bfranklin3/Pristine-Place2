"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, RefreshCw, Search } from "lucide-react"

interface Resident360ListItem {
  id: string
  address: string
  category: string
  primaryName: string
  secondaryName: string
  entryCode: string
  activeCredentialCount: number
  confirmedAccCount: number
  latestAccSubmittedAt: string | null
}

interface Resident360ListResponse {
  items: Resident360ListItem[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

interface Resident360Detail {
  id: string
  category: string | null
  addressFull: string | null
  entryCode: string | null
  comments: string | null
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
  credentials: Array<{
    id: string
    credentialType: string
    credentialLabel: string | null
    credentialValue: string
    status: string
  }>
  nativeAccRequests: Array<{
    id: string
    requestNumber: string
    submittedAt: string | null
    status: string
    finalDecision: string | null
    finalDecisionAt: string | null
    reviewCycle: number
    isVerified: boolean
    workType: string | null
    title: string | null
    description: string | null
    residentName: string | null
    residentAddress: string | null
    decisionNote: string | null
    residentActionNote: string | null
    attachments: Array<{
      id: string
      filename: string | null
      mimeType: string | null
      storageKey: string
      storageProvider: string
      scope: string | null
    }>
  }>
  confirmedAccRequests: Array<{
    matchId: string
    matchScore: number
    sourceEntryId: string
    permitNumber: string | null
    submittedAt: string | null
    processDate: string | null
    disposition: string
    workType: string | null
    ownerName: string | null
    ownerPhone: string | null
    ownerEmail: string | null
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

function personName(person: { firstName: string | null; lastName: string | null } | null): string {
  if (!person) return "—"
  return `${person.firstName || ""} ${person.lastName || ""}`.trim() || "—"
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
    .slice(0, 64) || "resident"
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

export function Resident360Table() {
  const [items, setItems] = useState<Resident360ListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Resident360Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qInput, setQInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/resident-360?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load resident list")
      }
      const json = (await res.json()) as Resident360ListResponse
      setItems(json.items || [])
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
      if (!selectedId && json.items?.length) setSelectedId(json.items[0].id)
      if (selectedId && !json.items?.some((x) => x.id === selectedId)) {
        setSelectedId(json.items?.[0]?.id || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resident list")
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
      const res = await fetch(`/api/resident-360/${residentProfileId}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load resident detail")
      }
      setDetail((await res.json()) as Resident360Detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resident detail")
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

  const onSearch = () => {
    setPage(1)
    setQ(qInput.trim())
  }

  const onClear = () => {
    setQInput("")
    setQ("")
    setPage(1)
  }

  const selectedSummary = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId])
  const exportBaseName = useMemo(() => {
    const base = detail?.addressFull || selectedSummary?.address || detail?.id || "resident-report"
    return slugifyFilePart(base)
  }, [detail?.addressFull, detail?.id, selectedSummary?.address])

  const exportCsv = () => {
    if (!detail) return
    const lines: string[] = []
    lines.push([csvEscape("Section"), csvEscape("Field"), csvEscape("Value")].join(","))

    const pushRow = (section: string, field: string, value: unknown) => {
      lines.push([csvEscape(section), csvEscape(field), csvEscape(value ?? "")].join(","))
    }

    pushRow("Resident", "Address", detail.addressFull || "—")
    pushRow("Resident", "Category", detail.category || "—")
    pushRow("Resident", "Entry Code", detail.entryCode || "—")
    pushRow("Resident", "Comments", detail.comments || "—")

    pushRow("Primary Contact", "Name", personName(detail.primary))
    pushRow("Primary Contact", "Phone", detail.primary?.phone || "—")
    pushRow("Primary Contact", "Email", detail.primary?.email || "—")

    pushRow("Secondary Contact", "Name", personName(detail.secondary))
    pushRow("Secondary Contact", "Phone", detail.secondary?.phone || "—")
    pushRow("Secondary Contact", "Email", detail.secondary?.email || "—")

    detail.credentials.forEach((c, idx) => {
      pushRow(`Credential ${idx + 1}`, "Type", c.credentialType)
      pushRow(`Credential ${idx + 1}`, "Label", c.credentialLabel || "")
      pushRow(`Credential ${idx + 1}`, "Value", c.credentialValue)
      pushRow(`Credential ${idx + 1}`, "Status", c.status)
    })

    detail.nativeAccRequests.forEach((r, idx) => {
      const section = `Native ACC Request ${idx + 1}`
      pushRow(section, "Request Number", r.requestNumber)
      pushRow(section, "Status", nativeAccStatusLabel(r.status, r.finalDecision))
      pushRow(section, "Work Type", r.workType || "")
      pushRow(section, "Title", r.title || "")
      pushRow(section, "Submitted", formatDate(r.submittedAt))
      pushRow(section, "Final Decision", r.finalDecision || "")
      pushRow(section, "Final Decision Date", formatDate(r.finalDecisionAt))
      pushRow(section, "Resident Name", r.residentName || "")
      pushRow(section, "Resident Address", r.residentAddress || "")
      pushRow(section, "Description", r.description || "")
      pushRow(section, "Decision Note", r.decisionNote || "")
      pushRow(section, "Resident Action Note", r.residentActionNote || "")
    })

    detail.confirmedAccRequests.forEach((r, idx) => {
      const section = `Legacy ACC Request ${idx + 1}`
      pushRow(section, "Permit Number", r.permitNumber || "")
      pushRow(section, "Source Entry", r.sourceEntryId)
      pushRow(section, "Disposition", r.disposition)
      pushRow(section, "Work Type", r.workType || "")
      pushRow(section, "Submitted", formatDate(r.submittedAt))
      pushRow(section, "Process Date", formatDate(r.processDate))
      pushRow(section, "Owner Name", r.ownerName || "")
      pushRow(section, "Owner Phone", r.ownerPhone || "")
      pushRow(section, "Owner Email", r.ownerEmail || "")
      pushRow(section, "Address", r.addressRaw || "")
      pushRow(section, "Description", r.description || "")
      pushRow(section, "Notes", r.notes || "")
      r.attachments.forEach((a, aIdx) => {
        pushRow(section, `Attachment ${aIdx + 1} Name`, a.filename || "")
        pushRow(section, `Attachment ${aIdx + 1} URL`, a.url)
      })
    })

    const csv = `${lines.join("\n")}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resident-360-${exportBaseName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    if (!detail) return

    const credentialRows = detail.credentials
      .map(
        (c) =>
          `<tr><td>${escapeHtml(c.credentialType)}${c.credentialLabel ? ` (${escapeHtml(c.credentialLabel)})` : ""}</td><td>${escapeHtml(c.credentialValue)}</td><td>${escapeHtml(c.status)}</td></tr>`,
      )
      .join("")

    const nativeAccRows = detail.nativeAccRequests
      .map((r) => {
        return `
          <div class="card">
            <h4>${escapeHtml(r.requestNumber)} · ${escapeHtml(r.workType || r.title || "Native ACC Request")}</h4>
            <p><strong>Status:</strong> ${escapeHtml(nativeAccStatusLabel(r.status, r.finalDecision))} | <strong>Submitted:</strong> ${escapeHtml(formatDate(r.submittedAt))}</p>
            <p><strong>Resident:</strong> ${escapeHtml(r.residentName || "—")} | <strong>Address:</strong> ${escapeHtml(r.residentAddress || "—")}</p>
            <p><strong>Description:</strong> ${escapeHtml(r.description || "—")}</p>
            <p><strong>Decision Note:</strong> ${escapeHtml(r.decisionNote || "—")}</p>
            <p><strong>Resident Action Note:</strong> ${escapeHtml(r.residentActionNote || "—")}</p>
          </div>
        `
      })
      .join("")

    const accRows = detail.confirmedAccRequests
      .map((r) => {
        const attachmentList =
          r.attachments.length > 0
            ? `<ul>${r.attachments
                .map(
                  (a) =>
                    `<li><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.filename || a.url)}</a></li>`,
                )
                .join("")}</ul>`
            : "—"
        return `
          <div class="card">
            <h4>Permit ${escapeHtml(r.permitNumber || "—")} · ${escapeHtml(r.workType || "—")}</h4>
            <p><strong>Disposition:</strong> ${escapeHtml(r.disposition)} | <strong>Submitted:</strong> ${escapeHtml(formatDate(r.submittedAt))} | <strong>Process:</strong> ${escapeHtml(formatDate(r.processDate))}</p>
            <p><strong>Owner:</strong> ${escapeHtml(r.ownerName || "—")} (${escapeHtml(r.ownerPhone || "—")} | ${escapeHtml(r.ownerEmail || "—")})</p>
            <p><strong>Address:</strong> ${escapeHtml(r.addressRaw || "—")}</p>
            <p><strong>Description:</strong> ${escapeHtml(r.description || "—")}</p>
            <p><strong>Notes:</strong> ${escapeHtml(r.notes || "—")}</p>
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
    <title>Resident 360 Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { margin: 0 0 8px 0; }
      h2 { margin: 20px 0 8px 0; }
      h4 { margin: 0 0 6px 0; }
      p { margin: 4px 0; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
    <h1>Resident 360 Report</h1>
    <p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
    <h2>${escapeHtml(detail.addressFull || "Resident")}</h2>
    <p><strong>Category:</strong> ${escapeHtml(detail.category || "—")} | <strong>Entry Code:</strong> ${escapeHtml(detail.entryCode || "—")}</p>
    <p><strong>Comments:</strong> ${escapeHtml(detail.comments || "—")}</p>

    <div class="grid">
      <div class="card">
        <h4>Primary Contact</h4>
        <p>${escapeHtml(personName(detail.primary))}</p>
        <p>${escapeHtml(detail.primary?.phone || "—")}</p>
        <p>${escapeHtml(detail.primary?.email || "—")}</p>
      </div>
      <div class="card">
        <h4>Secondary Contact</h4>
        <p>${escapeHtml(personName(detail.secondary))}</p>
        <p>${escapeHtml(detail.secondary?.phone || "—")}</p>
        <p>${escapeHtml(detail.secondary?.email || "—")}</p>
      </div>
    </div>

    <h2>Active Gate Credentials</h2>
    <table>
      <thead><tr><th>Type</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>${credentialRows || '<tr><td colspan="3">No credentials</td></tr>'}</tbody>
    </table>

    <h2>ACC History</h2>
    ${nativeAccRows || ""}
    ${accRows || ""}
    ${nativeAccRows || accRows ? "" : "<p>No ACC history available.</p>"}
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
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onSearch()
              }
            }}
            placeholder="Search by name, address, permit..."
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

        <button type="button" className="btn btn-primary" onClick={onSearch}>
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
        {total} resident records
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
            Residents
          </div>
          <div style={{ maxHeight: "60vh", overflow: "auto" }}>
            {loading ? (
              <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>Loading...</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p style={{ margin: 0, padding: "0.8rem", color: "var(--pp-slate-600)" }}>No residents found.</p>
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
                  <span style={{ fontSize: "0.85rem", color: "var(--pp-slate-700)" }}>Primary: {item.primaryName}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--pp-slate-600)" }}>
                    ACC: {item.confirmedAccCount} · Credentials: {item.activeCredentialCount}
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
          {detailLoading ? <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>Loading resident detail...</p> : null}
          {!detailLoading && !detail ? (
            <p style={{ margin: 0, color: "var(--pp-slate-600)" }}>Select a resident to view details.</p>
          ) : null}
          {!detailLoading && detail ? (
            <div className="stack" style={{ gap: "0.8rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                  {detail.addressFull || selectedSummary?.address || "Resident"}
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", color: "var(--pp-slate-600)", fontSize: "0.9rem" }}>
                  Category: {detail.category || "—"} · Entry code: {detail.entryCode || "—"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-secondary" onClick={exportCsv}>
                  Export CSV
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportPdf}>
                  Export PDF
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                  gap: "0.7rem",
                }}
              >
                <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.65rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Primary Contact</strong>
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem" }}>{personName(detail.primary)}</p>
                  <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-600)" }}>{detail.primary?.phone || "—"}</p>
                  <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-600)" }}>{detail.primary?.email || "—"}</p>
                </div>
                <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.65rem" }}>
                  <strong style={{ color: "var(--pp-navy-dark)" }}>Secondary Contact</strong>
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem" }}>{personName(detail.secondary)}</p>
                  <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-600)" }}>{detail.secondary?.phone || "—"}</p>
                  <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-600)" }}>{detail.secondary?.email || "—"}</p>
                </div>
              </div>

              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.65rem" }}>
                <strong style={{ color: "var(--pp-navy-dark)" }}>Active Gate Credentials</strong>
                {detail.credentials.length ? (
                  <ul style={{ margin: "0.45rem 0 0 1rem", padding: 0 }}>
                    {detail.credentials.filter((c) => c.status === "active").map((c) => (
                      <li key={c.id} style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                        {c.credentialType}
                        {c.credentialLabel ? ` (${c.credentialLabel})` : ""}: {c.credentialValue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--pp-slate-600)" }}>No active credentials.</p>
                )}
              </div>

              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-sm)", padding: "0.65rem" }}>
                <strong style={{ color: "var(--pp-navy-dark)" }}>ACC History</strong>

                {!detail.nativeAccRequests.length && !detail.confirmedAccRequests.length ? (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--pp-slate-600)" }}>
                    No ACC history available.
                  </p>
                ) : (
                  <div className="stack" style={{ gap: "0.45rem", marginTop: "0.55rem" }}>
                    {detail.nativeAccRequests.map((r) => (
                      <div key={r.id} style={{ borderTop: "1px solid var(--pp-slate-100)", paddingTop: "0.4rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          <strong>Request:</strong> {r.requestNumber} · <strong>Type:</strong> {r.workType || r.title || "—"} ·{" "}
                          <strong>Submitted:</strong> {formatDate(r.submittedAt)} · <strong>Status:</strong> {nativeAccStatusLabel(r.status, r.finalDecision)}
                        </p>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>
                          {r.description || r.decisionNote || r.residentActionNote || "No additional description"}
                        </p>
                      </div>
                    ))}
                    {detail.confirmedAccRequests.map((r) => (
                      <div key={r.matchId} style={{ borderTop: "1px solid var(--pp-slate-100)", paddingTop: "0.4rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          <strong>Permit:</strong> {r.permitNumber || "—"} · <strong>Type:</strong> {r.workType || "—"} ·{" "}
                          <strong>Submitted:</strong> {formatDate(r.submittedAt)} · <strong>Disposition:</strong> {r.disposition}
                        </p>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--pp-slate-700)" }}>
                          {r.description || r.notes || "No additional description"}
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
