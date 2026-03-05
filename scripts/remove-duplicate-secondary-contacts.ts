import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function normalize(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ")
}

async function main() {
  const execute = hasFlag("--execute")
  const actor = "script:remove-duplicate-secondary-contacts"

  const profiles = await prisma.residentProfile.findMany({
    select: {
      id: true,
      householdMembers: {
        where: { role: { in: ["primary", "secondary"] } },
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  const targets: Array<{ residentProfileId: string; primaryId: string; secondaryId: string }> = []
  for (const profile of profiles) {
    const primary = profile.householdMembers.find((m) => m.role === "primary")
    const secondary = profile.householdMembers.find((m) => m.role === "secondary")
    if (!primary || !secondary) continue
    const same =
      normalize(primary.firstName) === normalize(secondary.firstName) &&
      normalize(primary.lastName) === normalize(secondary.lastName) &&
      normalize(primary.phone) === normalize(secondary.phone) &&
      normalize(primary.email) === normalize(secondary.email)
    if (!same) continue
    targets.push({ residentProfileId: profile.id, primaryId: primary.id, secondaryId: secondary.id })
  }

  let deletedSecondary = 0
  let reassignedCredentials = 0
  let auditRows = 0

  if (execute) {
    for (const row of targets) {
      const creds = await prisma.gateCredential.findMany({
        where: { householdMemberId: row.secondaryId },
        select: { id: true },
      })

      for (const credential of creds) {
        await prisma.gateCredential.update({
          where: { id: credential.id },
          data: { householdMemberId: row.primaryId },
        })
        await prisma.accessAuditLog.create({
          data: {
            residentProfileId: row.residentProfileId,
            actorUserId: actor,
            entityType: "gate_credential",
            entityId: credential.id,
            action: "update",
            afterJson: {
              householdMemberId: row.primaryId,
            },
            reason: "Reassigned credential from duplicate secondary contact to primary contact.",
          },
        })
        reassignedCredentials += 1
        auditRows += 1
      }

      await prisma.householdMember.delete({ where: { id: row.secondaryId } })
      await prisma.accessAuditLog.create({
        data: {
          residentProfileId: row.residentProfileId,
          actorUserId: actor,
          entityType: "household_member",
          entityId: row.secondaryId,
          action: "update",
          reason: "Removed duplicate secondary contact (identical to primary).",
        },
      })
      deletedSecondary += 1
      auditRows += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        profilesScanned: profiles.length,
        duplicateSecondaryCandidates: targets.length,
        deletedSecondary,
        reassignedCredentials,
        auditRows,
        sample: targets.slice(0, 20),
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

