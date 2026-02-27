"use client"

// components/portal/acc-queue-table.tsx

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, AlertCircle, FileText, Calendar, CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO, addMonths, endOfMonth, getDay, isSameDay, isSameMonth, startOfMonth } from "date-fns"
import * as Dialog from "@radix-ui/react-dialog"

/* ── Types ──────────────────────────────────────────────────── */

interface GfEntry {
  id: string
  form_id: string
  date_created: string
  date_updated: string
  is_starred: string
  is_read: string
  ip: string
  source_url: string
  created_by: string
  status: string
  [key: string]: unknown  // Dynamic form fields (1, 2, 3, etc.)
}

type DispositionStatus = "approved" | "rejected" | "conditional" | "duplicate" | "canceled" | "unknown"
type DispositionFilter = "all" | Exclude<DispositionStatus, "unknown">
type ModalMode = "view" | "edit"
type AttachmentFieldId = "19" | "60"
type AccQueueViewMode = "full" | "redacted"
type FormErrorMap = Partial<
  Record<
    "permitNumber" | "ownerEmail" | "disposition" | "processDate" | "estimatedStartDate" | "estimatedCompletionDate" | "global",
    string
  >
>

const DISPOSITION_OPTIONS: Array<{ value: Exclude<DispositionStatus, "unknown">; label: string }> = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected / Denied" },
  { value: "conditional", label: "Conditional" },
  { value: "duplicate", label: "Duplicate" },
  { value: "canceled", label: "Canceled" },
]

const ROLE_CONFIRMATION_OPTIONS = [
  "I am the owner",
  "I am an authorized representative acting on the owner's behalf",
]

const WORK_TYPE_OPTIONS = [
  "Paint",
  "Roof",
  "Fence",
  "Landscaping",
  "Other",
]

const FENCE_STYLE_OPTIONS = [
  "Black Chain Link",
  "Green Chain Link",
  "4' High Black Metal Panel - Puppy",
  "4' High Black Metal Panel - Sierra",
  "4' High Black Metal Panel - Outback",
  "4' High Black Metal Panel - Carolina",
]

const ATTACH_DOCS_OPTIONS = [
  "Not at this time",
  "Yes, I am prepared to submit my documents now.",
]

function dispositionToGfValue(value: DispositionStatus): string {
  if (value === "approved") return "Approved"
  if (value === "rejected") return "Denied"
  if (value === "conditional") return "Conditional"
  if (value === "duplicate") return "Duplicate"
  if (value === "canceled") return "Canceled"
  return ""
}

/* ── Status badge ───────────────────────────────────────────── */

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  approved: { bg: "#d1fae5", color: "#065f46", icon: CheckCircle },  // approved (green)
  rejected: { bg: "#fee2e2", color: "#991b1b", icon: XCircle },      // rejected (red)
  conditional: { bg: "#fef3c7", color: "#92400e", icon: Clock },      // yellow
  duplicate: { bg: "#e0e7ff", color: "#3730a3", icon: FileText },     // indigo
  canceled: { bg: "#f3f4f6", color: "#4b5563", icon: XCircle },       // neutral gray
  unknown: { bg: "var(--pp-slate-100)", color: "var(--pp-slate-600)", icon: FileText },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.unknown
  const Icon = s.icon
  const label =
    status === "approved" ? "Approved" :
    status === "rejected" ? "Rejected" :
    status === "conditional" ? "Conditional" :
    status === "duplicate" ? "Duplicate" :
    status === "canceled" ? "Canceled" :
    "Unknown"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.25rem 0.75rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon style={{ width: "0.75rem", height: "0.75rem" }} />
      {label}
    </span>
  )
}

function normalizeDisposition(raw: unknown): DispositionStatus {
  if (typeof raw !== "string") return "unknown"
  const v = raw.trim().toLowerCase()
  if (["approved", "approve", "accepted", "complete", "completed"].includes(v)) return "approved"
  if (["rejected", "reject", "denied", "deny", "declined", "disapproved"].includes(v)) return "rejected"
  if (["conditional", "conditionally approved", "approve with conditions"].includes(v)) return "conditional"
  if (["duplicate", "dup"].includes(v)) return "duplicate"
  if (["canceled", "cancelled", "cancel"].includes(v)) return "canceled"
  return "unknown"
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatYmd(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatMdy(value: string): string {
  const d = parseYmd(value)
  return d ? format(d, "MM/dd/yyyy") : ""
}

function SafariDatePicker({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  ariaLabel: string
}) {
  const selectedDate = parseYmd(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedDate) setMonth(selectedDate)
  }, [value, selectedDate])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const leading = getDay(monthStart)
  const daysInMonth = monthEnd.getDate()
  const cells: Array<{ date: Date; inMonth: boolean }> = []

  for (let i = 0; i < leading; i += 1) {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - (leading - i))
    cells.push({ date: d, inMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    cells.push({ date: new Date(month.getFullYear(), month.getMonth(), i), inMonth: true })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1]?.date ?? monthEnd
    const d = new Date(last)
    d.setDate(d.getDate() + 1)
    cells.push({ date: d, inMonth: false })
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        style={{
          width: "100%",
          padding: "0.5rem 0.6rem",
          borderRadius: "var(--radius-sm)",
          border: "1.5px solid var(--pp-slate-200)",
          fontSize: "0.875rem",
          color: "var(--pp-slate-700)",
          background: "var(--pp-white)",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span style={{ opacity: value ? 1 : 0.65 }}>{value ? formatMdy(value) : placeholder}</span>
        <Calendar style={{ width: "0.9rem", height: "0.9rem", color: "var(--pp-slate-500)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            marginTop: "0.35rem",
            width: "18.5rem",
            background: "var(--pp-white)",
            border: "1px solid var(--pp-slate-200)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
            padding: "0.6rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0.2rem" }}
              aria-label="Previous month"
            >
              <ChevronLeft style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-600)" }} />
            </button>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--pp-slate-700)" }}>{format(month, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0.2rem" }}
              aria-label="Next month"
            >
              <ChevronRight style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-600)" }} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.2rem", marginBottom: "0.25rem" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
              <div key={w} style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--pp-slate-500)", padding: "0.2rem 0" }}>
                {w}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.2rem" }}>
            {cells.map(({ date, inMonth }, idx) => {
              const isSelected = !!selectedDate && isSameDay(date, selectedDate)
              const isCurrentMonth = isSameMonth(date, month)
              return (
                <button
                  key={`${format(date, "yyyy-MM-dd")}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(formatYmd(date))
                    setOpen(false)
                  }}
                  style={{
                    border: "none",
                    borderRadius: "0.35rem",
                    padding: "0.35rem 0.2rem",
                    fontSize: "0.78rem",
                    cursor: inMonth ? "pointer" : "default",
                    background: isSelected ? "var(--pp-navy-dark)" : "transparent",
                    color: isSelected ? "var(--pp-white)" : isCurrentMonth ? "var(--pp-slate-700)" : "var(--pp-slate-400)",
                    opacity: inMonth ? 1 : 0.55,
                  }}
                  disabled={!inMonth}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.55rem" }}>
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                border: "1px solid var(--pp-slate-200)",
                background: "var(--pp-white)",
                borderRadius: "0.35rem",
                padding: "0.25rem 0.55rem",
                fontSize: "0.78rem",
                color: "var(--pp-slate-600)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(formatYmd(new Date()))
                setOpen(false)
              }}
              style={{
                border: "1px solid var(--pp-slate-200)",
                background: "var(--pp-white)",
                borderRadius: "0.35rem",
                padding: "0.25rem 0.55rem",
                fontSize: "0.78rem",
                color: "var(--pp-slate-600)",
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */

export function AccQueueTable({ viewMode = "full" }: { viewMode?: AccQueueViewMode }) {
  const [entries, setEntries] = useState<GfEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DispositionFilter>("all")
  const [query, setQuery] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [isSafari, setIsSafari] = useState(false)
  const [entryModal, setEntryModal] = useState<{ id: string; mode: ModalMode } | null>(null)
  const [entryModalLoading, setEntryModalLoading] = useState(false)
  const [entryModalError, setEntryModalError] = useState<string | null>(null)
  const [entryDetail, setEntryDetail] = useState<GfEntry | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editDisposition, setEditDisposition] = useState<DispositionStatus>("unknown")
  const [editPermitNumber, setEditPermitNumber] = useState("")
  const [editOwnerPhone, setEditOwnerPhone] = useState("")
  const [editPhase, setEditPhase] = useState("")
  const [editLot, setEditLot] = useState("")
  const [editOwnerName, setEditOwnerName] = useState("")
  const [editStreetAddress, setEditStreetAddress] = useState("")
  const [editOwnerEmail, setEditOwnerEmail] = useState("")
  const [editRoleConfirmation, setEditRoleConfirmation] = useState("")
  const [editAuthorizedRepName, setEditAuthorizedRepName] = useState("")
  const [editWorkType, setEditWorkType] = useState("")
  const [editFenceStyle, setEditFenceStyle] = useState("")
  const [editBodyColor, setEditBodyColor] = useState("")
  const [editTrimColor, setEditTrimColor] = useState("")
  const [editDoorColor, setEditDoorColor] = useState("")
  const [editRoofColor, setEditRoofColor] = useState("")
  const [editRoofType, setEditRoofType] = useState("")
  const [editAttachDocsChoice, setEditAttachDocsChoice] = useState("")
  const [editAccApproval1, setEditAccApproval1] = useState("")
  const [editAccApproval2, setEditAccApproval2] = useState("")
  const [editEstimatedStartDate, setEditEstimatedStartDate] = useState("")
  const [editEstimatedCompletionDate, setEditEstimatedCompletionDate] = useState("")
  const [editProcessDate, setEditProcessDate] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrorMap>({})
  const [residentUploadFiles, setResidentUploadFiles] = useState<File[]>([])
  const [accUploadFiles, setAccUploadFiles] = useState<File[]>([])
  const [uploadingField, setUploadingField] = useState<AttachmentFieldId | null>(null)
  const [deletingAttachmentKey, setDeletingAttachmentKey] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [residentInputKey, setResidentInputKey] = useState(0)
  const [accInputKey, setAccInputKey] = useState(0)
  const residentFileInputRef = useRef<HTMLInputElement | null>(null)
  const accFileInputRef = useRef<HTMLInputElement | null>(null)
  const DEFAULT_PAGE_SIZE = 25

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
    setIsSafari(/Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Android/i.test(ua))
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    const url = new URL("/api/gf-entries", window.location.origin)
    url.searchParams.set("disposition", statusFilter)
    if (query.trim()) url.searchParams.set("q", query.trim())
    if (startDate) url.searchParams.set("startDate", startDate)
    if (endDate) url.searchParams.set("endDate", endDate)
    url.searchParams.set("page", String(currentPage))
    url.searchParams.set("per_page", String(pageSize))

    const res = await fetch(url.toString())

    if (!res.ok) {
      setError("Failed to load ACC permit entries. Check your Gravity Forms API credentials in .env.local.")
      setLoading(false)
      return
    }

    const data = await res.json()
    setEntries(data.entries ?? [])
    setTotal(Number(data.total ?? 0))
    setTotalPages(Math.max(1, Number(data.totalPages ?? 1)))
    setLoading(false)
  }, [statusFilter, query, startDate, endDate, currentPage, pageSize])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function formatDate(iso: string) {
    try { return format(parseISO(iso), "MMM d, yyyy h:mm a") }
    catch { return iso }
  }

  // Helper to convert any GF field value to a readable string
  function fieldToString(value: unknown): string {
    if (!value) return "—"
    if (typeof value === "string") return value
    if (Array.isArray(value)) return value.filter(Boolean).join(", ")
    if (typeof value === "object") {
      // Handle choice fields that return objects like { "5.1": "Option 1", "5.2": "Option 2" }
      const vals = Object.values(value).filter(Boolean)
      return vals.length > 0 ? vals.join(", ") : "—"
    }
    return String(value)
  }

  // Extract key fields from the entry (adjust field IDs based on your ACC form)
  function getEntryFields(entry: GfEntry) {
    return {
      name:        fieldToString(entry["23"]),   // Field 23: Applicant name
      address:     fieldToString(entry["58"]),   // Field 58: Property address
      description: fieldToString(entry["14"]),   // Field 14: Project description
    }
  }

  function maybeRedact(fieldId: "23" | "6" | "20" | "44", value: string): string {
    if (viewMode === "redacted" && value && value !== "—") {
      return "REDACTED"
    }
    return value
  }

  function getPermitNumber(entry: GfEntry): string {
    const candidates = [
      entry["39"],
      entry.permit_number,
      entry["permit_number"],
      entry.permit_no,
      entry["permit_no"],
      entry.permit,
      entry["permit"],
    ]
    for (const c of candidates) {
      const v = fieldToString(c)
      if (v && v !== "—") return v
    }
    return "—"
  }

  function getAccDisposition(entry: GfEntry): DispositionStatus {
    const candidates = [
      entry["55"],
      entry._accDisposition,
      entry.acc_disposition,
      entry.disposition,
      entry["acc_disposition"],
      entry["ACC Disposition"],
      entry.approval_status,
      entry["approval_status"],
      entry.workflow_final_status,
      entry.workflow_status,
      entry.workflow_current_status,
      entry.gravityflow_status,
      entry.gravityflow_current_status,
      entry["workflow_final_status"],
      entry["workflow_status"],
      entry["workflow_current_status"],
      entry["gravityflow_status"],
      entry["gravityflow_current_status"],
    ]
    for (const raw of candidates) {
      const normalized = normalizeDisposition(raw)
      if (normalized !== "unknown") return normalized
    }
    return "unknown"
  }

  function resolveFieldKey(entry: GfEntry, candidates: string[], fallback: string): string {
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(entry, key)) return key
    }
    return fallback
  }

  function firstFieldValue(entry: GfEntry, candidates: string[]): string {
    for (const key of candidates) {
      const v = fieldToString(entry[key])
      if (v && v !== "—") return v
    }
    return ""
  }

  function isValidYmd(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
  }

  function normalizeDateForInput(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ""
    if (isValidYmd(trimmed)) return trimmed
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) return ""
    return format(parsed, "yyyy-MM-dd")
  }

  function formatDateForDisplay(value: string): string {
    if (!value) return "—"
    const trimmed = value.trim()
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`)
      if (!Number.isNaN(parsed.getTime())) return format(parsed, "MM/dd/yyyy")
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return format(parsed, "MM/dd/yyyy")
    return trimmed
  }

  function hasUnsavedChanges(): boolean {
    if (!entryDetail) return false
    const currentDescription = firstFieldValue(entryDetail, ["14", "description", "project_description"])
    const currentNotes = firstFieldValue(entryDetail, ["37", "notes", "note"])
    const currentPermit = firstFieldValue(entryDetail, ["39", "permit_number", "permit_no", "permit"])
    const currentOwnerPhone = firstFieldValue(entryDetail, ["6", "owners_phone", "owner_phone"])
    const currentPhase = firstFieldValue(entryDetail, ["4", "phase"])
    const currentLot = firstFieldValue(entryDetail, ["5", "lot", "lot_number"])
    const currentOwnerName = firstFieldValue(entryDetail, ["23", "owner_name"])
    const currentStreetAddress = firstFieldValue(entryDetail, ["58", "street_address", "address"])
    const currentOwnerEmail = firstFieldValue(entryDetail, ["20", "owner_email", "owners_email"])
    const currentRoleConfirmation = firstFieldValue(entryDetail, ["24", "role_confirmation", "owner_role"])
    const currentAuthorizedRepName = firstFieldValue(entryDetail, ["44", "authorized_rep_name"])
    const currentWorkType = firstFieldValue(entryDetail, ["27", "work_type", "type_of_work"])
    const currentFenceStyle = firstFieldValue(entryDetail, ["56", "fence_style"])
    const currentBodyColor = firstFieldValue(entryDetail, ["28", "body_color"])
    const currentTrimColor = firstFieldValue(entryDetail, ["29", "trim_color"])
    const currentDoorColor = firstFieldValue(entryDetail, ["30", "door_color"])
    const currentRoofColor = firstFieldValue(entryDetail, ["31", "roof_color"])
    const currentRoofType = firstFieldValue(entryDetail, ["32", "roof_type"])
    const currentAttachChoice = firstFieldValue(entryDetail, ["18", "attach_docs_choice"])
    const currentAccApproval1 = firstFieldValue(entryDetail, ["38", "acc_approval_1"])
    const currentAccApproval2 = firstFieldValue(entryDetail, ["62", "acc_approval_2"])
    const currentDisposition = getAccDisposition(entryDetail)
    const currentEstimatedStartDate = normalizeDateForInput(firstFieldValue(entryDetail, ["15", "estimated_start_date"]))
    const currentEstimatedCompletionDate = normalizeDateForInput(firstFieldValue(entryDetail, ["16", "estimated_completion_date"]))
    const currentProcessDate = normalizeDateForInput(firstFieldValue(entryDetail, ["61", "process_date"]))

    if (editDescription !== currentDescription) return true
    if (editNotes !== currentNotes) return true
    if (editPermitNumber !== currentPermit) return true
    if (editOwnerPhone !== currentOwnerPhone) return true
    if (editPhase !== currentPhase) return true
    if (editLot !== currentLot) return true
    if (editOwnerName !== currentOwnerName) return true
    if (editStreetAddress !== currentStreetAddress) return true
    if (editOwnerEmail !== currentOwnerEmail) return true
    if (editRoleConfirmation !== currentRoleConfirmation) return true
    if (editAuthorizedRepName !== currentAuthorizedRepName) return true
    if (editWorkType !== currentWorkType) return true
    if (editFenceStyle !== currentFenceStyle) return true
    if (editBodyColor !== currentBodyColor) return true
    if (editTrimColor !== currentTrimColor) return true
    if (editDoorColor !== currentDoorColor) return true
    if (editRoofColor !== currentRoofColor) return true
    if (editRoofType !== currentRoofType) return true
    if (editAttachDocsChoice !== currentAttachChoice) return true
    if (editAccApproval1 !== currentAccApproval1) return true
    if (editAccApproval2 !== currentAccApproval2) return true
    if (editDisposition !== currentDisposition) return true
    if (editEstimatedStartDate !== currentEstimatedStartDate) return true
    if (editEstimatedCompletionDate !== currentEstimatedCompletionDate) return true
    if (editProcessDate !== currentProcessDate) return true
    return false
  }

  function dateInputToGfMdy(value: string): string {
    if (!value) return ""
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return value
    return format(parsed, "MM/dd/yyyy")
  }

  function isValidEmail(value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }

  function validateEditForm(): FormErrorMap {
    const errors: FormErrorMap = {}

    const permit = editPermitNumber.trim()
    if (permit && !/^\d{2}-\d{3}$/.test(permit)) {
      errors.permitNumber = "Permit number must use format 99-999."
    }

    if (viewMode === "full" && !isValidEmail(editOwnerEmail)) {
      errors.ownerEmail = "Enter a valid email address."
    }

    const hasDisposition = editDisposition !== "unknown"
    const hasProcessDate = !!editProcessDate.trim()
    if (hasDisposition && !hasProcessDate) {
      errors.processDate = "Process date is required when disposition is set."
    }
    if (!hasDisposition && hasProcessDate) {
      errors.disposition = "Disposition is required when process date is set."
    }

    if (editEstimatedStartDate && !isValidYmd(editEstimatedStartDate)) {
      errors.estimatedStartDate = "Estimated start date is invalid."
    }
    if (editEstimatedCompletionDate && !isValidYmd(editEstimatedCompletionDate)) {
      errors.estimatedCompletionDate = "Estimated completion date is invalid."
    }
    if (editProcessDate && !isValidYmd(editProcessDate)) {
      errors.processDate = "Process date is invalid."
    }

    if (
      editEstimatedStartDate &&
      editEstimatedCompletionDate &&
      isValidYmd(editEstimatedStartDate) &&
      isValidYmd(editEstimatedCompletionDate) &&
      editEstimatedCompletionDate < editEstimatedStartDate
    ) {
      errors.estimatedCompletionDate = "Estimated completion date cannot be before estimated start date."
    }

    if (Object.keys(errors).length > 0) {
      errors.global = "Please fix validation errors before saving."
    }
    return errors
  }

  function collectAttachmentUrlsByField(entry: GfEntry, fieldId: AttachmentFieldId): string[] {
    const urls = new Set<string>()
    function addUrl(raw: string) {
      const cleaned = raw.trim().replace(/^"+|"+$/g, "")
      if (!/^https?:\/\//i.test(cleaned)) return
      urls.add(cleaned)
    }
    function walk(value: unknown) {
      if (!value) return
      if (typeof value === "string") {
        addUrl(value)
        if ((value.startsWith("[") || value.startsWith("{")) && (value.includes("http") || value.includes("wp-content"))) {
          try {
            walk(JSON.parse(value))
          } catch {
            // ignore parse issues
          }
        }
        const matches = value.match(/https?:\/\/[^\s"'<>]+/g) || []
        for (const m of matches) addUrl(m)
        const split = value.split(/[\n,]+/)
        for (const s of split) addUrl(s)
        return
      }
      if (Array.isArray(value)) {
        for (const item of value) walk(item)
        return
      }
      if (typeof value === "object") {
        for (const item of Object.values(value)) walk(item)
      }
    }
    walk(entry[fieldId])
    return Array.from(urls)
  }

  async function uploadAttachments(fieldId: AttachmentFieldId) {
    if (!entryModal?.id) return
    const files = fieldId === "19" ? residentUploadFiles : accUploadFiles
    if (!files.length) return
    setUploadError(null)
    setUploadingField(fieldId)
    const formData = new FormData()
    formData.append("fieldId", fieldId)
    for (const file of files) formData.append("files", file, file.name)

    const res = await fetch(`/api/gf-entries/${entryModal.id}/attachments`, {
      method: "POST",
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUploadError(String(data?.detail || data?.error || "Unable to upload attachments."))
      setUploadingField(null)
      return
    }

    if (data?.entry && typeof data.entry === "object") {
      setEntryDetail(data.entry as GfEntry)
    } else {
      const reload = await fetch(`/api/gf-entries/${entryModal.id}`)
      if (reload.ok) {
        const latest = await reload.json()
        const detail = (latest?.entry ?? latest) as GfEntry
        setEntryDetail(detail)
      }
    }

    if (fieldId === "19") {
      setResidentUploadFiles([])
      setResidentInputKey((k) => k + 1)
    } else {
      setAccUploadFiles([])
      setAccInputKey((k) => k + 1)
    }
    setSuccessMessage(`Attachment${uploadedUrlsLabel(data)} uploaded to field ${fieldId}.`)
    setUploadingField(null)
  }

  function uploadedUrlsLabel(data: unknown): string {
    const count =
      data && typeof data === "object" && "uploadedUrls" in data && Array.isArray((data as { uploadedUrls?: unknown[] }).uploadedUrls)
        ? (data as { uploadedUrls?: unknown[] }).uploadedUrls?.length ?? 0
        : 0
    if (count <= 1) return ""
    return "s"
  }

  async function deleteAttachment(fieldId: AttachmentFieldId, url: string) {
    if (!entryModal?.id || !entryDetail) return
    const confirmed = window.confirm("Are you sure you want to delete the attachment?")
    if (!confirmed) return

    setUploadError(null)
    const key = `${fieldId}:${url}`
    setDeletingAttachmentKey(key)

    const current = collectAttachmentUrlsByField(entryDetail, fieldId)
    const next = current.filter((u) => u !== url)
    const payload = { [fieldId]: JSON.stringify(next) }

    const res = await fetch(`/api/gf-entries/${entryModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        __auditReason: `gf_attachment_delete_field_${fieldId}`,
        __auditContext: { deletedUrl: url, fieldId },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUploadError(String(data?.detail || data?.error || "Unable to delete attachment."))
      setDeletingAttachmentKey(null)
      return
    }

    const detail = (data?.entry ?? data) as GfEntry
    if (detail && typeof detail === "object") {
      setEntryDetail(detail)
    } else {
      const reload = await fetch(`/api/gf-entries/${entryModal.id}`)
      if (reload.ok) {
        const latest = await reload.json()
        setEntryDetail((latest?.entry ?? latest) as GfEntry)
      }
    }
    setSuccessMessage("Attachment deleted.")
    setDeletingAttachmentKey(null)
  }

  function attachmentPanel(title: string, fieldId: AttachmentFieldId, files: File[], setFiles: (next: File[]) => void, inputKey: number) {
    const urls = entryDetail ? collectAttachmentUrlsByField(entryDetail, fieldId) : []
    const isUploading = uploadingField === fieldId
    const inputRef = fieldId === "19" ? residentFileInputRef : accFileInputRef

    return (
      <div style={{ border: "1px solid var(--pp-slate-100)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--pp-navy-dark)" }}>{title}</div>
        {urls.length ? (
          <ul style={{ margin: 0, paddingLeft: "1rem", display: "grid", gap: "0.22rem" }}>
            {urls.map((url) => (
              <li key={`${fieldId}-${url}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--pp-navy-dark)", textDecoration: "underline" }}>
                    {url.split("/").pop() || url}
                  </a>
                  {entryModal?.mode === "edit" && (
                    <button
                      type="button"
                      onClick={() => deleteAttachment(fieldId, url)}
                      disabled={!!uploadingField || deletingAttachmentKey === `${fieldId}:${url}`}
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid #fecaca",
                        background: "#fff5f5",
                        color: "#b91c1c",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: !!uploadingField ? "not-allowed" : "pointer",
                        opacity: !!uploadingField ? 0.65 : 1,
                      }}
                    >
                      {deletingAttachmentKey === `${fieldId}:${url}` ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>No attachments found.</div>
        )}

        {entryModal?.mode === "edit" && (
          <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.45rem" }}>
            <input
              ref={inputRef}
              key={inputKey}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={!!uploadingField}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--pp-slate-200)",
                  background: "var(--pp-white)",
                  color: "var(--pp-slate-700)",
                  fontWeight: 600,
                  cursor: !!uploadingField ? "not-allowed" : "pointer",
                  opacity: !!uploadingField ? 0.65 : 1,
                }}
              >
                Select files
              </button>
              <button
                type="button"
                disabled={!files.length || !!uploadingField}
                onClick={() => uploadAttachments(fieldId)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "var(--pp-navy-dark)",
                  color: "var(--pp-white)",
                  fontWeight: 600,
                  cursor: !files.length || !!uploadingField ? "not-allowed" : "pointer",
                  opacity: !files.length || !!uploadingField ? 0.65 : 1,
                }}
              >
                {isUploading ? "Uploading..." : "Upload files"}
              </button>
              <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                {files.length
                  ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                  : "No files selected"}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = total === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const pageEnd = pageStart + entries.length
  const visibleEntries = entries

  const filterButtons: Array<{ key: DispositionFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "conditional", label: "Conditional" },
    { key: "duplicate", label: "Duplicate" },
    { key: "canceled", label: "Canceled" },
  ]

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, query, startDate, endDate, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pageNumbers = (() => {
    const pages: number[] = []
    const maxVisible = 5
    const start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    const adjustedStart = Math.max(1, end - maxVisible + 1)
    for (let i = adjustedStart; i <= end; i += 1) pages.push(i)
    return pages
  })()

  function clearFilters() {
    setStatusFilter("all")
    setQuery("")
    setStartDate("")
    setEndDate("")
    setPageSize(DEFAULT_PAGE_SIZE)
    setCurrentPage(1)
  }

  async function openEntryModal(id: string, mode: ModalMode) {
    setEntryModal({ id, mode })
    setEntryModalError(null)
    setFormErrors({})
    setUploadError(null)
    setSuccessMessage(null)
    setResidentUploadFiles([])
    setAccUploadFiles([])
    setEntryDetail(null)
    setEntryModalLoading(true)
    const res = await fetch(`/api/gf-entries/${id}`)
    if (!res.ok) {
      setEntryModalLoading(false)
      setEntryModalError("Unable to load request details.")
      return
    }
    const data = await res.json()
    const detail = (data?.entry ?? data) as GfEntry
    setEntryDetail(detail)
    setEditDescription(firstFieldValue(detail, ["14", "description", "project_description"]))
    setEditNotes(firstFieldValue(detail, ["37", "notes", "note"]))
    setEditPermitNumber(firstFieldValue(detail, ["39", "permit_number", "permit_no", "permit"]))
    setEditOwnerPhone(firstFieldValue(detail, ["6", "owners_phone", "owner_phone"]))
    setEditPhase(firstFieldValue(detail, ["4", "phase"]))
    setEditLot(firstFieldValue(detail, ["5", "lot", "lot_number"]))
    setEditOwnerName(firstFieldValue(detail, ["23", "owner_name"]))
    setEditStreetAddress(firstFieldValue(detail, ["58", "street_address", "address"]))
    setEditOwnerEmail(firstFieldValue(detail, ["20", "owner_email", "owners_email"]))
    setEditRoleConfirmation(firstFieldValue(detail, ["24", "role_confirmation", "owner_role"]))
    setEditAuthorizedRepName(firstFieldValue(detail, ["44", "authorized_rep_name"]))
    setEditWorkType(firstFieldValue(detail, ["27", "work_type", "type_of_work"]))
    setEditFenceStyle(firstFieldValue(detail, ["56", "fence_style"]))
    setEditBodyColor(firstFieldValue(detail, ["28", "body_color"]))
    setEditTrimColor(firstFieldValue(detail, ["29", "trim_color"]))
    setEditDoorColor(firstFieldValue(detail, ["30", "door_color"]))
    setEditRoofColor(firstFieldValue(detail, ["31", "roof_color"]))
    setEditRoofType(firstFieldValue(detail, ["32", "roof_type"]))
    setEditAttachDocsChoice(firstFieldValue(detail, ["18", "attach_docs_choice"]))
    setEditAccApproval1(firstFieldValue(detail, ["38", "acc_approval_1"]))
    setEditAccApproval2(firstFieldValue(detail, ["62", "acc_approval_2"]))
    setEditDisposition(getAccDisposition(detail))
    setEditEstimatedStartDate(normalizeDateForInput(firstFieldValue(detail, ["15", "estimated_start_date"])))
    setEditEstimatedCompletionDate(normalizeDateForInput(firstFieldValue(detail, ["16", "estimated_completion_date"])))
    setEditProcessDate(normalizeDateForInput(firstFieldValue(detail, ["61", "process_date"])))
    setEntryModalLoading(false)
  }

  async function saveEntryEdit() {
    if (!entryModal?.id || !entryDetail) return
    const validationErrors = validateEditForm()
    setFormErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSavingEdit(true)
    setEntryModalError(null)
    const payload: Record<string, unknown> = {
      ...entryDetail,
    }
    payload[resolveFieldKey(entryDetail, ["14", "description", "project_description"], "14")] = editDescription
    payload[resolveFieldKey(entryDetail, ["37", "notes", "note"], "37")] = editNotes
    payload[resolveFieldKey(entryDetail, ["39", "permit_number", "permit_no", "permit"], "39")] = editPermitNumber
    if (viewMode === "full") {
      payload[resolveFieldKey(entryDetail, ["6", "owners_phone", "owner_phone"], "6")] = editOwnerPhone
    }
    payload[resolveFieldKey(entryDetail, ["4", "phase"], "4")] = editPhase
    payload[resolveFieldKey(entryDetail, ["5", "lot", "lot_number"], "5")] = editLot
    if (viewMode === "full") {
      payload[resolveFieldKey(entryDetail, ["23", "owner_name"], "23")] = editOwnerName
    }
    payload[resolveFieldKey(entryDetail, ["58", "street_address", "address"], "58")] = editStreetAddress
    if (viewMode === "full") {
      payload[resolveFieldKey(entryDetail, ["20", "owner_email", "owners_email"], "20")] = editOwnerEmail
    }
    payload[resolveFieldKey(entryDetail, ["24", "role_confirmation", "owner_role"], "24")] = editRoleConfirmation
    if (viewMode === "full") {
      payload[resolveFieldKey(entryDetail, ["44", "authorized_rep_name"], "44")] = editAuthorizedRepName
    }
    payload[resolveFieldKey(entryDetail, ["27", "work_type", "type_of_work"], "27")] = editWorkType
    payload[resolveFieldKey(entryDetail, ["56", "fence_style"], "56")] = editFenceStyle
    payload[resolveFieldKey(entryDetail, ["28", "body_color"], "28")] = editBodyColor
    payload[resolveFieldKey(entryDetail, ["29", "trim_color"], "29")] = editTrimColor
    payload[resolveFieldKey(entryDetail, ["30", "door_color"], "30")] = editDoorColor
    payload[resolveFieldKey(entryDetail, ["31", "roof_color"], "31")] = editRoofColor
    payload[resolveFieldKey(entryDetail, ["32", "roof_type"], "32")] = editRoofType
    payload[resolveFieldKey(entryDetail, ["18", "attach_docs_choice"], "18")] = editAttachDocsChoice
    payload[resolveFieldKey(entryDetail, ["38", "acc_approval_1"], "38")] = editAccApproval1
    payload[resolveFieldKey(entryDetail, ["62", "acc_approval_2"], "62")] = editAccApproval2
    payload[resolveFieldKey(entryDetail, ["55", "acc_disposition", "disposition", "approval_status", "workflow_status", "workflow_final_status"], "55")] = dispositionToGfValue(editDisposition)
    payload[resolveFieldKey(entryDetail, ["15", "estimated_start_date"], "15")] = dateInputToGfMdy(editEstimatedStartDate)
    payload[resolveFieldKey(entryDetail, ["16", "estimated_completion_date"], "16")] = dateInputToGfMdy(editEstimatedCompletionDate)
    payload[resolveFieldKey(entryDetail, ["61", "process_date"], "61")] = dateInputToGfMdy(editProcessDate)
    const res = await fetch(`/api/gf-entries/${entryModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        __auditReason: "gf_entry_edit_modal_save",
      }),
    })
    if (!res.ok) {
      setSavingEdit(false)
      setEntryModalError("Unable to save changes.")
      return
    }
    setSavingEdit(false)
    setSuccessMessage("Changes saved successfully.")
    setEntryModal(null)
    await fetchEntries()
  }

  function closeModalWithGuard() {
    if (entryModal?.mode === "edit" && hasUnsavedChanges()) {
      const confirmed = window.confirm("You have unsaved changes. Discard them and close?")
      if (!confirmed) return
    }
    setEntryModal(null)
    setFormErrors({})
    setUploadError(null)
    setSuccessMessage(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-l)" }}>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-400)" }} />
            <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
              {loading ? "Loading…" : `${total} permit request${total !== 1 ? "s" : ""}`}
            </span>
          </div>
          {!loading && total > 0 && (
            <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
              Showing {pageStart + 1}–{Math.min(pageEnd, total)}
            </span>
          )}
        </div>

        {/* Search + date controls */}
        <div
          className="acc-controls-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(16rem, 1fr) repeat(2, minmax(10rem, 12rem)) auto",
            gap: "var(--space-s)",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: "0.875rem", height: "0.875rem", color: "var(--pp-slate-400)", pointerEvents: "none" }} />
            <input
              type="search"
              placeholder="Search any field…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem 0.5rem 2rem",
                borderRadius: "var(--radius-sm)",
                border: "1.5px solid var(--pp-slate-200)",
                fontSize: "0.875rem",
                color: "var(--pp-slate-700)",
              }}
            />
          </div>

          {isSafari ? (
            <>
              <SafariDatePicker
                value={startDate}
                onChange={setStartDate}
                ariaLabel="Start date"
                placeholder="Start date"
              />
              <SafariDatePicker
                value={endDate}
                onChange={setEndDate}
                ariaLabel="End date"
                placeholder="End date"
              />
            </>
          ) : (
            <>
              <input
                type="date"
                autoComplete="off"
                aria-label="Start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  fontSize: "0.875rem",
                  color: "var(--pp-slate-700)",
                }}
              />

              <input
                type="date"
                autoComplete="off"
                aria-label="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--pp-slate-200)",
                  fontSize: "0.875rem",
                  color: "var(--pp-slate-700)",
                }}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => fetchEntries()}
            aria-label="Refresh"
            style={{
              padding: "0.5rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--pp-slate-200)",
              background: "var(--pp-white)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RefreshCw style={{ width: "0.9rem", height: "0.9rem", color: "var(--pp-slate-500)" }} />
          </button>
        </div>

        {/* Status filter buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-s)", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-s)", flexWrap: "wrap" }}>
            {filterButtons.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatusFilter(s.key)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: statusFilter === s.key ? "none" : "1.5px solid var(--pp-slate-200)",
                  background: statusFilter === s.key ? "var(--pp-navy-dark)" : "var(--pp-white)",
                  color: statusFilter === s.key ? "var(--pp-white)" : "var(--pp-slate-600)",
                  boxShadow: statusFilter === s.key ? "0 2px 8px rgba(58,90,64,0.25)" : "none",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }} htmlFor="acc-page-size">
              Rows:
            </label>
            <select
              id="acc-page-size"
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
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1.5px solid var(--pp-slate-200)",
                background: "var(--pp-white)",
                color: "var(--pp-slate-600)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "var(--space-m)",
            borderRadius: "var(--radius-md)",
            background: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <AlertCircle style={{ width: "1.125rem", height: "1.125rem", color: "#dc2626", flexShrink: 0, marginTop: "0.1rem" }} />
          <div>
            <p className="text-fluid-sm font-semibold" style={{ color: "#dc2626" }}>Unable to load entries</p>
            <p className="text-fluid-sm" style={{ color: "#dc2626", opacity: 0.85, marginTop: "0.2rem" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
          <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--pp-slate-200)" }}>
          <table className="acc-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--pp-navy-dark)" }}>
                {["ID", "Submitted", "Applicant", "Address", "Description", "Work Type", "Permit #", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={
                      h === "Submitted"
                        ? "acc-col-submitted"
                        : h === "Description"
                          ? "acc-col-description"
                          : h === "Work Type"
                            ? "acc-col-worktype"
                            : h === "Permit #"
                              ? "acc-col-permit"
                              : h === "Status"
                                ? "acc-col-status"
                            : undefined
                    }
                    data-acc-cell="true"
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
                  <td colSpan={9} style={{ padding: "3rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>Loading entries…</p>
                  </td>
                </tr>
              ) : visibleEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "3rem", textAlign: "center" }}>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
                      No permit requests match the current filters.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleEntries.map((entry, i) => {
                  const fields = getEntryFields(entry)
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        background: i % 2 === 0 ? "var(--pp-white)" : "var(--pp-slate-50)",
                        borderBottom: "1px solid var(--pp-slate-100)",
                      }}
                    >
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span
                          className="text-fluid-sm font-semibold"
                          data-acc-cell="true"
                          style={{ color: "var(--pp-navy-dark)", fontFamily: "monospace" }}
                        >
                          #{entry.id}
                        </span>
                      </td>
                      <td className="acc-col-submitted" data-acc-cell="true" style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Calendar style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-slate-400)" }} />
                          <span className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                            {formatDate(entry.date_created)}
                          </span>
                        </div>
                      </td>
                      <td data-acc-cell="true" style={{ padding: "0.65rem 1rem" }}>
                        <span className="text-fluid-sm acc-applicant-text" style={{ color: "var(--pp-slate-700)" }}>
                          {maybeRedact("23", fields.name)}
                        </span>
                      </td>
                      <td data-acc-cell="true" style={{ padding: "0.65rem 1rem" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>
                          {fields.address}
                        </span>
                      </td>
                      <td className="acc-col-description" data-acc-cell="true" style={{ padding: "0.65rem 1rem", maxWidth: "20rem" }}>
                        <span
                          className="text-fluid-sm acc-description-text"
                          style={{
                            color: "var(--pp-slate-600)",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {fields.description}
                        </span>
                      </td>
                      <td className="acc-col-worktype" data-acc-cell="true" style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                          {fieldToString(entry["27"])}
                        </span>
                      </td>
                      <td className="acc-col-permit" data-acc-cell="true" style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", fontFamily: "monospace" }}>
                          {getPermitNumber(entry)}
                        </span>
                      </td>
                      <td className="acc-col-status" data-acc-cell="true" style={{ padding: "0.65rem 1rem" }}>
                        <StatusBadge status={String(entry._accDisposition ?? "unknown")} />
                      </td>
                      <td data-acc-cell="true" style={{ padding: "0.65rem 1rem" }}>
                        <div className="acc-actions-stack" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => openEntryModal(String(entry.id), "view")}
                            style={{
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
                          <button
                            type="button"
                            onClick={() => openEntryModal(String(entry.id), "edit")}
                            style={{
                              padding: "0.35rem 0.65rem",
                              borderRadius: "var(--radius-sm)",
                              border: "none",
                              background: "var(--pp-navy-dark)",
                              color: "var(--pp-white)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>

          {!loading && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-s)", flexWrap: "wrap" }}>
              <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                Page {safeCurrentPage} of {totalPages}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1.5px solid var(--pp-slate-200)",
                    background: "var(--pp-white)",
                    color: "var(--pp-slate-700)",
                    cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                    opacity: safeCurrentPage <= 1 ? 0.55 : 1,
                  }}
                >
                  Prev
                </button>

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: "2rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      border: safeCurrentPage === page ? "none" : "1.5px solid var(--pp-slate-200)",
                      background: safeCurrentPage === page ? "var(--pp-navy-dark)" : "var(--pp-white)",
                      color: safeCurrentPage === page ? "var(--pp-white)" : "var(--pp-slate-700)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1.5px solid var(--pp-slate-200)",
                    background: "var(--pp-white)",
                    color: "var(--pp-slate-700)",
                    cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                    opacity: safeCurrentPage >= totalPages ? 0.55 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog.Root open={!!entryModal} onOpenChange={(o) => !o && closeModalWithGuard()}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
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
              width: "min(94vw, 58rem)",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "var(--pp-white)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--pp-slate-200)",
              padding: "var(--space-m)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
              <Dialog.Title className="text-fluid-lg font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                {entryModal?.mode === "edit" ? "Edit ACC Request" : "View ACC Request"} {entryModal?.id ? `#${entryModal.id}` : ""}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={closeModalWithGuard}
                  style={{
                    border: "1px solid var(--pp-slate-200)",
                    background: "var(--pp-white)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.3rem 0.6rem",
                    cursor: "pointer",
                    color: "var(--pp-slate-700)",
                  }}
                >
                  Close
                </button>
              </Dialog.Close>
            </div>

            {entryModalLoading ? (
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>Loading request details…</p>
            ) : entryModalError ? (
              <p className="text-fluid-sm" style={{ color: "#b91c1c" }}>{entryModalError}</p>
            ) : entryDetail ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
                  <div><strong>ID:</strong> #{String(entryDetail.id)}</div>
                  <div><strong>Submitted:</strong> {formatDate(String(entryDetail.date_created))}</div>
                </div>

                <div style={{ border: "1px solid var(--pp-slate-100)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.6rem", color: "var(--pp-navy-dark)" }}>Owner / Property</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
                    <div>
                      <strong>Owner Name</strong>
                      {entryModal?.mode === "edit" ? (
                        viewMode === "redacted" ? (
                          <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-500)" }}>REDACTED</div>
                        ) : (
                          <input type="text" value={editOwnerName} onChange={(e) => setEditOwnerName(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        )
                      ) : <div style={{ marginTop: "0.25rem" }}>{maybeRedact("23", fieldToString(entryDetail["23"]))}</div>}
                    </div>
                    <div>
                      <strong>Street Address</strong>
                      {entryModal?.mode === "edit" ? (
                        <input type="text" value={editStreetAddress} onChange={(e) => setEditStreetAddress(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["58"])}</div>}
                    </div>
                    <div>
                      <strong>Phone</strong>
                      {entryModal?.mode === "edit" ? (
                        viewMode === "redacted" ? (
                          <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-500)" }}>REDACTED</div>
                        ) : (
                          <input type="text" value={editOwnerPhone} onChange={(e) => setEditOwnerPhone(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        )
                      ) : <div style={{ marginTop: "0.25rem" }}>{maybeRedact("6", fieldToString(entryDetail["6"]))}</div>}
                    </div>
                    <div>
                      <strong>Email</strong>
                      {entryModal?.mode === "edit" ? (
                        viewMode === "redacted" ? (
                          <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-500)" }}>REDACTED</div>
                        ) : (
                          <>
                            <input type="text" value={editOwnerEmail} onChange={(e) => { setEditOwnerEmail(e.target.value); setFormErrors((prev) => ({ ...prev, ownerEmail: undefined, global: undefined })) }} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: formErrors.ownerEmail ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                            {formErrors.ownerEmail && (
                              <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.ownerEmail}</div>
                            )}
                          </>
                        )
                      ) : <div style={{ marginTop: "0.25rem" }}>{maybeRedact("20", fieldToString(entryDetail["20"]))}</div>}
                    </div>
                    <div>
                      <strong>Phase</strong>
                      {entryModal?.mode === "edit" ? (
                        <input type="text" value={editPhase} onChange={(e) => setEditPhase(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["4"])}</div>}
                    </div>
                    <div>
                      <strong>Lot #</strong>
                      {entryModal?.mode === "edit" ? (
                        <input type="text" value={editLot} onChange={(e) => setEditLot(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["5"])}</div>}
                    </div>
                  </div>
                </div>

                <div style={{ border: "1px solid var(--pp-slate-100)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.6rem", color: "var(--pp-navy-dark)" }}>Request Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
                    <div>
                      <strong>Role Confirmation</strong>
                      {entryModal?.mode === "edit" ? (
                        <select
                          value={editRoleConfirmation}
                          onChange={(e) => setEditRoleConfirmation(e.target.value)}
                          style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                        >
                          <option value="">Select role…</option>
                          {ROLE_CONFIRMATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          {editRoleConfirmation && !ROLE_CONFIRMATION_OPTIONS.includes(editRoleConfirmation) && (
                            <option value={editRoleConfirmation}>{editRoleConfirmation}</option>
                          )}
                        </select>
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["24"])}</div>}
                    </div>
                    <div>
                      <strong>Authorized Rep Name</strong>
                      {(entryModal?.mode === "edit"
                        ? editRoleConfirmation === "I am an authorized representative acting on the owner's behalf"
                        : !!fieldToString(entryDetail["44"]).trim() && fieldToString(entryDetail["44"]) !== "—"
                      ) ? (
                        entryModal?.mode === "edit" ? (
                          viewMode === "redacted" ? (
                            <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-500)" }}>REDACTED</div>
                          ) : (
                            <input type="text" value={editAuthorizedRepName} onChange={(e) => setEditAuthorizedRepName(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                          )
                        ) : <div style={{ marginTop: "0.25rem" }}>{maybeRedact("44", fieldToString(entryDetail["44"]))}</div>
                      ) : (
                        <div style={{ marginTop: "0.25rem", color: "var(--pp-slate-500)" }}>Not required for owner role.</div>
                      )}
                    </div>
                    <div>
                      <strong>Work Type</strong>
                      {entryModal?.mode === "edit" ? (
                        <select
                          value={editWorkType}
                          onChange={(e) => setEditWorkType(e.target.value)}
                          style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                        >
                          <option value="">Select work type…</option>
                          {WORK_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          {editWorkType && !WORK_TYPE_OPTIONS.includes(editWorkType) && (
                            <option value={editWorkType}>{editWorkType}</option>
                          )}
                        </select>
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["27"])}</div>}
                    </div>
                    <div>
                      <strong>Attach Documents Now?</strong>
                      {entryModal?.mode === "edit" ? (
                        <select
                          value={editAttachDocsChoice}
                          onChange={(e) => setEditAttachDocsChoice(e.target.value)}
                          style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                        >
                          <option value="">Select option…</option>
                          {ATTACH_DOCS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          {editAttachDocsChoice && !ATTACH_DOCS_OPTIONS.includes(editAttachDocsChoice) && (
                            <option value={editAttachDocsChoice}>{editAttachDocsChoice}</option>
                          )}
                        </select>
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["18"])}</div>}
                    </div>
                    <div>
                      <strong>Estimated Start Date</strong>
                      {entryModal?.mode === "edit" ? (
                        <>
                          <input type="date" value={editEstimatedStartDate} onChange={(e) => { setEditEstimatedStartDate(e.target.value); setFormErrors((prev) => ({ ...prev, estimatedStartDate: undefined, global: undefined })) }} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: formErrors.estimatedStartDate ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                          {formErrors.estimatedStartDate && (
                            <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.estimatedStartDate}</div>
                          )}
                        </>
                      ) : <div style={{ marginTop: "0.25rem" }}>{formatDateForDisplay(firstFieldValue(entryDetail, ["15", "estimated_start_date"]))}</div>}
                    </div>
                    <div>
                      <strong>Estimated Completion Date</strong>
                      {entryModal?.mode === "edit" ? (
                        <>
                          <input type="date" value={editEstimatedCompletionDate} onChange={(e) => { setEditEstimatedCompletionDate(e.target.value); setFormErrors((prev) => ({ ...prev, estimatedCompletionDate: undefined, global: undefined })) }} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: formErrors.estimatedCompletionDate ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                          {formErrors.estimatedCompletionDate && (
                            <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.estimatedCompletionDate}</div>
                          )}
                        </>
                      ) : <div style={{ marginTop: "0.25rem" }}>{formatDateForDisplay(firstFieldValue(entryDetail, ["16", "estimated_completion_date"]))}</div>}
                    </div>

                    {(entryModal?.mode === "edit" ? editWorkType === "Paint" : !!fieldToString(entryDetail["28"]).trim() && fieldToString(entryDetail["28"]) !== "—") && (
                      <div>
                        <strong>Body Color</strong>
                        {entryModal?.mode === "edit" ? (
                          <input type="text" value={editBodyColor} onChange={(e) => setEditBodyColor(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["28"])}</div>}
                      </div>
                    )}
                    {(entryModal?.mode === "edit" ? editWorkType === "Paint" : !!fieldToString(entryDetail["29"]).trim() && fieldToString(entryDetail["29"]) !== "—") && (
                      <div>
                        <strong>Trim Color</strong>
                        {entryModal?.mode === "edit" ? (
                          <input type="text" value={editTrimColor} onChange={(e) => setEditTrimColor(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["29"])}</div>}
                      </div>
                    )}
                    {(entryModal?.mode === "edit" ? editWorkType === "Paint" : !!fieldToString(entryDetail["30"]).trim() && fieldToString(entryDetail["30"]) !== "—") && (
                      <div>
                        <strong>Door Color</strong>
                        {entryModal?.mode === "edit" ? (
                          <input type="text" value={editDoorColor} onChange={(e) => setEditDoorColor(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["30"])}</div>}
                      </div>
                    )}

                    {(entryModal?.mode === "edit" ? editWorkType === "Roof" : !!fieldToString(entryDetail["31"]).trim() && fieldToString(entryDetail["31"]) !== "—") && (
                      <div>
                        <strong>Roof Color</strong>
                        {entryModal?.mode === "edit" ? (
                          <input type="text" value={editRoofColor} onChange={(e) => setEditRoofColor(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["31"])}</div>}
                      </div>
                    )}
                    {(entryModal?.mode === "edit" ? editWorkType === "Roof" : !!fieldToString(entryDetail["32"]).trim() && fieldToString(entryDetail["32"]) !== "—") && (
                      <div>
                        <strong>Roof Type</strong>
                        {entryModal?.mode === "edit" ? (
                          <select value={editRoofType} onChange={(e) => setEditRoofType(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}>
                            <option value="">Choose one...</option>
                            <option value="Dimensional Shingle">Dimensional Shingle</option>
                            <option value="Tile Roof">Tile Roof</option>
                            {editRoofType && !["Dimensional Shingle", "Tile Roof"].includes(editRoofType) && (
                              <option value={editRoofType}>{editRoofType}</option>
                            )}
                          </select>
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["32"])}</div>}
                      </div>
                    )}
                    {(entryModal?.mode === "edit" ? editWorkType === "Fence" : !!fieldToString(entryDetail["56"]).trim() && fieldToString(entryDetail["56"]) !== "—") && (
                      <div>
                        <strong>Fence Style</strong>
                        {entryModal?.mode === "edit" ? (
                          <select
                            value={editFenceStyle}
                            onChange={(e) => setEditFenceStyle(e.target.value)}
                            style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                          >
                            <option value="">Select fence style…</option>
                            {FENCE_STYLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            {editFenceStyle && !FENCE_STYLE_OPTIONS.includes(editFenceStyle) && (
                              <option value={editFenceStyle}>{editFenceStyle}</option>
                            )}
                          </select>
                        ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["56"])}</div>}
                      </div>
                    )}
                    {entryModal?.mode === "edit" && editWorkType && !["Paint", "Roof", "Fence"].includes(editWorkType) && (
                      <div style={{ gridColumn: "1 / -1", marginTop: "0.15rem", color: "var(--pp-slate-500)", fontSize: "0.85rem" }}>
                        No additional conditional fields for this work type.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ border: "1px solid var(--pp-slate-100)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.6rem", color: "var(--pp-navy-dark)" }}>ACC Review</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
                    <div>
                      <strong>ACC Approval 1</strong>
                      {entryModal?.mode === "edit" ? (
                        <input type="text" value={editAccApproval1} onChange={(e) => setEditAccApproval1(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["38"])}</div>}
                    </div>
                    <div>
                      <strong>ACC Approval 2</strong>
                      {entryModal?.mode === "edit" ? (
                        <input type="text" value={editAccApproval2} onChange={(e) => setEditAccApproval2(e.target.value)} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                      ) : <div style={{ marginTop: "0.25rem" }}>{fieldToString(entryDetail["62"])}</div>}
                    </div>
                    <div>
                      <strong>Process Date</strong>
                      {entryModal?.mode === "edit" ? (
                        <>
                          <input type="date" value={editProcessDate} onChange={(e) => { setEditProcessDate(e.target.value); setFormErrors((prev) => ({ ...prev, processDate: undefined, global: undefined })) }} style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: formErrors.processDate ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }} />
                          {formErrors.processDate && (
                            <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.processDate}</div>
                          )}
                        </>
                      ) : <div style={{ marginTop: "0.25rem" }}>{formatDateForDisplay(firstFieldValue(entryDetail, ["61", "process_date"]))}</div>}
                    </div>
                    <div>
                      <strong>Permit #</strong>
                      {entryModal?.mode === "edit" ? (
                        <>
                          <input
                            type="text"
                            value={editPermitNumber}
                            onChange={(e) => { setEditPermitNumber(e.target.value); setFormErrors((prev) => ({ ...prev, permitNumber: undefined, global: undefined })) }}
                            style={{ width: "100%", marginTop: "0.25rem", borderRadius: "var(--radius-sm)", border: formErrors.permitNumber ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                          />
                          {formErrors.permitNumber && (
                            <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.permitNumber}</div>
                          )}
                        </>
                      ) : <div style={{ marginTop: "0.25rem" }}>{getPermitNumber(entryDetail) || "—"}</div>}
                    </div>
                    <div>
                      <strong>ACC Disposition</strong>
                      <div style={{ marginTop: "0.25rem" }}>
                        {entryModal?.mode === "edit" ? (
                          <>
                            <select
                              value={editDisposition}
                              onChange={(e) => { setEditDisposition(e.target.value as DispositionStatus); setFormErrors((prev) => ({ ...prev, disposition: undefined, global: undefined })) }}
                              style={{ width: "100%", borderRadius: "var(--radius-sm)", border: formErrors.disposition ? "1.5px solid #ef4444" : "1.5px solid var(--pp-slate-200)", padding: "0.35rem 0.45rem" }}
                            >
                              <option value="unknown">Not set</option>
                              {DISPOSITION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            {formErrors.disposition && (
                              <div className="text-fluid-sm" style={{ marginTop: "0.2rem", color: "#b91c1c" }}>{formErrors.disposition}</div>
                            )}
                          </>
                        ) : (
                          <StatusBadge status={String(entryDetail._accDisposition ?? getAccDisposition(entryDetail))} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)", display: "block", marginBottom: "0.35rem" }}>
                    Description
                  </label>
                  {entryModal?.mode === "edit" ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      style={{
                        width: "100%",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--pp-slate-200)",
                        padding: "0.55rem 0.65rem",
                        fontSize: "0.9rem",
                        color: "var(--pp-slate-700)",
                      }}
                    />
                  ) : (
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>{fieldToString(entryDetail["14"])}</div>
                  )}
                </div>

                <div>
                  <label className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-700)", display: "block", marginBottom: "0.35rem" }}>
                    Notes
                  </label>
                  {entryModal?.mode === "edit" ? (
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--pp-slate-200)",
                        padding: "0.55rem 0.65rem",
                        fontSize: "0.9rem",
                        color: "var(--pp-slate-700)",
                      }}
                    />
                  ) : (
                    <div className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>{firstFieldValue(entryDetail, ["37", "notes", "note"]) || "—"}</div>
                  )}
                </div>

                <div style={{ border: "1px solid var(--pp-slate-100)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.6rem", color: "var(--pp-navy-dark)" }}>Attachments</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "0.65rem" }}>
                    {attachmentPanel("Resident Attachments (Field 19)", "19", residentUploadFiles, setResidentUploadFiles, residentInputKey)}
                    {attachmentPanel("ACC Attachments (Field 60)", "60", accUploadFiles, setAccUploadFiles, accInputKey)}
                  </div>
                </div>

                {uploadError && (
                  <div style={{ border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "#b91c1c", padding: "0.55rem 0.65rem" }}>
                    {uploadError}
                  </div>
                )}

                {successMessage && (
                  <div style={{ border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", background: "#f0fdf4", color: "#166534", padding: "0.55rem 0.65rem" }}>
                    {successMessage}
                  </div>
                )}

                {formErrors.global && (
                  <div style={{ border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "#b91c1c", padding: "0.55rem 0.65rem" }}>
                    {formErrors.global}
                  </div>
                )}

                {entryModal?.mode === "edit" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={closeModalWithGuard}
                      style={{
                        padding: "0.45rem 0.8rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--pp-slate-200)",
                        background: "var(--pp-white)",
                        color: "var(--pp-slate-700)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEntryEdit}
                      disabled={savingEdit}
                      style={{
                        padding: "0.45rem 0.8rem",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: "var(--pp-navy-dark)",
                        color: "var(--pp-white)",
                        cursor: savingEdit ? "not-allowed" : "pointer",
                        opacity: savingEdit ? 0.7 : 1,
                      }}
                    >
                      {savingEdit ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style jsx>{`
        .acc-table {
          min-width: 40rem;
        }

        .acc-description-text {
          -webkit-line-clamp: 2;
        }

        .acc-applicant-text {
          display: block;
        }

        .acc-col-worktype {
          display: none;
        }

        @media (max-width: 900px) {
          .acc-controls-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 1180px) {
          .acc-description-text {
            -webkit-line-clamp: 3;
          }
        }

        @media (max-width: 1170px) {
          .acc-col-submitted {
            display: none;
          }
        }

        @media (max-width: 955px) {
          .acc-col-description {
            display: none;
          }
          .acc-col-worktype {
            display: table-cell;
          }
        }

        @media (max-width: 755px) {
          .acc-col-permit {
            display: none;
          }
        }

        @media (max-width: 670px) {
          .acc-col-worktype {
            display: none;
          }
        }

        @media (max-width: 740px) {
          .acc-table {
            min-width: 33.5rem;
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

          .acc-col-status {
            display: none;
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
            align-items: stretch;
            flex-wrap: nowrap;
          }
        }
      `}</style>

    </div>
  )
}
