export const CAPABILITY_KEYS = [
  "acc.view",
  "acc.edit",
  "acc.workflow",
  "access.view",
  "access.edit",
  "announcement.submit",
] as const

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number]
export type CapabilityOverrideValue = "allow" | "deny"

export const CAPABILITY_OPTIONS: Array<{
  key: CapabilityKey
  label: string
  description: string
}> = [
  { key: "acc.view", label: "View ACC Submissions", description: "Can view ACC queue and submission details." },
  { key: "acc.edit", label: "Edit ACC Submissions", description: "Can edit ACC submission fields and attachments." },
  { key: "acc.workflow", label: "Control ACC Workflow", description: "Can run workflow approve/reject actions." },
  { key: "access.view", label: "View Access Records", description: "Can view Resident Access pages and records." },
  { key: "access.edit", label: "Edit Access Records", description: "Can edit Resident Access records." },
  {
    key: "announcement.submit",
    label: "Submit Announcements",
    description: "Can submit portal announcements from the frontend.",
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function isCapabilityKey(value: string): value is CapabilityKey {
  return (CAPABILITY_KEYS as readonly string[]).includes(value)
}

export function normalizeCapabilityOverrides(
  values: unknown,
): Partial<Record<CapabilityKey, CapabilityOverrideValue>> {
  if (!isRecord(values)) return {}
  const result: Partial<Record<CapabilityKey, CapabilityOverrideValue>> = {}
  for (const [key, value] of Object.entries(values)) {
    if (!isCapabilityKey(key)) continue
    if (value === "allow" || value === "deny") {
      result[key] = value
    }
  }
  return result
}
