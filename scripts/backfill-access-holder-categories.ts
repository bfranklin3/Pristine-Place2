import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeCategory(value: string | null | undefined): string {
  return normalizeSpace((value || "").toLowerCase())
}

function mapProfileCategory(input: string | null | undefined): "owner_occupant" | "tenant" | "vendor" | "property_manager" | "unspecified" {
  const category = normalizeCategory(input)
  if (!category) return "unspecified"
  if (category === "owner") return "owner_occupant"
  if (category === "renter" || category === "tenant") return "tenant"
  if (category === "vendor") return "vendor"
  if (category === "property manager" || category === "property_manager") return "property_manager"
  return "unspecified"
}

function resolveMemberCategory(input: {
  baseCategory: "owner_occupant" | "tenant" | "vendor" | "property_manager" | "unspecified"
  role: "primary" | "secondary" | "tertiary" | "company_contact"
}): "owner_occupant" | "tenant" | "vendor" | "property_manager" | "household_member" | "trustee_or_owner_rep" | "unspecified" {
  if (input.baseCategory === "vendor" || input.baseCategory === "property_manager") {
    return input.baseCategory
  }
  if (input.baseCategory === "owner_occupant" || input.baseCategory === "tenant") {
    if (input.role === "tertiary") return "household_member"
    if (input.role === "company_contact") return "trustee_or_owner_rep"
    return input.baseCategory
  }
  if (input.role === "company_contact") return "trustee_or_owner_rep"
  if (input.role === "tertiary") return "household_member"
  return "unspecified"
}

async function main() {
  const execute = hasFlag("--execute")
  const overwrite = hasFlag("--overwrite")

  const rows = await prisma.residentProfile.findMany({
    select: {
      id: true,
      residentCategory: true,
      residentState: true,
      householdMembers: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          holderCategory: true,
          holderState: true,
          organizationName: true,
        },
      },
      credentials: {
        select: {
          id: true,
          credentialType: true,
          credentialLabel: true,
          householdMemberId: true,
          status: true,
        },
      },
    },
  })

  let membersScanned = 0
  let membersCategoryUpdated = 0
  let membersStateUpdated = 0
  let membersOrgNameUpdated = 0
  let credentialsScanned = 0
  let credentialsLinked = 0
  let credentialsAlreadyLinked = 0
  let credentialsUnresolved = 0
  const unresolvedCredentialIds: string[] = []

  for (const row of rows) {
    const baseCategory = mapProfileCategory(row.residentCategory)
    const state = row.residentState || "unknown"
    const primary = row.householdMembers.find((m) => m.role === "primary")
    const secondary = row.householdMembers.find((m) => m.role === "secondary")
    const tertiary = row.householdMembers.find((m) => m.role === "tertiary")
    const companyContact = row.householdMembers.find((m) => m.role === "company_contact")
    const fallback = primary || secondary || tertiary || companyContact || row.householdMembers[0]

    for (const member of row.householdMembers) {
      membersScanned += 1
      const nextCategory = resolveMemberCategory({ baseCategory, role: member.role })
      const shouldCategoryUpdate = overwrite || member.holderCategory === "unspecified" || !member.holderCategory
      const shouldStateUpdate = overwrite || member.holderState === "unknown" || !member.holderState

      const nextOrganizationName =
        member.role === "company_contact" && !member.organizationName
          ? normalizeSpace([member.firstName || "", member.lastName || ""].join(" ")).trim() || null
          : member.organizationName
      const shouldOrgUpdate =
        member.role === "company_contact" &&
        !member.organizationName &&
        Boolean(nextOrganizationName)

      if (shouldCategoryUpdate && member.holderCategory !== nextCategory) {
        membersCategoryUpdated += 1
      }
      if (shouldStateUpdate && member.holderState !== state) {
        membersStateUpdated += 1
      }
      if (shouldOrgUpdate) {
        membersOrgNameUpdated += 1
      }

      if (execute && (shouldCategoryUpdate || shouldStateUpdate || shouldOrgUpdate)) {
        await prisma.householdMember.update({
          where: { id: member.id },
          data: {
            ...(shouldCategoryUpdate ? { holderCategory: nextCategory } : {}),
            ...(shouldStateUpdate ? { holderState: state } : {}),
            ...(shouldOrgUpdate ? { organizationName: nextOrganizationName } : {}),
          },
        })
      }
    }

    for (const credential of row.credentials) {
      credentialsScanned += 1
      if (credential.householdMemberId) {
        credentialsAlreadyLinked += 1
        continue
      }
      let targetMemberId: string | null = null
      if (credential.credentialType === "directory_code") {
        const label = (credential.credentialLabel || "").toUpperCase()
        if (label === "A") targetMemberId = primary?.id || fallback?.id || null
        else if (label === "B") targetMemberId = secondary?.id || primary?.id || fallback?.id || null
        else if (label === "C") targetMemberId = tertiary?.id || companyContact?.id || primary?.id || fallback?.id || null
      } else {
        targetMemberId = primary?.id || fallback?.id || null
      }

      if (!targetMemberId) {
        credentialsUnresolved += 1
        unresolvedCredentialIds.push(credential.id)
        continue
      }
      credentialsLinked += 1
      if (execute) {
        await prisma.gateCredential.update({
          where: { id: credential.id },
          data: { householdMemberId: targetMemberId },
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        overwrite,
        profilesScanned: rows.length,
        members: {
          scanned: membersScanned,
          categoryUpdates: membersCategoryUpdated,
          stateUpdates: membersStateUpdated,
          organizationNameUpdates: membersOrgNameUpdated,
        },
        credentials: {
          scanned: credentialsScanned,
          linked: credentialsLinked,
          alreadyLinked: credentialsAlreadyLinked,
          unresolved: credentialsUnresolved,
          unresolvedSample: unresolvedCredentialIds.slice(0, 50),
        },
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

