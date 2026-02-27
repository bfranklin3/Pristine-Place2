import { NextRequest, NextResponse } from "next/server"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { prisma } from "@/lib/db/prisma"

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET = process.env.GRAVITY_FORMS_API_SECRET ?? ""
const WP_API = process.env.WORDPRESS_API_URL ?? "https://www.pristineplace.us/wp-json/wp/v2"
const WP_USER = process.env.WORDPRESS_USERNAME ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD ?? ""

const ALLOWED_FIELD_IDS = new Set(["19", "60"])
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "bmp", "pdf", "doc", "docx", "xls", "xlsx", "xlsm", "txt"])
const MAX_FILES_PER_FIELD = 20
const MAX_FILE_SIZE = 256 * 1024 * 1024

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function wpAuthHeader() {
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return { Authorization: `Basic ${token}` }
}

function mediaEndpoint() {
  return `${WP_API.replace(/\/wp\/v2\/?$/, "")}/wp/v2/media`
}

function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const cleaned = raw.trim().replace(/^"+|"+$/g, "")
  if (!/^https?:\/\//i.test(cleaned)) return null
  return cleaned
}

function parseAttachmentField(raw: unknown): string[] {
  const urls = new Set<string>()

  function add(value: unknown) {
    if (!value) return
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return

      if ((trimmed.startsWith("[") || trimmed.startsWith("{")) && trimmed.includes("http")) {
        try {
          add(JSON.parse(trimmed))
        } catch {
          // Ignore invalid JSON; continue with fallback parsing.
        }
      }

      const direct = normalizeUrl(trimmed)
      if (direct) {
        urls.add(direct)
      } else {
        const split = trimmed.split(/[\n,]+/)
        for (const part of split) {
          const maybe = normalizeUrl(part)
          if (maybe) urls.add(maybe)
        }
      }
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) add(item)
      return
    }

    if (typeof value === "object") {
      for (const item of Object.values(value as Record<string, unknown>)) add(item)
    }
  }

  add(raw)
  return Array.from(urls)
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".")
  if (idx === -1) return ""
  return name.slice(idx + 1).toLowerCase()
}

async function uploadToWordPress(file: File): Promise<string> {
  if (!WP_USER || !WP_PASS) throw new Error("WordPress credentials are not configured.")
  if (!file.name) throw new Error("Invalid file name.")

  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type not allowed: .${ext || "unknown"}`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.name}`)
  }

  const fd = new FormData()
  fd.append("file", file, file.name)

  const res = await fetch(mediaEndpoint(), {
    method: "POST",
    headers: wpAuthHeader(),
    body: fd,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`WordPress upload failed (${res.status}): ${JSON.stringify(json).slice(0, 180)}`)
  }

  const source = typeof json?.source_url === "string" ? json.source_url : ""
  const normalized = normalizeUrl(source)
  if (!normalized) throw new Error("WordPress upload returned no valid source URL.")
  return normalized
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireManagementApiAccess(["admin", "acc"])
    if (!access.ok) return access.response

    const { id } = await params
    if (!GF_KEY || !GF_SECRET) {
      return NextResponse.json({ error: "Gravity Forms API credentials are not configured." }, { status: 500 })
    }

    const form = await req.formData()
    const fieldId = String(form.get("fieldId") ?? "").trim()
    if (!ALLOWED_FIELD_IDS.has(fieldId)) {
      return NextResponse.json({ error: "Invalid attachment field.", fieldId }, { status: 400 })
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }

    const entryRes = await fetch(`${GF_API_URL}/entries/${id}`, {
      headers: gfAuthHeaders(),
      cache: "no-store",
    })
    const entryJson = await entryRes.json().catch(() => ({}))
    if (!entryRes.ok) {
      return NextResponse.json({ error: "Failed to fetch entry before upload.", detail: entryJson }, { status: entryRes.status })
    }

    const currentUrls = parseAttachmentField(entryJson?.[fieldId])
    const uploadedUrls: string[] = []

    for (const file of files) {
      const url = await uploadToWordPress(file)
      uploadedUrls.push(url)
    }

    const merged = Array.from(new Set([...currentUrls, ...uploadedUrls]))
    if (merged.length > MAX_FILES_PER_FIELD) {
      return NextResponse.json(
        { error: `Upload would exceed ${MAX_FILES_PER_FIELD} files for this field.` },
        { status: 400 },
      )
    }

    const updatePayload = { [fieldId]: JSON.stringify(merged) }
    const updateRes = await fetch(`${GF_API_URL}/entries/${id}`, {
      method: "PUT",
      headers: gfAuthHeaders(),
      body: JSON.stringify(updatePayload),
      cache: "no-store",
    })
    const updatedEntry = await updateRes.json().catch(() => ({}))
    if (!updateRes.ok) {
      return NextResponse.json(
        { error: "Files uploaded, but updating entry attachment field failed.", detail: updatedEntry },
        { status: updateRes.status },
      )
    }

    await prisma.accessAuditLog.create({
      data: {
        residentProfileId: null,
        actorUserId: access.identity.userId,
        entityType: "resident_profile",
        entityId: `gf_entry:${id}`,
        action: "update",
        beforeJson: { [fieldId]: currentUrls },
        afterJson: { [fieldId]: merged, addedUrls: uploadedUrls },
        reason: `gf_attachment_add_field_${fieldId}`,
      },
    })

    return NextResponse.json({
      ok: true,
      fieldId,
      uploadedUrls,
      totalFiles: merged.length,
      entry: updatedEntry,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Attachment upload failed.", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
