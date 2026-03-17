import { NextRequest, NextResponse } from "next/server"
import { generateAccSubmittedFormPdf, type AccSubmittedFormSource } from "@/lib/acc-submitted-form-pdf"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"

export const runtime = "nodejs"

function parseSource(value: string | null): AccSubmittedFormSource | null {
  return value === "native" || value === "legacy" ? value : null
}

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const source = parseSource(searchParams.get("source"))
  const id = (searchParams.get("id") || "").trim()

  if (!source || !id) {
    return NextResponse.json({ error: "source and id are required." }, { status: 400 })
  }

  try {
    const generated = await generateAccSubmittedFormPdf({
      source,
      id,
      viewerUserId: access.identity.clerkUserId,
      viewMode: "full",
    })

    if (!generated) {
      return NextResponse.json({ error: "ACC submitted form not found." }, { status: 404 })
    }

    return new NextResponse(generated.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${generated.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("ACC submitted form PDF failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to generate ACC submitted form PDF", detail }, { status: 500 })
  }
}
