import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { buildNativeAccRequestWhere, dedupeNativeAccRequests } from "@/lib/resident-360/native-acc"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementApiAccess(["admin", "board_of_directors"])
  if (!access.ok) return access.response

  const { residentProfileId } = await context.params
  if (!residentProfileId) {
    return NextResponse.json({ error: "Missing residentProfileId" }, { status: 400 })
  }

  try {
    const row = await prisma.residentProfile.findUnique({
      where: { id: residentProfileId },
      include: {
        household: {
          select: {
            id: true,
            addressCanonical: true,
          },
        },
        residency: {
          select: {
            id: true,
          },
        },
        accMatches: {
          where: { status: "confirmed" },
          orderBy: { updatedAt: "desc" },
          include: {
            accRequest: {
              include: {
                attachments: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        },
      },
    })

    if (!row) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    const nativeWhere = buildNativeAccRequestWhere({
      residencyId: row.residency?.id || null,
      householdId: row.household?.id || null,
      addressCanonical: row.household?.addressCanonical || null,
    })

    const nativeRequests = nativeWhere
      ? dedupeNativeAccRequests(
          await prisma.accWorkflowRequest.findMany({
            where: nativeWhere,
            orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
            include: {
              attachments: {
                where: { deletedAt: null },
                orderBy: { createdAt: "asc" },
              },
            },
          }),
        )
      : []

    return NextResponse.json({
      id: row.id,
      addressFull: row.addressFull,
      nativeAccRequests: nativeRequests.map((request) => ({
        id: request.id,
        requestNumber: request.requestNumber,
        permitNumber: request.permitNumber,
        submittedAt: request.submittedAt,
        status: request.status,
        finalDecision: request.finalDecision,
        finalDecisionAt: request.finalDecisionAt,
        reviewCycle: request.reviewCycle,
        isVerified: request.isVerified,
        workType: request.workType,
        title: request.title,
        description: request.description,
        decisionNote: request.decisionNote,
        residentActionNote: request.residentActionNote,
        attachments: request.attachments.map((attachment) => ({
          id: attachment.id,
          filename: attachment.originalFilename,
          url: attachment.storageKey,
          mimeType: attachment.mimeType,
          scope: attachment.scope,
        })),
      })),
      confirmedAccRequests: row.accMatches.map((match) => ({
        matchId: match.id,
        sourceEntryId: match.accRequest.sourceEntryId,
        permitNumber: match.accRequest.permitNumber,
        submittedAt: match.accRequest.submittedAt,
        processDate: match.accRequest.processDate,
        disposition: match.accRequest.disposition,
        workType: match.accRequest.workType,
        addressRaw: match.accRequest.addressRaw,
        description: match.accRequest.description,
        notes: match.accRequest.notes,
        attachments: match.accRequest.attachments.map((attachment) => ({
          id: attachment.id,
          fieldId: attachment.fieldId,
          url: attachment.url,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
        })),
      })),
    })
  } catch (error) {
    console.error("ACC permit lookup detail failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC permit lookup detail", detail }, { status: 500 })
  }
}
