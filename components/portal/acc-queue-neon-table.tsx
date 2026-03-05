"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle, Clock, FileText, RefreshCw, Search, XCircle } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

type Disposition = "pending" | "approved" | "rejected" | "conditional" | "duplicate" | "canceled"
type DispositionFilter = "all" | Disposition
type ModalMode = "view" | "edit"

interface QueueEntry {
  id: string
  sourceEntryId: string
  permitNumber: string | null
  submittedAt: string | null
  processDate: string | null
  disposition: Disposition
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
  addressRaw: string | null
  workType: string | null
  description: string | null
  notes: string | null
  updatedAt: string
}

interface QueueResponse {
  entries: QueueEntry[]
  total: number
  totalPages: number
  page: number
  perPage: number
  counts: Record<string, number>
}

const FILTERS: Array<{ key: DispositionFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "conditional", label: "Conditional" },
  { key: "duplicate", label: "Duplicate" },
  { key: "canceled", label: "Canceled" },
]

const EDIT_DISPOSITION_OPTIONS: Array<{ value: Disposition; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected / Denied" },
  { value: "conditional", label: "Conditional" },
  { value: "duplicate", label: "Duplicate" },
  { value: "canceled", label: "Canceled" },
]

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

function formatDateOnly(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

function toYmd(value: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function badgeStyle(disposition: Disposition) {
  if (disposition === "approved") return { bg: "#d1fae5", color: "#065f46", icon: CheckCircle, label: "Approved" }
  if (disposition === "rejected") return { bg: "#fee2e2", color: "#991b1b", icon: XCircle, label: "Rejected" }
  if (disposition === "conditional") return { bg: "#fef3c7", color: "#92400e", icon: Clock, label: "Conditional" }
  if (disposition === "duplicate") return { bg: "#e0e7ff", color: "#3730a3", icon: FileText, label: "Duplicate" }
  if (disposition === "canceled") return { bg: "#f3f4f6", color: "#4b5563", icon: XCircle, label: "Canceled" }
  return { bg: "#dbeafe", color: "#1e3a8a", icon: Clock, label: "Pending" }
}

function StatusBadge({ disposition }: { disposition: Disposition }) {
  const style = badgeStyle(disposition)
  const Icon = style.icon
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "0.2rem 0.65rem",
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon style={{ width: "0.75rem", height: "0.75rem" }} />
      {style.label}
    </span>
  )
}

export function AccQueueNeonTable() {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<DispositionFilter>("all")
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const [selected, setSelected] = useState<QueueEntry | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>("view")
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [editPermitNumber, setEditPermitNumber] = useState("")
  const [editDisposition, setEditDisposition] = useState<Disposition>("pending")
  const [editProcessDate, setEditProcessDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editNotes, setEditNotes] = useState("")

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("disposition", statusFilter)
      params.set("page", String(currentPage))
      params.set("per_page", String(pageSize))
      if (query.trim()) params.set("q", query.trim())
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/acc/queue?${params.toString()}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as QueueResponse & { error?: string; detail?: string }
      if (!res.ok) {
        throw new Error(body.error || body.detail || "Failed to load ACC queue")
      }

      setEntries(body.entries || [])
      setTotal(body.total || 0)
      setTotalPages(Math.max(1, body.totalPages || 1))
      setCounts(body.counts || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ACC queue")
    } finally {
      setLoading(false)
    }
  }, [currentPage, endDate, pageSize, query, startDate, statusFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(total, currentPage * pageSize)

  const summary = useMemo(
    () => [
      { label: "Pending", value: counts.pending || 0 },
      { label: "Approved", value: counts.approved || 0 },
      { label: "Rejected", value: counts.rejected || 0 },
      { label: "Conditional", value: counts.conditional || 0 },
    ],
    [counts],
  )

  const resetFilters = () => {
    setStatusFilter("all")
    setQueryInput("")
    setQuery("")
    setStartDate("")
    setEndDate("")
    setPageSize(25)
    setCurrentPage(1)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    setQuery(queryInput)
  }

  const openEntry = async (id: string, mode: ModalMode) => {
    setModalMode(mode)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await fetch(`/api/acc/queue/${id}`, { cache: "no-store" })
      const body = (await res.json().catch(() => ({}))) as { entry?: QueueEntry; error?: string; detail?: string }
      if (!res.ok || !body.entry) {
        throw new Error(body.error || body.detail || "Failed to load queue entry")
      }
      setSelected(body.entry)
      setEditPermitNumber(body.entry.permitNumber || "")
      setEditDisposition(body.entry.disposition)
      setEditProcessDate(toYmd(body.entry.processDate))
      setEditDescription(body.entry.description || "")
      setEditNotes(body.entry.notes || "")
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load queue entry")
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setSelected(null)
    setDetailError(null)
  }

  const saveEntry = async () => {
    if (!selected) return
    setSaving(true)
    setDetailError(null)
    try {
      const res = await fetch(`/api/acc/queue/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permitNumber: editPermitNumber,
          disposition: editDisposition,
          processDate: editProcessDate,
          description: editDescription,
          notes: editNotes,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { entry?: QueueEntry; error?: string; detail?: string }
      if (!res.ok || !body.entry) {
        throw new Error(body.error || body.detail || "Save failed")
      }
      setSelected(body.entry)
      await fetchEntries()
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--space-m)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))", gap: "0.55rem" }}>
        {summary.map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid var(--pp-slate-200)",
              borderRadius: "var(--radius-sm)",
              padding: "0.55rem 0.65rem",
              background: "var(--pp-slate-50)",
            }}
          >
            <div className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: "0.6rem" }}>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatusFilter(f.key)
                setCurrentPage(1)
              }}
              style={{
                borderRadius: "999px",
                border: statusFilter === f.key ? "none" : "1.5px solid var(--pp-slate-200)",
                background: statusFilter === f.key ? "var(--pp-navy-dark)" : "var(--pp-white)",
                color: statusFilter === f.key ? "var(--pp-white)" : "var(--pp-slate-700)",
                padding: "0.42rem 0.75rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="acc-controls-grid" style={{ display: "grid", gridTemplateColumns: "minmax(16rem, 1fr) 10rem 10rem auto auto", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: "0.85rem", height: "0.85rem", color: "var(--pp-slate-400)" }} />
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search permit, owner, address..."
              style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.5rem 0.6rem 0.5rem 1.9rem" }}
            />
          </div>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1) }} style={{ borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.5rem" }} />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1) }} style={{ borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.5rem" }} />
          <button type="button" onClick={handleSearch} className="btn btn-primary">Search</button>
          <button type="button" onClick={resetFilters} className="btn btn-secondary">Reset</button>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.7rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid #fecaca",
            background: "#fef2f2",
          }}
        >
          <AlertCircle style={{ width: "1rem", height: "1rem", color: "#dc2626", marginTop: "0.15rem" }} />
          <div>
            <div style={{ fontWeight: 700, color: "#b91c1c" }}>Unable to load ACC queue</div>
            <div className="text-fluid-sm" style={{ color: "#991b1b" }}>{error}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
          Showing {pageStart}-{pageEnd} of {total}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>Rows</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }} style={{ borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.5rem" }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button type="button" onClick={fetchEntries} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <RefreshCw style={{ width: "0.85rem", height: "0.85rem" }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
        <table className="acc-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "72rem" }}>
          <thead>
            <tr style={{ background: "var(--pp-navy-dark)" }}>
              {[
                "Permit / ID",
                "Submitted",
                "Applicant",
                "Address",
                "Description",
                "Work Type",
                "Disposition",
                "Process Date",
                "Actions",
              ].map((label) => (
                <th
                  key={label}
                  className={
                    label === "Submitted"
                      ? "acc-col-submitted"
                      : label === "Applicant"
                        ? "acc-col-applicant"
                        : label === "Address"
                          ? "acc-col-address"
                      : label === "Description"
                        ? "acc-col-description"
                        : label === "Work Type"
                          ? "acc-col-worktype"
                          : label === "Disposition"
                            ? "acc-col-status"
                            : label === "Process Date"
                              ? "acc-col-process"
                              : undefined
                  }
                  data-acc-cell="true"
                  style={{ textAlign: "left", padding: "0.62rem 0.8rem", color: "var(--pp-gold-light)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "1rem", textAlign: "center", color: "var(--pp-slate-500)" }}>Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "1rem", textAlign: "center", color: "var(--pp-slate-500)" }}>No matching ACC requests found.</td></tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} style={{ borderTop: "1px solid var(--pp-slate-100)", background: index % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)" }}>
                  <td className="acc-col-permitid" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)", fontFamily: "monospace", fontSize: "0.8rem" }}>{entry.permitNumber || "—"}</div>
                    <div style={{ color: "var(--pp-slate-500)", fontSize: "0.76rem", fontFamily: "monospace" }}>#{entry.sourceEntryId}</div>
                  </td>
                  <td className="acc-col-submitted" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem", color: "var(--pp-slate-600)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDateOnly(entry.submittedAt)}</td>
                  <td className="acc-col-applicant" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem" }}>
                    <div className="acc-applicant-text" style={{ fontWeight: 600, color: "var(--pp-navy-dark)", fontSize: "0.82rem" }}>{entry.ownerName || "—"}</div>
                    <div style={{ color: "var(--pp-slate-500)", fontSize: "0.75rem" }}>{entry.ownerEmail || "—"}</div>
                  </td>
                  <td className="acc-col-address" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem", color: "var(--pp-slate-700)", fontSize: "0.8rem" }}>{entry.addressRaw || "—"}</td>
                  <td className="acc-col-description" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem", color: "var(--pp-slate-600)", maxWidth: "18rem" }}>
                    <span
                      className="acc-description-text"
                      style={{
                        fontSize: "0.8rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {entry.description || "—"}
                    </span>
                  </td>
                  <td className="acc-col-worktype" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem", color: "var(--pp-slate-700)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{entry.workType || "—"}</td>
                  <td className="acc-col-status" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem" }}><StatusBadge disposition={entry.disposition} /></td>
                  <td className="acc-col-process" data-acc-cell="true" style={{ padding: "0.55rem 0.7rem", color: "var(--pp-slate-700)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDateOnly(entry.processDate)}</td>
                  <td data-acc-cell="true" style={{ padding: "0.55rem 0.7rem" }}>
                    <div className="acc-actions-stack" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => openEntry(entry.id, "view")}
                        style={{
                          padding: "0.35rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1.5px solid var(--pp-slate-200)",
                          background: "var(--pp-white)",
                          color: "var(--pp-slate-700)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEntry(entry.id, "edit")}
                        style={{
                          padding: "0.35rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: "var(--pp-navy-dark)",
                          color: "var(--pp-white)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</button>
        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>Page {currentPage} of {totalPages}</div>
        <button type="button" className="btn btn-secondary" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
      </div>

      <Dialog.Root open={!!selected} onOpenChange={(open) => { if (!open) closeModal() }}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.42)", zIndex: 70 }} />
          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(52rem, 94vw)",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "var(--pp-white)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--pp-slate-200)",
              padding: "1rem",
              zIndex: 71,
            }}
          >
            <Dialog.Title style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
              ACC Request Detail ({modalMode === "view" ? "View" : "Edit"})
            </Dialog.Title>

            {detailLoading ? (
              <div style={{ padding: "1rem 0", color: "var(--pp-slate-600)" }}>Loading…</div>
            ) : selected ? (
              <div className="stack" style={{ gap: "0.75rem", marginTop: "0.75rem" }}>
                {detailError && <div style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{detailError}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <label>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Permit Number</div>
                    <input value={editPermitNumber} onChange={(e) => setEditPermitNumber(e.target.value)} readOnly={modalMode === "view"} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.45rem", background: modalMode === "view" ? "var(--pp-slate-50)" : "var(--pp-white)" }} />
                  </label>
                  <label>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Disposition</div>
                    <select value={editDisposition} onChange={(e) => setEditDisposition(e.target.value as Disposition)} disabled={modalMode === "view"} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.45rem", background: modalMode === "view" ? "var(--pp-slate-50)" : "var(--pp-white)" }}>
                      {EDIT_DISPOSITION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Process Date</div>
                    <input type="date" value={editProcessDate} onChange={(e) => setEditProcessDate(e.target.value)} readOnly={modalMode === "view"} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.45rem", background: modalMode === "view" ? "var(--pp-slate-50)" : "var(--pp-white)" }} />
                  </label>
                  <div>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Submitted</div>
                    <div style={{ color: "var(--pp-slate-700)", paddingTop: "0.4rem" }}>{formatDate(selected.submittedAt)}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Owner</div>
                    <div>{selected.ownerName || "—"}</div>
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>{selected.ownerEmail || "—"}</div>
                  </div>
                  <div>
                    <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Address</div>
                    <div>{selected.addressRaw || "—"}</div>
                  </div>
                </div>

                <label>
                  <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Description</div>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} readOnly={modalMode === "view"} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.45rem", background: modalMode === "view" ? "var(--pp-slate-50)" : "var(--pp-white)" }} />
                </label>

                <label>
                  <div className="text-fluid-sm" style={{ fontWeight: 700 }}>Notes</div>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} readOnly={modalMode === "view"} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.45rem", background: modalMode === "view" ? "var(--pp-slate-50)" : "var(--pp-white)" }} />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
                  {modalMode === "edit" && (
                    <button type="button" className="btn btn-primary" onClick={saveEntry} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  )}
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style jsx>{`
        .acc-description-text {
          -webkit-line-clamp: 2;
        }

        .acc-applicant-text {
          display: block;
        }

        @media (max-width: 1180px) {
          .acc-description-text {
            -webkit-line-clamp: 3;
          }
        }

        @media (max-width: 1220px) {
          .acc-col-submitted {
            display: none;
          }

          .acc-col-applicant,
          .acc-col-address {
            max-width: 11rem;
            width: 11rem;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 1170px) {
          .acc-col-process {
            display: none;
          }

          .acc-col-description {
            display: none;
          }

          .acc-col-permitid {
            max-width: 7.25rem;
            width: 7.25rem;
          }

          .acc-col-applicant {
            max-width: 9.25rem;
            width: 9.25rem;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .acc-col-worktype,
          .acc-col-status {
            max-width: 7.5rem;
            width: 7.5rem;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 820px) {
          .acc-col-worktype {
            display: none;
          }
        }

        @media (max-width: 725px) {
          .acc-col-status {
            display: none;
          }

          .acc-table {
            min-width: 0;
          }

          .acc-actions-stack {
            flex-direction: column;
            align-items: flex-start;
            flex-wrap: nowrap;
          }

          .acc-actions-stack button {
            width: auto;
            max-width: 100%;
            white-space: nowrap;
            padding: 0.3rem 0.5rem !important;
            font-size: 0.74rem !important;
          }
        }

        @media (max-width: 740px) {
          .acc-table {
            min-width: 34rem;
          }

          .acc-table [data-acc-cell="true"] {
            padding-left: 0.55rem !important;
            padding-right: 0.55rem !important;
          }
        }

        @media (max-width: 640px) {
          .acc-controls-grid {
            grid-template-columns: 1fr;
          }

          .acc-table {
            min-width: 0;
          }

          .acc-table [data-acc-cell="true"] {
            padding-left: 0.45rem !important;
            padding-right: 0.45rem !important;
          }

          .acc-applicant-text {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            max-width: 9.5rem;
            line-height: 1.25;
          }

          .acc-actions-stack {
            flex-direction: column;
            align-items: flex-start;
            flex-wrap: nowrap;
          }

          .acc-actions-stack button {
            width: auto;
            max-width: 100%;
            white-space: nowrap;
            padding: 0.3rem 0.5rem !important;
            font-size: 0.74rem !important;
          }
        }

        @media (max-width: 545px) {
          .acc-col-permitid {
            max-width: 5.8rem;
            width: 5.8rem;
          }

          .acc-col-applicant {
            max-width: 8rem;
            width: 8rem;
          }

          .acc-col-permitid,
          .acc-col-permitid div {
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        }
      `}</style>
    </div>
  )
}
