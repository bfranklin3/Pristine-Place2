import { prisma } from "@/lib/db/prisma"

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""
const WP_JSON_API_URL = process.env.WORDPRESS_API_URL ?? "https://www.pristineplace.us/wp-json"
const WP_USER = process.env.WORDPRESS_USERNAME ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD ?? ""
const ACC_FORM_ID = process.env.ACC_FORM_ID ?? "1"

type LegacyDispositionStatus = "approved" | "rejected" | "conditional" | "duplicate" | "canceled" | "pending" | "unknown"
type NativeWorkflowStatus = "initial_review" | "needs_more_info" | "committee_vote" | "approved" | "rejected"

export type CombinedAccDashboardSource = "native" | "legacy"
export type CombinedAccDashboardSourceFilter = "all" | CombinedAccDashboardSource
export type CombinedAccDashboardViewMode = "full" | "redacted"
export type CombinedAccDashboardStatus =
  | NativeWorkflowStatus
  | Exclude<LegacyDispositionStatus, "unknown">
export type CombinedAccDashboardStatusFilter = "all" | CombinedAccDashboardStatus

type GfEntry = {
  id: string
  date_created: string
  date_updated?: string
  status: string
  is_approved?: string | boolean
  _accDisposition?: LegacyDispositionStatus
  [key: string]: unknown
}

type NativeRow = {
  id: string
  requestNumber: string
  permitNumber: string | null
  residentNameSnapshot: string
  residentAddressSnapshot: string | null
  title: string | null
  description: string | null
  status: NativeWorkflowStatus
  reviewCycle: number
  isVerified: boolean
  finalDecisionAt: Date | null
  submittedAt: Date
  updatedAt: Date
}

export type CombinedAccDashboardEntry = {
  id: string
  source: CombinedAccDashboardSource
  sourceRecordId: string
  displayId: string
  residentName: string
  residentAddress: string | null
  title: string | null
  description: string | null
  permitNumber: string | null
  statusKey: CombinedAccDashboardStatus
  statusLabel: string
  processedAt: string | null
  updatedAt: string | null
  reviewCycle: number | null
  isVerified: boolean
  sourceHref: string
  sourceLabel: string
}

export type CombinedAccDashboardListResponse = {
  entries: CombinedAccDashboardEntry[]
  total: number
  totalPages: number
  page: number
  perPage: number
  counts: {
    all: number
    native: number
    legacy: number
  }
  statusCounts: Record<string, number>
}

export type CombinedAccDashboardFilters = {
  viewMode: CombinedAccDashboardViewMode
  source: CombinedAccDashboardSourceFilter
  status: CombinedAccDashboardStatusFilter
  query?: string
  page?: number
  perPage?: number
}

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function wpAuthHeaders() {
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function normalizeLegacyDisposition(raw: unknown): LegacyDispositionStatus {
  if (typeof raw !== "string") return "unknown"
  const value = raw.trim().toLowerCase()
  if (["approved", "approve", "accepted", "complete", "completed"].includes(value)) return "approved"
  if (["rejected", "reject", "denied", "deny", "declined", "disapproved"].includes(value)) return "rejected"
  if (["conditional", "conditionally approved", "approve with conditions"].includes(value)) return "conditional"
  if (["duplicate", "dup"].includes(value)) return "duplicate"
  if (["canceled", "cancelled", "cancel"].includes(value)) return "canceled"
  if (["pending", "new", "submitted", "in review", "in_review", "awaiting review", "awaiting approval"].includes(value)) {
    return "pending"
  }
  return "unknown"
}

function dispositionFromIsApproved(raw: unknown): LegacyDispositionStatus | null {
  const value = String(raw ?? "").trim()
  if (!value) return null
  if (value === "1") return "approved"
  if (value === "2") return "rejected"
  if (value === "3") return "conditional"
  return null
}

function getLegacyDisposition(entry: GfEntry, workflowStatusRaw?: unknown): LegacyDispositionStatus {
  const preferred = [
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

  for (const raw of preferred) {
    const normalized = normalizeLegacyDisposition(raw)
    if (normalized !== "unknown") return normalized
  }

  for (const [key, value] of Object.entries(entry)) {
    if (!/^\d+(\.\d+)?$/.test(key)) continue
    const normalized = normalizeLegacyDisposition(value)
    if (normalized !== "unknown") return normalized
  }

  const viaApprovedFlag = dispositionFromIsApproved(entry.is_approved)
  if (viaApprovedFlag) return viaApprovedFlag

  const workflowStatus = normalizeLegacyDisposition(workflowStatusRaw)
  if (workflowStatus !== "unknown") return workflowStatus

  if (entry.status === "active") return "pending"
  if (entry.status === "trash") return "canceled"
  return "unknown"
}

async function fetchWorkflowStatusMap(entryIds: string[]) {
  const map = new Map<string, LegacyDispositionStatus>()
  if (!WP_USER || !WP_PASS || entryIds.length === 0) return map

  const batchSize = 100
  for (let index = 0; index < entryIds.length; index += batchSize) {
    const batch = entryIds.slice(index, index + batchSize)
    const url = new URL(`${WP_JSON_API_URL}/pp/v1/acc-workflow-status`)
    url.searchParams.set("entry_ids", batch.join(","))

    const res = await fetch(url.toString(), {
      headers: wpAuthHeaders(),
      cache: "no-store",
    })
    if (!res.ok) continue

    const payload = (await res.json().catch(() => null)) as
      | { results?: Record<string, { ok?: boolean; resolved_status?: unknown; workflow_status?: unknown; acc_disposition?: unknown }> }
      | null

    const results = payload?.results ?? {}
    for (const [entryId, row] of Object.entries(results)) {
      if (!row?.ok) continue
      const normalized = normalizeLegacyDisposition(row.resolved_status ?? row.workflow_status ?? row.acc_disposition)
      if (normalized !== "unknown") {
        map.set(entryId, normalized)
      }
    }
  }

  return map
}

async function fetchAllLegacyAccEntries(): Promise<GfEntry[]> {
  const all: GfEntry[] = []
  const pageSize = 200
  let currentPage = 1
  let totalCount = Number.POSITIVE_INFINITY

  while (all.length < totalCount) {
    const url = new URL(`${GF_API_URL}/forms/${ACC_FORM_ID}/entries`)
    url.searchParams.set("paging[page_size]", String(pageSize))
    url.searchParams.set("paging[current_page]", String(currentPage))
    url.searchParams.set("search", JSON.stringify({ status: "active" }))

    const res = await fetch(url.toString(), {
      headers: gfAuthHeaders(),
      cache: "no-store",
    })

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(`Failed to fetch legacy ACC entries: ${JSON.stringify(detail)}`)
    }

    const data = await res.json()
    const batch = (data?.entries ?? []) as GfEntry[]
    totalCount = typeof data?.total_count === "number" ? data.total_count : all.length + batch.length
    all.push(...batch)

    if (batch.length === 0) break
    currentPage += 1
    if (currentPage > 200) break
  }

  return all
}

function fieldToString(value: unknown): string {
  if (!value) return "—"
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.filter(Boolean).join(", ")
  if (typeof value === "object") {
    const values = Object.values(value).filter(Boolean)
    return values.length > 0 ? values.join(", ") : "—"
  }
  return String(value)
}

function getLegacyPermitNumber(entry: GfEntry): string | null {
  const candidates = [
    entry["39"],
    entry.permit_number,
    entry["permit_number"],
    entry.permit_no,
    entry["permit_no"],
    entry.permit,
    entry["permit"],
  ]

  for (const candidate of candidates) {
    const value = fieldToString(candidate)
    if (value && value !== "—") return value
  }

  return null
}

function legacyStatusLabel(status: Exclude<LegacyDispositionStatus, "unknown">) {
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  if (status === "conditional") return "Conditional"
  if (status === "duplicate") return "Duplicate"
  if (status === "canceled") return "Canceled"
  return "Pending"
}

function nativeStatusLabel(status: NativeWorkflowStatus) {
  if (status === "initial_review") return "Initial Review"
  if (status === "needs_more_info") return "Needs More Info"
  if (status === "committee_vote") return "Committee Vote"
  if (status === "approved") return "Approved"
  return "Rejected"
}

function maybeRedactName(name: string, viewMode: CombinedAccDashboardViewMode) {
  if (viewMode === "redacted" && name.trim()) return "REDACTED"
  return name || "—"
}

function includeByStatus(
  entryStatus: CombinedAccDashboardStatus,
  filter: CombinedAccDashboardStatusFilter,
) {
  return filter === "all" || entryStatus === filter
}

function includeByQuery(entry: CombinedAccDashboardEntry, query: string) {
  if (!query) return true
  const haystack = [
    entry.source,
    entry.sourceRecordId,
    entry.displayId,
    entry.residentName,
    entry.residentAddress || "",
    entry.title || "",
    entry.description || "",
    entry.permitNumber || "",
    entry.statusLabel,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}

function buildSourceHref(
  source: CombinedAccDashboardSource,
  viewMode: CombinedAccDashboardViewMode,
  sourceRecordId: string,
) {
  if (source === "native") {
    return `/resident-portal/management/acc-queue?selected=${encodeURIComponent(sourceRecordId)}`
  }

  const basePath = viewMode === "redacted"
    ? "/resident-portal/management/wp-acc-queue-redacted"
    : "/resident-portal/management/wp-acc-queue"

  return `${basePath}?entry=${encodeURIComponent(sourceRecordId)}&mode=view`
}

function toLegacyEntry(entry: GfEntry, viewMode: CombinedAccDashboardViewMode): CombinedAccDashboardEntry | null {
  const status = getLegacyDisposition(entry)
  if (status === "unknown") return null

  const residentName = fieldToString(entry["23"])
  const residentAddress = fieldToString(entry["58"])
  const description = fieldToString(entry["14"])
  const workType = fieldToString(entry["27"])
  const processDate = fieldToString(entry["61"])

  return {
    id: `legacy:${entry.id}`,
    source: "legacy",
    sourceRecordId: String(entry.id),
    displayId: `#${entry.id}`,
    residentName: maybeRedactName(residentName, viewMode),
    residentAddress: residentAddress === "—" ? null : residentAddress,
    title: workType === "—" ? "Legacy ACC Request" : workType,
    description: description === "—" ? null : description,
    permitNumber: getLegacyPermitNumber(entry),
    statusKey: status,
    statusLabel: legacyStatusLabel(status),
    processedAt: processDate === "—" ? null : processDate,
    updatedAt: entry.date_updated || null,
    reviewCycle: null,
    isVerified: false,
    sourceHref: buildSourceHref("legacy", viewMode, String(entry.id)),
    sourceLabel: "WordPress legacy",
  }
}

function toNativeEntry(entry: NativeRow, viewMode: CombinedAccDashboardViewMode): CombinedAccDashboardEntry {
  return {
    id: `native:${entry.id}`,
    source: "native",
    sourceRecordId: entry.id,
    displayId: entry.requestNumber,
    residentName: maybeRedactName(entry.residentNameSnapshot || "—", viewMode),
    residentAddress: entry.residentAddressSnapshot,
    title: entry.title || "Native ACC Request",
    description: entry.description || null,
    permitNumber: entry.permitNumber,
    statusKey: entry.status,
    statusLabel: nativeStatusLabel(entry.status),
    processedAt: entry.finalDecisionAt?.toISOString() || null,
    updatedAt: entry.updatedAt.toISOString(),
    reviewCycle: entry.reviewCycle,
    isVerified: entry.isVerified,
    sourceHref: buildSourceHref("native", viewMode, entry.id),
    sourceLabel: "Native workflow",
  }
}

export async function listCombinedAccDashboardEntries(
  filters: CombinedAccDashboardFilters,
): Promise<CombinedAccDashboardListResponse> {
  const page = Math.max(1, filters.page || 1)
  const perPage = Math.max(5, Math.min(100, filters.perPage || 25))
  const query = (filters.query || "").trim().toLowerCase()

  const [nativeRows, legacyRawEntries] = await Promise.all([
    prisma.accWorkflowRequest.findMany({
      select: {
        id: true,
        requestNumber: true,
        permitNumber: true,
        residentNameSnapshot: true,
        residentAddressSnapshot: true,
        title: true,
        description: true,
        status: true,
        reviewCycle: true,
        isVerified: true,
        finalDecisionAt: true,
        submittedAt: true,
        updatedAt: true,
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    }) as Promise<NativeRow[]>,
    fetchAllLegacyAccEntries(),
  ])

  const workflowStatusMap = await fetchWorkflowStatusMap(legacyRawEntries.map((entry) => String(entry.id)))
  const legacyRows = legacyRawEntries
    .map((entry) => ({
      ...entry,
      _accDisposition: getLegacyDisposition(entry, workflowStatusMap.get(String(entry.id))),
    }))
    .map((entry) => toLegacyEntry(entry, filters.viewMode))
    .filter((entry): entry is CombinedAccDashboardEntry => Boolean(entry))

  const nativeEntries = nativeRows.map((row) => toNativeEntry(row, filters.viewMode))
  const sourceScoped = [...nativeEntries, ...legacyRows]
    .filter((entry) => filters.source === "all" || entry.source === filters.source)
    .filter((entry) => includeByQuery(entry, query))

  const counts = {
    all: sourceScoped.length,
    native: sourceScoped.filter((entry) => entry.source === "native").length,
    legacy: sourceScoped.filter((entry) => entry.source === "legacy").length,
  }

  const statusCounts: Record<string, number> = {}
  for (const entry of sourceScoped) {
    statusCounts[entry.statusKey] = (statusCounts[entry.statusKey] || 0) + 1
  }

  const filtered = sourceScoped
    .filter((entry) => includeByStatus(entry.statusKey, filters.status))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const end = start + perPage

  return {
    entries: filtered.slice(start, end),
    total,
    totalPages,
    page: safePage,
    perPage,
    counts,
    statusCounts,
  }
}
