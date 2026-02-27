"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Check, KeyRound, Pencil, RefreshCw, Search, X } from "lucide-react"
import { useAccessResidents } from "@/lib/hooks/use-access-residents"
import type { AccessHouseholdMember, AccessResidentDetail } from "@/lib/access/types"

interface EditFormState {
  residentCategory: string
  includeInDirectory: boolean
  confidentialPhone: boolean
  addressNumber: string
  streetName: string
  addressFull: string
  entryCode: string
  comments: string
  primaryFirstName: string
  primaryLastName: string
  primaryPhone: string
  primaryEmail: string
  secondaryFirstName: string
  secondaryLastName: string
  secondaryPhone: string
  secondaryEmail: string
  tertiaryPhone: string
  dirA: string
  dirB: string
  dirC: string
}

const emptyForm: EditFormState = {
  residentCategory: "",
  includeInDirectory: true,
  confidentialPhone: false,
  addressNumber: "",
  streetName: "",
  addressFull: "",
  entryCode: "",
  comments: "",
  primaryFirstName: "",
  primaryLastName: "",
  primaryPhone: "",
  primaryEmail: "",
  secondaryFirstName: "",
  secondaryLastName: "",
  secondaryPhone: "",
  secondaryEmail: "",
  tertiaryPhone: "",
  dirA: "",
  dirB: "",
  dirC: "",
}

export function AccessManagementTable() {
  const [searchInput, setSearchInput] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [viewportWidth, setViewportWidth] = useState<number>(1400)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDetail, setEditingDetail] = useState<AccessResidentDetail | null>(null)
  const [form, setForm] = useState<EditFormState>(emptyForm)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data, loading, error, params, setParams, refresh } = useAccessResidents()

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    setCategoryFilter(params.category || "")
  }, [params.category])

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setParams((prev) => ({
      ...prev,
      q: searchInput.trim(),
      category: categoryFilter || undefined,
      page: 1,
    }))
  }

  const beginEdit = async (residentProfileId: string) => {
    setActionError(null)
    setEditingId(residentProfileId)
    setLoadingDetail(true)
    const res = await fetch(`/api/access/residents/${residentProfileId}`, { cache: "no-store" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setActionError(body?.error || "Failed to load resident details")
      setEditingId(null)
      setLoadingDetail(false)
      return
    }
    const detail = (await res.json()) as AccessResidentDetail
    const primary = detail.householdMembers.find((m) => m.role === "primary") || null
    const secondary = detail.householdMembers.find((m) => m.role === "secondary") || null
    const tertiary = detail.householdMembers.find((m) => m.role === "tertiary") || null
    const dirA = detail.credentials.find((c) => c.credentialType === "directory_code" && c.credentialLabel === "A")
    const dirB = detail.credentials.find((c) => c.credentialType === "directory_code" && c.credentialLabel === "B")
    const dirC = detail.credentials.find((c) => c.credentialType === "directory_code" && c.credentialLabel === "C")
    setEditingDetail(detail)
    setForm({
      residentCategory: detail.residentCategory || "",
      includeInDirectory: detail.includeInDirectory ?? true,
      confidentialPhone: detail.confidentialPhone ?? false,
      addressNumber: detail.addressNumber || "",
      streetName: detail.streetName || "",
      addressFull: detail.addressFull || "",
      entryCode: detail.entryCode || "",
      comments: detail.comments || "",
      primaryFirstName: primary?.firstName || "",
      primaryLastName: primary?.lastName || "",
      primaryPhone: primary?.phone || "",
      primaryEmail: primary?.email || "",
      secondaryFirstName: secondary?.firstName || "",
      secondaryLastName: secondary?.lastName || "",
      secondaryPhone: secondary?.phone || "",
      secondaryEmail: secondary?.email || "",
      tertiaryPhone: tertiary?.phone || "",
      dirA: dirA?.credentialValue || "",
      dirB: dirB?.credentialValue || "",
      dirC: dirC?.credentialValue || "",
    })
    setLoadingDetail(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDetail(null)
    setForm(emptyForm)
    setLoadingDetail(false)
    setSavingId(null)
    setActionError(null)
  }

  const saveEdit = async (residentProfileId: string) => {
    setActionError(null)
    setSavingId(residentProfileId)

    const patchResidentRes = await fetch(`/api/access/residents/${residentProfileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentCategory: form.residentCategory || null,
        includeInDirectory: form.includeInDirectory,
        confidentialPhone: form.confidentialPhone,
        addressNumber: form.addressNumber || null,
        streetName: form.streetName || null,
        addressFull: form.addressFull || null,
        entryCode: form.entryCode || null,
        comments: form.comments || null,
        reason: "Resident profile update from Access Management form",
      }),
    })

    if (!patchResidentRes.ok) {
      const body = await patchResidentRes.json().catch(() => ({}))
      setActionError(body?.error || "Failed to save resident profile")
      setSavingId(null)
      return
    }

    const upsertHouseholdMember = async (
      role: "primary" | "secondary" | "tertiary",
      fields: { firstName: string; lastName: string; phone: string; email: string },
      existing: AccessHouseholdMember | undefined,
    ) => {
      const hasAnyValue = Boolean(
        fields.firstName.trim() || fields.lastName.trim() || fields.phone.trim() || fields.email.trim(),
      )

      if (existing && !hasAnyValue) {
        return fetch(`/api/access/household-members/${existing.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: `Removed ${role} contact from access form` }),
        })
      }

      if (existing) {
        return fetch(`/api/access/household-members/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            firstName: fields.firstName || null,
            lastName: fields.lastName || null,
            phone: fields.phone || null,
            email: fields.email || null,
            isPrimaryContact: role === "primary",
            reason: `Updated ${role} contact from access form`,
          }),
        })
      }

      if (!hasAnyValue) return null
      return fetch(`/api/access/residents/${residentProfileId}/household-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          firstName: fields.firstName || null,
          lastName: fields.lastName || null,
          phone: fields.phone || null,
          email: fields.email || null,
          isPrimaryContact: role === "primary",
          reason: `Created ${role} contact from access form`,
        }),
      })
    }

    const primaryExisting = editingDetail?.householdMembers.find((m) => m.role === "primary")
    const secondaryExisting = editingDetail?.householdMembers.find((m) => m.role === "secondary")
    const tertiaryExisting = editingDetail?.householdMembers.find((m) => m.role === "tertiary")

    const upsertDirectoryCode = async (label: "A" | "B" | "C", value: string) => {
      const trimmed = value.trim()
      const existing = editingDetail?.credentials.find(
        (c) => c.credentialType === "directory_code" && c.credentialLabel === label && c.status !== "revoked",
      )

      if (existing && !trimmed) {
        return fetch(`/api/access/credentials/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "revoked",
            reason: `Cleared DIR_${label} from access form`,
          }),
        })
      }

      if (existing && trimmed) {
        return fetch(`/api/access/credentials/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "active",
            credentialLabel: label,
            credentialValue: trimmed,
            reason: `Updated DIR_${label} from access form`,
          }),
        })
      }

      if (!trimmed) return null
      return fetch(`/api/access/residents/${residentProfileId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialType: "directory_code",
          credentialLabel: label,
          credentialValue: trimmed,
          reason: `Created DIR_${label} from access form`,
        }),
      })
    }

    const [primaryRes, secondaryRes, tertiaryRes, dirARes, dirBRes, dirCRes] = await Promise.all([
      upsertHouseholdMember(
        "primary",
        {
          firstName: form.primaryFirstName,
          lastName: form.primaryLastName,
          phone: form.primaryPhone,
          email: form.primaryEmail,
        },
        primaryExisting,
      ),
      upsertHouseholdMember(
        "secondary",
        {
          firstName: form.secondaryFirstName,
          lastName: form.secondaryLastName,
          phone: form.secondaryPhone,
          email: form.secondaryEmail,
        },
        secondaryExisting,
      ),
      upsertHouseholdMember(
        "tertiary",
        {
          firstName: "",
          lastName: "",
          phone: form.tertiaryPhone,
          email: "",
        },
        tertiaryExisting,
      ),
      upsertDirectoryCode("A", form.dirA),
      upsertDirectoryCode("B", form.dirB),
      upsertDirectoryCode("C", form.dirC),
    ])

    if (
      (primaryRes && !primaryRes.ok) ||
      (secondaryRes && !secondaryRes.ok) ||
      (tertiaryRes && !tertiaryRes.ok) ||
      (dirARes && !dirARes.ok) ||
      (dirBRes && !dirBRes.ok) ||
      (dirCRes && !dirCRes.ok)
    ) {
      setActionError("Resident saved, but one or more contact/code updates failed.")
      setSavingId(null)
      return
    }

    await refresh()
    setSavingId(null)
    setEditingId(null)
    setEditingDetail(null)
    setForm(emptyForm)
  }

  const updateField = (field: keyof EditFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateBoolField = (field: "includeInDirectory" | "confidentialPhone", value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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
            {loading ? "Loading…" : `${data.total} record${data.total !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginLeft: "auto" }}>
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.55rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--pp-slate-300)",
                fontSize: "0.85rem",
                color: "var(--pp-slate-700)",
                background: "var(--pp-white)",
              }}
            >
              <option value="">All Categories</option>
              <option value="Owner">Owner</option>
              <option value="Renter">Renter</option>
              <option value="Vendor">Vendor</option>
            </select>
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
            onClick={refresh}
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
              Unable to load resident access report
            </p>
            <p className="text-fluid-sm" style={{ color: "#b91c1c" }}>
              {error}
            </p>
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
              minWidth: showSecondaryContact ? "65rem" : showComments ? "50rem" : "38rem",
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
                    {column.replace(/[_-]+/g, " ")}
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
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "2.5rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
                      No records found.
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((row, i) => (
                  <tr
                    key={row.residentProfileId}
                    style={{
                      background: i % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                      borderBottom: "1px solid var(--pp-slate-100)",
                    }}
                  >
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                      <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-800)" }}>
                        {row.addressFull || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                      <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", whiteSpace: "nowrap" }}>
                        {row.primaryContact
                          ? `${row.primaryContact.firstName || ""} ${row.primaryContact.lastName || ""}`.trim() || "—"
                          : "—"}
                      </div>
                      <div className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                        {row.primaryContact?.phone || row.primaryContact?.email || "—"}
                      </div>
                    </td>
                    {showSecondaryContact && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                        <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", whiteSpace: "nowrap" }}>
                          {row.secondaryContact
                            ? `${row.secondaryContact.firstName || ""} ${row.secondaryContact.lastName || ""}`.trim() || "—"
                            : "—"}
                        </div>
                        <div className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                          {row.secondaryContact?.phone || row.secondaryContact?.email || "—"}
                        </div>
                      </td>
                    )}
                    {showCategory && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {row.residentCategory || "—"}
                        </span>
                      </td>
                    )}
                    {showGateCode && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {row.entryCode || "—"}
                        </span>
                      </td>
                    )}
                    {showComments && (
                      <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", maxWidth: "20rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
                          <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                            {row.comments || "—"}
                          </span>
                        </div>
                      </td>
                    )}
                    <td style={{ padding: "0.65rem 0.9rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => beginEdit(row.residentProfileId)}
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
                <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Edit Access Profile</h3>
                <p className="text-fluid-sm" style={{ margin: "0.2rem 0 0", color: "var(--pp-slate-500)" }}>
                  {form.addressFull || "Resident / Company record"}
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

            {loadingDetail ? (
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "1rem" }}>
                Loading resident details...
              </p>
            ) : (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                <div
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.9rem",
                  }}
                >
                  <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                    Primary Contact
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>First Name<input value={form.primaryFirstName} onChange={(e) => updateField("primaryFirstName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Last Name / Company<input value={form.primaryLastName} onChange={(e) => updateField("primaryLastName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Phone<input value={form.primaryPhone} onChange={(e) => updateField("primaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Email<input value={form.primaryEmail} onChange={(e) => updateField("primaryEmail", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.9rem",
                    background: "var(--pp-slate-50)",
                  }}
                >
                  <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                    Profile
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.6rem",
                      marginTop: "0.65rem",
                    }}
                  >
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                      Category
                      <select
                        value={form.residentCategory}
                        onChange={(e) => updateField("residentCategory", e.target.value)}
                        style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }}
                      >
                        <option value="">Unspecified</option>
                        <option value="Owner">Owner</option>
                        <option value="Renter">Renter</option>
                        <option value="Vendor">Vendor</option>
                      </select>
                    </label>
                    <label
                      className="text-fluid-xs"
                      style={{
                        color: "var(--pp-slate-700)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        marginTop: "1.2rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.includeInDirectory}
                        onChange={(e) => updateBoolField("includeInDirectory", e.target.checked)}
                      />
                      Include in Residents Directory
                    </label>
                    <label
                      className="text-fluid-xs"
                      style={{
                        color: "var(--pp-slate-700)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        marginTop: "1.2rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.confidentialPhone}
                        onChange={(e) => updateBoolField("confidentialPhone", e.target.checked)}
                      />
                      Confidential Phone #
                    </label>
                    <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
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
                    </div>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)", gridColumn: "1 / -1" }}>
                      Address (Full)
                      <input value={form.addressFull} onChange={(e) => updateField("addressFull", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                    </label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)", gridColumn: "1 / -1" }}>
                      Comments
                      <textarea value={form.comments} onChange={(e) => updateField("comments", e.target.value)} rows={3} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)", resize: "vertical", fontFamily: "inherit" }} />
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.9rem",
                  }}
                >
                  <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                    Secondary Contact
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>First Name<input value={form.secondaryFirstName} onChange={(e) => updateField("secondaryFirstName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Last Name / Company<input value={form.secondaryLastName} onChange={(e) => updateField("secondaryLastName", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Phone<input value={form.secondaryPhone} onChange={(e) => updateField("secondaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>Email<input value={form.secondaryEmail} onChange={(e) => updateField("secondaryEmail", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} /></label>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.9rem",
                  }}
                >
                  <p className="text-fluid-sm font-semibold" style={{ margin: 0, color: "var(--pp-navy-dark)" }}>
                    Gate Codes
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.65rem" }}>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                      DIR_A (Resident A)
                      <input value={form.dirA} onChange={(e) => updateField("dirA", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                    </label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                      DIR_B (Resident B)
                      <input value={form.dirB} onChange={(e) => updateField("dirB", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                    </label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                      DIR_C (Resident C)
                      <input value={form.dirC} onChange={(e) => updateField("dirC", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                    </label>
                    <label className="text-fluid-xs" style={{ color: "var(--pp-slate-600)" }}>
                      Phone_C
                      <input value={form.tertiaryPhone} onChange={(e) => updateField("tertiaryPhone", e.target.value)} style={{ width: "100%", marginTop: "0.2rem", padding: "0.45rem", border: "1px solid var(--pp-slate-300)", borderRadius: "var(--radius-sm)" }} />
                    </label>
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
            )}
          </div>
        </div>
      )}

      {!loading && !error && data.total > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
            disabled={(params.page || 1) <= 1}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-white)",
              color: "var(--pp-slate-700)",
              marginRight: "0.4rem",
              opacity: (params.page || 1) <= 1 ? 0.5 : 1,
              cursor: (params.page || 1) <= 1 ? "default" : "pointer",
            }}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
            disabled={(params.page || 1) * (params.pageSize || 25) >= data.total}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--pp-slate-300)",
              background: "var(--pp-white)",
              color: "var(--pp-slate-700)",
              opacity: (params.page || 1) * (params.pageSize || 25) >= data.total ? 0.5 : 1,
              cursor: (params.page || 1) * (params.pageSize || 25) >= data.total ? "default" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
