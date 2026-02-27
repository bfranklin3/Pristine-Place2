"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, KeyRound, Pencil, RefreshCw, Search, X } from "lucide-react"

interface WpAccessItem {
  id: string
  addressFull: string
  residentCategory: string
  entryCode: string
  comments: string
  primaryName: string
  primaryMeta: string
  secondaryName: string
  secondaryMeta: string
  phase: string
  addressNumber: string
  streetName: string
  primaryFirstName: string
  primaryLastName: string
  primaryPhone: string
  secondaryFirstName: string
  secondaryLastName: string
  secondaryPhone: string
  tertiaryPhone: string
  dirA: string
  dirB: string
  dirC: string
  includeInDirectory: boolean
  confidentialPhone: boolean
  residentCategoryKey: "owner" | "renter" | "vendor" | ""
}

interface EditFormState {
  residentCategory: string
  includeInDirectory: boolean
  confidentialPhone: boolean
  phase: string
  addressNumber: string
  streetName: string
  addressFull: string
  entryCode: string
  comments: string
  primaryFirstName: string
  primaryLastName: string
  primaryPhone: string
  secondaryFirstName: string
  secondaryLastName: string
  secondaryPhone: string
  tertiaryPhone: string
  dirA: string
  dirB: string
  dirC: string
}

const emptyForm: EditFormState = {
  residentCategory: "",
  includeInDirectory: false,
  confidentialPhone: false,
  phase: "",
  addressNumber: "",
  streetName: "",
  addressFull: "",
  entryCode: "",
  comments: "",
  primaryFirstName: "",
  primaryLastName: "",
  primaryPhone: "",
  secondaryFirstName: "",
  secondaryLastName: "",
  secondaryPhone: "",
  tertiaryPhone: "",
  dirA: "",
  dirB: "",
  dirC: "",
}

function getString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number") return String(value)
  }
  return ""
}

function asBoolYes(value: string): boolean {
  return value.trim().toLowerCase() === "yes"
}

function buildName(first: string, last: string): string {
  const full = `${first} ${last}`.trim()
  return full || ""
}

function normalizeCategoryKey(value: string): "owner" | "renter" | "vendor" | "" {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return ""
  if (normalized.includes("owner")) return "owner"
  if (normalized.includes("rent")) return "renter"
  if (normalized.includes("vendor") || normalized.includes("service")) return "vendor"
  return ""
}

function normalizeRow(row: Record<string, unknown>, index: number): WpAccessItem {
  const addressNumber = getString(row, ["37", "address_number", "addressNumber"])
  const streetName = getString(row, ["38", "street_name", "streetName"])
  const computedAddress = [addressNumber, streetName].filter(Boolean).join(" ").trim()

  const primaryFirstName = getString(row, ["7", "First Name - Resident A", "First Name A", "First_Name_A", "first_name_a"])
  const primaryLastName = getString(row, [
    "3",
    "Last Name A or Company Name",
    "Last Name - Resident A",
    "Last Name A",
    "Last_Name_A",
    "last_name_a",
    "Company",
  ])
  const primaryPhone = getString(row, ["8", "Phone_A", "Phone A", "phone_a", "phoneA"])

  const secondaryFirstName = getString(row, [
    "10",
    "First Name - Resident B",
    "First Name B",
    "First_Name_B",
    "first_name_b",
  ])
  const secondaryLastName = getString(row, ["11", "Last Name - Resident B", "Last Name B", "Last_Name_B", "last_name_b"])
  const secondaryPhone = getString(row, ["30", "Phone_B", "Phone B", "phone_b", "phoneB"])

  const tertiaryPhone = getString(row, ["40", "Phone_C", "Phone C", "phone_c", "phoneC"])
  const dirA = getString(row, ["29", "DIR_A", "dir_a"])
  const dirB = getString(row, ["33", "DIR_B", "dir_b"])
  const dirC = getString(row, ["32", "DIR_C", "dir_c"])

  const addressFull =
    getString(row, ["Address & Street", "Address and Street", "Address", "address", "address_full", "addressFull"]) ||
    computedAddress
  const entryCode = getString(row, ["35", "ENT", "ent", "Entry Code", "entry_code", "entryCode"])
  const comments = getString(row, ["17", "Comments", "comments", "Notes", "notes"])
  const residentCategory = getString(row, ["39", "Resident Category", "Category", "resident_category", "residentCategory"])
  const phase = getString(row, ["1", "Phase", "phase"])
  const includeInDirectory = asBoolYes(getString(row, ["23.1", "include_in_directory"]))
  const confidentialPhone = asBoolYes(getString(row, ["25.1", "confidential_phone"]))
  const rawId = getString(row, ["id", "ID", "entry_id"])

  return {
    id: rawId || `${addressFull || "wp-row"}-${index}`,
    addressFull: addressFull || "—",
    residentCategory: residentCategory || "—",
    entryCode: entryCode || "—",
    comments: comments || "—",
    primaryName: buildName(primaryFirstName, primaryLastName) || "—",
    primaryMeta: primaryPhone || "—",
    secondaryName: buildName(secondaryFirstName, secondaryLastName) || "—",
    secondaryMeta: secondaryPhone || "—",
    phase,
    addressNumber,
    streetName,
    primaryFirstName,
    primaryLastName,
    primaryPhone,
    secondaryFirstName,
    secondaryLastName,
    secondaryPhone,
    tertiaryPhone,
    dirA,
    dirB,
    dirC,
    includeInDirectory,
    confidentialPhone,
    residentCategoryKey: normalizeCategoryKey(residentCategory),
  }
}

export function WpAccessManagementTable() {
  const [allRows, setAllRows] = useState<WpAccessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [errorUpstream, setErrorUpstream] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [viewportWidth, setViewportWidth] = useState<number>(1400)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditFormState>(emptyForm)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    setErrorDetail(null)
    setErrorUpstream(null)
    const res = await fetch("/api/wp-access-report", { cache: "no-store" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || "Failed to load WordPress access report")
      setErrorStatus(typeof body?.status === "number" ? body.status : res.status)
      setErrorDetail(typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail || ""))
      setErrorUpstream(typeof body?.upstream === "string" ? body.upstream : null)
      setLoading(false)
      return
    }
    const json = (await res.json()) as {
      rows?: Record<string, unknown>[]
    }
    const rows = Array.isArray(json.rows) ? json.rows : []
    setAllRows(rows.map((row, idx) => normalizeRow(row, idx)))
    setLoading(false)
  }

  useEffect(() => {
    fetchRows()
  }, [])

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const showSecondaryContact = viewportWidth >= 1100
  const showGateCode = viewportWidth >= 900
  const showCategory = viewportWidth >= 840
  const showComments = viewportWidth >= 830
  const showEditLabel = viewportWidth >= 635

  const columns = [
    "Address",
    "Primary Contact",
    ...(showSecondaryContact ? ["Secondary Contact"] : []),
    ...(showCategory ? ["Category"] : []),
    ...(showGateCode ? ["Gate Code"] : []),
    ...(showComments ? ["Comments"] : []),
    "Edit",
  ]
  const categoryButtons = [
    { key: "", label: "All" },
    { key: "Owner", label: "Owner" },
    { key: "Renter", label: "Renter" },
    { key: "Vendor", label: "Vendor" },
  ]

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((row) => {
      const filterKey = normalizeCategoryKey(categoryFilter)
      const categoryMatch = !filterKey || row.residentCategoryKey === filterKey
      if (!categoryMatch) return false
      if (!q) return true
      const haystack = [
        row.addressFull,
        row.residentCategory,
        row.entryCode,
        row.comments,
        row.primaryName,
        row.primaryMeta,
        row.secondaryName,
        row.secondaryMeta,
        row.dirA,
        row.dirB,
        row.dirC,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [allRows, categoryFilter, query])

  const total = filteredRows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setPage(1)
  }, [query, categoryFilter, pageSize])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(searchInput.trim())
  }

  const beginEdit = (row: WpAccessItem) => {
    setActionError(null)
    setEditingId(row.id)
    setForm({
      residentCategory: row.residentCategory === "—" ? "" : row.residentCategory,
      includeInDirectory: row.includeInDirectory,
      confidentialPhone: row.confidentialPhone,
      phase: row.phase,
      addressNumber: row.addressNumber,
      streetName: row.streetName,
      addressFull: row.addressFull === "—" ? "" : row.addressFull,
      entryCode: row.entryCode === "—" ? "" : row.entryCode,
      comments: row.comments === "—" ? "" : row.comments,
      primaryFirstName: row.primaryFirstName,
      primaryLastName: row.primaryLastName,
      primaryPhone: row.primaryPhone,
      secondaryFirstName: row.secondaryFirstName,
      secondaryLastName: row.secondaryLastName,
      secondaryPhone: row.secondaryPhone,
      tertiaryPhone: row.tertiaryPhone,
      dirA: row.dirA,
      dirB: row.dirB,
      dirC: row.dirC,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSavingId(null)
    setActionError(null)
  }

  const updateField = (field: keyof EditFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateBoolField = (field: "includeInDirectory" | "confidentialPhone", value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveEdit = async (entryId: string) => {
    setActionError(null)
    setSavingId(entryId)
    const payload: Record<string, string> = {
      "3": form.primaryLastName || "",
      "7": form.primaryFirstName || "",
      "8": form.primaryPhone || "",
      "10": form.secondaryFirstName || "",
      "11": form.secondaryLastName || "",
      "30": form.secondaryPhone || "",
      "40": form.tertiaryPhone || "",
      "39": form.residentCategory || "",
      "17": form.comments || "",
      "1": form.phase || "",
      "37": form.addressNumber || "",
      "38": form.streetName || "",
      "35": form.entryCode || "",
      "29": form.dirA || "",
      "33": form.dirB || "",
      "32": form.dirC || "",
      "23.1": form.includeInDirectory ? "Yes" : "",
      "25.1": form.confidentialPhone ? "Yes" : "",
    }

    const res = await fetch(`/api/wp-access-report/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const detail = typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail || "")
      setActionError(`${body?.error || "Failed to save WordPress entry"}${detail ? ` — ${detail}` : ""}`)
      setSavingId(null)
      return
    }

    await fetchRows()
    setSavingId(null)
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-l)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-m)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <KeyRound style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-400)" }} />
          <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
            {loading ? "Loading…" : `${total} record${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <form onSubmit={onSubmit} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "0.55rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "0.85rem",
                    height: "0.85rem",
                    color: "var(--pp-slate-400)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search report…"
                  style={{
                    padding: "0.5rem 0.7rem 0.5rem 1.9rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--pp-slate-300)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "0.5rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "var(--pp-navy-dark)",
                  color: "var(--pp-white)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </form>

            <button
              type="button"
              onClick={fetchRows}
              aria-label="Refresh report"
              style={{
                padding: "0.5rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--pp-slate-300)",
                background: "var(--pp-white)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw style={{ width: "0.85rem", height: "0.85rem", color: "var(--pp-slate-500)" }} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.45rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
              {categoryButtons.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  style={{
                    padding: "0.42rem 0.95rem",
                    borderRadius: "999px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: categoryFilter === cat.key ? "none" : "1.5px solid var(--pp-slate-200)",
                    background: categoryFilter === cat.key ? "var(--pp-navy-dark)" : "var(--pp-white)",
                    color: categoryFilter === cat.key ? "var(--pp-white)" : "var(--pp-slate-600)",
                    boxShadow: categoryFilter === cat.key ? "0 2px 8px rgba(58,90,64,0.25)" : "none",
                  }}
                  aria-pressed={categoryFilter === cat.key}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginLeft: "0.25rem" }}>
              <label className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }} htmlFor="wp-access-page-size">
                Rows:
              </label>
              <select
                id="wp-access-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  padding: "0.4rem 0.55rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  fontSize: "0.85rem",
                  color: "var(--pp-slate-700)",
                  background: "var(--pp-white)",
                }}
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.7rem",
            padding: "var(--space-m)",
            borderRadius: "var(--radius-md)",
            background: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <AlertCircle style={{ width: "1.1rem", height: "1.1rem", color: "#dc2626", marginTop: "0.1rem" }} />
          <div>
            <p className="text-fluid-sm font-semibold" style={{ color: "#dc2626" }}>
              Unable to load WordPress access report
            </p>
            <p className="text-fluid-sm" style={{ color: "#b91c1c" }}>
              {error}
            </p>
            {errorStatus !== null ? (
              <p className="text-fluid-xs" style={{ color: "#9a3412", marginTop: "0.3rem" }}>
                Status: {errorStatus}
              </p>
            ) : null}
            {errorDetail ? (
              <p
                className="text-fluid-xs"
                style={{ color: "#9a3412", marginTop: "0.3rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                Detail: {errorDetail}
              </p>
            ) : null}
            {errorUpstream ? (
              <p
                className="text-fluid-xs"
                style={{ color: "#7c2d12", marginTop: "0.3rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                Upstream: {errorUpstream}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 0.8rem",
            borderRadius: "var(--radius-sm)",
            background: "#fff7ed",
            border: "1px solid #fdba74",
          }}
        >
          <AlertCircle style={{ width: "0.95rem", height: "0.95rem", color: "#c2410c" }} />
          <span className="text-fluid-sm" style={{ color: "#9a3412" }}>
            {actionError}
          </span>
        </div>
      )}

      {!error && (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: showSecondaryContact ? "66rem" : showComments ? "52rem" : "40rem",
            }}
          >
            <thead>
              <tr style={{ background: "var(--pp-navy-dark)" }}>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{
                      padding: "0.65rem 0.9rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--pp-gold-light)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "2.5rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
                      Loading report…
                    </p>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "2.5rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
                      No records found.
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      background: i % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                      borderBottom: "1px solid var(--pp-slate-100)",
                    }}
                  >
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                      <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-800)" }}>
                        {row.addressFull}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                      <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", whiteSpace: "nowrap" }}>
                        {row.primaryName}
                      </div>
                      <div className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                        {row.primaryMeta}
                      </div>
                    </td>
                    {showSecondaryContact && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", whiteSpace: "nowrap" }}>
                          {row.secondaryName}
                        </div>
                        <div className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                          {row.secondaryMeta}
                        </div>
                      </td>
                    )}
                    {showCategory && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {row.residentCategory}
                        </span>
                      </td>
                    )}
                    {showGateCode && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {row.entryCode}
                        </span>
                      </td>
                    )}
                    {showComments && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", maxWidth: "20rem" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {row.comments}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => beginEdit(row)}
                        style={{
                          padding: "0.28rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--pp-slate-300)",
                          background: "var(--pp-white)",
                          color: "var(--pp-slate-700)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil style={{ width: "0.75rem", height: "0.75rem" }} />
                        {showEditLabel ? "Edit" : null}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12, 23, 18, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "var(--pp-white)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--pp-slate-200)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
              padding: "1rem 1rem 1.2rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Edit WordPress Access Profile</h3>
                <p className="text-fluid-sm" style={{ margin: "0.2rem 0 0", color: "var(--pp-slate-500)" }}>
                  Entry #{editingId}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  border: "1px solid var(--pp-slate-300)",
                  background: "var(--pp-white)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.35rem 0.5rem",
                  display: "inline-flex",
                  cursor: "pointer",
                }}
                aria-label="Close edit form"
              >
                <X style={{ width: "0.9rem", height: "0.9rem" }} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-md)", padding: "0.9rem" }}>
                <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                  Primary Contact
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>First Name<input value={form.primaryFirstName} onChange={(e) => updateField("primaryFirstName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Last Name / Company<input value={form.primaryLastName} onChange={(e) => updateField("primaryLastName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Phone<input value={form.primaryPhone} onChange={(e) => updateField("primaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                </div>
              </div>

              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-md)", padding: "0.9rem", background: "var(--pp-slate-50)" }}>
                <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Profile</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                    Category
                    <select value={form.residentCategory} onChange={(e) => updateField("residentCategory", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }}>
                      <option value="">Unspecified</option>
                      <option value="Owner">Owner</option>
                      <option value="Renter">Renter</option>
                      <option value="Vendor">Vendor</option>
                    </select>
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                    Phase
                    <input value={form.phase} onChange={(e) => updateField("phase", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                    Address Number
                    <input value={form.addressNumber} onChange={(e) => updateField("addressNumber", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                    Street Name
                    <input value={form.streetName} onChange={(e) => updateField("streetName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                    Gate Code (ENT)
                    <input value={form.entryCode} onChange={(e) => updateField("entryCode", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)", gridColumn: "1 / -1" }}>
                    Address (Full)
                    <input value={form.addressFull} onChange={(e) => updateField("addressFull", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-700)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <input type="checkbox" checked={form.includeInDirectory} onChange={(e) => updateBoolField("includeInDirectory", e.target.checked)} />
                    Include in Residents Directory
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-700)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <input type="checkbox" checked={form.confidentialPhone} onChange={(e) => updateBoolField("confidentialPhone", e.target.checked)} />
                    Confidential Phone #
                  </label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)", gridColumn: "1 / -1" }}>
                    Comments
                    <textarea value={form.comments} onChange={(e) => updateField("comments", e.target.value)} rows={3} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", resize: "vertical", fontFamily: "inherit" }} />
                  </label>
                </div>
              </div>

              <div style={{ border: "1px solid var(--pp-slate-200)", borderRadius: "var(--radius-md)", padding: "0.9rem" }}>
                <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Secondary Contact & Codes</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>First Name (B)<input value={form.secondaryFirstName} onChange={(e) => updateField("secondaryFirstName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Last Name (B)<input value={form.secondaryLastName} onChange={(e) => updateField("secondaryLastName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Phone_B<input value={form.secondaryPhone} onChange={(e) => updateField("secondaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Phone_C<input value={form.tertiaryPhone} onChange={(e) => updateField("tertiaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>DIR_A<input value={form.dirA} onChange={(e) => updateField("dirA", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>DIR_B<input value={form.dirB} onChange={(e) => updateField("dirB", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>DIR_C<input value={form.dirC} onChange={(e) => updateField("dirC", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingId === editingId}
                  style={{
                    padding: "0.5rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--pp-slate-300)",
                    background: "var(--pp-white)",
                    color: "var(--pp-slate-700)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(editingId)}
                  disabled={savingId === editingId}
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: "var(--pp-navy-dark)",
                    color: "var(--pp-white)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: savingId === editingId ? "default" : "pointer",
                    opacity: savingId === editingId ? 0.65 : 1,
                  }}
                >
                  <Check style={{ width: "0.85rem", height: "0.85rem" }} />
                  {savingId === editingId ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage <= 1}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-white)",
              color: "var(--pp-slate-700)",
              marginRight: "0.4rem",
              opacity: safePage <= 1 ? 0.5 : 1,
              cursor: safePage <= 1 ? "default" : "pointer",
            }}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
            disabled={safePage >= pageCount}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-white)",
              color: "var(--pp-slate-700)",
              opacity: safePage >= pageCount ? 0.5 : 1,
              cursor: safePage >= pageCount ? "default" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
