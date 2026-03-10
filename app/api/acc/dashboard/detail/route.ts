import { NextRequest, NextResponse } from "next/server"
import { getWorkflowRequestForManagement } from "@/lib/acc-workflow/repository"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import type { CombinedAccDashboardViewMode } from "@/lib/acc-dashboard/repository"

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""

type DashboardDetailSource = "native" | "legacy"

type GfEntry = {
  id: string
  date_created: string
  date_updated?: string
  status: string
  [key: string]: unknown
}

function parseViewMode(value: string | null): CombinedAccDashboardViewMode {
  return value === "redacted" ? "redacted" : "full"
}

function parseSource(value: string | null): DashboardDetailSource | null {
  return value === "native" || value === "legacy" ? value : null
}

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function maybeRedact(value: string | null, viewMode: CombinedAccDashboardViewMode) {
  if (!value) return null
  return viewMode === "redacted" ? "REDACTED" : value
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

function toOptionalString(value: unknown): string | null {
  const normalized = fieldToString(value)
  return normalized && normalized !== "—" ? normalized : null
}

function inferLegacyTitle(entry: GfEntry) {
  return toOptionalString(entry["27"]) || "Legacy ACC Request"
}

function collectLegacyAttachmentUrls(entry: GfEntry, fieldId: "19" | "60") {
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
          // Ignore malformed attachment values from Gravity Forms.
        }
      }
      for (const match of value.match(/https?:\/\/[^\s"'<>]+/g) || []) addUrl(match)
      for (const segment of value.split(/[\n,]+/)) addUrl(segment)
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

function filenameFromUrl(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() || url)
  } catch {
    return url.split("/").pop() || url
  }
}

function formatDecision(value: string | null | undefined) {
  if (!value) return null
  if (value === "approve") return "Approved"
  if (value === "reject") return "Rejected"
  return value
}

async function getLegacyDetail(id: string, viewMode: CombinedAccDashboardViewMode) {
  const res = await fetch(`${GF_API_URL}/entries/${id}`, {
    headers: gfAuthHeaders(),
    cache: "no-store",
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Failed to fetch legacy ACC detail (${res.status}): ${detail}`)
  }

  const entry = (await res.json()) as GfEntry
  const residentAttachments = collectLegacyAttachmentUrls(entry, "19").map((url) => ({
    name: filenameFromUrl(url),
    url,
    scope: "resident",
  }))
  const internalAttachments = collectLegacyAttachmentUrls(entry, "60").map((url) => ({
    name: filenameFromUrl(url),
    url,
    scope: "internal",
  }))

  const residentName = maybeRedact(toOptionalString(entry["23"]), viewMode)
  const residentEmail = maybeRedact(toOptionalString(entry["20"]), viewMode)
  const residentPhone = maybeRedact(toOptionalString(entry["6"]), viewMode)
  const authorizedRepName = maybeRedact(toOptionalString(entry["44"]), viewMode)

  return {
    residentName,
    residentAddress: toOptionalString(entry["58"]),
    title: inferLegacyTitle(entry),
    description: toOptionalString(entry["14"]),
    permitNumber: toOptionalString(entry["39"]),
    workType: toOptionalString(entry["27"]),
    phase: toOptionalString(entry["4"]),
    lot: toOptionalString(entry["5"]),
    reviewCycle: null,
    isVerified: false,
    locationDetails: toOptionalString(entry["37"]),
    residentActionNote: null,
    decisionNote: null,
    verificationNote: null,
    submittedAt: entry.date_created,
    updatedAt: entry.date_updated || null,
    attachments: [...residentAttachments, ...internalAttachments],
    facts: [
      { label: "Resident Email", value: residentEmail },
      { label: "Resident Phone", value: residentPhone },
      { label: "Authorized Representative", value: authorizedRepName },
      { label: "Role Confirmation", value: toOptionalString(entry["24"]) },
      { label: "Estimated Start", value: toOptionalString(entry["15"]) },
      { label: "Estimated Completion", value: toOptionalString(entry["16"]) },
      { label: "Process Date", value: toOptionalString(entry["61"]) },
    ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value)),
  }
}

async function getNativeDetail(id: string, viewerUserId: string, viewMode: CombinedAccDashboardViewMode) {
  const request = await getWorkflowRequestForManagement({ requestId: id, viewerUserId })
  if (!request) return null

  return {
    residentName: maybeRedact(request.residentName || null, viewMode),
    residentAddress: request.residentAddress || null,
    title: request.title || "Native ACC Request",
    description: request.description || null,
    permitNumber: null,
    workType: request.workType || null,
    phase: request.phase || null,
    lot: request.lot || null,
    reviewCycle: request.reviewCycle,
    isVerified: request.isVerified,
    locationDetails: request.locationDetails || null,
    residentActionNote: request.residentActionNote || null,
    decisionNote: request.decisionNote || null,
    verificationNote: request.verificationNote || null,
    submittedAt: request.submittedAt,
    updatedAt: request.updatedAt || null,
    attachments: request.attachments.map((attachment) => ({
      name: attachment.originalFilename,
      url: attachment.url,
      scope: attachment.scope,
    })),
    facts: [
      { label: "Resident Email", value: maybeRedact(request.residentEmail || null, viewMode) },
      { label: "Resident Phone", value: maybeRedact(request.residentPhone || null, viewMode) },
      { label: "Authorized Representative", value: maybeRedact(request.authorizedRepName || null, viewMode) },
      { label: "Vote Deadline", value: request.voteDeadlineAt || null },
      { label: "Final Decision", value: formatDecision(request.finalDecision) },
      { label: "Final Decision At", value: request.finalDecisionAt || null },
      { label: "Verified At", value: request.verifiedAt || null },
    ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value)),
  }
}

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const source = parseSource(searchParams.get("source"))
  const id = (searchParams.get("id") || "").trim()
  const viewMode = parseViewMode(searchParams.get("view"))

  if (!source || !id) {
    return NextResponse.json({ error: "source and id are required." }, { status: 400 })
  }

  try {
    const detail =
      source === "native"
        ? await getNativeDetail(id, access.identity.clerkUserId, viewMode)
        : await getLegacyDetail(id, viewMode)

    if (!detail) {
      return NextResponse.json({ error: "ACC dashboard detail not found." }, { status: 404 })
    }

    return NextResponse.json({ detail })
  } catch (error) {
    console.error("ACC dashboard detail failed:", error)
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC dashboard detail", message }, { status: 500 })
  }
}
