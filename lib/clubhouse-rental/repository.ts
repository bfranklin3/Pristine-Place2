import {
  Prisma,
  type ClubhouseRentalActorRole,
  type ClubhouseRentalRequestStatus,
} from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { canonicalizeAddressParts } from "@/lib/address-normalization"
import {
  EMPTY_CLUBHOUSE_RENTAL_FORM_DATA,
  normalizeClubhouseRentalFormData,
  type ClubhouseRentalFormData,
  validateClubhouseRentalFormData,
} from "@/lib/clubhouse-rental/form"

const residentRequestSelect = Prisma.validator<Prisma.ClubhouseRentalRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    residentClerkUserId: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    eventType: true,
    reservationDate: true,
    reservationStartLabel: true,
    reservationEndLabel: true,
    guestCount: true,
    requestedSpace: true,
    eventDescription: true,
    specialRequests: true,
    vendorsInvolved: true,
    vendorDetails: true,
    insuranceCompany: true,
    policyNumber: true,
    typedConfirmationName: true,
    clubhouseAgreementInitials: true,
    insuranceInitials: true,
    decorationInitials: true,
    acknowledgeRentalRules: true,
    acknowledgeDepositResponsibility: true,
    acknowledgeAttendanceResponsibility: true,
    acknowledgeCapacitySafety: true,
    status: true,
    reviewCycle: true,
    residentActionNote: true,
    finalDecision: true,
    finalDecisionAt: true,
    decisionNote: true,
    lockedAt: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    formDataJson: true,
    attachments: {
      where: { deletedAt: null },
      select: {
        id: true,
        originalFilename: true,
        storageKey: true,
        mimeType: true,
        fileSizeBytes: true,
        scope: true,
        note: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    },
  },
})

type ResidentRequestRow = Prisma.ClubhouseRentalRequestGetPayload<typeof residentRequestSelect>

const managementListSelect = Prisma.validator<Prisma.ClubhouseRentalRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    eventType: true,
    reservationDate: true,
    reservationStartLabel: true,
    reservationEndLabel: true,
    guestCount: true,
    requestedSpace: true,
    status: true,
    reviewCycle: true,
    residentActionNote: true,
    finalDecision: true,
    finalDecisionAt: true,
    decisionNote: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
  },
})

const managementDetailSelect = Prisma.validator<Prisma.ClubhouseRentalRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    residentClerkUserId: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    eventType: true,
    reservationDate: true,
    reservationStartLabel: true,
    reservationEndLabel: true,
    guestCount: true,
    requestedSpace: true,
    eventDescription: true,
    specialRequests: true,
    vendorsInvolved: true,
    vendorDetails: true,
    insuranceCompany: true,
    policyNumber: true,
    typedConfirmationName: true,
    clubhouseAgreementInitials: true,
    insuranceInitials: true,
    decorationInitials: true,
    acknowledgeRentalRules: true,
    acknowledgeDepositResponsibility: true,
    acknowledgeAttendanceResponsibility: true,
    acknowledgeCapacitySafety: true,
    status: true,
    reviewCycle: true,
    residentActionNote: true,
    finalDecision: true,
    finalDecisionAt: true,
    finalDecisionByUserId: true,
    finalDecisionByRole: true,
    decisionNote: true,
    lockedAt: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    formDataJson: true,
    attachments: {
      where: { deletedAt: null },
      select: {
        id: true,
        originalFilename: true,
        storageKey: true,
        mimeType: true,
        fileSizeBytes: true,
        scope: true,
        note: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    },
    events: {
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        reviewCycle: true,
        eventType: true,
        actorUserId: true,
        actorRole: true,
        note: true,
        metadataJson: true,
        createdAt: true,
      },
    },
  },
})

type ManagementListRow = Prisma.ClubhouseRentalRequestGetPayload<typeof managementListSelect>
type ManagementDetailRow = Prisma.ClubhouseRentalRequestGetPayload<typeof managementDetailSelect>

export interface ClubhouseRentalUploadedAttachmentInput {
  originalFilename: string
  storageProvider: string
  storageKey: string
  storageBucket: string | null
  mimeType: string
  fileSizeBytes: number
  note?: string | null
}

export type ClubhouseRentalManagementStatusFilter = "all" | ClubhouseRentalRequestStatus
export type ClubhouseRentalManagementSort =
  | "submitted_desc"
  | "submitted_asc"
  | "request_number_asc"
  | "request_number_desc"

interface ClubhouseRentalQueueEntry {
  id: string
  requestNumber: string
  residentName: string
  residentEmail: string
  residentPhone: string | null
  residentAddress: string | null
  eventType: string
  reservationDate: string
  reservationStartLabel: string
  reservationEndLabel: string
  guestCount: number
  requestedSpace: string
  status: ClubhouseRentalRequestStatus
  reviewCycle: number
  residentActionNote: string | null
  finalDecision: "approve" | "reject" | null
  finalDecisionAt: string | null
  decisionNote: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

interface ClubhouseRentalQueueDetail extends ClubhouseRentalQueueEntry {
  residentClerkUserId: string
  eventDescription: string
  specialRequests: string | null
  vendorsInvolved: boolean
  vendorDetails: string | null
  insuranceCompany: string
  policyNumber: string
  typedConfirmationName: string
  clubhouseAgreementInitials: string
  insuranceInitials: string
  decorationInitials: string
  acknowledgeRentalRules: boolean
  acknowledgeDepositResponsibility: boolean
  acknowledgeAttendanceResponsibility: boolean
  acknowledgeCapacitySafety: boolean
  finalDecisionByUserId: string | null
  finalDecisionByRole: ClubhouseRentalActorRole | null
  lockedAt: string | null
  formData: ClubhouseRentalFormData
  attachments: Array<{
    id: string
    originalFilename: string
    url: string
    mimeType: string
    fileSizeBytes: number
    scope: string
    note: string | null
    createdAt: string
  }>
  events: Array<{
    id: string
    reviewCycle: number
    eventType: string
    actorUserId: string | null
    actorRole: ClubhouseRentalActorRole
    note: string | null
    metadata: unknown
    createdAt: string
  }>
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function resolveCurrentResidency(clerkUserId: string) {
  const rows = await prisma.residency.findMany({
    where: { clerkUserId, isCurrent: true },
    include: { household: true },
    take: 2,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })

  if (rows.length !== 1) return null
  return rows[0]
}

function toFormDataJson(form: ClubhouseRentalFormData): Prisma.InputJsonObject {
  return {
    residentName: form.residentName,
    bestContactPhone: form.bestContactPhone,
    bestEmailAddress: form.bestEmailAddress,
    propertyAddress: form.propertyAddress,
    eventType: form.eventType,
    reservationDate: form.reservationDate,
    startTime: form.startTime,
    endTime: form.endTime,
    guestCount: form.guestCount,
    requestedSpace: form.requestedSpace,
    eventDescription: form.eventDescription,
    specialRequests: form.specialRequests,
    vendorsInvolved: form.vendorsInvolved,
    vendorDetails: form.vendorDetails,
    insuranceCompany: form.insuranceCompany,
    policyNumber: form.policyNumber,
    typedConfirmationName: form.typedConfirmationName,
    clubhouseAgreementInitials: form.clubhouseAgreementInitials,
    insuranceInitials: form.insuranceInitials,
    decorationInitials: form.decorationInitials,
    acknowledgeRentalRules: form.acknowledgeRentalRules,
    acknowledgeDepositResponsibility: form.acknowledgeDepositResponsibility,
    acknowledgeAttendanceResponsibility: form.acknowledgeAttendanceResponsibility,
    acknowledgeCapacitySafety: form.acknowledgeCapacitySafety,
  }
}

function toResidentResponse(row: ResidentRequestRow, includeFormData: boolean) {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    residentName: row.residentNameSnapshot,
    residentEmail: row.residentEmailSnapshot,
    residentPhone: row.residentPhoneSnapshot,
    residentAddress: row.residentAddressSnapshot,
    eventType: row.eventType,
    reservationDate: row.reservationDate.toISOString(),
    reservationStartLabel: row.reservationStartLabel,
    reservationEndLabel: row.reservationEndLabel,
    guestCount: row.guestCount,
    requestedSpace: row.requestedSpace,
    eventDescription: row.eventDescription,
    specialRequests: row.specialRequests,
    vendorsInvolved: row.vendorsInvolved,
    vendorDetails: row.vendorDetails,
    insuranceCompany: row.insuranceCompany,
    policyNumber: row.policyNumber,
    typedConfirmationName: row.typedConfirmationName,
    clubhouseAgreementInitials: row.clubhouseAgreementInitials,
    insuranceInitials: row.insuranceInitials,
    decorationInitials: row.decorationInitials,
    acknowledgeRentalRules: row.acknowledgeRentalRules,
    acknowledgeDepositResponsibility: row.acknowledgeDepositResponsibility,
    acknowledgeAttendanceResponsibility: row.acknowledgeAttendanceResponsibility,
    acknowledgeCapacitySafety: row.acknowledgeCapacitySafety,
    status: row.status,
    reviewCycle: row.reviewCycle,
    residentActionNote: row.status === "needs_more_info" ? row.residentActionNote : null,
    finalDecision: row.finalDecision,
    finalDecisionAt: toIso(row.finalDecisionAt),
    decisionNote: row.decisionNote,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      url: attachment.storageKey,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes,
      scope: attachment.scope,
      note: attachment.note,
      createdAt: attachment.createdAt.toISOString(),
    })),
    canEdit: row.status === "needs_more_info",
    canResubmit: row.status === "needs_more_info",
    ...(includeFormData ? { formData: normalizeClubhouseRentalFormData(row.formDataJson) } : {}),
  }
}

function toManagementQueueEntry(row: ManagementListRow): ClubhouseRentalQueueEntry {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    residentName: row.residentNameSnapshot,
    residentEmail: row.residentEmailSnapshot,
    residentPhone: row.residentPhoneSnapshot,
    residentAddress: row.residentAddressSnapshot,
    eventType: row.eventType,
    reservationDate: row.reservationDate.toISOString(),
    reservationStartLabel: row.reservationStartLabel,
    reservationEndLabel: row.reservationEndLabel,
    guestCount: row.guestCount,
    requestedSpace: row.requestedSpace,
    status: row.status,
    reviewCycle: row.reviewCycle,
    residentActionNote: row.residentActionNote,
    finalDecision: row.finalDecision,
    finalDecisionAt: toIso(row.finalDecisionAt),
    decisionNote: row.decisionNote,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toManagementQueueDetail(row: ManagementDetailRow): ClubhouseRentalQueueDetail {
  const base = toManagementQueueEntry(row)
  return {
    ...base,
    residentClerkUserId: row.residentClerkUserId,
    eventDescription: row.eventDescription,
    specialRequests: row.specialRequests,
    vendorsInvolved: row.vendorsInvolved,
    vendorDetails: row.vendorDetails,
    insuranceCompany: row.insuranceCompany,
    policyNumber: row.policyNumber,
    typedConfirmationName: row.typedConfirmationName,
    clubhouseAgreementInitials: row.clubhouseAgreementInitials,
    insuranceInitials: row.insuranceInitials,
    decorationInitials: row.decorationInitials,
    acknowledgeRentalRules: row.acknowledgeRentalRules,
    acknowledgeDepositResponsibility: row.acknowledgeDepositResponsibility,
    acknowledgeAttendanceResponsibility: row.acknowledgeAttendanceResponsibility,
    acknowledgeCapacitySafety: row.acknowledgeCapacitySafety,
    finalDecisionByUserId: row.finalDecisionByUserId,
    finalDecisionByRole: row.finalDecisionByRole,
    lockedAt: toIso(row.lockedAt),
    formData: normalizeClubhouseRentalFormData(row.formDataJson),
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      url: attachment.storageKey,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes,
      scope: attachment.scope,
      note: attachment.note,
      createdAt: attachment.createdAt.toISOString(),
    })),
    events: row.events.map((event) => ({
      id: event.id,
      reviewCycle: event.reviewCycle,
      eventType: event.eventType,
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      note: event.note,
      metadata: event.metadataJson,
      createdAt: event.createdAt.toISOString(),
    })),
  }
}

async function reserveNextClubhouseRentalRequestNumber(
  tx: Prisma.TransactionClient,
  requestDate: Date,
) {
  const year = requestDate.getUTCFullYear()
  const sequence = await tx.clubhouseRentalRequestNumberSequence.upsert({
    where: { year },
    update: {
      nextNumber: {
        increment: 1,
      },
    },
    create: {
      year,
      nextNumber: 2,
    },
  })

  const reservedNumber = sequence.nextNumber - 1
  return `CBR-${year}-${String(reservedNumber).padStart(4, "0")}`
}

function isAttachmentMutableStatus(status: ClubhouseRentalRequestStatus) {
  return status === "submitted" || status === "needs_more_info"
}

function isDecisionMutableStatus(status: ClubhouseRentalRequestStatus) {
  return status === "submitted" || status === "needs_more_info"
}

export async function createClubhouseRentalRequestForResident(input: {
  clerkUserId: string
  formData: ClubhouseRentalFormData
}) {
  const { clerkUserId, formData } = input
  const residency = await resolveCurrentResidency(clerkUserId)
  const canonical = canonicalizeAddressParts(formData.propertyAddress)
  const submittedAt = new Date()

  const created = await prisma.$transaction(async (tx) => {
    const requestNumber = await reserveNextClubhouseRentalRequestNumber(tx, submittedAt)
    const request = await tx.clubhouseRentalRequest.create({
      data: {
        requestNumber,
        residentClerkUserId: clerkUserId,
        householdId: residency?.householdId || null,
        residencyId: residency?.id || null,
        residentNameSnapshot: formData.residentName,
        residentEmailSnapshot: formData.bestEmailAddress,
        residentPhoneSnapshot: formData.bestContactPhone || null,
        residentAddressSnapshot: formData.propertyAddress || null,
        addressCanonical: canonical.canonical || null,
        addressKey: canonical.canonical || null,
        eventType: formData.eventType,
        reservationDate: parseDateInput(formData.reservationDate) || submittedAt,
        reservationStartLabel: formData.startTime,
        reservationEndLabel: formData.endTime,
        guestCount: Number.parseInt(formData.guestCount, 10),
        requestedSpace: formData.requestedSpace,
        eventDescription: formData.eventDescription,
        specialRequests: formData.specialRequests || null,
        vendorsInvolved: formData.vendorsInvolved === "yes",
        vendorDetails: formData.vendorDetails || null,
        insuranceCompany: formData.insuranceCompany,
        policyNumber: formData.policyNumber,
        typedConfirmationName: formData.typedConfirmationName,
        clubhouseAgreementInitials: formData.clubhouseAgreementInitials,
        insuranceInitials: formData.insuranceInitials,
        decorationInitials: formData.decorationInitials,
        acknowledgeRentalRules: formData.acknowledgeRentalRules,
        acknowledgeDepositResponsibility: formData.acknowledgeDepositResponsibility,
        acknowledgeAttendanceResponsibility: formData.acknowledgeAttendanceResponsibility,
        acknowledgeCapacitySafety: formData.acknowledgeCapacitySafety,
        formDataJson: toFormDataJson(formData),
        submittedAt,
      },
      ...residentRequestSelect,
    })

    await tx.clubhouseRentalEvent.create({
      data: {
        requestId: request.id,
        reviewCycle: 1,
        eventType: "request_submitted",
        actorUserId: clerkUserId,
        actorRole: "resident",
        metadataJson: {
          requestedSpace: formData.requestedSpace,
          vendorsInvolved: formData.vendorsInvolved === "yes",
          guestCount: Number.parseInt(formData.guestCount, 10),
        },
      },
    })

    return request
  })

  return toResidentResponse(created, true)
}

export async function listClubhouseRentalRequestsForResident(clerkUserId: string) {
  const rows = await prisma.clubhouseRentalRequest.findMany({
    where: { residentClerkUserId: clerkUserId },
    ...residentRequestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })

  return rows.map((row) => toResidentResponse(row, false))
}

export async function getClubhouseRentalRequestForResident(clerkUserId: string, requestId: string) {
  const row = await prisma.clubhouseRentalRequest.findFirst({
    where: {
      id: requestId,
      residentClerkUserId: clerkUserId,
    },
    ...residentRequestSelect,
  })

  return row ? toResidentResponse(row, true) : null
}

export async function addAttachmentsToClubhouseRentalRequestForResident(input: {
  requestId: string
  clerkUserId: string
  attachments: ClubhouseRentalUploadedAttachmentInput[]
}) {
  const { requestId, clerkUserId, attachments } = input

  if (attachments.length === 0) {
    return { kind: "validation_error" as const, errors: ["At least one attachment is required."] }
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.clubhouseRentalRequest.findFirst({
      where: {
        id: requestId,
        residentClerkUserId: clerkUserId,
      },
      ...residentRequestSelect,
    })

    if (!existing) {
      return { kind: "not_found" as const }
    }

    if (!isAttachmentMutableStatus(existing.status)) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    for (const attachment of attachments) {
      await tx.clubhouseRentalAttachment.create({
        data: {
          requestId,
          uploadedByUserId: clerkUserId,
          uploadedByRole: "resident",
          scope: "resident",
          originalFilename: attachment.originalFilename,
          storageProvider: attachment.storageProvider,
          storageKey: attachment.storageKey,
          storageBucket: attachment.storageBucket,
          mimeType: attachment.mimeType,
          fileSizeBytes: attachment.fileSizeBytes,
          note: attachment.note || null,
        },
      })

      await tx.clubhouseRentalEvent.create({
        data: {
          requestId,
          reviewCycle: existing.reviewCycle,
          eventType: "attachment_added",
          actorUserId: clerkUserId,
          actorRole: "resident",
          metadataJson: {
            filename: attachment.originalFilename,
            scope: "resident",
          },
        },
      })
    }

    const updated = await tx.clubhouseRentalRequest.findUnique({
      where: { id: requestId },
      ...residentRequestSelect,
    })

    return updated ? { kind: "ok" as const, request: toResidentResponse(updated, true) } : { kind: "not_found" as const }
  })

  return result
}

export async function updateClubhouseRentalRequestForResident(input: {
  clerkUserId: string
  requestId: string
  formPatch: Partial<ClubhouseRentalFormData>
}) {
  const existing = await prisma.clubhouseRentalRequest.findFirst({
    where: {
      id: input.requestId,
      residentClerkUserId: input.clerkUserId,
    },
    ...residentRequestSelect,
  })

  if (!existing) return { kind: "not_found" as const }
  if (existing.status !== "needs_more_info") return { kind: "invalid_state" as const, status: existing.status }

  const merged = normalizeClubhouseRentalFormData({
    ...normalizeClubhouseRentalFormData(existing.formDataJson),
    ...input.formPatch,
  })

  const errors = validateClubhouseRentalFormData(merged)
  if (errors.length > 0) return { kind: "validation_error" as const, errors }

  const canonical = canonicalizeAddressParts(merged.propertyAddress)
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.clubhouseRentalRequest.update({
      where: { id: existing.id },
      data: {
        residentNameSnapshot: merged.residentName,
        residentEmailSnapshot: merged.bestEmailAddress,
        residentPhoneSnapshot: merged.bestContactPhone || null,
        residentAddressSnapshot: merged.propertyAddress || null,
        addressCanonical: canonical.canonical || null,
        addressKey: canonical.canonical || null,
        eventType: merged.eventType,
        reservationDate: parseDateInput(merged.reservationDate) || existing.reservationDate,
        reservationStartLabel: merged.startTime,
        reservationEndLabel: merged.endTime,
        guestCount: Number.parseInt(merged.guestCount, 10),
        requestedSpace: merged.requestedSpace,
        eventDescription: merged.eventDescription,
        specialRequests: merged.specialRequests || null,
        vendorsInvolved: merged.vendorsInvolved === "yes",
        vendorDetails: merged.vendorDetails || null,
        insuranceCompany: merged.insuranceCompany,
        policyNumber: merged.policyNumber,
        typedConfirmationName: merged.typedConfirmationName,
        clubhouseAgreementInitials: merged.clubhouseAgreementInitials,
        insuranceInitials: merged.insuranceInitials,
        decorationInitials: merged.decorationInitials,
        acknowledgeRentalRules: merged.acknowledgeRentalRules,
        acknowledgeDepositResponsibility: merged.acknowledgeDepositResponsibility,
        acknowledgeAttendanceResponsibility: merged.acknowledgeAttendanceResponsibility,
        acknowledgeCapacitySafety: merged.acknowledgeCapacitySafety,
        formDataJson: toFormDataJson(merged),
      },
      ...residentRequestSelect,
    })

    return request
  })

  return { kind: "ok" as const, request: toResidentResponse(updated, true) }
}

export async function resubmitClubhouseRentalRequestForResident(input: {
  clerkUserId: string
  requestId: string
}) {
  const existing = await prisma.clubhouseRentalRequest.findFirst({
    where: {
      id: input.requestId,
      residentClerkUserId: input.clerkUserId,
    },
    ...residentRequestSelect,
  })

  if (!existing) return { kind: "not_found" as const }
  if (existing.status !== "needs_more_info") return { kind: "invalid_state" as const, status: existing.status }

  const formData = normalizeClubhouseRentalFormData(existing.formDataJson)
  const errors = validateClubhouseRentalFormData(formData)
  if (errors.length > 0) return { kind: "validation_error" as const, errors }

  const attachmentCount = await prisma.clubhouseRentalAttachment.count({
    where: {
      requestId: existing.id,
      deletedAt: null,
    },
  })
  if (attachmentCount === 0) {
    return { kind: "validation_error" as const, errors: ["An insurance certificate or supporting attachment is required before resubmitting."] }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.clubhouseRentalRequest.update({
      where: { id: existing.id },
      data: {
        status: "submitted",
        reviewCycle: { increment: 1 },
        residentActionNote: null,
      },
      ...residentRequestSelect,
    })

    await tx.clubhouseRentalEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: request.reviewCycle,
        eventType: "resident_resubmitted",
        actorUserId: input.clerkUserId,
        actorRole: "resident",
      },
    })

    return request
  })

  return { kind: "ok" as const, request: toResidentResponse(updated, true) }
}

function buildManagementWhere(input: {
  status: ClubhouseRentalManagementStatusFilter
  query: string
}): Prisma.ClubhouseRentalRequestWhereInput {
  const query = input.query.trim()
  const where: Prisma.ClubhouseRentalRequestWhereInput = {}

  if (input.status !== "all") {
    where.status = input.status
  }

  if (query) {
    where.OR = [
      { requestNumber: { contains: query, mode: "insensitive" } },
      { residentNameSnapshot: { contains: query, mode: "insensitive" } },
      { residentEmailSnapshot: { contains: query, mode: "insensitive" } },
      { residentAddressSnapshot: { contains: query, mode: "insensitive" } },
      { eventType: { contains: query, mode: "insensitive" } },
      { eventDescription: { contains: query, mode: "insensitive" } },
    ]
  }

  return where
}

function managementOrderBy(sort: ClubhouseRentalManagementSort): Prisma.ClubhouseRentalRequestOrderByWithRelationInput[] {
  if (sort === "submitted_asc") return [{ submittedAt: "asc" }, { id: "asc" }]
  if (sort === "request_number_asc") return [{ requestNumber: "asc" }]
  if (sort === "request_number_desc") return [{ requestNumber: "desc" }]
  return [{ submittedAt: "desc" }, { id: "desc" }]
}

export async function listClubhouseRentalRequestsForManagement(input: {
  status: ClubhouseRentalManagementStatusFilter
  sort: ClubhouseRentalManagementSort
  query: string
  page: number
  perPage: number
}) {
  const { status, sort, query, page, perPage } = input
  const where = buildManagementWhere({ status, query })
  const skip = Math.max(0, (page - 1) * perPage)

  const [total, rows, countsRaw] = await Promise.all([
    prisma.clubhouseRentalRequest.count({ where }),
    prisma.clubhouseRentalRequest.findMany({
      where,
      ...managementListSelect,
      orderBy: managementOrderBy(sort),
      skip,
      take: perPage,
    }),
    prisma.clubhouseRentalRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ])

  const counts: Record<string, number> = {
    all: countsRaw.reduce((sum, row) => sum + row._count._all, 0),
    submitted: 0,
    needs_more_info: 0,
    approved: 0,
    rejected: 0,
  }
  for (const row of countsRaw) {
    counts[row.status] = row._count._all
  }

  return {
    entries: rows.map((row) => toManagementQueueEntry(row)),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
    perPage,
    sort,
    counts,
  }
}

export async function getClubhouseRentalRequestForManagement(requestId: string) {
  const row = await prisma.clubhouseRentalRequest.findUnique({
    where: { id: requestId },
    ...managementDetailSelect,
  })

  return row ? toManagementQueueDetail(row) : null
}

function requireActionNote(note: string, actionLabel: string) {
  if (!note.trim()) {
    return { kind: "validation_error" as const, errors: [`A note is required to ${actionLabel}.`] }
  }
  return null
}

export async function requestMoreInfoForClubhouseRentalRequest(input: {
  requestId: string
  actorUserId: string
  note: string
}) {
  const noteValidation = requireActionNote(input.note, "request more information")
  if (noteValidation) return noteValidation

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.clubhouseRentalRequest.findUnique({
      where: { id: input.requestId },
      ...managementDetailSelect,
    })

    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "submitted") {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    await tx.clubhouseRentalEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "more_info_requested",
        actorUserId: input.actorUserId,
        actorRole: "admin",
        note: input.note.trim(),
      },
    })

    const updated = await tx.clubhouseRentalRequest.update({
      where: { id: existing.id },
      data: {
        status: "needs_more_info",
        residentActionNote: input.note.trim(),
        decisionNote: null,
        finalDecision: null,
        finalDecisionAt: null,
        finalDecisionByUserId: null,
        finalDecisionByRole: null,
        lockedAt: null,
      },
      ...managementDetailSelect,
    })

    return { kind: "ok" as const, request: toManagementQueueDetail(updated) }
  })

  return result
}

async function finalizeClubhouseRentalRequest(input: {
  requestId: string
  actorUserId: string
  decision: "approve" | "reject"
  note?: string
}) {
  if (input.decision === "reject") {
    const noteValidation = requireActionNote(input.note || "", "reject this request")
    if (noteValidation) return noteValidation
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.clubhouseRentalRequest.findUnique({
      where: { id: input.requestId },
      ...managementDetailSelect,
    })

    if (!existing) return { kind: "not_found" as const }
    if (!isDecisionMutableStatus(existing.status)) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    const now = new Date()
    const nextStatus: ClubhouseRentalRequestStatus = input.decision === "approve" ? "approved" : "rejected"
    const decisionNote = input.note?.trim() || null

    await tx.clubhouseRentalEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: input.decision === "approve" ? "request_approved" : "request_rejected",
        actorUserId: input.actorUserId,
        actorRole: "admin",
        note: decisionNote,
      },
    })

    await tx.clubhouseRentalEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "request_finalized",
        actorUserId: input.actorUserId,
        actorRole: "admin",
        note: decisionNote,
        metadataJson: {
          decision: input.decision,
        },
      },
    })

    const updated = await tx.clubhouseRentalRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        residentActionNote: existing.status === "needs_more_info" ? existing.residentActionNote : null,
        finalDecision: input.decision,
        finalDecisionAt: now,
        finalDecisionByUserId: input.actorUserId,
        finalDecisionByRole: "admin",
        decisionNote,
        lockedAt: now,
      },
      ...managementDetailSelect,
    })

    return { kind: "ok" as const, request: toManagementQueueDetail(updated) }
  })

  return result
}

export async function approveClubhouseRentalRequest(input: {
  requestId: string
  actorUserId: string
  note?: string
}) {
  return finalizeClubhouseRentalRequest({
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    decision: "approve",
    note: input.note,
  })
}

export async function rejectClubhouseRentalRequest(input: {
  requestId: string
  actorUserId: string
  note: string
}) {
  return finalizeClubhouseRentalRequest({
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    decision: "reject",
    note: input.note,
  })
}

export { EMPTY_CLUBHOUSE_RENTAL_FORM_DATA }
