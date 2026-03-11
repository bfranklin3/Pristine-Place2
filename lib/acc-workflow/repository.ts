import {
  Prisma,
  type AccWorkflowActorRole,
  type AccWorkflowDecision,
  type AccWorkflowRequestStatus,
  type AccWorkflowVoteValue,
} from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { canonicalizeAddressParts } from "@/lib/address-normalization"

export type AccWorkflowWorkType = "paint" | "roof" | "fence" | "landscaping" | "other" | ""
export type AccWorkflowRoleType = "owner" | "authorized_rep" | ""
export type AccWorkflowSupportingDocs = "no" | "yes" | ""

export interface AccWorkflowFormData {
  ownerName: string
  streetAddress: string
  ownerPhone: string
  ownerEmail: string
  phase: string
  lot: string
  role: AccWorkflowRoleType
  authorizedRepName: string
  workType: AccWorkflowWorkType
  projectDescription: string
  startDate: string
  completionDate: string
  hasSupportingDocs: AccWorkflowSupportingDocs
  paintBodyColor: string
  paintTrimColor: string
  paintDoorColor: string
  roofColor: string
  roofType: string
  fenceStyle: string
  landscapingDetails: string
  otherWorkDetails: string
}

export const EMPTY_FORM_DATA: AccWorkflowFormData = {
  ownerName: "",
  streetAddress: "",
  ownerPhone: "",
  ownerEmail: "",
  phase: "",
  lot: "",
  role: "",
  authorizedRepName: "",
  workType: "",
  projectDescription: "",
  startDate: "",
  completionDate: "",
  hasSupportingDocs: "",
  paintBodyColor: "",
  paintTrimColor: "",
  paintDoorColor: "",
  roofColor: "",
  roofType: "",
  fenceStyle: "",
  landscapingDetails: "",
  otherWorkDetails: "",
}

const residentRequestSelect = Prisma.validator<Prisma.AccWorkflowRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    residentClerkUserId: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    phase: true,
    lot: true,
    workType: true,
    title: true,
    description: true,
    locationDetails: true,
    authorizedRepName: true,
    status: true,
    reviewCycle: true,
    residentActionNote: true,
    voteDeadlineAt: true,
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

type ResidentRequestRow = Prisma.AccWorkflowRequestGetPayload<typeof residentRequestSelect>

const managementListSelect = Prisma.validator<Prisma.AccWorkflowRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    phase: true,
    lot: true,
    workType: true,
    title: true,
    description: true,
    status: true,
    reviewCycle: true,
    voteDeadlineAt: true,
    finalDecision: true,
    finalDecisionAt: true,
    decisionNote: true,
    isVerified: true,
    verifiedAt: true,
    lockedAt: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
  },
})

const managementDetailSelect = Prisma.validator<Prisma.AccWorkflowRequestDefaultArgs>()({
  select: {
    id: true,
    requestNumber: true,
    origin: true,
    importedAccRequestId: true,
    residentClerkUserId: true,
    residentNameSnapshot: true,
    residentEmailSnapshot: true,
    residentPhoneSnapshot: true,
    residentAddressSnapshot: true,
    phase: true,
    lot: true,
    workType: true,
    title: true,
    description: true,
    locationDetails: true,
    formDataJson: true,
    authorizedRepName: true,
    status: true,
    reviewCycle: true,
    residentActionNote: true,
    voteDeadlineAt: true,
    finalDecision: true,
    finalDecisionAt: true,
    finalDecisionByUserId: true,
    finalDecisionByRole: true,
    decisionNote: true,
    isVerified: true,
    verifiedAt: true,
    verifiedByUserId: true,
    verificationNote: true,
    lockedAt: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    attachments: {
      where: { deletedAt: null },
      select: {
        id: true,
        originalFilename: true,
        storageKey: true,
        scope: true,
        mimeType: true,
        fileSizeBytes: true,
        note: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    },
    votes: {
      select: {
        id: true,
        reviewCycle: true,
        voterUserId: true,
        vote: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    },
    events: {
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
      orderBy: [{ createdAt: "desc" }],
    },
  },
})

type ManagementListRow = Prisma.AccWorkflowRequestGetPayload<typeof managementListSelect>
type ManagementDetailRow = Prisma.AccWorkflowRequestGetPayload<typeof managementDetailSelect>

export type AccWorkflowManagementStatusFilter = "all" | AccWorkflowRequestStatus
export type AccWorkflowManagementSort =
  | "submitted_desc"
  | "submitted_asc"
  | "request_number_asc"
  | "request_number_desc"

export interface AccWorkflowManagementFilters {
  status: AccWorkflowManagementStatusFilter
  query?: string
  page?: number
  perPage?: number
  sort?: AccWorkflowManagementSort
}

type WorkflowActionResult =
  | { kind: "ok"; request: ReturnType<typeof toManagementDetailResponse> }
  | { kind: "not_found" }
  | { kind: "invalid_state"; status: AccWorkflowRequestStatus }
  | { kind: "validation_error"; errors: string[] }
  | { kind: "duplicate_vote" }
  | { kind: "already_verified" }
  | { kind: "not_allowed" }

export interface AccWorkflowUploadedAttachmentInput {
  originalFilename: string
  storageProvider: string
  storageKey: string
  storageBucket: string | null
  mimeType: string
  fileSizeBytes: number
  note?: string | null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function cleanRole(value: unknown): AccWorkflowRoleType {
  return value === "owner" || value === "authorized_rep" ? value : ""
}

function cleanWorkType(value: unknown): AccWorkflowWorkType {
  return value === "paint" || value === "roof" || value === "fence" || value === "landscaping" || value === "other" ? value : ""
}

function cleanSupportingDocs(value: unknown): AccWorkflowSupportingDocs {
  return value === "yes" || value === "no" ? value : ""
}

export function normalizeAccWorkflowFormData(input: unknown): AccWorkflowFormData {
  if (!isObject(input)) return { ...EMPTY_FORM_DATA }
  return {
    ownerName: cleanString(input.ownerName),
    streetAddress: cleanString(input.streetAddress),
    ownerPhone: cleanString(input.ownerPhone),
    ownerEmail: cleanString(input.ownerEmail),
    phase: cleanString(input.phase),
    lot: cleanString(input.lot),
    role: cleanRole(input.role),
    authorizedRepName: cleanString(input.authorizedRepName),
    workType: cleanWorkType(input.workType),
    projectDescription: cleanString(input.projectDescription),
    startDate: cleanString(input.startDate),
    completionDate: cleanString(input.completionDate),
    hasSupportingDocs: cleanSupportingDocs(input.hasSupportingDocs),
    paintBodyColor: cleanString(input.paintBodyColor),
    paintTrimColor: cleanString(input.paintTrimColor),
    paintDoorColor: cleanString(input.paintDoorColor),
    roofColor: cleanString(input.roofColor),
    roofType: cleanString(input.roofType),
    fenceStyle: cleanString(input.fenceStyle),
    landscapingDetails: cleanString(input.landscapingDetails),
    otherWorkDetails: cleanString(input.otherWorkDetails),
  }
}

export function validateAccWorkflowFormData(form: AccWorkflowFormData): string[] {
  const errors: string[] = []

  if (!form.ownerName) errors.push("Owner name is required.")
  if (!form.streetAddress) errors.push("Street address is required.")
  if (!form.ownerPhone) errors.push("Owner phone number is required.")
  if (!form.ownerEmail) errors.push("Owner email address is required.")
  if (!form.role) errors.push("Role is required.")
  if (!form.workType) errors.push("Work type is required.")
  if (!form.projectDescription) errors.push("Project description is required.")
  if (!form.startDate) errors.push("Estimated start date is required.")
  if (!form.completionDate) errors.push("Estimated completion date is required.")
  if (!form.hasSupportingDocs) errors.push("Supporting documents response is required.")

  if (form.startDate && form.completionDate) {
    const start = new Date(form.startDate)
    const completion = new Date(form.completionDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(completion.getTime())) {
      errors.push("Start and completion dates must be valid.")
    } else if (completion < start) {
      errors.push("Estimated completion date cannot be earlier than the start date.")
    }
  }

  if (form.role === "authorized_rep" && !form.authorizedRepName) {
    errors.push("Authorized representative name is required.")
  }

  if (form.workType === "paint") {
    if (!form.paintBodyColor) errors.push("Paint body color is required.")
    if (!form.paintTrimColor) errors.push("Paint trim color is required.")
    if (!form.paintDoorColor) errors.push("Paint door color is required.")
  }

  if (form.workType === "roof") {
    if (!form.roofColor) errors.push("Roof color is required.")
    if (!form.roofType) errors.push("Roof type is required.")
  }

  if (form.workType === "fence" && !form.fenceStyle) {
    errors.push("Fence style is required.")
  }

  if (form.workType === "landscaping" && !form.landscapingDetails) {
    errors.push("Landscaping details are required.")
  }

  if (form.workType === "other" && !form.otherWorkDetails) {
    errors.push("Other work details are required.")
  }

  return errors
}

function buildTitle(workType: AccWorkflowWorkType): string {
  if (workType === "paint") return "Paint Request"
  if (workType === "roof") return "Roof Request"
  if (workType === "fence") return "Fence Request"
  if (workType === "landscaping") return "Landscaping Request"
  if (workType === "other") return "Other ACC Request"
  return "ACC Request"
}

function buildLocationDetails(form: AccWorkflowFormData): string | null {
  if (form.workType === "paint") {
    return [`Body: ${form.paintBodyColor}`, `Trim: ${form.paintTrimColor}`, `Door: ${form.paintDoorColor}`].join(" | ")
  }
  if (form.workType === "roof") {
    return [`Color: ${form.roofColor}`, `Type: ${form.roofType}`].join(" | ")
  }
  if (form.workType === "fence") return form.fenceStyle || null
  if (form.workType === "landscaping") return form.landscapingDetails || null
  if (form.workType === "other") return form.otherWorkDetails || null
  return null
}

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toFormDataJson(form: AccWorkflowFormData): Prisma.InputJsonObject {
  return {
    ownerName: form.ownerName,
    streetAddress: form.streetAddress,
    ownerPhone: form.ownerPhone,
    ownerEmail: form.ownerEmail,
    phase: form.phase,
    lot: form.lot,
    role: form.role,
    authorizedRepName: form.authorizedRepName,
    workType: form.workType,
    projectDescription: form.projectDescription,
    startDate: form.startDate,
    completionDate: form.completionDate,
    hasSupportingDocs: form.hasSupportingDocs,
    paintBodyColor: form.paintBodyColor,
    paintTrimColor: form.paintTrimColor,
    paintDoorColor: form.paintDoorColor,
    roofColor: form.roofColor,
    roofType: form.roofType,
    fenceStyle: form.fenceStyle,
    landscapingDetails: form.landscapingDetails,
    otherWorkDetails: form.otherWorkDetails,
  }
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

function toResidentResponse(row: ResidentRequestRow, includeFormData: boolean) {
  const showResidentActionNote = row.status === "needs_more_info"

  return {
    id: row.id,
    requestNumber: row.requestNumber,
    residentName: row.residentNameSnapshot,
    residentEmail: row.residentEmailSnapshot,
    residentPhone: row.residentPhoneSnapshot,
    residentAddress: row.residentAddressSnapshot,
    phase: row.phase,
    lot: row.lot,
    workType: row.workType,
    title: row.title,
    description: row.description,
    locationDetails: row.locationDetails,
    authorizedRepName: row.authorizedRepName,
    status: row.status,
    reviewCycle: row.reviewCycle,
    residentActionNote: showResidentActionNote ? row.residentActionNote : null,
    voteDeadlineAt: row.voteDeadlineAt?.toISOString() || null,
    finalDecision: row.finalDecision,
    finalDecisionAt: row.finalDecisionAt?.toISOString() || null,
    decisionNote: row.decisionNote,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    canEdit: row.status === "needs_more_info",
    canResubmit: row.status === "needs_more_info",
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
    ...(includeFormData ? { formData: normalizeAccWorkflowFormData(row.formDataJson) } : {}),
  }
}

function toManagementListResponse(row: ManagementListRow) {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    residentName: row.residentNameSnapshot,
    residentEmail: row.residentEmailSnapshot,
    residentPhone: row.residentPhoneSnapshot,
    residentAddress: row.residentAddressSnapshot,
    phase: row.phase,
    lot: row.lot,
    workType: row.workType,
    title: row.title,
    description: row.description,
    status: row.status,
    reviewCycle: row.reviewCycle,
    voteDeadlineAt: toIso(row.voteDeadlineAt),
    finalDecision: row.finalDecision,
    finalDecisionAt: toIso(row.finalDecisionAt),
    decisionNote: row.decisionNote,
    isVerified: row.isVerified,
    verifiedAt: toIso(row.verifiedAt),
    lockedAt: toIso(row.lockedAt),
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toManagementDetailResponse(row: ManagementDetailRow, viewerUserId: string) {
  const formData = normalizeAccWorkflowFormData(row.formDataJson)
  const votesCurrentCycle = row.votes.filter((vote) => vote.reviewCycle === row.reviewCycle)
  const approveVotes = votesCurrentCycle.filter((vote) => vote.vote === "approve").length
  const rejectVotes = votesCurrentCycle.filter((vote) => vote.vote === "reject").length
  const currentUserVote = votesCurrentCycle.find((vote) => vote.voterUserId === viewerUserId) || null

  return {
    id: row.id,
    requestNumber: row.requestNumber,
    origin: row.origin,
    importedAccRequestId: row.importedAccRequestId,
    residentClerkUserId: row.residentClerkUserId,
    residentName: row.residentNameSnapshot,
    residentEmail: row.residentEmailSnapshot,
    residentPhone: row.residentPhoneSnapshot,
    residentAddress: row.residentAddressSnapshot,
    phase: row.phase,
    lot: row.lot,
    workType: row.workType,
    title: row.title,
    description: row.description,
    locationDetails: row.locationDetails,
    formData,
    authorizedRepName: row.authorizedRepName,
    status: row.status,
    reviewCycle: row.reviewCycle,
    residentActionNote: row.residentActionNote,
    voteDeadlineAt: toIso(row.voteDeadlineAt),
    finalDecision: row.finalDecision,
    finalDecisionAt: toIso(row.finalDecisionAt),
    finalDecisionByUserId: row.finalDecisionByUserId,
    finalDecisionByRole: row.finalDecisionByRole,
    decisionNote: row.decisionNote,
    isVerified: row.isVerified,
    verifiedAt: toIso(row.verifiedAt),
    verifiedByUserId: row.verifiedByUserId,
    verificationNote: row.verificationNote,
    lockedAt: toIso(row.lockedAt),
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      url: attachment.storageKey,
      scope: attachment.scope,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes,
      note: attachment.note,
      createdAt: attachment.createdAt.toISOString(),
    })),
    votesCurrentCycle: votesCurrentCycle.map((vote) => ({
      id: vote.id,
      voterUserId: vote.voterUserId,
      vote: vote.vote,
      createdAt: vote.createdAt.toISOString(),
    })),
    voteSummary: {
      total: votesCurrentCycle.length,
      approve: approveVotes,
      reject: rejectVotes,
      currentUserVote: currentUserVote?.vote || null,
      hasCurrentUserVoted: !!currentUserVote,
    },
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

function buildSearchWhere(query?: string): Prisma.AccWorkflowRequestWhereInput {
  const q = (query || "").trim()
  if (!q) return {}

  return {
    OR: [
      { residentNameSnapshot: { contains: q, mode: "insensitive" } },
      { requestNumber: { contains: q, mode: "insensitive" } },
      { residentEmailSnapshot: { contains: q, mode: "insensitive" } },
      { residentPhoneSnapshot: { contains: q, mode: "insensitive" } },
      { residentAddressSnapshot: { contains: q, mode: "insensitive" } },
      { phase: { contains: q, mode: "insensitive" } },
      { lot: { contains: q, mode: "insensitive" } },
      { workType: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { locationDetails: { contains: q, mode: "insensitive" } },
    ],
  }
}

function buildFinalizedDecisionNote(input: {
  decision: AccWorkflowDecision
  source: "initial_review" | "committee_vote" | "chair_override"
  approveVotes?: number
  rejectVotes?: number
}) {
  if (input.source !== "committee_vote") return null
  return input.decision === "approve"
    ? `Committee vote finalized the request as approved (${input.approveVotes || 0} approve, ${input.rejectVotes || 0} reject).`
    : `Committee vote finalized the request as rejected (${input.approveVotes || 0} approve, ${input.rejectVotes || 0} reject).`
}

async function fetchManagementDetailById(tx: Prisma.TransactionClient | typeof prisma, requestId: string) {
  return tx.accWorkflowRequest.findUnique({
    where: { id: requestId },
    ...managementDetailSelect,
  })
}

async function fetchResidentDetailById(tx: Prisma.TransactionClient | typeof prisma, requestId: string, clerkUserId: string) {
  return tx.accWorkflowRequest.findFirst({
    where: {
      id: requestId,
      residentClerkUserId: clerkUserId,
    },
    ...residentRequestSelect,
  })
}

async function finalizeByCommitteeVote(tx: Prisma.TransactionClient, input: {
  requestId: string
  reviewCycle: number
  approveVotes: number
  rejectVotes: number
}) {
  const finalDecision: AccWorkflowDecision = input.approveVotes >= 2 ? "approve" : "reject"
  const finalizedAt = new Date()
  const decisionNote = buildFinalizedDecisionNote({
    decision: finalDecision,
    source: "committee_vote",
    approveVotes: input.approveVotes,
    rejectVotes: input.rejectVotes,
  })

  await tx.accWorkflowRequest.update({
    where: { id: input.requestId },
    data: {
      status: finalDecision === "approve" ? "approved" : "rejected",
      finalDecision,
      finalDecisionAt: finalizedAt,
      finalDecisionByRole: "system",
      decisionNote,
      lockedAt: finalizedAt,
    },
  })

  await tx.accWorkflowEvent.create({
    data: {
      requestId: input.requestId,
      reviewCycle: input.reviewCycle,
      eventType: "request_finalized",
      actorRole: "system",
      note: decisionNote,
      metadataJson: {
        source: "committee_vote",
        finalDecision,
        approveVotes: input.approveVotes,
        rejectVotes: input.rejectVotes,
      },
    },
  })
}

async function reserveNextWorkflowRequestNumber(
  tx: Prisma.TransactionClient,
  requestDate: Date,
) {
  const year = requestDate.getUTCFullYear()
  const sequence = await tx.accWorkflowRequestNumberSequence.upsert({
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
  return `REQ-${year}-${String(reservedNumber).padStart(4, "0")}`
}

export async function createWorkflowRequestForResident(input: { clerkUserId: string; formData: AccWorkflowFormData }) {
  const { clerkUserId, formData } = input
  const residency = await resolveCurrentResidency(clerkUserId)
  const canonical = canonicalizeAddressParts(formData.streetAddress)
  const submittedAt = new Date()

  const created = await prisma.$transaction(async (tx) => {
    const requestNumber = await reserveNextWorkflowRequestNumber(tx, submittedAt)
    const request = await tx.accWorkflowRequest.create({
      data: {
        requestNumber,
        residentClerkUserId: clerkUserId,
        householdId: residency?.householdId || null,
        residencyId: residency?.id || null,
        residentNameSnapshot: formData.ownerName,
        residentEmailSnapshot: formData.ownerEmail,
        residentPhoneSnapshot: formData.ownerPhone || null,
        residentAddressSnapshot: formData.streetAddress || null,
        addressCanonical: canonical.canonical || null,
        addressKey: canonical.canonical || null,
        phase: formData.phase || null,
        lot: formData.lot || null,
        workType: formData.workType || null,
        title: buildTitle(formData.workType),
        description: formData.projectDescription,
        locationDetails: buildLocationDetails(formData),
        formDataJson: toFormDataJson(formData),
        authorizedRepName: formData.authorizedRepName || null,
        estimatedStartDate: parseDateInput(formData.startDate),
        estimatedCompletionDate: parseDateInput(formData.completionDate),
        submittedAt,
      },
      ...residentRequestSelect,
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: request.id,
        reviewCycle: 1,
        eventType: "request_submitted",
        actorUserId: clerkUserId,
        actorRole: "resident",
        metadataJson: {
          workType: formData.workType || null,
          hasSupportingDocs: formData.hasSupportingDocs || null,
        },
      },
    })

    return request
  })

  return toResidentResponse(created, true)
}

export async function listWorkflowRequestsForResident(clerkUserId: string) {
  const rows = await prisma.accWorkflowRequest.findMany({
    where: { residentClerkUserId: clerkUserId },
    ...residentRequestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })

  return rows.map((row) => toResidentResponse(row, false))
}

export async function getWorkflowRequestForResident(clerkUserId: string, requestId: string) {
  const row = await prisma.accWorkflowRequest.findFirst({
    where: {
      id: requestId,
      residentClerkUserId: clerkUserId,
    },
    ...residentRequestSelect,
  })

  return row ? toResidentResponse(row, true) : null
}

export async function updateWorkflowRequestForManagement(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  formPatch: Partial<AccWorkflowFormData>
}) {
  const existing = await prisma.accWorkflowRequest.findUnique({
    where: { id: input.requestId },
    ...managementDetailSelect,
  })

  if (!existing) return { kind: "not_found" as const }
  if (existing.status !== "initial_review" || existing.lockedAt) {
    return { kind: "invalid_state" as const, status: existing.status }
  }

  const merged = normalizeAccWorkflowFormData({
    ...normalizeAccWorkflowFormData(existing.formDataJson),
    ...input.formPatch,
  })

  const errors = validateAccWorkflowFormData(merged)
  if (errors.length > 0) return { kind: "validation_error" as const, errors }

  const canonical = canonicalizeAddressParts(merged.streetAddress)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        residentNameSnapshot: merged.ownerName,
        residentEmailSnapshot: merged.ownerEmail,
        residentPhoneSnapshot: merged.ownerPhone || null,
        residentAddressSnapshot: merged.streetAddress || null,
        addressCanonical: canonical.canonical || null,
        addressKey: canonical.canonical || null,
        phase: merged.phase || null,
        lot: merged.lot || null,
        workType: merged.workType || null,
        title: buildTitle(merged.workType),
        description: merged.projectDescription,
        locationDetails: buildLocationDetails(merged),
        formDataJson: toFormDataJson(merged),
        authorizedRepName: merged.authorizedRepName || null,
        estimatedStartDate: parseDateInput(merged.startDate),
        estimatedCompletionDate: parseDateInput(merged.completionDate),
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "request_updated",
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
      },
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? toManagementDetailResponse(refreshed, input.actorUserId) : null
  })

  return updated ? { kind: "ok" as const, request: updated } : { kind: "not_found" as const }
}

export async function updateWorkflowRequestForResident(input: {
  clerkUserId: string
  requestId: string
  formPatch: Partial<AccWorkflowFormData>
}) {
  const existing = await prisma.accWorkflowRequest.findFirst({
    where: {
      id: input.requestId,
      residentClerkUserId: input.clerkUserId,
    },
    ...residentRequestSelect,
  })

  if (!existing) return { kind: "not_found" as const }
  if (existing.status !== "needs_more_info") return { kind: "invalid_state" as const, status: existing.status }

  const merged = normalizeAccWorkflowFormData({
    ...normalizeAccWorkflowFormData(existing.formDataJson),
    ...input.formPatch,
  })

  const errors = validateAccWorkflowFormData(merged)
  if (errors.length > 0) return { kind: "validation_error" as const, errors }

  const canonical = canonicalizeAddressParts(merged.streetAddress)

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        residentNameSnapshot: merged.ownerName,
        residentEmailSnapshot: merged.ownerEmail,
        residentPhoneSnapshot: merged.ownerPhone || null,
        residentAddressSnapshot: merged.streetAddress || null,
        addressCanonical: canonical.canonical || null,
        addressKey: canonical.canonical || null,
        phase: merged.phase || null,
        lot: merged.lot || null,
        workType: merged.workType || null,
        title: buildTitle(merged.workType),
        description: merged.projectDescription,
        locationDetails: buildLocationDetails(merged),
        formDataJson: toFormDataJson(merged),
        authorizedRepName: merged.authorizedRepName || null,
        estimatedStartDate: parseDateInput(merged.startDate),
        estimatedCompletionDate: parseDateInput(merged.completionDate),
      },
      ...residentRequestSelect,
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "request_updated",
        actorUserId: input.clerkUserId,
        actorRole: "resident",
      },
    })

    return request
  })

  return { kind: "ok" as const, request: toResidentResponse(updated, true) }
}

export async function resubmitWorkflowRequestForResident(input: { clerkUserId: string; requestId: string }) {
  const existing = await prisma.accWorkflowRequest.findFirst({
    where: {
      id: input.requestId,
      residentClerkUserId: input.clerkUserId,
    },
    ...residentRequestSelect,
  })

  if (!existing) return { kind: "not_found" as const }
  if (existing.status !== "needs_more_info") return { kind: "invalid_state" as const, status: existing.status }

  const formData = normalizeAccWorkflowFormData(existing.formDataJson)
  const errors = validateAccWorkflowFormData(formData)
  if (errors.length > 0) return { kind: "validation_error" as const, errors }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        status: "initial_review",
        reviewCycle: { increment: 1 },
        residentActionNote: null,
      },
      ...residentRequestSelect,
    })

    await tx.accWorkflowEvent.create({
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

export function isApprovedDecisionStatus(status: AccWorkflowRequestStatus) {
  return status === "approved"
}

function buildManagementOrderBy(sort: AccWorkflowManagementSort | undefined): Prisma.AccWorkflowRequestOrderByWithRelationInput[] {
  if (sort === "submitted_asc") {
    return [{ submittedAt: "asc" }, { requestNumber: "asc" }]
  }

  if (sort === "request_number_asc") {
    return [{ requestNumber: "asc" }, { submittedAt: "asc" }]
  }

  if (sort === "request_number_desc") {
    return [{ requestNumber: "desc" }, { submittedAt: "desc" }]
  }

  return [{ submittedAt: "desc" }, { requestNumber: "desc" }]
}

export async function listWorkflowRequestsForManagement(filters: AccWorkflowManagementFilters) {
  const page = Math.max(1, filters.page || 1)
  const perPage = Math.max(5, Math.min(100, filters.perPage || 25))
  const orderBy = buildManagementOrderBy(filters.sort)
  const where: Prisma.AccWorkflowRequestWhereInput = {
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...buildSearchWhere(filters.query),
  }

  const [rows, total, grouped] = await Promise.all([
    prisma.accWorkflowRequest.findMany({
      where,
      ...managementListSelect,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.accWorkflowRequest.count({ where }),
    prisma.accWorkflowRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ])

  const counts: Record<string, number> = {
    all: 0,
    initial_review: 0,
    needs_more_info: 0,
    committee_vote: 0,
    approved: 0,
    rejected: 0,
  }

  for (const row of grouped) {
    counts[row.status] = row._count._all
    counts.all += row._count._all
  }

  return {
    entries: rows.map(toManagementListResponse),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
    perPage,
    sort: filters.sort || "submitted_desc",
    counts,
  }
}

export async function getWorkflowRequestForManagement(input: { requestId: string; viewerUserId: string }) {
  const row = await prisma.accWorkflowRequest.findUnique({
    where: { id: input.requestId },
    ...managementDetailSelect,
  })

  return row ? toManagementDetailResponse(row, input.viewerUserId) : null
}

export async function requestMoreInfoForWorkflowRequest(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  note: string
}): Promise<WorkflowActionResult> {
  const note = input.note.trim()
  if (!note) return { kind: "validation_error", errors: ["A resident-facing note is required."] }

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "initial_review") return { kind: "invalid_state" as const, status: existing.status }

    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        status: "needs_more_info",
        residentActionNote: note,
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "more_info_requested",
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note,
      },
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return updated
}

async function finalizeInitialReview(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  decision: AccWorkflowDecision
  note?: string
}): Promise<WorkflowActionResult> {
  const trimmedNote = (input.note || "").trim()
  if (input.decision === "reject" && !trimmedNote) {
    return { kind: "validation_error", errors: ["A decision note is required when rejecting a request."] }
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (!["initial_review", "needs_more_info"].includes(existing.status)) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    const finalizedAt = new Date()
    const nextStatus: AccWorkflowRequestStatus = input.decision === "approve" ? "approved" : "rejected"
    const finalizeSource = existing.status === "needs_more_info" ? "needs_more_info" : "initial_review"

    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        finalDecision: input.decision,
        finalDecisionAt: finalizedAt,
        finalDecisionByUserId: input.actorUserId,
        finalDecisionByRole: input.actorRole,
        decisionNote: trimmedNote || null,
        residentActionNote: null,
        lockedAt: finalizedAt,
      },
    })

    await tx.accWorkflowEvent.createMany({
      data: [
        {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: input.decision === "approve" ? "initial_review_approved" : "initial_review_rejected",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note: trimmedNote || null,
        },
        {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: "request_finalized",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note: trimmedNote || null,
          metadataJson: {
            source: finalizeSource,
            finalDecision: input.decision,
          },
        },
      ],
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function approveWorkflowRequestInInitialReview(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  note?: string
}) {
  return finalizeInitialReview({ ...input, decision: "approve" })
}

export async function rejectWorkflowRequestInInitialReview(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  note: string
}) {
  return finalizeInitialReview({ ...input, decision: "reject" })
}

export async function sendWorkflowRequestToCommitteeVote(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  voteDeadlineAt: Date
}): Promise<WorkflowActionResult> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "initial_review") return { kind: "invalid_state" as const, status: existing.status }

    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        status: "committee_vote",
        voteDeadlineAt: input.voteDeadlineAt,
        residentActionNote: null,
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "sent_to_committee_vote",
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        metadataJson: {
          voteDeadlineAt: input.voteDeadlineAt.toISOString(),
        },
      },
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function castCommitteeVoteForWorkflowRequest(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  vote: AccWorkflowVoteValue
}): Promise<WorkflowActionResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await fetchManagementDetailById(tx, input.requestId)
      if (!existing) return { kind: "not_found" as const }
      if (existing.status !== "committee_vote" || existing.lockedAt) {
        return { kind: "invalid_state" as const, status: existing.status }
      }

      const currentVotes = existing.votes.filter((vote) => vote.reviewCycle === existing.reviewCycle)
      if (currentVotes.some((vote) => vote.voterUserId === input.actorUserId)) {
        return { kind: "duplicate_vote" as const }
      }
      if (currentVotes.length >= 3) {
        return { kind: "invalid_state" as const, status: existing.status }
      }

      await tx.accWorkflowVote.create({
        data: {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          voterUserId: input.actorUserId,
          vote: input.vote,
        },
      })

      await tx.accWorkflowEvent.create({
        data: {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: "vote_cast",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          metadataJson: {
            vote: input.vote,
          },
        },
      })

      const afterVote = await fetchManagementDetailById(tx, existing.id)
      if (!afterVote) return { kind: "not_found" as const }

      const currentCycleVotes = afterVote.votes.filter((vote) => vote.reviewCycle === afterVote.reviewCycle)
      if (currentCycleVotes.length === 3 && !afterVote.lockedAt) {
        const approveVotes = currentCycleVotes.filter((vote) => vote.vote === "approve").length
        const rejectVotes = currentCycleVotes.filter((vote) => vote.vote === "reject").length
        await finalizeByCommitteeVote(tx, {
          requestId: afterVote.id,
          reviewCycle: afterVote.reviewCycle,
          approveVotes,
          rejectVotes,
        })
      }

      const refreshed = await fetchManagementDetailById(tx, existing.id)
      return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    return result
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { kind: "duplicate_vote" }
    }
    throw error
  }
}

export async function overrideCommitteeVoteForWorkflowRequest(input: {
  requestId: string
  actorUserId: string
  actorRole: "chair"
  decision: AccWorkflowDecision
  note: string
}): Promise<WorkflowActionResult> {
  const note = input.note.trim()
  if (!note) return { kind: "validation_error", errors: ["An override note is required."] }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "committee_vote" || existing.lockedAt) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    const finalizedAt = new Date()
    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        status: input.decision === "approve" ? "approved" : "rejected",
        finalDecision: input.decision,
        finalDecisionAt: finalizedAt,
        finalDecisionByUserId: input.actorUserId,
        finalDecisionByRole: input.actorRole,
        decisionNote: note,
        lockedAt: finalizedAt,
      },
    })

    await tx.accWorkflowEvent.createMany({
      data: [
        {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: input.decision === "approve" ? "chair_override_approved" : "chair_override_rejected",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note,
        },
        {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: "request_finalized",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note,
          metadataJson: {
            source: "chair_override",
            finalDecision: input.decision,
          },
        },
      ],
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function verifyApprovedWorkflowRequest(input: {
  requestId: string
  actorUserId: string
  actorRole: "chair" | "admin"
  note?: string
}): Promise<WorkflowActionResult> {
  const note = (input.note || "").trim()

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "approved") return { kind: "invalid_state" as const, status: existing.status }
    if (existing.isVerified) return { kind: "already_verified" as const }

    const verifiedAt = new Date()
    await tx.accWorkflowRequest.update({
      where: { id: existing.id },
      data: {
        isVerified: true,
        verifiedAt,
        verifiedByUserId: input.actorUserId,
        verificationNote: note || null,
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "request_verified",
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: note || null,
      },
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function addAttachmentsToWorkflowRequestForResident(input: {
  requestId: string
  clerkUserId: string
  attachments: AccWorkflowUploadedAttachmentInput[]
}) {
  if (input.attachments.length === 0) {
    return { kind: "validation_error" as const, errors: ["At least one attachment is required."] }
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchResidentDetailById(tx, input.requestId, input.clerkUserId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.lockedAt || !["initial_review", "needs_more_info"].includes(existing.status)) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    for (const attachment of input.attachments) {
      const created = await tx.accWorkflowAttachment.create({
        data: {
          requestId: existing.id,
          uploadedByUserId: input.clerkUserId,
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

      await tx.accWorkflowEvent.create({
        data: {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: "attachment_added",
          actorUserId: input.clerkUserId,
          actorRole: "resident",
          note: attachment.note || null,
          metadataJson: {
            attachmentId: created.id,
            filename: created.originalFilename,
            scope: created.scope,
          },
        },
      })
    }

    const refreshed = await fetchResidentDetailById(tx, existing.id, input.clerkUserId)
    return refreshed ? { kind: "ok" as const, request: toResidentResponse(refreshed, true) } : { kind: "not_found" as const }
  })

  return result
}

export async function addAttachmentsToWorkflowRequestForManagement(input: {
  requestId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  attachments: AccWorkflowUploadedAttachmentInput[]
  scope?: "resident" | "internal"
}) {
  if (input.attachments.length === 0) {
    return { kind: "validation_error" as const, errors: ["At least one attachment is required."] }
  }

  const scope = input.scope || "internal"

  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.status !== "initial_review" || existing.lockedAt) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    for (const attachment of input.attachments) {
      const created = await tx.accWorkflowAttachment.create({
        data: {
          requestId: existing.id,
          uploadedByUserId: input.actorUserId,
          uploadedByRole: input.actorRole,
          scope,
          originalFilename: attachment.originalFilename,
          storageProvider: attachment.storageProvider,
          storageKey: attachment.storageKey,
          storageBucket: attachment.storageBucket,
          mimeType: attachment.mimeType,
          fileSizeBytes: attachment.fileSizeBytes,
          note: attachment.note || null,
        },
      })

      await tx.accWorkflowEvent.create({
        data: {
          requestId: existing.id,
          reviewCycle: existing.reviewCycle,
          eventType: "attachment_added",
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note: attachment.note || null,
          metadataJson: {
            attachmentId: created.id,
            filename: created.originalFilename,
            scope: created.scope,
          },
        },
      })
    }

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function deleteWorkflowAttachmentForResident(input: {
  requestId: string
  attachmentId: string
  clerkUserId: string
}) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchResidentDetailById(tx, input.requestId, input.clerkUserId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.lockedAt || !["initial_review", "needs_more_info"].includes(existing.status)) {
      return { kind: "invalid_state" as const, status: existing.status }
    }

    const attachment = await tx.accWorkflowAttachment.findFirst({
      where: {
        id: input.attachmentId,
        requestId: existing.id,
        deletedAt: null,
      },
    })

    if (!attachment) return { kind: "not_found" as const }
    if (attachment.uploadedByRole !== "resident" && attachment.scope !== "resident") {
      return { kind: "not_allowed" as const }
    }

    await tx.accWorkflowAttachment.update({
      where: { id: attachment.id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: input.clerkUserId,
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "attachment_deleted",
        actorUserId: input.clerkUserId,
        actorRole: "resident",
        metadataJson: {
          attachmentId: attachment.id,
          filename: attachment.originalFilename,
        },
      },
    })

    const refreshed = await fetchResidentDetailById(tx, existing.id, input.clerkUserId)
    return refreshed ? { kind: "ok" as const, request: toResidentResponse(refreshed, true) } : { kind: "not_found" as const }
  })

  return result
}

export async function deleteWorkflowAttachmentForManagement(input: {
  requestId: string
  attachmentId: string
  actorUserId: string
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
}) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await fetchManagementDetailById(tx, input.requestId)
    if (!existing) return { kind: "not_found" as const }
    if (existing.lockedAt) return { kind: "invalid_state" as const, status: existing.status }

    const attachment = await tx.accWorkflowAttachment.findFirst({
      where: {
        id: input.attachmentId,
        requestId: existing.id,
        deletedAt: null,
      },
    })

    if (!attachment) return { kind: "not_found" as const }

    await tx.accWorkflowAttachment.update({
      where: { id: attachment.id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: input.actorUserId,
      },
    })

    await tx.accWorkflowEvent.create({
      data: {
        requestId: existing.id,
        reviewCycle: existing.reviewCycle,
        eventType: "attachment_deleted",
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        metadataJson: {
          attachmentId: attachment.id,
          filename: attachment.originalFilename,
        },
      },
    })

    const refreshed = await fetchManagementDetailById(tx, existing.id)
    return refreshed ? { kind: "ok" as const, request: toManagementDetailResponse(refreshed, input.actorUserId) } : { kind: "not_found" as const }
  })

  return result
}

export async function purgeWorkflowRequestForAdmin(input: {
  requestId: string
  actorUserId: string
  confirmText: string
}) {
  if (input.confirmText.trim().toUpperCase() !== "PURGE") {
    return { kind: "validation_error" as const, errors: ["Type PURGE to confirm permanent deletion."] }
  }

  const existing = await prisma.accWorkflowRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true },
  })

  if (!existing) return { kind: "not_found" as const }

  await prisma.accWorkflowRequest.delete({
    where: { id: input.requestId },
  })

  return { kind: "ok" as const, deletedRequestId: input.requestId }
}
