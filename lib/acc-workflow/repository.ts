import { Prisma, type AccWorkflowRequestStatus } from "@prisma/client"
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
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    formDataJson: true,
  },
})

type ResidentRequestRow = Prisma.AccWorkflowRequestGetPayload<typeof residentRequestSelect>

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
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
    ...(includeFormData ? { formData: normalizeAccWorkflowFormData(row.formDataJson) } : {}),
  }
}

export async function createWorkflowRequestForResident(input: { clerkUserId: string; formData: AccWorkflowFormData }) {
  const { clerkUserId, formData } = input
  const residency = await resolveCurrentResidency(clerkUserId)
  const canonical = canonicalizeAddressParts(formData.streetAddress)

  const created = await prisma.$transaction(async (tx) => {
    const request = await tx.accWorkflowRequest.create({
      data: {
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
