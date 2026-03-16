import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { buildNativeAccRequestWhere, dedupeNativeAccRequests } from "@/lib/resident-360/native-acc"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ residentProfileId: string }> },
) {
  const access = await requireManagementApiAccess(["admin"])
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
        householdMembers: { orderBy: { createdAt: "asc" } },
        credentials: { orderBy: { createdAt: "asc" } },
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
      return NextResponse.json({ error: "Resident not found" }, { status: 404 })
    }

    const primary = row.householdMembers.find((m) => m.role === "primary") || null
    const secondary = row.householdMembers.find((m) => m.role === "secondary") || null
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
      category: row.residentCategory,
      includeInDirectory: row.includeInDirectory,
      confidentialPhone: row.confidentialPhone,
      addressNumber: row.addressNumber,
      streetName: row.streetName,
      addressFull: row.addressFull,
      entryCode: row.entryCode,
      comments: row.comments,
      primary,
      secondary,
      householdMembers: row.householdMembers,
      credentials: row.credentials,
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
        residentName: request.residentNameSnapshot,
        residentAddress: request.residentAddressSnapshot,
        decisionNote: request.decisionNote,
        residentActionNote: request.residentActionNote,
        attachments: request.attachments.map((a) => ({
          id: a.id,
          filename: a.originalFilename,
          mimeType: a.mimeType,
          storageKey: a.storageKey,
          storageProvider: a.storageProvider,
          scope: a.scope,
        })),
      })),
      confirmedAccRequests: row.accMatches.map((match) => ({
        matchId: match.id,
        matchScore: match.matchScore,
        reviewedAt: match.reviewedAt,
        sourceEntryId: match.accRequest.sourceEntryId,
        permitNumber: match.accRequest.permitNumber,
        submittedAt: match.accRequest.submittedAt,
        processDate: match.accRequest.processDate,
        disposition: match.accRequest.disposition,
        workType: match.accRequest.workType,
        ownerName: match.accRequest.ownerName,
        ownerPhone: match.accRequest.ownerPhone,
        ownerEmail: match.accRequest.ownerEmail,
        addressRaw: match.accRequest.addressRaw,
        description: match.accRequest.description,
        notes: match.accRequest.notes,
        attachments: match.accRequest.attachments.map((a) => ({
          id: a.id,
          fieldId: a.fieldId,
          url: a.url,
          filename: a.filename,
          mimeType: a.mimeType,
        })),
      })),
    })
  } catch (error) {
    console.error("Resident 360 detail failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load resident lookup detail", detail }, { status: 500 })
  }
}
