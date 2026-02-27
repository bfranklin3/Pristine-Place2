export const COMMITTEE_OPTIONS = [
  { slug: "access_control", label: "Access Control" },
  { slug: "acc", label: "Architectural Control Committee (ACC)" },
  { slug: "clubhouse_rental", label: "Clubhouse Rental" },
  { slug: "board_of_directors", label: "Board of Directors" },
  { slug: "communication_committee", label: "Communication Committee" },
  { slug: "social_committee", label: "Social Committee" },
  { slug: "clubhouse_maintenance", label: "Clubhouse Maintenance" },
] as const

export type CommitteeSlug = (typeof COMMITTEE_OPTIONS)[number]["slug"]

const COMMITTEE_SLUG_SET = new Set<string>(COMMITTEE_OPTIONS.map((option) => option.slug))

export function isCommitteeSlug(value: string): value is CommitteeSlug {
  return COMMITTEE_SLUG_SET.has(value)
}

export function normalizeCommitteeSlugs(values: unknown): CommitteeSlug[] {
  if (!Array.isArray(values)) return []

  const seen = new Set<string>()
  const normalized: CommitteeSlug[] = []

  for (const value of values) {
    if (typeof value !== "string") continue
    if (!isCommitteeSlug(value)) continue
    if (seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized.sort(
    (a, b) =>
      COMMITTEE_OPTIONS.findIndex((option) => option.slug === a) -
      COMMITTEE_OPTIONS.findIndex((option) => option.slug === b),
  )
}
