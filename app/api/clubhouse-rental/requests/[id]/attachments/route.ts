import { NextRequest, NextResponse } from "next/server"
import { requireApprovedPortalApiAccess } from "@/lib/auth/portal-api"
import {
  uploadClubhouseRentalFileToWordPress,
  validateClubhouseRentalUploadFiles,
} from "@/lib/clubhouse-rental/attachment-storage"
import { addAttachmentsToClubhouseRentalRequestForResident } from "@/lib/clubhouse-rental/repository"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireApprovedPortalApiAccess()
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const form = await req.formData()
    const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0)
    const validationErrors = validateClubhouseRentalUploadFiles(files)

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: "Invalid attachment payload.", validationErrors }, { status: 400 })
    }

    const uploaded = []
    for (const file of files) {
      uploaded.push(await uploadClubhouseRentalFileToWordPress(file))
    }

    const result = await addAttachmentsToClubhouseRentalRequestForResident({
      requestId: id,
      clerkUserId: access.identity.clerkUserId,
      attachments: uploaded,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Clubhouse rental request not found." }, { status: 404 })
    }
    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "Attachments cannot be updated in the current request status.", status: result.status },
        { status: 409 },
      )
    }
    if (result.kind === "validation_error") {
      return NextResponse.json({ error: "Invalid attachment payload.", validationErrors: result.errors }, { status: 400 })
    }

    return NextResponse.json({ request: result.request })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to upload clubhouse rental attachments", detail }, { status: 500 })
  }
}
