import { Prisma } from "@prisma/client"

export function buildNativeAccRequestWhere(input: {
  householdId?: string | null
  residencyId?: string | null
  addressCanonical?: string | null
}): Prisma.AccWorkflowRequestWhereInput | null {
  const ors: Prisma.AccWorkflowRequestWhereInput[] = []

  if (input.residencyId) ors.push({ residencyId: input.residencyId })
  if (input.householdId) ors.push({ householdId: input.householdId })
  if (input.addressCanonical) ors.push({ addressCanonical: input.addressCanonical })

  if (ors.length === 0) return null
  return { OR: ors }
}

export function dedupeNativeAccRequests<T extends { id: string }>(rows: T[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

export function matchesNativeAccAnchor(
  request: {
    householdId: string | null
    residencyId: string | null
    addressCanonical: string | null
  },
  anchor: {
    householdId: string | null
    residencyId: string | null
    addressCanonical: string | null
  },
) {
  return Boolean(
    (anchor.residencyId && request.residencyId === anchor.residencyId) ||
      (anchor.householdId && request.householdId === anchor.householdId) ||
      (anchor.addressCanonical && request.addressCanonical === anchor.addressCanonical),
  )
}
