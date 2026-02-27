// app/api/gf-entries/[id]/route.ts
// Proxy to Gravity Forms REST API — get or update a single ACC permit entry.

import { NextRequest, NextResponse } from "next/server"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { prisma } from "@/lib/db/prisma"

const GF_API_URL = process.env.GRAVITY_FORMS_API_URL ?? "https://www.pristineplace.us/wp-json/gf/v2"
const GF_KEY     = process.env.GRAVITY_FORMS_API_KEY ?? ""
const GF_SECRET  = process.env.GRAVITY_FORMS_API_SECRET ?? ""

function gfAuthHeaders() {
  const token = Buffer.from(`${GF_KEY}:${GF_SECRET}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

/** GET /api/gf-entries/[id] — fetch a single entry */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireManagementApiAccess(["admin", "acc"])
  if (!access.ok) return access.response

  const { id } = await params

  const res = await fetch(`${GF_API_URL}/entries/${id}`, {
    headers: gfAuthHeaders(),
    cache: "no-store",
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** PUT /api/gf-entries/[id] — update entry (e.g. change status, add notes) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireManagementApiAccess(["admin", "acc"])
  if (!access.ok) return access.response

  const { id } = await params
  const body = await req.json()
  const rawPayload = (body ?? {}) as Record<string, unknown>
  const auditReason = typeof rawPayload.__auditReason === "string" ? rawPayload.__auditReason : "gf_entry_update"
  const auditContext =
    rawPayload.__auditContext && typeof rawPayload.__auditContext === "object"
      ? (rawPayload.__auditContext as Record<string, unknown>)
      : null

  const payload = Object.fromEntries(
    Object.entries(rawPayload).filter(([key]) => !key.startsWith("__")),
  )

  let beforeEntry: Record<string, unknown> | null = null
  try {
    const beforeRes = await fetch(`${GF_API_URL}/entries/${id}`, {
      headers: gfAuthHeaders(),
      cache: "no-store",
    })
    beforeEntry = (await beforeRes.json().catch(() => null)) as Record<string, unknown> | null
  } catch {
    beforeEntry = null
  }

  const res = await fetch(`${GF_API_URL}/entries/${id}`, {
    method: "PUT",
    headers: gfAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (res.ok) {
    const beforeJson: Record<string, unknown> = {}
    const afterJson: Record<string, unknown> = {}
    for (const [key, nextValue] of Object.entries(payload)) {
      const previousValue = beforeEntry ? beforeEntry[key] : undefined
      if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
        beforeJson[key] = previousValue ?? null
        afterJson[key] = nextValue ?? null
      }
    }

    if (Object.keys(afterJson).length > 0 || auditContext) {
      await prisma.accessAuditLog.create({
        data: {
          residentProfileId: null,
          actorUserId: access.identity.userId,
          entityType: "resident_profile",
          entityId: `gf_entry:${id}`,
          action: "update",
          beforeJson: Object.keys(beforeJson).length ? beforeJson : null,
          afterJson: Object.keys(afterJson).length
            ? { ...afterJson, ...(auditContext ? { _context: auditContext } : {}) }
            : auditContext
              ? { _context: auditContext }
              : null,
          reason: auditReason,
        },
      })
    }
  }

  return NextResponse.json(data, { status: res.status })
}
