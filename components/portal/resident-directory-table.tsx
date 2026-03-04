"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
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
type DirectoryCounts = Record<DirectoryStatus, number>
type DirectoryAction =
  | "approve"
  | "reject"
  | "set_admin"
  | "unset_admin"
  | "set_committees"
  | "set_profile_name"
  | "set_capability_overrides"
  | "send_password_reset"
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
  profileNameUpdatedAt: string
  profileNameUpdatedBy: string
  passwordResetSentAt: string
  passwordResetSentBy: string
}

interface InactiveReportRow extends PortalUserRow {
  inactiveDays: number | null
}

interface CleanupAuditPayload {
  audit: {
    actorUserId: string
    actorEmail: string
    at: string
    policy: {
      inactiveDays: number
      includeAdmins: boolean
      includeNever: boolean
      statusFilter: string[]
    }
    candidateCount: number
    deletedCount: number
    failedCount: number
    skippedSelfCount: number
  }
  deletedUserIds: string[]
  skippedSelfUserIds: string[]
  failed: Array<{ userId: string; reason: string }>
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

function primaryActionForStatus(status: PortalUserRow["status"]): "approve" | "reject" {
  return status === "approved" ? "reject" : "approve"
}

function workflowStatusMeta(status: PortalUserRow["status"]) {
  if (status === "pending") {
    return { label: "Needs review", detail: "Awaiting approval decision", bg: "#fff7ed", color: "#9a3412", border: "#fdba74" }
  }
  if (status === "approved") {
    return { label: "Approved", detail: "Portal access granted", bg: "#ecfdf3", color: "#166534", border: "#86efac" }
  }
  if (status === "rejected") {
    return { label: "Rejected", detail: "Portal access denied", bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" }
  }
  return { label: "No registration", detail: "No portal registration submitted", bg: "#f8fafc", color: "#475569", border: "#cbd5e1" }
}

export function ResidentDirectoryTable() {
  const [rows, setRows] = useState<PortalUserRow[]>([])
  const [status, setStatus] = useState<DirectoryStatus>("all")
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusCounts, setStatusCounts] = useState<DirectoryCounts>({
    all: 0,
    not_submitted: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [resetEmailInput, setResetEmailInput] = useState("")
  const [resettingEmail, setResettingEmail] = useState(false)
  const [inactiveThresholdDays, setInactiveThresholdDays] = useState("180")
  const [inactiveIncludeAdmins, setInactiveIncludeAdmins] = useState(false)
  const [inactiveReportLoading, setInactiveReportLoading] = useState(false)
  const [inactiveReportError, setInactiveReportError] = useState<string | null>(null)
  const [inactiveReportRows, setInactiveReportRows] = useState<InactiveReportRow[]>([])
  const [inactiveReportGeneratedAt, setInactiveReportGeneratedAt] = useState<string>("")
  const [cleanupIncludePending, setCleanupIncludePending] = useState(false)
  const [cleanupIncludeApproved, setCleanupIncludeApproved] = useState(false)
  const [cleanupPreviewLoading, setCleanupPreviewLoading] = useState(false)
  const [cleanupExecuteLoading, setCleanupExecuteLoading] = useState(false)
  const [cleanupError, setCleanupError] = useState<string | null>(null)
  const [cleanupPreviewRows, setCleanupPreviewRows] = useState<InactiveReportRow[]>([])
  const [cleanupConfirmationPhrase, setCleanupConfirmationPhrase] = useState("")
  const [cleanupConfirmInput, setCleanupConfirmInput] = useState("")
  const [cleanupResultSummary, setCleanupResultSummary] = useState<string | null>(null)
  const [cleanupAuditPayload, setCleanupAuditPayload] = useState<CleanupAuditPayload | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [committeeDrafts, setCommitteeDrafts] = useState<Record<string, CommitteeSlug[]>>({})
  const [committeeChairDrafts, setCommitteeChairDrafts] = useState<Record<string, CommitteeChairSlug[]>>({})
  const [nameDrafts, setNameDrafts] = useState<Record<string, { firstName: string; lastName: string }>>({})
  const [capabilityOverrideDrafts, setCapabilityOverrideDrafts] = useState<
    Record<string, Partial<Record<CapabilityKey, CapabilityOverrideValue>>>
  >({})
  const [committeeMessages, setCommitteeMessages] = useState<Record<string, string>>({})
  const [profileMessages, setProfileMessages] = useState<Record<string, string>>({})
  const [capabilityMessages, setCapabilityMessages] = useState<Record<string, string>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isCompactLayout, setIsCompactLayout] = useState(false)
  const [openMoreMenuUserId, setOpenMoreMenuUserId] = useState<string | null>(null)
  const moreMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      query.set("status", status)
      if (searchQuery.trim()) query.set("q", searchQuery.trim())

      const response = await fetch(`/api/portal-users?${query.toString()}`)
      const data = (await response.json()) as {
        success: boolean
        rows?: PortalUserRow[]
        counts?: Partial<DirectoryCounts>
        error?: string
      }

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load directory users.")
        setRows([])
        return
      }

      setRows(data.rows || [])
      setOpenMoreMenuUserId(null)
      setStatusCounts({
        all: data.counts?.all ?? 0,
        not_submitted: data.counts?.not_submitted ?? 0,
        pending: data.counts?.pending ?? 0,
        approved: data.counts?.approved ?? 0,
        rejected: data.counts?.rejected ?? 0,
      })
      setCommitteeDrafts({})
      setCommitteeChairDrafts({})
      setNameDrafts({})
      setCapabilityOverrideDrafts({})
      setCommitteeMessages({})
      setProfileMessages({})
      setCapabilityMessages({})
    } catch {
      setError("Failed to load directory users.")
      setRows([])
      setStatusCounts({ all: 0, not_submitted: 0, pending: 0, approved: 0, rejected: 0 })
    } finally {
      setLoading(false)
    }
  }, [searchQuery, status])

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
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!openMoreMenuUserId) return
    const menu = moreMenuRefs.current[openMoreMenuUserId]
    const firstItem = menu?.querySelector<HTMLButtonElement>("[data-more-menu-item='true']")
    firstItem?.focus()

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("[data-row-more-menu='true']")) return
      setOpenMoreMenuUserId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMoreMenuUserId(null)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [openMoreMenuUserId])

  function handleMoreMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-more-menu-item='true']"),
    )
    if (!items.length) return

    const activeIndex = items.findIndex((item) => item === document.activeElement)
    if (event.key === "ArrowDown") {
      event.preventDefault()
      const nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length
      items[nextIndex]?.focus()
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      const nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length
      items[nextIndex]?.focus()
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      items[0]?.focus()
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

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
      if (action === "send_password_reset") {
        setWarning("Password reset email sent.")
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

  function getDraftName(row: PortalUserRow) {
    const draft = nameDrafts[row.userId]
    return {
      firstName: draft?.firstName ?? row.firstName,
      lastName: draft?.lastName ?? row.lastName,
    }
  }

  function hasNameChanges(row: PortalUserRow): boolean {
    const draft = getDraftName(row)
    return draft.firstName.trim() !== row.firstName.trim() || draft.lastName.trim() !== row.lastName.trim()
  }

  function setNameField(row: PortalUserRow, field: "firstName" | "lastName", value: string) {
    const userId = row.userId
    setProfileMessages((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })
    setNameDrafts((current) => {
      const existing = current[userId] ?? { firstName: row.firstName, lastName: row.lastName }
      return {
        ...current,
        [userId]: {
          ...existing,
          [field]: value,
        },
      }
    })
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

  async function saveProfileName(row: PortalUserRow) {
    const draft = getDraftName(row)
    const firstName = draft.firstName.trim()
    const lastName = draft.lastName.trim()

    if (!firstName || !lastName) {
      setError("First and last name are required.")
      return
    }

    setSavingUserId(row.userId)
    setError(null)
    setProfileMessages((current) => ({ ...current, [row.userId]: "" }))
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          action: "set_profile_name",
          firstName,
          lastName,
        }),
      })
      const data = (await response.json()) as { success: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save profile name.")
        return
      }
      setProfileMessages((current) => ({ ...current, [row.userId]: "Name updated." }))
      await loadRows()
    } catch {
      setError("Failed to save profile name.")
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

  function formatInactiveDays(value: number | null) {
    if (value === null) return "Never signed in"
    if (value === 1) return "1 day"
    return `${value} days`
  }

  function cleanupStatusFilterCsv() {
    const values = ["not_submitted", "rejected"]
    if (cleanupIncludePending) values.push("pending")
    if (cleanupIncludeApproved) values.push("approved")
    return values.join(",")
  }

  async function runInactiveReport() {
    const parsedDays = Math.max(1, Math.min(3650, Number(inactiveThresholdDays) || 180))
    setInactiveReportLoading(true)
    setInactiveReportError(null)
    try {
      const query = new URLSearchParams()
      query.set("report", "inactive")
      query.set("inactive_days", String(parsedDays))
      query.set("include_admins", String(inactiveIncludeAdmins))
      query.set("include_never", "true")
      const response = await fetch(`/api/portal-users?${query.toString()}`)
      const data = (await response.json()) as {
        success: boolean
        rows?: InactiveReportRow[]
        error?: string
      }
      if (!response.ok || !data.success) {
        setInactiveReportError(data.error || "Failed to run inactive user report.")
        setInactiveReportRows([])
        return
      }
      setInactiveReportRows(data.rows || [])
      setInactiveReportGeneratedAt(new Date().toISOString())
      setInactiveThresholdDays(String(parsedDays))
    } catch {
      setInactiveReportError("Failed to run inactive user report.")
      setInactiveReportRows([])
    } finally {
      setInactiveReportLoading(false)
    }
  }

  function exportInactiveReportCsv() {
    if (!inactiveReportRows.length) return
    const escape = (value: string) => `"${value.replace(/"/g, "\"\"")}"`
    const header = [
      "Name",
      "Email",
      "Address",
      "Status",
      "Last Active",
      "Inactive Days",
      "Portal Admin",
      "Committees",
    ]
    const lines = inactiveReportRows.map((row) =>
      [
        row.fullName || `${row.firstName} ${row.lastName}`.trim() || row.username || row.userId,
        row.emailAddress || "",
        row.homeAddress || "",
        statusLabel(row.status),
        row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleString() : "Never",
        row.inactiveDays === null ? "Never signed in" : String(row.inactiveDays),
        row.portalAdmin ? "Yes" : "No",
        row.committees.join(", "),
      ]
        .map((value) => escape(String(value)))
        .join(","),
    )
    const csv = [header.map((value) => escape(value)).join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `inactive-users-report-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function runCleanupPreview() {
    const parsedDays = Math.max(1, Math.min(3650, Number(inactiveThresholdDays) || 180))
    setCleanupPreviewLoading(true)
    setCleanupError(null)
    setCleanupResultSummary(null)
    setCleanupConfirmInput("")
    setCleanupAuditPayload(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cleanup_inactive_preview",
          inactiveDays: parsedDays,
          includeAdmins: inactiveIncludeAdmins,
          includeNever: true,
          statusFilter: cleanupStatusFilterCsv(),
        }),
      })
      const data = (await response.json()) as {
        success: boolean
        rows?: InactiveReportRow[]
        confirmationPhrase?: string
        error?: string
      }
      if (!response.ok || !data.success) {
        setCleanupError(data.error || "Failed to run cleanup preview.")
        setCleanupPreviewRows([])
        setCleanupConfirmationPhrase("")
        return
      }
      setCleanupPreviewRows(data.rows || [])
      setCleanupConfirmationPhrase(data.confirmationPhrase || "")
      setInactiveThresholdDays(String(parsedDays))
    } catch {
      setCleanupError("Failed to run cleanup preview.")
      setCleanupPreviewRows([])
      setCleanupConfirmationPhrase("")
    } finally {
      setCleanupPreviewLoading(false)
    }
  }

  async function executeInactiveCleanup() {
    if (!cleanupConfirmationPhrase || cleanupConfirmInput.trim() !== cleanupConfirmationPhrase) return
    const parsedDays = Math.max(1, Math.min(3650, Number(inactiveThresholdDays) || 180))
    setCleanupExecuteLoading(true)
    setCleanupError(null)
    setCleanupResultSummary(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cleanup_inactive_execute",
          inactiveDays: parsedDays,
          includeAdmins: inactiveIncludeAdmins,
          includeNever: true,
          statusFilter: cleanupStatusFilterCsv(),
          confirmText: cleanupConfirmInput.trim(),
        }),
      })
      const data = (await response.json()) as {
        success: boolean
        audit: CleanupAuditPayload["audit"]
        deletedUserIds?: string[]
        failed?: Array<{ userId: string; reason: string }>
        skippedSelfUserIds?: string[]
        error?: string
      }
      if (!response.ok || !data.success) {
        setCleanupError(data.error || "Failed to execute cleanup.")
        return
      }
      const deleted = data.deletedUserIds?.length ?? 0
      const failed = data.failed?.length ?? 0
      const skipped = data.skippedSelfUserIds?.length ?? 0
      setCleanupAuditPayload({
        audit: data.audit,
        deletedUserIds: data.deletedUserIds ?? [],
        skippedSelfUserIds: data.skippedSelfUserIds ?? [],
        failed: data.failed ?? [],
      })
      setCleanupResultSummary(
        `Cleanup complete: deleted ${deleted}, failed ${failed}, skipped self ${skipped}.`,
      )
      setCleanupConfirmInput("")
      await runCleanupPreview()
      await runInactiveReport()
      await loadRows()
    } catch {
      setCleanupError("Failed to execute cleanup.")
    } finally {
      setCleanupExecuteLoading(false)
    }
  }

  function downloadCleanupAuditJson() {
    if (!cleanupAuditPayload) return
    const json = JSON.stringify(cleanupAuditPayload, null, 2)
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const stamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19)
    link.href = url
    link.download = `cleanup-audit-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function downloadCleanupAuditCsv() {
    if (!cleanupAuditPayload) return
    const escape = (value: string) => `"${value.replace(/"/g, "\"\"")}"`
    const lines: string[] = []
    lines.push([escape("section"), escape("field"), escape("value")].join(","))
    lines.push([escape("audit"), escape("at"), escape(cleanupAuditPayload.audit.at)].join(","))
    lines.push([escape("audit"), escape("actorUserId"), escape(cleanupAuditPayload.audit.actorUserId)].join(","))
    lines.push([escape("audit"), escape("actorEmail"), escape(cleanupAuditPayload.audit.actorEmail || "")].join(","))
    lines.push([escape("audit"), escape("inactiveDays"), escape(String(cleanupAuditPayload.audit.policy.inactiveDays))].join(","))
    lines.push([escape("audit"), escape("includeAdmins"), escape(String(cleanupAuditPayload.audit.policy.includeAdmins))].join(","))
    lines.push([escape("audit"), escape("includeNever"), escape(String(cleanupAuditPayload.audit.policy.includeNever))].join(","))
    lines.push([escape("audit"), escape("statusFilter"), escape(cleanupAuditPayload.audit.policy.statusFilter.join("|"))].join(","))
    lines.push([escape("audit"), escape("candidateCount"), escape(String(cleanupAuditPayload.audit.candidateCount))].join(","))
    lines.push([escape("audit"), escape("deletedCount"), escape(String(cleanupAuditPayload.audit.deletedCount))].join(","))
    lines.push([escape("audit"), escape("failedCount"), escape(String(cleanupAuditPayload.audit.failedCount))].join(","))
    lines.push([escape("audit"), escape("skippedSelfCount"), escape(String(cleanupAuditPayload.audit.skippedSelfCount))].join(","))
    for (const userId of cleanupAuditPayload.deletedUserIds) {
      lines.push([escape("deleted"), escape("userId"), escape(userId)].join(","))
    }
    for (const userId of cleanupAuditPayload.skippedSelfUserIds) {
      lines.push([escape("skippedSelf"), escape("userId"), escape(userId)].join(","))
    }
    for (const failure of cleanupAuditPayload.failed) {
      lines.push([escape("failed"), escape(failure.userId), escape(failure.reason)].join(","))
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const stamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19)
    link.href = url
    link.download = `cleanup-audit-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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
    const draftName = getDraftName(row)
    const nameDirty = hasNameChanges(row)
    const profileMessage = profileMessages[row.userId]
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
      row.profileNameUpdatedAt
        ? {
            at: new Date(row.profileNameUpdatedAt).getTime(),
            date: new Date(row.profileNameUpdatedAt).toLocaleString(),
            user: row.profileNameUpdatedBy || "Unknown",
            action: "Updated resident name",
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

    const historyCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.35rem" }}>
          Recent changes ({recentChanges.length})
        </div>
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
      </div>
    )

    const profileBadgeLabel = row.profileNameUpdatedAt
      ? `Last saved ${new Date(row.profileNameUpdatedAt).toLocaleDateString()} by ${row.profileNameUpdatedBy || "Unknown"}`
      : "No profile name saves yet"

    const profileNameCard = (
      <div
        style={{
          background: "var(--pp-white)",
          border: "1px solid var(--pp-slate-200)",
          borderRadius: "0.65rem",
          padding: "0.7rem 0.8rem",
          minWidth: 0,
          gridColumn: singleColumn ? "auto" : "1 / -1",
        }}
      >
        <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.35rem" }}>
          Resident Name
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: singleColumn ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
        >
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700 }}>
            First Name
            <input
              type="text"
              value={draftName.firstName}
              onChange={(event) => setNameField(row, "firstName", event.target.value)}
              disabled={busy}
              style={{
                border: nameDirty ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                borderRadius: "0.45rem",
                padding: "0.45rem 0.55rem",
                background: nameDirty ? "#fff7ed" : "var(--pp-white)",
                color: "var(--pp-slate-800)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700 }}>
            Last Name
            <input
              type="text"
              value={draftName.lastName}
              onChange={(event) => setNameField(row, "lastName", event.target.value)}
              disabled={busy}
              style={{
                border: nameDirty ? "1px solid #f59e0b" : "1px solid var(--pp-slate-200)",
                borderRadius: "0.45rem",
                padding: "0.45rem 0.55rem",
                background: nameDirty ? "#fff7ed" : "var(--pp-white)",
                color: "var(--pp-slate-800)",
              }}
            />
          </label>
        </div>
        <div style={{ color: nameDirty ? "#92400e" : "var(--pp-slate-500)", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.6rem" }}>
          {nameDirty ? "Unsaved changes" : "No pending changes"}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.45rem" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => saveProfileName(row)}
            disabled={busy || !nameDirty}
          >
            Save Name
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
              row.profileNameUpdatedAt
                ? `Last saved by ${row.profileNameUpdatedBy || "Unknown"} on ${new Date(row.profileNameUpdatedAt).toLocaleString()}`
                : "No profile name saves yet"
            }
          >
            {profileBadgeLabel}
          </span>
        </div>
        {profileMessage ? (
          <div style={{ color: "#166534", fontSize: "0.76rem", fontWeight: 600, marginTop: "0.5rem" }}>
            {profileMessage}
          </div>
        ) : null}
      </div>
    )

    const profileGrid = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: singleColumn ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "0.7rem",
        }}
      >
        {profileNameCard}
        {profileCards.map((card) => (
          <div key={card.label} style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--pp-slate-600)", fontWeight: 700, marginBottom: "0.2rem" }}>{card.label}</div>
            <div style={{ color: "var(--pp-slate-800)", lineHeight: 1.35, overflowWrap: "anywhere" }}>{card.value}</div>
          </div>
        ))}
      </div>
    )

    const advancedCard = (
      <div style={{ background: "var(--pp-white)", border: "1px solid var(--pp-slate-200)", borderRadius: "0.65rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
        <div style={{ color: "var(--pp-slate-500)", fontSize: "0.76rem", marginBottom: "0.55rem" }}>
          High-impact actions are grouped here to reduce accidental clicks.
        </div>
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => runAction(row.userId, "send_password_reset")}
            disabled={busy}
            title={`Send password reset email to ${row.emailAddress || "primary email"}`}
          >
            Send Password Reset
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
              row.passwordResetSentAt
                ? `Last reset email sent by ${row.passwordResetSentBy || "Unknown"} on ${new Date(row.passwordResetSentAt).toLocaleString()}`
                : "No password reset emails sent yet"
            }
          >
            {row.passwordResetSentAt
              ? `Reset sent ${new Date(row.passwordResetSentAt).toLocaleDateString()} by ${row.passwordResetSentBy || "Unknown"}`
              : "No reset emails sent yet"}
          </span>
        </div>
      </div>
    )

    const accessSectionBody = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: singleColumn ? "1fr" : "minmax(260px, 1fr) minmax(320px, 1.35fr)",
          gap: "0.7rem",
          alignItems: "start",
          marginTop: "0.7rem",
        }}
      >
        {committeesCard}
        {capabilityCard}
      </div>
    )

    const accordionSummaryStyle: React.CSSProperties = {
      cursor: "pointer",
      fontSize: "0.88rem",
      fontWeight: 700,
      color: "var(--pp-navy-dark)",
      listStyle: "none",
    }

    const accordionContainerStyle: React.CSSProperties = {
      borderRadius: "0.75rem",
      border: "1px solid var(--pp-slate-200)",
      background: "var(--pp-white)",
      padding: "0.7rem 0.8rem",
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
        <details open data-collapsible="true" style={accordionContainerStyle}>
          <summary style={accordionSummaryStyle}>
            <span className="accordion-caret" aria-hidden>
              ▸
            </span>
            Access Roles {committeesDirty || capabilityDirty ? "• Unsaved changes" : ""}
          </summary>
          {accessSectionBody}
        </details>

        <details data-collapsible="true" style={accordionContainerStyle}>
          <summary style={accordionSummaryStyle}>
            <span className="accordion-caret" aria-hidden>
              ▸
            </span>
            Profile Metadata
          </summary>
          <div style={{ marginTop: "0.7rem" }}>{profileGrid}</div>
        </details>

        <details data-collapsible="true" style={accordionContainerStyle}>
          <summary style={accordionSummaryStyle}>
            <span className="accordion-caret" aria-hidden>
              ▸
            </span>
            Audit & History
          </summary>
          <div style={{ marginTop: "0.7rem" }}>{historyCard}</div>
        </details>

        <details data-collapsible="true" style={accordionContainerStyle}>
          <summary style={accordionSummaryStyle}>
            <span className="accordion-caret" aria-hidden>
              ▸
            </span>
            Advanced
          </summary>
          <div style={{ marginTop: "0.7rem" }}>{advancedCard}</div>
        </details>
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
            {option.label} ({statusCounts[option.key] ?? 0})
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSearchQuery(searchInput.trim())
        }}
        style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}
      >
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
            className="directory-search-input"
            type="text"
            placeholder="Search by name, email, or address..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem 0.6rem 2.1rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
            }}
          />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
          Search
        </button>
        {searchInput || searchQuery ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearchInput("")
              setSearchQuery("")
            }}
            disabled={loading}
          >
            Clear
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>
          <RefreshCw style={{ width: "0.9rem", height: "0.9rem", marginRight: "0.25rem" }} />
          Refresh
        </button>
      </form>

      {searchQuery ? (
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
          Showing results for <strong>{searchQuery}</strong>
        </p>
      ) : null}

      <details
        data-collapsible="true"
        style={{
          border: "1px solid var(--pp-slate-200)",
          borderRadius: "0.65rem",
          padding: "0.65rem 0.75rem",
          background: "var(--pp-white)",
        }}
      >
        <summary style={{ cursor: "pointer", color: "var(--pp-slate-700)", fontWeight: 700, fontSize: "0.82rem", listStyle: "none" }}>
          <span className="accordion-caret" aria-hidden>
            ▸
          </span>
          Advanced Utilities
        </summary>
        <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.65rem" }}>
          <input
            className="directory-search-input"
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

        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--pp-slate-200)",
            display: "grid",
            gap: "0.55rem",
          }}
        >
          <div style={{ color: "var(--pp-slate-700)", fontWeight: 700, fontSize: "0.82rem" }}>Inactive Users Report</div>
          <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--pp-slate-700)", fontSize: "0.82rem", fontWeight: 600 }}
            >
              Inactive for at least
              <input
                type="number"
                min={1}
                max={3650}
                value={inactiveThresholdDays}
                onChange={(event) => setInactiveThresholdDays(event.target.value)}
                style={{
                  width: "6rem",
                  padding: "0.42rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                }}
              />
              days
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--pp-slate-700)", fontSize: "0.82rem", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={inactiveIncludeAdmins}
                onChange={(event) => setInactiveIncludeAdmins(event.target.checked)}
              />
              Include admins
            </label>

            <button type="button" className="btn btn-secondary btn-sm" onClick={runInactiveReport} disabled={inactiveReportLoading}>
              {inactiveReportLoading ? "Running..." : "Generate Report"}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={exportInactiveReportCsv}
              disabled={!inactiveReportRows.length}
            >
              Export CSV
            </button>
          </div>

          {inactiveReportError ? (
            <p className="text-fluid-sm" style={{ color: "#b91c1c", fontWeight: 600 }}>
              {inactiveReportError}
            </p>
          ) : null}

          {inactiveReportGeneratedAt ? (
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
              Report generated {new Date(inactiveReportGeneratedAt).toLocaleString()} — {inactiveReportRows.length} user
              {inactiveReportRows.length === 1 ? "" : "s"} found.
            </p>
          ) : null}

          {inactiveReportRows.length ? (
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <div style={{ color: "var(--pp-slate-700)", fontWeight: 700, fontSize: "0.8rem" }}>Report Results</div>
              <div style={{ overflowX: "auto", borderRadius: "0.55rem", border: "1px solid var(--pp-slate-200)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "52rem" }}>
                  <thead style={{ background: "var(--pp-slate-50)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Last Active</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Inactive</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "var(--pp-slate-600)" }}>Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveReportRows.map((row, index) => (
                      <tr key={`inactive-${row.userId}`} style={{ borderTop: index === 0 ? "none" : "1px solid var(--pp-slate-100)" }}>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-800)", fontWeight: 600 }}>
                          {row.fullName || `${row.firstName} ${row.lastName}`.trim() || row.username || row.userId}
                        </td>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-700)" }}>{row.emailAddress || "N/A"}</td>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-700)" }}>{statusLabel(row.status)}</td>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-700)" }}>
                          {row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleDateString() : "Never"}
                        </td>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-700)" }}>{formatInactiveDays(row.inactiveDays)}</td>
                        <td style={{ padding: "0.52rem 0.6rem", color: "var(--pp-slate-700)" }}>{row.portalAdmin ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--pp-slate-200)",
            display: "grid",
            gap: "0.55rem",
          }}
        >
          <div style={{ color: "var(--pp-slate-700)", fontWeight: 700, fontSize: "0.82rem" }}>Safe Cleanup</div>
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
            Default policy targets <strong>No Registration</strong> and <strong>Rejected</strong> users only.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--pp-slate-700)", fontSize: "0.82rem", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={cleanupIncludePending}
                onChange={(event) => setCleanupIncludePending(event.target.checked)}
              />
              Include Pending
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--pp-slate-700)", fontSize: "0.82rem", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={cleanupIncludeApproved}
                onChange={(event) => setCleanupIncludeApproved(event.target.checked)}
              />
              Include Approved
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={runCleanupPreview}
              disabled={cleanupPreviewLoading || cleanupExecuteLoading}
            >
              {cleanupPreviewLoading ? "Running Dry Run..." : "Dry Run Cleanup"}
            </button>
          </div>

          {cleanupError ? (
            <p role="alert" className="text-fluid-sm" style={{ color: "#b91c1c", fontWeight: 600 }}>
              {cleanupError}
            </p>
          ) : null}

          {cleanupPreviewRows.length ? (
            <>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                Dry run found <strong>{cleanupPreviewRows.length}</strong> cleanup candidate
                {cleanupPreviewRows.length === 1 ? "" : "s"}.
              </p>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <div style={{ color: "#92400e", fontWeight: 700, fontSize: "0.8rem" }}>Dry Run Results</div>
                <div style={{ overflowX: "auto", borderRadius: "0.55rem", border: "1px solid #fcd34d", background: "#fffbeb" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "52rem" }}>
                    <thead style={{ background: "#fef3c7" }}>
                      <tr>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "#92400e" }}>Name</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "#92400e" }}>Email</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "#92400e" }}>Status</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontSize: "0.72rem", color: "#92400e" }}>Inactive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleanupPreviewRows.map((row, index) => (
                        <tr key={`cleanup-${row.userId}`} style={{ borderTop: index === 0 ? "none" : "1px solid #fde68a" }}>
                          <td style={{ padding: "0.52rem 0.6rem", color: "#78350f", fontWeight: 600 }}>
                            {row.fullName || `${row.firstName} ${row.lastName}`.trim() || row.username || row.userId}
                          </td>
                          <td style={{ padding: "0.52rem 0.6rem", color: "#78350f" }}>{row.emailAddress || "N/A"}</td>
                          <td style={{ padding: "0.52rem 0.6rem", color: "#78350f" }}>{statusLabel(row.status)}</td>
                          <td style={{ padding: "0.52rem 0.6rem", color: "#78350f" }}>{formatInactiveDays(row.inactiveDays)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#92400e", fontWeight: 700, fontSize: "0.8rem" }}>
                  Type <code>{cleanupConfirmationPhrase}</code> to confirm:
                  <input
                    type="text"
                    value={cleanupConfirmInput}
                    onChange={(event) => setCleanupConfirmInput(event.target.value)}
                    style={{
                      minWidth: "12rem",
                      padding: "0.42rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid #fcd34d",
                      background: "#fff",
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                  onClick={executeInactiveCleanup}
                  disabled={
                    cleanupExecuteLoading ||
                    cleanupPreviewLoading ||
                    cleanupConfirmInput.trim() !== cleanupConfirmationPhrase
                  }
                >
                  {cleanupExecuteLoading ? "Executing Cleanup..." : "Execute Cleanup"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={downloadCleanupAuditJson}
                  disabled={!cleanupAuditPayload}
                >
                  Download Audit JSON
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={downloadCleanupAuditCsv}
                  disabled={!cleanupAuditPayload}
                >
                  Download Audit CSV
                </button>
              </div>
            </>
          ) : null}

          {cleanupResultSummary ? (
            <p role="status" className="text-fluid-sm" style={{ color: "#166534", fontWeight: 700 }}>
              {cleanupResultSummary}
            </p>
          ) : null}
        </div>
      </details>

      {error && (
        <p role="alert" aria-live="assertive" className="text-fluid-sm" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {warning && (
        <p role="status" aria-live="polite" className="text-fluid-sm" style={{ color: "#92400e", fontWeight: 600 }}>
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
            const primaryAction = primaryActionForStatus(row.status)
            const workflow = workflowStatusMeta(row.status)
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
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "999px",
                        padding: "0.18rem 0.5rem",
                        border: `1px solid ${workflow.border}`,
                        background: workflow.bg,
                        color: workflow.color,
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                      title={workflow.detail}
                    >
                      {workflow.label}
                    </span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Admin: {row.portalAdmin ? "Yes" : "No"}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>Last Active: {formatLastActive(row.lastActiveAt)}</span>
                  </div>
                  <div className="row-actions-compact" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => runAction(row.userId, primaryAction)}
                      disabled={busy}
                    >
                      {primaryAction === "approve" ? (
                        <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      ) : (
                        <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                      )}
                      {primaryAction === "approve" ? "Approve" : "Reject"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => runAction(row.userId, primaryAction === "approve" ? "reject" : "approve")}
                      disabled={busy}
                    >
                      {primaryAction === "approve" ? (
                        <>
                          <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                          Reject
                        </>
                      ) : (
                        <>
                          <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                          Approve
                        </>
                      )}
                    </button>
                    <div data-row-more-menu="true" style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        id={`more-menu-trigger-${row.userId}`}
                        aria-haspopup="menu"
                        aria-controls={`more-menu-${row.userId}`}
                        aria-expanded={openMoreMenuUserId === row.userId}
                        onClick={() =>
                          setOpenMoreMenuUserId((current) => (current === row.userId ? null : row.userId))
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowDown") return
                          event.preventDefault()
                          setOpenMoreMenuUserId(row.userId)
                        }}
                      >
                        More
                      </button>
                      {openMoreMenuUserId === row.userId ? (
                        <div
                          ref={(el) => {
                            moreMenuRefs.current[row.userId] = el
                          }}
                          id={`more-menu-${row.userId}`}
                          role="menu"
                          aria-labelledby={`more-menu-trigger-${row.userId}`}
                          onKeyDown={handleMoreMenuKeyDown}
                          style={{
                            position: "absolute",
                            top: "calc(100% + 0.3rem)",
                            left: 0,
                            zIndex: 20,
                            display: "grid",
                            gap: "0.35rem",
                            padding: "0.45rem",
                            borderRadius: "0.55rem",
                            border: "1px solid var(--pp-slate-200)",
                            background: "var(--pp-white)",
                            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                            minWidth: "12.2rem",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            role="menuitem"
                            data-more-menu-item="true"
                            onClick={() => {
                              setOpenMoreMenuUserId(null)
                              void runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")
                            }}
                            disabled={busy}
                          >
                            <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            role="menuitem"
                            data-more-menu-item="true"
                            style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                            onClick={() => {
                              setOpenMoreMenuUserId(null)
                              void runAction(row.userId, "delete_user")
                            }}
                            disabled={busy}
                            title="Delete user from Clerk"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
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
                const primaryAction = primaryActionForStatus(row.status)
                const workflow = workflowStatusMeta(row.status)
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
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "999px",
                            padding: "0.16rem 0.5rem",
                            border: `1px solid ${workflow.border}`,
                            background: workflow.bg,
                            color: workflow.color,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                          }}
                          title={workflow.detail}
                        >
                          {workflow.label}
                        </div>
                        <div style={{ color: "var(--pp-slate-500)", fontSize: "0.72rem", marginTop: "0.22rem" }}>
                          {workflow.detail}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {formatLastActive(row.lastActiveAt)}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top" }}>
                        {row.portalAdmin ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "0.75rem", verticalAlign: "top", width: "23rem", whiteSpace: "normal" }}>
                        <div className="row-actions-desktop" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => runAction(row.userId, primaryAction)}
                            disabled={busy}
                          >
                            {primaryAction === "approve" ? (
                              <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            ) : (
                              <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                            )}
                            {primaryAction === "approve" ? "Approve" : "Reject"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => runAction(row.userId, primaryAction === "approve" ? "reject" : "approve")}
                            disabled={busy}
                          >
                            {primaryAction === "approve" ? (
                              <>
                                <UserX style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                                Reject
                              </>
                            ) : (
                              <>
                                <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                                Approve
                              </>
                            )}
                          </button>
                          <div data-row-more-menu="true" style={{ position: "relative" }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              id={`more-menu-trigger-${row.userId}`}
                              aria-haspopup="menu"
                              aria-controls={`more-menu-${row.userId}`}
                              aria-expanded={openMoreMenuUserId === row.userId}
                              onClick={() =>
                                setOpenMoreMenuUserId((current) => (current === row.userId ? null : row.userId))
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "ArrowDown") return
                                event.preventDefault()
                                setOpenMoreMenuUserId(row.userId)
                              }}
                            >
                              More
                            </button>
                            {openMoreMenuUserId === row.userId ? (
                              <div
                                ref={(el) => {
                                  moreMenuRefs.current[row.userId] = el
                                }}
                                id={`more-menu-${row.userId}`}
                                role="menu"
                                aria-labelledby={`more-menu-trigger-${row.userId}`}
                                onKeyDown={handleMoreMenuKeyDown}
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 0.3rem)",
                                  right: 0,
                                  zIndex: 12,
                                  display: "grid",
                                  gap: "0.35rem",
                                  padding: "0.45rem",
                                  borderRadius: "0.55rem",
                                  border: "1px solid var(--pp-slate-200)",
                                  background: "var(--pp-white)",
                                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                                  minWidth: "12.2rem",
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  role="menuitem"
                                  data-more-menu-item="true"
                                  onClick={() => {
                                    setOpenMoreMenuUserId(null)
                                    void runAction(row.userId, row.portalAdmin ? "unset_admin" : "set_admin")
                                  }}
                                  disabled={busy}
                                >
                                  <Shield style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.2rem" }} />
                                  {row.portalAdmin ? "Demote Admin" : "Promote Admin"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  role="menuitem"
                                  data-more-menu-item="true"
                                  style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
                                  onClick={() => {
                                    setOpenMoreMenuUserId(null)
                                    void runAction(row.userId, "delete_user")
                                  }}
                                  disabled={busy}
                                  title="Delete user from Clerk"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
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
      <style jsx global>{`
        details[data-collapsible="true"] > summary {
          list-style: none;
          display: flex;
          align-items: center;
          line-height: 1.25;
        }

        details[data-collapsible="true"] > summary::-webkit-details-marker,
        details[data-collapsible="true"] summary::-webkit-details-marker {
          display: none;
        }

        details[data-collapsible="true"] > summary::marker,
        details[data-collapsible="true"] summary::marker {
          content: "";
          font-size: 0;
        }

        details[data-collapsible="true"] summary .accordion-caret {
          display: inline-block;
          margin-right: 0.45rem;
          font-size: 1.35rem;
          line-height: 1;
          color: var(--pp-slate-500);
          transform: rotate(0deg);
          transition: transform 0.16s ease;
        }

        details[data-collapsible="true"][open] summary .accordion-caret {
          transform: rotate(90deg);
        }

        details[data-collapsible="true"] > summary:focus-visible,
        .directory-search-input:focus-visible,
        [data-row-more-menu="true"] button:focus-visible {
          outline: 2px solid var(--pp-navy);
          outline-offset: 2px;
        }

        @media (max-width: 1220px) {
          .row-actions-desktop {
            gap: 0.3rem;
          }
        }

        @media (max-width: 640px) {
          .row-actions-compact > :global(.btn) {
            flex: 1 1 calc(50% - 0.35rem);
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
