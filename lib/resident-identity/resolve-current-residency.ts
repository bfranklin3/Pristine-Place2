import { prisma } from "@/lib/db/prisma"
import { canonicalizeAddressParts } from "@/lib/address-normalization"

const residencyInclude = {
  household: true,
} as const

function dedupeById<T extends { id: string }>(rows: T[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

export async function resolveCurrentResidencyForClerkUser(input: {
  clerkUserId: string
  addressRaw?: string | null
}) {
  const { clerkUserId, addressRaw } = input

  const linkedResidencies = await prisma.residency.findMany({
    where: { clerkUserId, isCurrent: true },
    include: residencyInclude,
    take: 2,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })

  if (linkedResidencies.length === 1) return linkedResidencies[0]

  const profileRows = await prisma.residentProfile.findMany({
    where: {
      primaryUserId: clerkUserId,
      residencyId: { not: null },
    },
    select: {
      residency: {
        include: residencyInclude,
      },
    },
    take: 5,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })

  const profileResidencies = dedupeById(
    profileRows
      .map((row) => row.residency)
      .filter((row): row is NonNullable<typeof row> => Boolean(row?.isCurrent)),
  )

  if (profileResidencies.length === 1) return profileResidencies[0]

  const canonical = canonicalizeAddressParts(addressRaw).canonical
  if (!canonical) return null

  const addressResidencies = await prisma.residency.findMany({
    where: {
      isCurrent: true,
      household: {
        addressCanonical: canonical,
      },
    },
    include: residencyInclude,
    take: 2,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })

  if (addressResidencies.length === 1) return addressResidencies[0]
  return null
}
