"use client"

// components/portal/user-management-table.tsx

import { useState, useEffect, useCallback } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Plus, Pencil, Trash2, Search, X, RefreshCw, AlertCircle, Users, ChevronDown, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"

/* ── Types ──────────────────────────────────────────────────── */

interface WpUser {
  id: number
  username: string
  name: string
  first_name: string
  last_name: string
  email: string
  roles: string[]
  registered_date: string
}

interface FormValues {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  role: string
}

const EMPTY_FORM: FormValues = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "suremember-resident",
}

const WP_ROLES = [
  "administrator",
  "suremember-hoa-director",
  "suremember-acc-chair",
  "suremember-acc",
  "suremember-access-control",
  "suremember-resident",
  "editor",
  "author",
  "contributor",
  "subscriber",
] as const

/* ── Role display names & styles ────────────────────────────── */

const ROLE_DISPLAY_NAME: Record<string, string> = {
  administrator:                  "Administrator",
  "suremember-hoa-director":      "HOA-Director",
  "suremember-acc-chair":         "ACC-Chair",
  "suremember-acc":               "ACC",
  "suremember-access-control":    "Access Control",
  "suremember-resident":          "Resident",
  editor:                         "Editor",
  author:                         "Author",
  contributor:                    "Contributor",
  subscriber:                     "Subscriber",
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  administrator:                  { bg: "var(--pp-navy-dark)",  color: "var(--pp-white)" },
  "suremember-hoa-director":      { bg: "#1e40af",              color: "#ffffff" },         // dark blue
  "suremember-acc-chair":         { bg: "var(--pp-gold)",       color: "var(--pp-white)" }, // gold for chairs
  "suremember-acc":               { bg: "#059669",              color: "#ffffff" },         // emerald green
  "suremember-access-control":    { bg: "#7c3aed",              color: "#ffffff" },         // purple
  "suremember-resident":          { bg: "var(--pp-slate-300)",  color: "var(--pp-slate-700)" }, // most common
  editor:                         { bg: "#0284c7",              color: "#ffffff" },
  author:                         { bg: "#7c3aed",              color: "#ffffff" },
  contributor:                    { bg: "#16a34a",              color: "#ffffff" },
  subscriber:                     { bg: "var(--pp-slate-200)",  color: "var(--pp-slate-700)" },
}

function RoleBadgeSelect({
  user,
  updating,
  onChange,
}: {
  user: WpUser
  updating: boolean
  onChange: (nextRole: string) => void
}) {
  const currentRole = user.roles[0] ?? "subscriber"
  const s = ROLE_STYLE[currentRole] ?? { bg: "var(--pp-slate-200)", color: "var(--pp-slate-700)" }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={currentRole}
        disabled={updating}
        onChange={(e) => onChange(e.target.value)}
        title="Click to change role"
        style={{
          display: "inline-block",
          padding: "0.22rem 1.6rem 0.22rem 0.65rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          fontWeight: 600,
          border: "1px solid transparent",
          background: s.bg,
          color: s.color,
          whiteSpace: "nowrap",
          cursor: updating ? "wait" : "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          outline: "none",
          opacity: updating ? 0.75 : 1,
        }}
      >
        {WP_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_DISPLAY_NAME[role] ?? role}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: "0.45rem",
          pointerEvents: "none",
          display: "inline-flex",
          alignItems: "center",
          color: s.color,
          opacity: 0.9,
        }}
      >
        {updating ? <Loader2 style={{ width: "0.72rem", height: "0.72rem" }} className="animate-spin" /> : <ChevronDown style={{ width: "0.72rem", height: "0.72rem" }} />}
      </span>
    </div>
  )
}

/* ── Input helper ───────────────────────────────────────────── */

function FieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label
        className="text-fluid-sm font-semibold"
        style={{ color: "var(--pp-navy-dark)" }}
      >
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: "0.2rem" }}>*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-fluid-xs" style={{ color: "var(--pp-slate-400)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: "var(--radius-sm)",
  border: "1.5px solid var(--pp-slate-200)",
  fontSize: "0.9rem",
  color: "var(--pp-slate-800)",
  background: "var(--pp-white)",
  outline: "none",
}

/* ── User form modal ────────────────────────────────────────── */

function UserFormModal({
  open,
  mode,
  user,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  user: WpUser | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && user) {
      setForm({
        username:   user.username,
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        password:   "",
        role:       user.roles[0] ?? "subscriber",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [mode, user, open])

  function set(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === "create" && !form.password) {
      setError("Password is required when creating a new user.")
      return
    }

    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name:  form.last_name,
      name:       `${form.first_name} ${form.last_name}`.trim(),
      email:      form.email,
      roles:      [form.role],
    }

    if (mode === "create") {
      payload.username = form.username
      payload.password = form.password
    }

    if (mode === "edit" && form.password) {
      payload.password = form.password
    }

    setSaving(true)

    const url    = mode === "create" ? "/api/wp-users" : `/api/wp-users/${user!.id}`
    const method = mode === "create" ? "POST" : "PUT"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.message ?? "An error occurred. Please try again.")
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 100,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 101,
            background: "var(--pp-white)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-l)",
            width: "min(92vw, 28rem)",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-m)" }}>
            <Dialog.Title
              className="text-step-1 font-bold"
              style={{ color: "var(--pp-navy-dark)" }}
            >
              {mode === "create" ? "Add New User" : "Edit User"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--pp-slate-400)",
                  padding: "0.25rem",
                }}
              >
                <X style={{ width: "1.25rem", height: "1.25rem" }} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>

            {/* Username — create only */}
            {mode === "create" && (
              <FieldRow label="Username" required>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  style={inputStyle}
                />
              </FieldRow>
            )}

            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-s)" }}>
              <FieldRow label="First Name">
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Last Name">
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  style={inputStyle}
                />
              </FieldRow>
            </div>

            {/* Email */}
            <FieldRow label="Email Address" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                style={inputStyle}
              />
            </FieldRow>

            {/* Role */}
            <FieldRow label="Role" required>
              <select
                required
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {WP_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DISPLAY_NAME[r] ?? r}
                  </option>
                ))}
              </select>
            </FieldRow>

            {/* Password */}
            <FieldRow
              label="Password"
              required={mode === "create"}
              hint={mode === "edit" ? "Leave blank to keep the current password." : undefined}
            >
              <input
                type="password"
                required={mode === "create"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                style={inputStyle}
              />
            </FieldRow>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  padding: "var(--space-s)",
                  borderRadius: "var(--radius-sm)",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                }}
              >
                <AlertCircle style={{ width: "1rem", height: "1rem", color: "#dc2626", flexShrink: 0, marginTop: "0.1rem" }} />
                <p className="text-fluid-sm" style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "var(--space-s)", justifyContent: "flex-end", marginTop: "var(--space-xs)" }}>
              <Dialog.Close asChild>
                <button
                  type="button"
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1.5px solid var(--pp-slate-200)",
                    background: "var(--pp-white)",
                    color: "var(--pp-slate-600)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: saving ? "var(--pp-slate-300)" : "var(--pp-navy-dark)",
                  color: "var(--pp-white)",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : mode === "create" ? "Create User" : "Save Changes"}
              </button>
            </div>

          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Delete confirmation modal ──────────────────────────────── */

function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: WpUser | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!user) return
    setDeleting(true)
    setError(null)

    const res = await fetch(`/api/wp-users/${user.id}?reassign=1`, { method: "DELETE" })
    setDeleting(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.message ?? "Delete failed. Please try again.")
      return
    }

    onDeleted()
    onClose()
  }

  return (
    <Dialog.Root open={!!user} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }} />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 101,
            background: "var(--pp-white)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-l)",
            width: "min(92vw, 24rem)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <Dialog.Title className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-s)" }}>
            Delete User
          </Dialog.Title>
          <Dialog.Description className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{user?.name || user?.username}</strong>? This
            action cannot be undone. Any content they authored will be reassigned to the site
            administrator.
          </Dialog.Description>

          {error && (
            <div style={{ marginTop: "var(--space-s)", padding: "var(--space-xs) var(--space-s)", borderRadius: "var(--radius-sm)", background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-fluid-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-s)", justifyContent: "flex-end", marginTop: "var(--space-m)" }}>
            <Dialog.Close asChild>
              <button
                type="button"
                style={{ padding: "0.5rem 1.1rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", background: "var(--pp-white)", color: "var(--pp-slate-600)", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "var(--radius-sm)", border: "none", background: deleting ? "#fca5a5" : "#dc2626", color: "#ffffff", fontWeight: 700, fontSize: "0.875rem", cursor: deleting ? "not-allowed" : "pointer" }}
            >
              {deleting ? "Deleting…" : "Delete User"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Main component ─────────────────────────────────────────── */

export function UserManagementTable() {
  const [users,      setUsers]      = useState<WpUser[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState("")
  const [searchInput, setSearchInput] = useState("")

  const [modal,      setModal]      = useState<{ mode: "create" | "edit"; user: WpUser | null } | null>(null)
  const [deleteUser, setDeleteUser] = useState<WpUser | null>(null)
  const [roleSaving, setRoleSaving] = useState<Record<number, boolean>>({})

  const fetchUsers = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)

    const url = new URL("/api/wp-users", window.location.origin)
    url.searchParams.set("per_page", "50")
    if (q) url.searchParams.set("search", q)

    const res = await fetch(url.toString())

    if (!res.ok) {
      setError("Failed to load users. Check your WordPress credentials in .env.local.")
      setLoading(false)
      return
    }

    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers("") }, [fetchUsers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    fetchUsers(searchInput)
  }

  function handleClearSearch() {
    setSearchInput("")
    setSearch("")
    fetchUsers("")
  }

  function formatDate(iso: string) {
    try { return format(parseISO(iso), "MMM d, yyyy") }
    catch { return "—" }
  }

  async function handleInlineRoleChange(user: WpUser, nextRole: string) {
    const currentRole = user.roles[0] ?? "subscriber"
    if (nextRole === currentRole) return

    setRoleSaving((prev) => ({ ...prev, [user.id]: true }))
    setError(null)

    const res = await fetch(`/api/wp-users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles: [nextRole] }),
    })

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      setError(detail?.message ?? "Failed to update role.")
      setRoleSaving((prev) => ({ ...prev, [user.id]: false }))
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, roles: [nextRole] } : u)),
    )
    setRoleSaving((prev) => ({ ...prev, [user.id]: false }))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-l)" }}>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-m)" }}>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-400)" }} />
          <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
            {loading ? "Loading…" : `${total} user${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Search + Add */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-s)", flexWrap: "wrap" }}>

          <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: "0.875rem", height: "0.875rem", color: "var(--pp-slate-400)", pointerEvents: "none" }} />
              <input
                type="search"
                placeholder="Search users…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  fontSize: "0.875rem",
                  color: "var(--pp-slate-700)",
                  width: "14rem",
                  outline: "none",
                }}
              />
            </div>
            <button
              type="submit"
              style={{ padding: "0.45rem 0.875rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", background: "var(--pp-white)", fontSize: "0.875rem", fontWeight: 600, color: "var(--pp-slate-600)", cursor: "pointer" }}
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{ padding: "0.45rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", background: "var(--pp-white)", cursor: "pointer", display: "flex", alignItems: "center" }}
                aria-label="Clear search"
              >
                <X style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-slate-400)" }} />
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={() => fetchUsers(search)}
            aria-label="Refresh"
            style={{ padding: "0.45rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", background: "var(--pp-white)", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <RefreshCw style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-slate-500)" }} />
          </button>

          <button
            type="button"
            onClick={() => setModal({ mode: "create", user: null })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--pp-navy-dark)",
              color: "var(--pp-white)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            <Plus style={{ width: "0.875rem", height: "0.875rem" }} />
            Add User
          </button>

        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "var(--space-m)", borderRadius: "var(--radius-md)", background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertCircle style={{ width: "1.125rem", height: "1.125rem", color: "#dc2626", flexShrink: 0, marginTop: "0.1rem" }} />
          <div>
            <p className="text-fluid-sm font-semibold" style={{ color: "#dc2626" }}>Unable to load users</p>
            <p className="text-fluid-sm" style={{ color: "#dc2626", opacity: 0.85, marginTop: "0.2rem" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Search context ── */}
      {search && !loading && (
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
          Showing results for <strong>&ldquo;{search}&rdquo;</strong> — {total} user{total !== 1 ? "s" : ""} found.
        </p>
      )}

      {/* ── Table ── */}
      {!error && (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table className="um-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "40rem" }}>
            <thead>
              <tr style={{ background: "var(--pp-navy-dark)" }}>
                {["Name", "Username", "Email", "Role", "Registered", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={
                      h === "Name"
                        ? "um-col-name"
                        : h === "Actions"
                          ? "um-col-actions"
                        : h === "Username"
                        ? "um-col-username"
                        : h === "Email"
                          ? "um-col-email"
                        : h === "Role"
                          ? "um-col-role"
                        : h === "Registered"
                          ? "um-col-registered"
                          : undefined
                    }
                    style={{
                      padding: "0.65rem 1rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--pp-gold-light)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>Loading users…</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
                      {search ? "No users match your search." : "No users found."}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{
                      background: i % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                      borderBottom: "1px solid var(--pp-slate-100)",
                    }}
                  >
                    <td className="um-col-name" style={{ padding: "0.65rem 1rem" }}>
                      <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                        {u.name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                      </span>
                    </td>
                    <td className="um-col-username" style={{ padding: "0.65rem 1rem" }}>
                      <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", fontFamily: "monospace" }}>
                        {u.username}
                      </span>
                    </td>
                    <td className="um-col-email" style={{ padding: "0.65rem 1rem" }}>
                      <a
                        href={`mailto:${u.email}`}
                        className="text-fluid-sm"
                        style={{ color: "var(--pp-navy-dark)", textDecoration: "none" }}
                      >
                        {u.email}
                      </a>
                    </td>
                    <td className="um-col-role" style={{ padding: "0.65rem 1rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {u.roles.length ? (
                          <RoleBadgeSelect
                            user={u}
                            updating={!!roleSaving[u.id]}
                            onChange={(nextRole) => handleInlineRoleChange(u, nextRole)}
                          />
                        ) : (
                          <span style={{ color: "var(--pp-slate-400)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td className="um-col-registered" style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                      <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                        {formatDate(u.registered_date)}
                      </span>
                    </td>
                    <td className="um-col-actions" style={{ padding: "0.65rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "edit", user: u })}
                          aria-label={`Edit ${u.name || u.username}`}
                          style={{ padding: "0.35rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", background: "var(--pp-white)", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Pencil style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-navy)" }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUser(u)}
                          aria-label={`Delete ${u.name || u.username}`}
                          style={{ padding: "0.35rem", borderRadius: "var(--radius-sm)", border: "1.5px solid #fecaca", background: "#fff1f1", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 style={{ width: "0.875rem", height: "0.875rem", color: "#dc2626" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      <UserFormModal
        open={!!modal}
        mode={modal?.mode ?? "create"}
        user={modal?.user ?? null}
        onClose={() => setModal(null)}
        onSaved={() => fetchUsers(search)}
      />

      <DeleteConfirmModal
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={() => fetchUsers(search)}
      />

      <style jsx>{`
        @media (max-width: 1130px) {
          .um-col-registered {
            display: none;
          }
        }

        @media (max-width: 990px) {
          .um-col-username {
            display: none;
          }
        }

        @media (max-width: 750px) {
          .um-col-role {
            display: none;
          }
        }

        @media (max-width: 665px) {
          .um-col-email {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .um-table {
            min-width: 0 !important;
          }

          .um-col-name {
            padding-right: 0.45rem !important;
          }

          .um-col-actions {
            padding-left: 0.45rem !important;
            white-space: nowrap;
            width: 1%;
          }
        }
      `}</style>

    </div>
  )
}
