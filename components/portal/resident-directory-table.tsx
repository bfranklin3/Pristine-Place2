"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { CheckCircle2, ChevronRight, RefreshCw, Search, Shield, UserX } from "lucide-react"
import {
  COMMITTEE_CHAIR_OPTIONS,
  COMMITTEE_OPTIONS,
  isCommitteeChairSlug,
  isCommitteeSlug,
  type CommitteeChairSlug,
  type CommitteeSlug,
} from "@/lib/portal/committees"
import { CAPABILITY_OPTIONS, type CapabilityKey, type CapabilityOverrideValue } from "@/lib/auth/capabilities"

type DirectoryStatus = "all" | "not_submitted" | "pending" | "approved" | "rejected"
type DirectoryAction =
  | "approve"
  | "reject"
  | "set_admin"
  | "unset_admin"
  | "set_committees"
  | "set_capability_overrides"
  | "delete_user"

interface PortalUserRow {
  userId: string
  firstName: string
  lastName: string
  fullName: string
  homeAddress: string
  username: string
  emailAddress: string
  status: Exclude<DirectoryStatus, "all">
  lastActiveAt: string
  submittedAt: string
  reviewedAt: string
  reviewedBy: string
  portalAdmin: boolean
  committees: string[]
  committeeChairs: string[]
  capabilityOverrides: Partial<Record<string, "allow" | "deny">>
  capabilityOverridesUpdatedAt: string
  capabilityOverridesUpdatedBy: string
  committeesUpdatedAt: string
  committeesUpdatedBy: string
}

function formatLastActive(lastActiveAt: string) {
  return lastActiveAt ? new Date(lastActiveAt).toLocaleString() : "Never"
}

const statusOptions: Array<{ key: DirectoryStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "not_submitted", label: "No Registration" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const DEFAULT_ROLE_GRANTS: Record<string, CapabilityKey[]> = {
  board_of_directors: ["acc.view", "access.view"],
  "committee.acc.member": ["acc.view"],
  "committee.acc.chair": ["acc.view", "acc.edit", "acc.workflow"],
  "committee.access_control.member": ["access.view"],
  "committee.access_control.chair": ["access.view", "access.edit"],
}
const CHAIR_ELIGIBLE_COMMITTEES = new Set<CommitteeSlug>(COMMITTEE_CHAIR_OPTIONS.map((option) => option.slug))
type CommitteeRoleDraft = "none" | "member" | "chair"

function statusLabel(status: PortalUserRow["status"]) {
  if (status === "not_submitted") return "No registration submitted"
  if (status === "pending") return "Pending"
  if (status === "approved") return "Approved"
  return "Rejected"
}

export function ResidentDirectoryTable() {
  const [rows, setRows] = useState<PortalUserRow[]>([])
  const [status, setStatus] = useState<DirectoryStatus>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [resetEmailInput, setResetEmailInput] = useState("")
  const [resettingEmail, setResettingEmail] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [committeeDrafts, setCommitteeDrafts] = useState<Record<string, CommitteeSlug[]>>({})
  const [committeeChairDrafts, setCommitteeChairDrafts] = useState<Record<string, CommitteeChairSlug[]>>({})
  const [capabilityOverrideDrafts, setCapabilityOverrideDrafts] = useState<
    Record<string, Partial<Record<CapabilityKey, CapabilityOverrideValue>>>
  >({})
  const [committeeMessages, setCommitteeMessages] = useState<Record<string, string>>({})
  const [capabilityMessages, setCapabilityMessages] = useState<Record<string, string>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isCompactLayout, setIsCompactLayout] = useState(false)
  const [isWideDetailsLayout, setIsWideDetailsLayout] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      query.set("status", status)
      if (search.trim()) query.set("q", search.trim())

      const response = await fetch(`/api/portal-users?${query.toString()}`)
      const data = (await response.json()) as { success: boolean; rows?: PortalUserRow[]; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load directory users.")
        setRows([])
        return
      }

      setRows(data.rows || [])
      setCommitteeDrafts({})
      setCommitteeChairDrafts({})
      setCapabilityOverrideDrafts({})
      setCommitteeMessages({})
      setCapabilityMessages({})
    } catch {
      setError("Failed to load directory users.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)")
    const update = () => setIsCompactLayout(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1360px)")
    const update = () => setIsWideDetailsLayout(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  async function runAction(userId: string, action: DirectoryAction) {
    if (action === "delete_user") {
      const confirmed = window.confirm(
        "Delete this user account from Clerk? This cannot be undone.",
      )
      if (!confirmed) return
    }

    setSavingUserId(userId)
    setError(null)
    setWarning(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      const data = (await response.json()) as { success: boolean; error?: string; warning?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save changes.")
        return
      }
      if (data.warning) {
        setWarning(data.warning)
      }
      await loadRows()
    } catch {
      setError("Failed to save changes.")
    } finally {
      setSavingUserId(null)
    }
  }

  function getDraftCommittees(row: PortalUserRow): CommitteeSlug[] {
    const draft = committeeDrafts[row.userId]
    return draft ?? row.committees.filter(isCommitteeSlug)
  }

  function getDraftCommitteeChairs(row: PortalUserRow): CommitteeChairSlug[] {
    const draft = committeeChairDrafts[row.userId]
    return draft ?? row.committeeChairs.filter(isCommitteeChairSlug)
  }

  function getDraftCapabilityOverrides(
    row: PortalUserRow,
  ): Partial<Record<CapabilityKey, CapabilityOverrideValue>> {
    const draft = capabilityOverrideDrafts[row.userId]
    if (draft) return draft

    const normalized: Partial<Record<CapabilityKey, CapabilityOverrideValue>> = {}
    for (const option of CAPABILITY_OPTIONS) {
      const value = row.capabilityOverrides[option.key]
      if (value === "allow" || value === "deny") {
        normalized[option.key] = value
      }
    }
    return normalized
  }

  function getCurrentCapabilityOverrides(
    row: PortalUserRow,
  ): Partial<Record<CapabilityKey, CapabilityOverrideValue>> {
    const normalized: Partial<Record<CapabilityKey, CapabilityOverrideValue>> = {}
    for (const option of CAPABILITY_OPTIONS) {
      const value = row.capabilityOverrides[option.key]
      if (value === "allow" || value === "deny") {
        normalized[option.key] = value
      }
    }
    return normalized
  }

  function serializeCapabilityOverrides(
    values: Partial<Record<CapabilityKey, CapabilityOverrideValue>>,
  ): string {
    return CAPABILITY_OPTIONS.map((option) => `${option.key}:${values[option.key] || ""}`).join("|")
  }

  function hasCommitteeChanges(row: PortalUserRow): boolean {
    const current = row.committees.filter(isCommitteeSlug)
    const draft = getDraftCommittees(row)
    const currentChairs = row.committeeChairs.filter(isCommitteeChairSlug)
    const draftChairs = getDraftCommitteeChairs(row)
    return current.join("|") !== draft.join("|") || currentChairs.join("|") !== draftChairs.join("|")
  }

  function hasCapabilityChanges(row: PortalUserRow): boolean {
    const current = getCurrentCapabilityOverrides(row)
    const draft = getDraftCapabilityOverrides(row)
    return serializeCapabilityOverrides(current) !== serializeCapabilityOverrides(draft)
  }

  function setCommitteeRole(userId: string, slug: CommitteeSlug, role: CommitteeRoleDraft) {
    setCommitteeMessages((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })

    setCommitteeDrafts((current) => {
      const existing = current[userId] ?? []
      const nextValues = role === "none" ? existing.filter((value) => value !== slug) : [...existing, slug]
      const deduped = Array.from(new Set(nextValues))
      const ordered = COMMITTEE_OPTIONS.map((option) => option.slug).filter((value) => deduped.includes(value))
      return { ...current, [userId]: ordered }
    })
    setCommitteeChairDrafts((current) => {
      const existing = current[userId] ?? []
      const nextValues =
        role === "chair" && CHAIR_ELIGIBLE_COMMITTEES.has(slug)
          ? [...existing, slug]
          : existing.filter((value) => value !== slug)
      const deduped = Array.from(new Set(nextValues))
      const ordered = COMMITTEE_CHAIR_OPTIONS.map((option) => option.slug).filter((value) =>
        deduped.includes(value),
      )
      return { ...current, [userId]: ordered }
    })
  }

  function getCommitteeRole(
    slug: CommitteeSlug,
    draftCommittees: CommitteeSlug[],
    draftCommitteeChairs: CommitteeChairSlug[],
  ): CommitteeRoleDraft {
    if (draftCommitteeChairs.includes(slug as CommitteeChairSlug)) return "chair"
    if (draftCommittees.includes(slug)) return "member"
    return "none"
  }

  function hasCommitteeRoleChanged(
    row: PortalUserRow,
    slug: CommitteeSlug,
    draftCommittees: CommitteeSlug[],
    draftCommitteeChairs: CommitteeChairSlug[],
  ): boolean {
    const currentRole = getCommitteeRole(
      slug,
      row.committees.filter(isCommitteeSlug),
      row.committeeChairs.filter(isCommitteeChairSlug),
    )
    const draftRole = getCommitteeRole(slug, draftCommittees, draftCommitteeChairs)
    return currentRole !== draftRole
  }

  function clearCommittees(row: PortalUserRow) {
    setCommitteeMessages((current) => {
      const next = { ...current }
      delete next[row.userId]
      return next
    })
    setCommitteeDrafts((current) => ({ ...current, [row.userId]: [] }))
    setCommitteeChairDrafts((current) => ({ ...current, [row.userId]: [] }))
  }

  function setCapabilityOverride(
    userId: string,
    capability: CapabilityKey,
    nextValue: "" | CapabilityOverrideValue,
  ) {
    setCapabilityMessages((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })
    setCapabilityOverrideDrafts((current) => {
      const existing = { ...(current[userId] ?? {}) }
      if (!nextValue) {
        delete existing[capability]
      } else {
        existing[capability] = nextValue
      }
      return { ...current, [userId]: existing }
    })
  }

  function clearCapabilityOverrides(row: PortalUserRow) {
    setCapabilityMessages((current) => {
      const next = { ...current }
      delete next[row.userId]
      return next
    })
    setCapabilityOverrideDrafts((current) => ({ ...current, [row.userId]: {} }))
  }

  async function saveCommittees(row: PortalUserRow) {
    const committees = getDraftCommittees(row)
    const committeeChairs = getDraftCommitteeChairs(row)
    setSavingUserId(row.userId)
    setError(null)
    setCommitteeMessages((current) => ({ ...current, [row.userId]: "" }))

    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          action: "set_committees",
          committees,
          committeeChairs,
        }),
      })
      const data = (await response.json()) as { success: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save committees.")
        return
      }

      setCommitteeMessages((current) => ({ ...current, [row.userId]: "Committees saved." }))
      await loadRows()
    } catch {
      setError("Failed to save committees.")
    } finally {
      setSavingUserId(null)
    }
  }

  async function saveCapabilityOverrides(row: PortalUserRow) {
    const previousOverrides = getCurrentCapabilityOverrides(row)
    const capabilityOverrides = getDraftCapabilityOverrides(row)
    const clearedCount = CAPABILITY_OPTIONS.reduce((count, option) => {
      const before = previousOverrides[option.key]
      const after = capabilityOverrides[option.key]
      return before && !after ? count + 1 : count
    }, 0)
    setSavingUserId(row.userId)
    setError(null)
    setCapabilityMessages((current) => ({ ...current, [row.userId]: "" }))

    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          action: "set_capability_overrides",
          capabilityOverrides,
        }),
      })
      const data = (await response.json()) as { success: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save capability overrides.")
        return
      }
      setCapabilityMessages((current) => ({ ...current, [row.userId]: "Capability overrides saved." }))
      if (clearedCount > 0) {
        setToastMessage(
          clearedCount === 1
            ? "1 capability override cleared to default."
            : `${clearedCount} capability overrides cleared to default.`,
        )
      }
      await loadRows()
    } catch {
      setError("Failed to save capability overrides.")
    } finally {
      setSavingUserId(null)
    }
  }

  function toggleExpanded(userId: string) {
    setExpandedRows((current) => ({
      ...current,
      [userId]: !current[userId],
    }))
  }

  async function runResetByEmail() {
    const emailAddress = resetEmailInput.trim().toLowerCase()
    if (!emailAddress) {
      setError("Enter an email address to reset.")
      return
    }
    const confirmed = window.confirm(
      `Reset test account for ${emailAddress}? This will delete matching Clerk user account(s).`,
    )
    if (!confirmed) return

    setResettingEmail(true)
    setError(null)
    setWarning(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_by_email", emailAddress }),
      })
      const data = (await response.json()) as {
        success: boolean
        error?: string
        warning?: string
        result?: { emailAddress: string; found: number; deleted: number; skippedSelf: number }
      }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to reset by email.")
        return
      }

      const result = data.result
      if (result) {
        const message = `Reset complete for ${result.emailAddress}: found ${result.found}, deleted ${result.deleted}, skipped self ${result.skippedSelf}.`
        setWarning(data.warning ? `${message} ${data.warning}` : message)
      } else if (data.warning) {
        setWarning(data.warning)
      }

      await loadRows()
    } catch {
      setError("Failed to reset by email.")
    } finally {
      setResettingEmail(false)
    }
  }

  function renderExpandedDetails(
    row: PortalUserRow,
    busy: boolean,
    draftCommittees: CommitteeSlug[],
    draftCommitteeChairs: CommitteeChairSlug[],
    draftCapabilityOverrides: Partial<Record<CapabilityKey, CapabilityOverrideValue>>,
    committeesDirty: boolean,
    committeeMessage: string | undefined,
    capabilityDirty: boolean,
    capabilityMessage: string | undefined,
    singleColumn = false,
  ) {
    const badgeLabel = row.committeesUpdatedAt
      ? `Last saved ${new Date(row.committeesUpdatedAt).toLocaleDateString()} by ${row.committeesUpdatedBy || "Unknown"}`
      : "No committee saves yet"

    const profileCards = [
      { label: "Address", value: row.homeAddress || "N/A" },
      { label: "Email", value: row.emailAddress || "N/A" },
      { label: "Submitted", value: row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "N/A" },
      { label: "Reviewed", value: row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : "N/A" },
      { label: "Reviewed By", value: row.reviewedBy || "N/A" },
      { label: "User ID", value: row.userId },
    ]

    const recentChanges = [
      row.reviewedAt
        ? {
            at: new Date(row.reviewedAt).getTime(),
            date: new Date(row.reviewedAt).toLocaleString(),
            user: row.reviewedBy || "Unknown",
            action: `Registration ${statusLabel(row.status)}`,
          }
        : null,
      row.committeesUpdatedAt
        ? {
            at: new Date(row.committeesUpdatedAt).getTime(),
            date: new Date(row.committeesUpdatedAt).toLocaleString(),
            user: row.committeesUpdatedBy || "Unknown",
            action: "Saved committee roles",
          }
        : null,
      row.capabilityOverridesUpdatedAt
        ? {
            at: new Date(row.capabilityOverridesUpdatedAt).getTime(),
            date: new Date(row.capabilityOverridesUpdatedAt).toLocaleString(),
            user: row.capabilityOverridesUpdatedBy || "Unknown",
            action: "Saved capability overrides",
          }
        : null,
    ]
      .filter((item): item is { at: number; date: string; user: string; action: string } => Boolean(item))
      .sort((a, b) => b.at - a.at)
      .slice(0, 5)

    const committeesCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.35rem" }}>
          Committees & Leadership
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 8.4rem", gap: "0.35rem 0.45rem", alignItems: "center" }}>
          <div style={{ color: "var(--pp-slate-500)", fontSize: "0.72rem", fontWeight: 700 }}>Committee</div>
          <div style={{ color: "var(--pp-slate-500)", fontSize: "0.72rem", fontWeight: 700 }}>Role</div>
          {COMMITTEE_OPTIONS.map((committee) => {
            const roleValue = getCommitteeRole(committee.slug, draftCommittees, draftCommitteeChairs)
            const canBeChair = CHAIR_ELIGIBLE_COMMITTEES.has(committee.slug)
            const roleChanged = hasCommitteeRoleChanged(
              row,
              committee.slug,
              draftCommittees,
              draftCommitteeChairs,
            )
            return (
              <Fragment
                key={committee.slug}
              >
                <div
                  style={{
                    color: "var(--pp-slate-800)",
                    fontSize: "0.82rem",
                    lineHeight: 1.25,
                    overflowWrap: "anywhere",
                    border: roleChanged ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                    borderRadius: "0.45rem",
                    padding: "0.38rem 0.5rem",
                    background: roleChanged
                      ? "#fff7ed"
                      : roleValue === "none"
                        ? "var(--pp-white)"
                        : "var(--pp-slate-50)",
                  }}
                >
                  {committee.label}
                </div>
                <select
                  value={roleValue}
                  onChange={(event) =>
                    setCommitteeRole(row.userId, committee.slug, event.target.value as CommitteeRoleDraft)
                  }
                  disabled={busy}
                  style={{
                    width: "100%",
                    border: roleChanged ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                    borderRadius: "0.45rem",
                    padding: "0.38rem 0.5rem",
                    background: roleChanged ? "#fff7ed" : "var(--pp-white)",
                    color: "var(--pp-slate-800)",
                  }}
                >
                  <option value="none">None</option>
                  <option value="member">Member</option>
                  {canBeChair ? <option value="chair">Chair</option> : null}
                </select>
              </Fragment>
            )
          })}
        </div>
        <div style={{ color: committeesDirty ? "#92400e" : "var(--pp-slate-500)", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.6rem" }}>
          {committeesDirty ? "Unsaved changes" : "No pending changes"}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.45rem" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => clearCommittees(row)}
            disabled={busy}
          >
            Select none
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => saveCommittees(row)}
            disabled={busy || !committeesDirty}
          >
            Save Committees
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.3rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid var(--pp-slate-200)",
              background: "var(--pp-slate-50)",
              color: "var(--pp-slate-700)",
              fontSize: "0.7rem",
              fontWeight: 600,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
            title={
              row.committeesUpdatedAt
                ? `Last saved by ${row.committeesUpdatedBy || "Unknown"} on ${new Date(row.committeesUpdatedAt).toLocaleString()}`
                : "No committee saves yet"
            }
          >
            {badgeLabel}
          </span>
        </div>
        {committeeMessage && (
          <div style={{ color: "#166534", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.5rem" }}>
            {committeeMessage}
          </div>
        )}
      </div>
    )

    const capabilityBadgeLabel = row.capabilityOverridesUpdatedAt
      ? `Last saved ${new Date(row.capabilityOverridesUpdatedAt).toLocaleDateString()} by ${row.capabilityOverridesUpdatedBy || "Unknown"}`
      : "No capability override saves yet"

    const grants = new Set<CapabilityKey>()
    const roleKeys: string[] = []
    if (draftCommittees.includes("board_of_directors")) roleKeys.push("board_of_directors")
    if (draftCommittees.includes("acc")) roleKeys.push("committee.acc.member")
    if (draftCommitteeChairs.includes("acc")) roleKeys.push("committee.acc.chair")
    if (draftCommittees.includes("access_control")) roleKeys.push("committee.access_control.member")
    if (draftCommitteeChairs.includes("access_control")) roleKeys.push("committee.access_control.chair")
    for (const roleKey of roleKeys) {
      for (const capability of DEFAULT_ROLE_GRANTS[roleKey] || []) {
        grants.add(capability)
      }
    }
    const currentCapabilityOverrides = getCurrentCapabilityOverrides(row)

    const capabilityRows = CAPABILITY_OPTIONS.map((capability) => {
      const override = draftCapabilityOverrides[capability.key]
      const selected = override ?? ""
      const currentSelected = currentCapabilityOverrides[capability.key] ?? ""
      const overrideChanged = selected !== currentSelected
      const isAllowed = row.portalAdmin || override === "allow" || (override !== "deny" && grants.has(capability.key))
      const source = row.portalAdmin
        ? "Admin"
        : override === "allow"
          ? "Override: Allow"
          : override === "deny"
            ? "Override: Deny"
            : grants.has(capability.key)
              ? "Role/Committee"
              : "None"
      return { capability, selected, isAllowed, source, overrideChanged }
    })
    const capabilityGridColumns = singleColumn
      ? "1fr"
      : "minmax(0, 1fr) minmax(10.75rem, 12rem) minmax(5.75rem, 6.5rem)"

    const capabilityCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.35rem" }}>
          Capability Overrides & Effective Summary
        </div>
        <div
          style={{
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "0.55rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: capabilityGridColumns,
              gap: "0.4rem",
              padding: "0.45rem 0.55rem",
              background: "var(--pp-slate-50)",
              borderBottom: "1px solid var(--pp-slate-200)",
              color: "var(--pp-slate-600)",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            <div>Overrides</div>
            {!singleColumn ? <div>Current Override</div> : null}
            {!singleColumn ? <div style={{ textAlign: "right" }}>Effective</div> : null}
          </div>
          {capabilityRows.map(({ capability, selected, isAllowed, source, overrideChanged }, index) => (
            <div
              key={capability.key}
              style={{
                display: "grid",
                gridTemplateColumns: capabilityGridColumns,
                gap: "0.4rem",
                padding: "0.45rem 0.55rem",
                alignItems: "center",
                borderTop: index === 0 ? "none" : "1px solid var(--pp-slate-100)",
                background: overrideChanged ? "#fff7ed" : "var(--pp-white)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "var(--pp-slate-800)", fontSize: "0.8rem", fontWeight: 700 }}>
                  {capability.label}
                </div>
                <div
                  style={{ color: "var(--pp-slate-500)", fontSize: "0.72rem" }}
                  title={capability.description}
                >
                  {source}
                </div>
              </div>
              {singleColumn ? (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <select
                    value={selected}
                    onChange={(event) =>
                      setCapabilityOverride(
                        row.userId,
                        capability.key,
                        event.target.value as "" | CapabilityOverrideValue,
                      )
                    }
                    disabled={busy}
                    style={{
                      flex: "1 1 12rem",
                      minWidth: "12rem",
                      border: overrideChanged ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                      borderRadius: "0.45rem",
                      padding: "0.35rem 0.45rem",
                      background: overrideChanged ? "#fff7ed" : "var(--pp-white)",
                      color: "var(--pp-slate-800)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <option value="">Default (role/committee)</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: "999px",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: isAllowed ? "#dcfce7" : "#fee2e2",
                      color: isAllowed ? "#166534" : "#991b1b",
                      border: `1px solid ${isAllowed ? "#86efac" : "#fca5a5"}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isAllowed ? "Granted" : "Denied"}
                  </span>
                </div>
              ) : (
                <>
                  <select
                    value={selected}
                    onChange={(event) =>
                      setCapabilityOverride(
                        row.userId,
                        capability.key,
                        event.target.value as "" | CapabilityOverrideValue,
                      )
                    }
                    disabled={busy}
                    style={{
                      width: "100%",
                      border: overrideChanged ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                      borderRadius: "0.45rem",
                      padding: "0.35rem 0.45rem",
                      background: overrideChanged ? "#fff7ed" : "var(--pp-white)",
                      color: "var(--pp-slate-800)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <option value="">Default (role/committee)</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "999px",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: isAllowed ? "#dcfce7" : "#fee2e2",
                        color: isAllowed ? "#166534" : "#991b1b",
                        border: `1px solid ${isAllowed ? "#86efac" : "#fca5a5"}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isAllowed ? "Granted" : "Denied"}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ color: capabilityDirty ? "#92400e" : "var(--pp-slate-500)", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.6rem" }}>
          {capabilityDirty ? "Unsaved changes" : "No pending changes"}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.45rem" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => clearCapabilityOverrides(row)}
            disabled={busy}
          >
            Clear Overrides
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => saveCapabilityOverrides(row)}
            disabled={busy || !capabilityDirty}
          >
            Save Capabilities
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.3rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid var(--pp-slate-200)",
              background: "var(--pp-slate-50)",
              color: "var(--pp-slate-700)",
              fontSize: "0.7rem",
              fontWeight: 600,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
            title={
              row.capabilityOverridesUpdatedAt
                ? `Last saved by ${row.capabilityOverridesUpdatedBy || "Unknown"} on ${new Date(
                    row.capabilityOverridesUpdatedAt,
                  ).toLocaleString()}`
                : "No capability override saves yet"
            }
          >
            {capabilityBadgeLabel}
          </span>
        </div>
        {capabilityMessage && (
          <div style={{ color: "#166534", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.5rem" }}>
            {capabilityMessage}
          </div>
        )}
      </div>
    )

    const summaryCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.35rem" }}>
          Summary & History
        </div>
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "var(--pp-slate-700)",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "0.45rem",
            }}
          >
            Recent changes ({recentChanges.length})
          </summary>
          {recentChanges.length ? (
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {recentChanges.map((item, index) => (
                <div
                  key={`${item.date}-${item.action}-${index}`}
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    borderRadius: "0.45rem",
                    padding: "0.38rem 0.5rem",
                    background: "var(--pp-white)",
                  }}
                >
                  <div style={{ color: "var(--pp-slate-800)", fontSize: "0.78rem", fontWeight: 700 }}>
                    {item.action}
                  </div>
                  <div style={{ color: "var(--pp-slate-600)", fontSize: "0.72rem" }}>
                    {item.date} by {item.user}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--pp-slate-500)", fontSize: "0.76rem" }}>No recent changes.</div>
          )}
        </details>
      </div>
    )

    if (singleColumn) {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
          {profileCards.map((card) => (
            <div key={card.label} style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>{card.label}</div>
              <div style={{ color: "var(--pp-slate-800)", lineHeight: 1.35, overflowWrap: "anywhere" }}>{card.value}</div>
            </div>
          ))}
          {committeesCard}
          {capabilityCard}
          {summaryCard}
        </div>
      )
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isWideDetailsLayout
            ? "minmax(220px, 300px) minmax(420px, 1.2fr) minmax(240px, 0.9fr)"
            : "minmax(260px, 320px) minmax(0, 1fr)",
          gap: "0.7rem",
          alignItems: "start",
        }}
      >
        {isWideDetailsLayout ? (
          <>
            <div style={{ alignSelf: "start" }}>{committeesCard}</div>
            <div style={{ alignSelf: "start" }}>{capabilityCard}</div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem", alignSelf: "start" }}>
            {committeesCard}
            {capabilityCard}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isWideDetailsLayout ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: isWideDetailsLayout ? undefined : "repeat(5, minmax(0, 1fr))",
            gap: "0.7rem",
          }}
        >
          {profileCards.map((card) => (
            <div key={card.label} style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>{card.label}</div>
              <div style={{ color: "var(--pp-slate-800)", lineHeight: 1.35, overflowWrap: "anywhere" }}>{card.value}</div>
            </div>
          ))}
          {summaryCard}
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: "var(--space-m)" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {statusOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className="btn btn-outline btn-sm"
            style={status === option.key ? { background: "var(--pp-slate-100)" } : undefined}
            onClick={() => setStatus(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: "0", flex: "1 1 20rem" }}>
          <Search
            style={{
              width: "0.95rem",
              height: "0.95rem",
              position: "absolute",
              left: "0.7rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--pp-slate-500)",
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem 0.6rem 2.1rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
            }}
          />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>
          <RefreshCw style={{ width: "0.9rem", height: "0.9rem", marginRight: "0.25rem" }} />
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="email"
          placeholder="Reset test account by email..."
          value={resetEmailInput}
          onChange={(event) => setResetEmailInput(event.target.value)}
          style={{
            minWidth: "18rem",
            flex: "1 1 18rem",
            padding: "0.52rem 0.7rem",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--pp-slate-200)",
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={runResetByEmail}
          disabled={resettingEmail}
          style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
        >
          {resettingEmail ? "Resetting..." : "Reset by Email"}
        </button>
      </div>

      {error && (
        <p className="text-fluid-sm" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {warning && (
        <p className="text-fluid-sm" style={{ color: "#92400e", fontWeight: 600 }}>
          {warning}
        </p>
      )}

      {loading ? (
        <div className="card" style={{ padding: "var(--space-l)" }}>
          <p>Loading resident directory...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-l)" }}>
          <p>No records found for this filter.</p>
        </div>
      ) : isCompactLayout ? (
        <div className="stack" style={{ gap: "0.8rem" }}>
          {rows.map((row) => {
            const busy = savingUserId === row.userId
            const expanded = expandedRows[row.userId] === true
            const draftCommittees = getDraftCommittees(row)
            const draftCommitteeChairs = getDraftCommitteeChairs(row)
            const draftCapabilityOverrides = getDraftCapabilityOverrides(row)
            const committeesDirty = hasCommitteeChanges(row)
            const capabilityDirty = hasCapabilityChanges(row)
            const committeeMessage = committeeMessages[row.userId]
            const capabilityMessage = capabilityMessages[row.userId]

            return (
              <div key={row.userId} style={{ borderRadius: "0.8rem", border: "1px solid var(--pp-slate-200)", overflow: "hidden" }}>
                <div style={{ padding: "0.85rem", background: "var(--pp-white)", borderBottom: "1px solid var(--pp-slate-100)" }}>
                  <div style={{ fontWeight: 800, color: "var(--pp-navy-dark)", fontSize: "1.05rem" }}>{row.fullName || "Unknown"}</div>
                  <div style={{ marginTop: "0.2rem", color: "var(--pp-slate-700)", fontSize: "0.9rem" }}>
                    Username: {row.username || "N/A"}
                  </div>
                  <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Status: {statusLabel(row.status)}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Admin: {row.portalAdmin ? "Yes" : "No"}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Last Active: {formatLastActive(row.lastActiveAt)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => runAction(row.userId, "approve")}
                      disabled={busy}
                    >
                      <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => runAction(row.userId, "reject")}
                      disabled={busy}
                    >
                      <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")}
                      disabled={busy}
                    >
                      <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                      onClick={() => runAction(row.userId, "delete_user")}
                      disabled={busy}
                      title="Delete user from Clerk"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleExpanded(row.userId)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Collapse row details" : "Expand row details"}
                    >
                      {expanded ? "Hide Details" : "Show Details"}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: "0.85rem", background: "var(--pp-slate-50)" }}>
                    {renderExpandedDetails(
                      row,
                      busy,
                      draftCommittees,
                      draftCommitteeChairs,
                      draftCapabilityOverrides,
                      committeesDirty,
                      committeeMessage,
                      capabilityDirty,
                      capabilityMessage,
                      true,
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
            <thead style={{ background: "var(--pp-slate-50)" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem" }}>Resident</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "9.5rem" }}>Portal Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "13rem" }}>Last Active</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "4.5rem" }}>Admin</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.78rem", width: "23rem" }}>Actions</th>
                <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.78rem", width: "3rem" }} aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = savingUserId === row.userId
                const expanded = expandedRows[row.userId] === true
                const draftCommittees = getDraftCommittees(row)
                const draftCommitteeChairs = getDraftCommitteeChairs(row)
                const draftCapabilityOverrides = getDraftCapabilityOverrides(row)
                const committeesDirty = hasCommitteeChanges(row)
                const capabilityDirty = hasCapabilityChanges(row)
                const committeeMessage = committeeMessages[row.userId]
                const capabilityMessage = capabilityMessages[row.userId]

                return (
                  <Fragment key={row.userId}>
                    <tr key={`${row.userId}-primary`} style={{ borderTop: "1px solid var(--pp-slate-100)" }}>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{row.fullName || "Unknown"}</div>
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", fontWeight: 600 }}>
                        {statusLabel(row.status)}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {formatLastActive(row.lastActiveAt)}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {row.portalAdmin ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", width: "23rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "nowrap", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => runAction(row.userId, "approve")}
                            disabled={busy}
                          >
                            <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => runAction(row.userId, "reject")}
                            disabled={busy}
                          >
                            <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")}
                            disabled={busy}
                          >
                            <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                            onClick={() => runAction(row.userId, "delete_user")}
                            disabled={busy}
                            title="Delete user from Clerk"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ width: "2rem", minWidth: "2rem", paddingInline: "0", justifyContent: "center" }}
                          onClick={() => toggleExpanded(row.userId)}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Collapse row details" : "Expand row details"}
                          aria-controls={`resident-row-details-${row.userId}`}
                        >
                          <ChevronRight
                            style={{
                              width: "0.95rem",
                              height: "0.95rem",
                              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.18s ease",
                            }}
                          />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr
                        key={`${row.userId}-details`}
                        id={`resident-row-details-${row.userId}`}
                        style={{ borderTop: "1px solid var(--pp-slate-100)" }}
                      >
                        <td colSpan={6} style={{ padding: "1rem", background: "var(--pp-slate-50)" }}>
                          {renderExpandedDetails(
                            row,
                            busy,
                            draftCommittees,
                            draftCommitteeChairs,
                            draftCapabilityOverrides,
                            committeesDirty,
                            committeeMessage,
                            capabilityDirty,
                            capabilityMessage,
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 80,
            background: "#ecfdf3",
            color: "#166534",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            padding: "0.5rem 0.7rem",
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.15)",
            fontSize: "0.78rem",
            fontWeight: 700,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
