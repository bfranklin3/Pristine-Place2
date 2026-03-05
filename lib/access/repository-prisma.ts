import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import type {
  AccessAuditEntry,
  AccessCredential,
  AccessCredentialStatus,
  AccessCredentialType,
  AccessHolderCategory,
  AccessHolderState,
  AccessHouseholdMember,
  AccessAuditEntityType,
  AccessResidentDetail,
  AccessResidentListItem,
} from "@/lib/access/types"

function maskValue(value: string) {
  if (!value) return "—"
  const tail = value.slice(-3)
  return `***${tail}`
}

function normalizePagination(page?: number, pageSize?: number) {
  const nextPage = Number.isFinite(page) ? Math.max(1, page as number) : 1
  const nextPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.min(100, pageSize as number)) : 25
  return { page: nextPage, pageSize: nextPageSize }
}

function categoryLabel(category: AccessHolderCategory): string {
  const map: Record<AccessHolderCategory, string> = {
    owner_occupant: "Owner (Occupant)",
    owner_non_occupant: "Owner (Non-Occupant)",
    tenant: "Tenant",
    household_member: "Household Member",
    trustee_or_owner_rep: "Trustee / Owner Rep",
    guardian: "Guardian",
    vendor: "Vendor",
    property_manager: "Property Manager",
    unspecified: "Unspecified",
  }
  return map[category]
}

function deriveEffectiveCategory(input: {
  primary: { holderCategory: AccessHolderCategory } | null
  secondary: { holderCategory: AccessHolderCategory } | null
  legacyResidentCategory: string | null
}): {
  effectiveCategory: AccessHolderCategory
  categoryNeedsReview: boolean
  categoryReviewReason: string | null
} {
  const p = input.primary?.holderCategory || "unspecified"
  const s = input.secondary?.holderCategory || "unspecified"

  let effective: AccessHolderCategory = "unspecified"
  if (p !== "unspecified") effective = p
  else if (s !== "unspecified") effective = s

  const reasons: string[] = []
  if (effective === "unspecified") {
    reasons.push("No primary/secondary holder category set.")
  }
  if (p !== "unspecified" && s !== "unspecified" && p !== s) {
    reasons.push("Primary and secondary categories differ.")
  }
  if (input.legacyResidentCategory && effective === "unspecified") {
    reasons.push(`Legacy category exists (${input.legacyResidentCategory}) but holder category is unspecified.`)
  }

  return {
    effectiveCategory: effective,
    categoryNeedsReview: reasons.length > 0,
    categoryReviewReason: reasons.length ? reasons.join(" ") : null,
  }
}

export async function listResidentsPrisma(params: {
  q?: string
  phase?: string
  category?: string
  status?: AccessCredentialStatus
  page?: number
  pageSize?: number
}) {
  const q = (params.q || "").trim()
  const phase = (params.phase || "").trim()
  const category = (params.category || "").trim()
  const categoryLower = category.toLowerCase()
  const { page, pageSize } = normalizePagination(params.page, params.pageSize)

  const categoryWhere: Prisma.ResidentProfileWhereInput =
    !category
      ? {}
      : categoryLower === "owner"
        ? {
            householdMembers: {
              some: {
                role: { in: ["primary", "secondary"] },
                holderCategory: { in: ["owner_occupant", "owner_non_occupant"] },
              },
            },
          }
        : categoryLower === "renter"
          ? {
              householdMembers: {
                some: {
                  role: { in: ["primary", "secondary"] },
                  holderCategory: "tenant",
                },
              },
            }
          : categoryLower === "vendor"
            ? {
                householdMembers: {
                  some: {
                    role: { in: ["primary", "secondary"] },
                    holderCategory: { in: ["vendor", "property_manager"] },
                  },
                },
              }
            : categoryLower === "unspecified"
              ? {
                  NOT: {
                    householdMembers: {
                      some: {
                        role: { in: ["primary", "secondary"] },
                        holderCategory: { not: "unspecified" },
                      },
                    },
                  },
                }
              : {}

  const where: Prisma.ResidentProfileWhereInput = {
    ...(phase ? { phase: { equals: phase, mode: "insensitive" } } : {}),
    ...categoryWhere,
    ...(q
      ? {
          OR: [
            { addressFull: { contains: q, mode: "insensitive" } },
            { comments: { contains: q, mode: "insensitive" } },
            { addressNumber: { contains: q, mode: "insensitive" } },
            { streetName: { contains: q, mode: "insensitive" } },
            {
              householdMembers: {
                some: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }

  const [rows, total, reviewRows] = await Promise.all([
    prisma.residentProfile.findMany({
      where,
      include: {
        householdMembers: true,
        credentials: params.status ? { where: { status: params.status } } : true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.residentProfile.count({ where }),
    prisma.residentProfile.findMany({
      where,
      select: {
        residentCategory: true,
        householdMembers: {
          where: { role: { in: ["primary", "secondary"] } },
          select: { role: true, holderCategory: true },
        },
      },
    }),
  ])

  const items: AccessResidentListItem[] = rows.map((row) => {
    const primary = row.householdMembers.find((m) => m.role === "primary") || null
    const secondary = row.householdMembers.find((m) => m.role === "secondary") || null
    const effective = deriveEffectiveCategory({
      primary: primary ? { holderCategory: primary.holderCategory as AccessHolderCategory } : null,
      secondary: secondary ? { holderCategory: secondary.holderCategory as AccessHolderCategory } : null,
      legacyResidentCategory: row.residentCategory,
    })

    return {
      residentProfileId: row.id,
      addressFull: row.addressFull,
      phase: row.phase,
      residentCategory: row.residentCategory,
      effectiveCategory: effective.effectiveCategory,
      effectiveCategoryLabel: categoryLabel(effective.effectiveCategory),
      categoryNeedsReview: effective.categoryNeedsReview,
      categoryReviewReason: effective.categoryReviewReason,
      includeInDirectory: row.includeInDirectory,
      confidentialPhone: row.confidentialPhone,
      entryCode: row.entryCode,
      comments: row.comments,
      primaryContact: primary
        ? {
            firstName: primary.firstName,
            lastName: primary.lastName,
            phone: primary.phone,
            email: primary.email,
          }
        : null,
      secondaryContact: secondary
        ? {
            firstName: secondary.firstName,
            lastName: secondary.lastName,
            phone: secondary.phone,
            email: secondary.email,
          }
        : null,
      credentials: row.credentials.map((c) => ({
        id: c.id,
        type: c.credentialType,
        label: c.credentialLabel,
        valueMasked: maskValue(c.credentialValue),
        status: c.status,
      })),
      updatedAt: row.updatedAt.toISOString(),
    }
  })

  const needsReviewCount = reviewRows.reduce((count, row) => {
    const primary = row.householdMembers.find((m) => m.role === "primary") || null
    const secondary = row.householdMembers.find((m) => m.role === "secondary") || null
    const effective = deriveEffectiveCategory({
      primary: primary ? { holderCategory: primary.holderCategory as AccessHolderCategory } : null,
      secondary: secondary ? { holderCategory: secondary.holderCategory as AccessHolderCategory } : null,
      legacyResidentCategory: row.residentCategory,
    })
    return count + (effective.categoryNeedsReview ? 1 : 0)
  }, 0)

  return { items, total, needsReviewCount, page, pageSize }
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null
}

function toHouseholdMember(member: {
  id: string
  role: "primary" | "secondary" | "tertiary" | "company_contact"
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  isPrimaryContact: boolean
  holderCategory:
    | "owner_occupant"
    | "owner_non_occupant"
    | "tenant"
    | "household_member"
    | "trustee_or_owner_rep"
    | "guardian"
    | "vendor"
    | "property_manager"
    | "unspecified"
  holderState: "current" | "past" | "unknown"
  organizationName: string | null
  startDate: Date | null
  endDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): AccessHouseholdMember {
  return {
    id: member.id,
    role: member.role,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    email: member.email,
    isPrimaryContact: member.isPrimaryContact,
    holderCategory: member.holderCategory,
    holderState: member.holderState,
    organizationName: member.organizationName,
    startDate: toIso(member.startDate),
    endDate: toIso(member.endDate),
    notes: member.notes,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  }
}

function toCredential(credential: {
  id: string
  credentialType: "directory_code" | "barcode" | "fob" | "temp_code"
  credentialLabel: string | null
  credentialValue: string
  householdMemberId: string | null
  status: "active" | "disabled" | "lost" | "revoked"
  notes: string | null
  issuedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): AccessCredential {
  return {
    id: credential.id,
    credentialType: credential.credentialType,
    credentialLabel: credential.credentialLabel,
    credentialValue: credential.credentialValue,
    householdMemberId: credential.householdMemberId,
    status: credential.status,
    notes: credential.notes,
    issuedAt: toIso(credential.issuedAt),
    revokedAt: toIso(credential.revokedAt),
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  }
}

function toAuditEntry(entry: {
  id: string
  actorUserId: string | null
  entityType: "resident_profile" | "household_member" | "gate_credential"
  entityId: string
  action: "create" | "update" | "revoke" | "approve" | "import"
  beforeJson: Prisma.JsonValue | null
  afterJson: Prisma.JsonValue | null
  reason: string | null
  createdAt: Date
}): AccessAuditEntry {
  return {
    id: entry.id,
    actorUserId: entry.actorUserId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    beforeJson: (entry.beforeJson as Record<string, unknown> | null) ?? null,
    afterJson: (entry.afterJson as Record<string, unknown> | null) ?? null,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  }
}

export async function getResidentDetailPrisma(residentProfileId: string): Promise<AccessResidentDetail | null> {
  const resident = await prisma.residentProfile.findUnique({
    where: { id: residentProfileId },
    include: {
      householdMembers: true,
      credentials: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  if (!resident) return null

  return {
    residentProfileId: resident.id,
    primaryUserId: resident.primaryUserId,
    residentCategory: resident.residentCategory,
    includeInDirectory: resident.includeInDirectory,
    confidentialPhone: resident.confidentialPhone,
    phase: resident.phase,
    addressNumber: resident.addressNumber,
    streetName: resident.streetName,
    addressFull: resident.addressFull,
    entryCode: resident.entryCode,
    comments: resident.comments,
    householdMembers: resident.householdMembers.map(toHouseholdMember),
    credentials: resident.credentials.map(toCredential),
    audit: resident.auditLogs.map(toAuditEntry),
    createdAt: resident.createdAt.toISOString(),
    updatedAt: resident.updatedAt.toISOString(),
  }
}

export async function createResidentPrisma(
  payload: Partial<{
    primaryUserId: string | null
    residentCategory: string | null
    includeInDirectory: boolean
    confidentialPhone: boolean
    phase: string | null
    addressNumber: string | null
    streetName: string | null
    addressFull: string | null
    entryCode: string | null
    comments: string | null
  }>,
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessResidentDetail> {
  const resident = await prisma.$transaction(async (tx) => {
    const created = await tx.residentProfile.create({
      data: {
        primaryUserId: payload.primaryUserId ?? null,
        residentCategory: payload.residentCategory ?? null,
        includeInDirectory: payload.includeInDirectory ?? true,
        confidentialPhone: payload.confidentialPhone ?? false,
        phase: payload.phase ?? null,
        addressNumber: payload.addressNumber ?? null,
        streetName: payload.streetName ?? null,
        addressFull: payload.addressFull ?? null,
        entryCode: payload.entryCode ?? null,
        comments: payload.comments ?? null,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId: created.id,
        actorUserId: actorUserId ?? null,
        entityType: "resident_profile",
        entityId: created.id,
        action: "create",
        afterJson: {
          residentCategory: created.residentCategory,
          includeInDirectory: created.includeInDirectory,
          confidentialPhone: created.confidentialPhone,
          phase: created.phase,
          addressNumber: created.addressNumber,
          streetName: created.streetName,
          addressFull: created.addressFull,
          entryCode: created.entryCode,
          comments: created.comments,
        },
        reason: reason ?? null,
      },
    })

    return created
  })

  const detail = await getResidentDetailPrisma(resident.id)
  if (!detail) {
    throw new Error("Created resident could not be loaded.")
  }
  return detail
}

export async function patchResidentPrisma(
  residentProfileId: string,
  payload: Partial<{
    residentCategory: string | null
    includeInDirectory: boolean
    confidentialPhone: boolean
    phase: string | null
    addressNumber: string | null
    streetName: string | null
    addressFull: string | null
    entryCode: string | null
    comments: string | null
  }>,
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessResidentDetail | null> {
  const existing = await prisma.residentProfile.findUnique({
    where: { id: residentProfileId },
  })
  if (!existing) return null

  const updated = await prisma.$transaction(async (tx) => {
    const residentData: Prisma.ResidentProfileUpdateInput = {
      residentCategory: payload.residentCategory !== undefined ? payload.residentCategory : existing.residentCategory,
      includeInDirectory: payload.includeInDirectory !== undefined
        ? payload.includeInDirectory
        : existing.includeInDirectory,
      confidentialPhone: payload.confidentialPhone !== undefined
        ? payload.confidentialPhone
        : existing.confidentialPhone,
      phase: payload.phase !== undefined ? payload.phase : existing.phase,
      addressNumber: payload.addressNumber !== undefined ? payload.addressNumber : existing.addressNumber,
      streetName: payload.streetName !== undefined ? payload.streetName : existing.streetName,
      addressFull: payload.addressFull !== undefined ? payload.addressFull : existing.addressFull,
      entryCode: payload.entryCode !== undefined ? payload.entryCode : existing.entryCode,
      comments: payload.comments !== undefined ? payload.comments : existing.comments,
    }

    const resident = await tx.residentProfile.update({
      where: { id: residentProfileId },
      data: residentData,
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "resident_profile",
        entityId: residentProfileId,
        action: "update",
        beforeJson: {
          residentCategory: existing.residentCategory,
          includeInDirectory: existing.includeInDirectory,
          confidentialPhone: existing.confidentialPhone,
          phase: existing.phase,
          addressNumber: existing.addressNumber,
          streetName: existing.streetName,
          addressFull: existing.addressFull,
          entryCode: existing.entryCode,
          comments: existing.comments,
        },
        afterJson: {
          residentCategory: resident.residentCategory,
          includeInDirectory: resident.includeInDirectory,
          confidentialPhone: resident.confidentialPhone,
          phase: resident.phase,
          addressNumber: resident.addressNumber,
          streetName: resident.streetName,
          addressFull: resident.addressFull,
          entryCode: resident.entryCode,
          comments: resident.comments,
        },
        reason: reason ?? null,
      },
    })

    return resident.id
  })

  return getResidentDetailPrisma(updated)
}

export async function addHouseholdMemberPrisma(
  residentProfileId: string,
  payload: Omit<AccessHouseholdMember, "id" | "createdAt" | "updatedAt" | "startDate" | "endDate"> & {
    startDate?: string | null
    endDate?: string | null
  },
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessHouseholdMember | null> {
  const resident = await prisma.residentProfile.findUnique({ where: { id: residentProfileId } })
  if (!resident) return null

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.householdMember.create({
      data: {
        residentProfileId,
        role: payload.role,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        isPrimaryContact: payload.isPrimaryContact,
        holderCategory: payload.holderCategory,
        holderState: payload.holderState,
        organizationName: payload.organizationName ?? null,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        notes: payload.notes ?? null,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "household_member",
        entityId: created.id,
        action: "create",
        afterJson: {
          role: created.role,
          firstName: created.firstName,
          lastName: created.lastName,
          phone: created.phone,
          email: created.email,
          isPrimaryContact: created.isPrimaryContact,
          holderCategory: created.holderCategory,
          holderState: created.holderState,
          organizationName: created.organizationName,
          startDate: created.startDate,
          endDate: created.endDate,
          notes: created.notes,
        },
        reason: reason ?? null,
      },
    })

    return created
  })

  return toHouseholdMember(member)
}

export async function patchHouseholdMemberPrisma(
  id: string,
  payload: Partial<Omit<AccessHouseholdMember, "id" | "createdAt" | "updatedAt" | "startDate" | "endDate">> & {
    startDate?: string | null
    endDate?: string | null
  },
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessHouseholdMember | null> {
  const existing = await prisma.householdMember.findUnique({ where: { id } })
  if (!existing) return null

  const updated = await prisma.$transaction(async (tx) => {
    const member = await tx.householdMember.update({
      where: { id },
      data: {
        role: payload.role ?? existing.role,
        firstName: payload.firstName ?? existing.firstName,
        lastName: payload.lastName ?? existing.lastName,
        phone: payload.phone ?? existing.phone,
        email: payload.email ?? existing.email,
        isPrimaryContact: payload.isPrimaryContact ?? existing.isPrimaryContact,
        holderCategory: (payload.holderCategory as AccessHolderCategory | undefined) ?? existing.holderCategory,
        holderState: (payload.holderState as AccessHolderState | undefined) ?? existing.holderState,
        organizationName: payload.organizationName ?? existing.organizationName,
        startDate:
          payload.startDate !== undefined
            ? payload.startDate
              ? new Date(payload.startDate)
              : null
            : existing.startDate,
        endDate:
          payload.endDate !== undefined
            ? payload.endDate
              ? new Date(payload.endDate)
              : null
            : existing.endDate,
        notes: payload.notes ?? existing.notes,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId: existing.residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "household_member",
        entityId: id,
        action: "update",
        beforeJson: {
          role: existing.role,
          firstName: existing.firstName,
          lastName: existing.lastName,
          phone: existing.phone,
          email: existing.email,
          isPrimaryContact: existing.isPrimaryContact,
          holderCategory: existing.holderCategory,
          holderState: existing.holderState,
          organizationName: existing.organizationName,
          startDate: existing.startDate,
          endDate: existing.endDate,
          notes: existing.notes,
        },
        afterJson: {
          role: member.role,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
          isPrimaryContact: member.isPrimaryContact,
          holderCategory: member.holderCategory,
          holderState: member.holderState,
          organizationName: member.organizationName,
          startDate: member.startDate,
          endDate: member.endDate,
          notes: member.notes,
        },
        reason: reason ?? null,
      },
    })

    return member
  })

  return toHouseholdMember(updated)
}

export async function deleteHouseholdMemberPrisma(
  id: string,
  actorUserId?: string | null,
  reason?: string | null,
): Promise<boolean> {
  const existing = await prisma.householdMember.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.$transaction(async (tx) => {
    await tx.householdMember.delete({ where: { id } })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId: existing.residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "household_member",
        entityId: id,
        action: "update",
        beforeJson: {
          role: existing.role,
          firstName: existing.firstName,
          lastName: existing.lastName,
          phone: existing.phone,
          email: existing.email,
          isPrimaryContact: existing.isPrimaryContact,
        },
        reason: reason ?? null,
      },
    })
  })

  return true
}

export async function addCredentialPrisma(
  residentProfileId: string,
  payload: {
    credentialType: AccessCredentialType
    credentialLabel?: string | null
    credentialValue: string
    householdMemberId?: string | null
    notes?: string | null
  },
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessCredential | null> {
  const resident = await prisma.residentProfile.findUnique({ where: { id: residentProfileId } })
  if (!resident) return null

  const created = await prisma.$transaction(async (tx) => {
    const credential = await tx.gateCredential.create({
      data: {
        residentProfileId,
        credentialType: payload.credentialType,
        credentialLabel: payload.credentialLabel ?? null,
        credentialValue: payload.credentialValue,
        householdMemberId: payload.householdMemberId ?? null,
        status: "active",
        notes: payload.notes ?? null,
        issuedAt: new Date(),
      },
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "gate_credential",
        entityId: credential.id,
        action: "create",
        afterJson: {
          credentialType: credential.credentialType,
          credentialLabel: credential.credentialLabel,
          credentialValue: maskValue(credential.credentialValue),
          householdMemberId: credential.householdMemberId,
          status: credential.status,
          notes: credential.notes,
        },
        reason: reason ?? null,
      },
    })

    return credential
  })

  return toCredential(created)
}

export async function patchCredentialPrisma(
  id: string,
  payload: Partial<{
    status: AccessCredentialStatus
    notes: string | null
    credentialLabel: string | null
    credentialValue: string
    householdMemberId: string | null
  }>,
  actorUserId?: string | null,
  reason?: string | null,
): Promise<AccessCredential | null> {
  const existing = await prisma.gateCredential.findUnique({ where: { id } })
  if (!existing) return null

  const updated = await prisma.$transaction(async (tx) => {
    const credential = await tx.gateCredential.update({
      where: { id },
      data: {
        status: payload.status ?? existing.status,
        notes: payload.notes ?? existing.notes,
        credentialLabel: payload.credentialLabel ?? existing.credentialLabel,
        credentialValue: payload.credentialValue ?? existing.credentialValue,
        householdMemberId:
          payload.householdMemberId !== undefined ? payload.householdMemberId : existing.householdMemberId,
        revokedAt:
          payload.status === "revoked" && !existing.revokedAt
            ? new Date()
            : payload.status
              ? existing.revokedAt
              : existing.revokedAt,
      },
    })

    await tx.accessAuditLog.create({
      data: {
        residentProfileId: existing.residentProfileId,
        actorUserId: actorUserId ?? null,
        entityType: "gate_credential",
        entityId: id,
        action: payload.status === "revoked" ? "revoke" : "update",
        beforeJson: {
          credentialType: existing.credentialType,
          credentialLabel: existing.credentialLabel,
          credentialValue: maskValue(existing.credentialValue),
          householdMemberId: existing.householdMemberId,
          status: existing.status,
          notes: existing.notes,
        },
        afterJson: {
          credentialType: credential.credentialType,
          credentialLabel: credential.credentialLabel,
          credentialValue: maskValue(credential.credentialValue),
          householdMemberId: credential.householdMemberId,
          status: credential.status,
          notes: credential.notes,
        },
        reason: reason ?? null,
      },
    })

    return credential
  })

  return toCredential(updated)
}

export async function listAuditPrisma(params: {
  entityType?: AccessAuditEntityType
  entityId?: string
  limit?: number
}): Promise<AccessAuditEntry[]> {
  const limit = Math.max(1, Math.min(200, params.limit || 50))
  const where: Prisma.AccessAuditLogWhereInput = {
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
  }

  const entries = await prisma.accessAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return entries.map(toAuditEntry)
}
