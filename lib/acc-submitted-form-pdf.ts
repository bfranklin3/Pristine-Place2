import { chromium } from "playwright"
import { getWorkflowRequestForManagement, normalizeAccWorkflowFormData } from "@/lib/acc-workflow/repository"

export type AccSubmittedFormSource = "native" | "legacy"

export type AccSubmittedFormAttachment = {
  name: string
  url: string
  scope: string | null
}

export type AccSubmittedFormFact = {
  label: string
  value: string
}

export type AccSubmittedFormData = {
  source: AccSubmittedFormSource
  sourceRecordId: string
  requestId: string | null
  requestNumber: string | null
  permitNumber: string | null
  title: string
  residentName: string | null
  residentAddress: string | null
  residentEmail: string | null
  residentPhone: string | null
  authorizedRepName: string | null
  statusLabel: string | null
  reviewCycle: number | null
  submittedAt: string | null
  updatedAt: string | null
  workType: string | null
  phase: string | null
  lot: string | null
  description: string | null
  locationDetails: string | null
  residentActionNote: string | null
  decisionNote: string | null
  verificationNote: string | null
  facts: AccSubmittedFormFact[]
  attachments: AccSubmittedFormAttachment[]
}

type CombinedAccDashboardViewMode = "full" | "redacted"

type GfEntry = {
  id: string
  date_created: string
  date_updated?: string
  status: string
  [key: string]: unknown
}

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""

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

function statusLabel(value: string | null | undefined) {
  if (!value) return null
  if (value === "initial_review") return "Initial Review"
  if (value === "needs_more_info") return "Needs More Info"
  if (value === "committee_vote") return "Committee Vote"
  if (value === "approved") return "Approved"
  if (value === "rejected") return "Rejected"
  return value
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderMaybeLink(url: string, label: string) {
  const safeUrl = escapeHtml(url)
  const safeLabel = escapeHtml(label)
  return `<a href="${safeUrl}">${safeLabel}</a>`
}

export async function getAccSubmittedFormData(input: {
  source: AccSubmittedFormSource
  id: string
  viewerUserId: string
  viewMode?: CombinedAccDashboardViewMode
}): Promise<AccSubmittedFormData | null> {
  if (input.source === "native") {
    const request = await getWorkflowRequestForManagement({ requestId: input.id, viewerUserId: input.viewerUserId })
    if (!request) return null

    const formData = normalizeAccWorkflowFormData(request.formData)
    const facts: AccSubmittedFormFact[] = [
      { label: "Owner Name", value: formData.ownerName },
      { label: "Street Address", value: formData.streetAddress },
      { label: "Owner Phone", value: formData.ownerPhone },
      { label: "Owner Email", value: formData.ownerEmail },
      { label: "Phase", value: formData.phase },
      { label: "Lot", value: formData.lot },
      { label: "Role", value: formData.role },
      { label: "Authorized Representative", value: formData.authorizedRepName },
      { label: "Work Type", value: formData.workType },
      { label: "Estimated Start", value: formData.startDate },
      { label: "Estimated Completion", value: formData.completionDate },
      { label: "Supporting Documents", value: formData.hasSupportingDocs },
      { label: "Paint Body Color", value: formData.paintBodyColor },
      { label: "Paint Trim Color", value: formData.paintTrimColor },
      { label: "Paint Door Color", value: formData.paintDoorColor },
      { label: "Roof Color", value: formData.roofColor },
      { label: "Roof Type", value: formData.roofType },
      { label: "Fence Style", value: formData.fenceStyle },
      { label: "Landscaping Details", value: formData.landscapingDetails },
      { label: "Other Work Details", value: formData.otherWorkDetails },
    ].filter((fact) => fact.value && fact.value.trim().length > 0)

    return {
      source: "native",
      sourceRecordId: request.id,
      requestId: request.id,
      requestNumber: request.requestNumber,
      permitNumber: request.permitNumber,
      title: request.title || "Native ACC Request",
      residentName: request.residentName,
      residentAddress: request.residentAddress,
      residentEmail: request.residentEmail,
      residentPhone: request.residentPhone,
      authorizedRepName: request.authorizedRepName,
      statusLabel: statusLabel(request.status),
      reviewCycle: request.reviewCycle,
      submittedAt: request.submittedAt,
      updatedAt: request.updatedAt,
      workType: request.workType,
      phase: request.phase,
      lot: request.lot,
      description: request.description,
      locationDetails: request.locationDetails,
      residentActionNote: request.residentActionNote,
      decisionNote: request.decisionNote,
      verificationNote: request.verificationNote,
      facts,
      attachments: request.attachments.map((attachment) => ({
        name: attachment.originalFilename,
        url: attachment.url,
        scope: attachment.scope,
      })),
    }
  }

  const viewMode = input.viewMode || "full"
  const res = await fetch(`${GF_API_URL}/entries/${input.id}`, {
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

  const facts: AccSubmittedFormFact[] = [
    { label: "Owner Name", value: residentName || "" },
    { label: "Street Address", value: toOptionalString(entry["58"]) || "" },
    { label: "Owner Phone", value: residentPhone || "" },
    { label: "Owner Email", value: residentEmail || "" },
    { label: "Phase", value: toOptionalString(entry["4"]) || "" },
    { label: "Lot", value: toOptionalString(entry["5"]) || "" },
    { label: "Role Confirmation", value: toOptionalString(entry["24"]) || "" },
    { label: "Authorized Representative", value: authorizedRepName || "" },
    { label: "Work Type", value: toOptionalString(entry["27"]) || "" },
    { label: "Estimated Start", value: toOptionalString(entry["15"]) || "" },
    { label: "Estimated Completion", value: toOptionalString(entry["16"]) || "" },
    { label: "Process Date", value: toOptionalString(entry["61"]) || "" },
    { label: "Additional Notes", value: toOptionalString(entry["37"]) || "" },
  ].filter((fact) => fact.value && fact.value.trim().length > 0)

  return {
    source: "legacy",
    sourceRecordId: String(entry.id),
    requestId: null,
    requestNumber: null,
    permitNumber: toOptionalString(entry["39"]),
    title: inferLegacyTitle(entry),
    residentName,
    residentAddress: toOptionalString(entry["58"]),
    residentEmail,
    residentPhone,
    authorizedRepName,
    statusLabel: null,
    reviewCycle: null,
    submittedAt: entry.date_created,
    updatedAt: entry.date_updated || null,
    workType: toOptionalString(entry["27"]),
    phase: toOptionalString(entry["4"]),
    lot: toOptionalString(entry["5"]),
    description: toOptionalString(entry["14"]),
    locationDetails: toOptionalString(entry["37"]),
    residentActionNote: null,
    decisionNote: null,
    verificationNote: null,
    facts,
    attachments: [...residentAttachments, ...internalAttachments],
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US")
}

export function getAccSubmittedFormPdfFilename(data: AccSubmittedFormData) {
  const base =
    data.requestNumber ||
    data.permitNumber ||
    `${data.source}-${data.sourceRecordId}`

  return `${base.replace(/[^a-zA-Z0-9._-]/g, "-")}-submitted-form.pdf`
}

export function renderAccSubmittedFormPdfHtml(data: AccSubmittedFormData) {
  const factsHtml = data.facts.length
    ? data.facts
        .map(
          (fact) => `
            <div class="fact">
              <div class="fact-label">${escapeHtml(fact.label)}</div>
              <div class="fact-value">${escapeHtml(fact.value)}</div>
            </div>
          `,
        )
        .join("")
    : `<p class="muted">No form fields were available.</p>`

  const attachmentsHtml = data.attachments.length
    ? `<ul class="attachments">
        ${data.attachments
          .map(
            (attachment) => `
              <li>
                <span class="attachment-scope">${escapeHtml((attachment.scope || "attachment").toUpperCase())}</span>
                ${renderMaybeLink(attachment.url, attachment.name)}
              </li>
            `,
          )
          .join("")}
      </ul>`
    : `<p class="muted">No attachments.</p>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.title)}</title>
    <style>
      @page { size: Letter; margin: 0.5in; }
      body {
        font-family: Georgia, "Times New Roman", serif;
        color: #1f2937;
        margin: 0;
        line-height: 1.4;
      }
      .page {
        display: grid;
        gap: 18px;
      }
      .header {
        border-bottom: 2px solid #1f3d2c;
        padding-bottom: 12px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #4b5563;
        margin-bottom: 6px;
      }
      h1 {
        font-size: 24px;
        margin: 0 0 6px 0;
        color: #163125;
      }
      .subhead {
        font-size: 13px;
        color: #4b5563;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .card {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 12px;
        background: #fbfdfc;
      }
      .card-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        margin-bottom: 4px;
      }
      .mono {
        font-family: "Courier New", Courier, monospace;
        font-weight: 700;
      }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #163125;
        margin: 0 0 8px 0;
      }
      .stack {
        display: grid;
        gap: 8px;
      }
      .fact {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px;
        background: #ffffff;
      }
      .fact-label {
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .fact-value {
        margin-top: 4px;
        font-size: 14px;
      }
      .attachments {
        margin: 0;
        padding-left: 18px;
      }
      .attachments li {
        margin: 0 0 6px 0;
      }
      .attachment-scope {
        display: inline-block;
        min-width: 74px;
        font-size: 11px;
        color: #6b7280;
        font-weight: 700;
      }
      a {
        color: #1d4ed8;
        text-decoration: underline;
      }
      p {
        margin: 0;
      }
      .muted {
        color: #6b7280;
      }
      .notes {
        display: grid;
        gap: 8px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="eyebrow">Pristine Place HOA ACC Submitted Form</div>
        <h1>${escapeHtml(data.title)}</h1>
        <div class="subhead">
          ${escapeHtml(data.residentName || "Resident")} • ${escapeHtml(data.residentAddress || "No address")}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-label">Request Number</div>
          <div class="mono">${escapeHtml(data.requestNumber || "—")}</div>
        </div>
        <div class="card">
          <div class="card-label">Permit Number</div>
          <div class="mono">${escapeHtml(data.permitNumber || "—")}</div>
        </div>
        <div class="card">
          <div class="card-label">Source</div>
          <div>${escapeHtml(data.source === "native" ? "Native ACC Workflow" : "Legacy WordPress ACC")}</div>
        </div>
        <div class="card">
          <div class="card-label">Status</div>
          <div>${escapeHtml(data.statusLabel || "—")}</div>
        </div>
        <div class="card">
          <div class="card-label">Submitted</div>
          <div>${escapeHtml(formatDateTime(data.submittedAt))}</div>
        </div>
        <div class="card">
          <div class="card-label">Updated</div>
          <div>${escapeHtml(formatDateTime(data.updatedAt))}</div>
        </div>
      </div>

      <div class="stack">
        <h2 class="section-title">Submitted Form</h2>
        <div class="grid">${factsHtml}</div>
      </div>

      ${
        data.description
          ? `<div class="stack"><h2 class="section-title">Project Description</h2><p>${escapeHtml(data.description)}</p></div>`
          : ""
      }

      ${
        data.locationDetails
          ? `<div class="stack"><h2 class="section-title">Additional Details</h2><p>${escapeHtml(data.locationDetails)}</p></div>`
          : ""
      }

      ${
        data.residentActionNote || data.decisionNote || data.verificationNote
          ? `<div class="notes">
              <h2 class="section-title">Workflow Notes</h2>
              ${data.residentActionNote ? `<div class="card"><div class="card-label">Resident Action Note</div><div>${escapeHtml(data.residentActionNote)}</div></div>` : ""}
              ${data.decisionNote ? `<div class="card"><div class="card-label">Decision Note</div><div>${escapeHtml(data.decisionNote)}</div></div>` : ""}
              ${data.verificationNote ? `<div class="card"><div class="card-label">Verification Note</div><div>${escapeHtml(data.verificationNote)}</div></div>` : ""}
            </div>`
          : ""
      }

      <div class="stack">
        <h2 class="section-title">Attachments</h2>
        ${attachmentsHtml}
      </div>
    </div>
  </body>
</html>`
}

export async function generateAccSubmittedFormPdf(input: {
  source: AccSubmittedFormSource
  id: string
  viewerUserId: string
  viewMode?: CombinedAccDashboardViewMode
}) {
  const data = await getAccSubmittedFormData(input)
  if (!data) return null

  const html = renderAccSubmittedFormPdfHtml(data)
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    })
    await page.close()

    return {
      data,
      pdf,
      filename: getAccSubmittedFormPdfFilename(data),
    }
  } finally {
    await browser.close()
  }
}
