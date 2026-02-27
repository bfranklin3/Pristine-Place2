// app/api/gf-entries/route.ts
// Proxy to Gravity Forms REST API — fetch ACC permit form entries
// with server-side disposition/search/date filtering and pagination.

import { NextRequest, NextResponse } from "next/server"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""
const ACC_FORM_ID = process.env.ACC_FORM_ID ?? "1"

type DispositionStatus = "approved" | "rejected" | "conditional" | "duplicate" | "canceled" | "unknown"
type DispositionFilter = "all" | Exclude<DispositionStatus, "unknown">

interface GfEntry {
  id: string
  date_created: string
  status: string
  is_approved?: string | boolean
  [key: string]: unknown
}
type GfEntryWithDisposition = GfEntry & { _accDisposition: DispositionStatus }

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
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

function dispositionFromIsApproved(raw: unknown): DispositionStatus | null {
  const v = String(raw ?? "").trim()
  if (!v) return null
  if (v === "1") return "approved"
  if (v === "2") return "rejected"
  if (v === "3") return "conditional"
  return null
}

function getAccDisposition(entry: GfEntry): DispositionStatus {
  const preferred = [
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

  for (const value of preferred) {
    const normalized = normalizeDisposition(value)
    if (normalized !== "unknown") return normalized
  }

  // Fallback: numeric GF fields containing disposition words.
  for (const [key, value] of Object.entries(entry)) {
    if (!/^\d+(\.\d+)?$/.test(key)) continue
    const normalized = normalizeDisposition(value)
    if (normalized !== "unknown") return normalized
  }

  const viaApprovedFlag = dispositionFromIsApproved(entry.is_approved)
  if (viaApprovedFlag) return viaApprovedFlag

  // Last fallback from GF lifecycle status.
  if (entry.status === "active") return "conditional"
  if (entry.status === "trash") return "canceled"
  return "unknown"
}

function stringifyValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map(stringifyValue).join(" ")
  if (typeof value === "object") return Object.values(value).map(stringifyValue).join(" ")
  return ""
}

function isWithinDate(entryDateCreated: string, startDate?: string, endDate?: string): boolean {
  const day = String(entryDateCreated || "").slice(0, 10) // YYYY-MM-DD
  if (!day || day.length < 10) return false
  if (startDate && day < startDate) return false
  if (endDate && day > endDate) return false
  return true
}

async function fetchAllActiveEntries(): Promise<GfEntry[]> {
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
      throw { status: res.status, detail }
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

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin", "acc"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const disposition = (searchParams.get("disposition") ?? "all").toLowerCase() as DispositionFilter
  const q = (searchParams.get("q") ?? "").trim().toLowerCase()
  const startDate = (searchParams.get("startDate") ?? "").trim() || undefined
  const endDate = (searchParams.get("endDate") ?? "").trim() || undefined
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? "25") || 25))

  try {
    const all = await fetchAllActiveEntries()

    const filtered = all.filter((entry) => {
      const d = getAccDisposition(entry)
      if (disposition !== "all" && d !== disposition) return false

      if (q) {
        const haystack = Object.values(entry).map((v) => stringifyValue(v)).join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }

      if ((startDate || endDate) && !isWithinDate(entry.date_created, startDate, endDate)) return false

      return true
    })

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * perPage
    const end = start + perPage
    const entries: GfEntryWithDisposition[] = filtered
      .slice(start, end)
      .map((entry) => ({ ...entry, _accDisposition: getAccDisposition(entry) }))

    return NextResponse.json({
      entries,
      total,
      page: safePage,
      perPage,
      totalPages,
    })
  } catch (err: unknown) {
    const e = err as { status?: number; detail?: unknown }
    return NextResponse.json(
      { error: "Failed to fetch entries", detail: e?.detail ?? null },
      { status: e?.status ?? 500 },
    )
  }
}
