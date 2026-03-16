type AccImportDisposition = "approved" | "denied" | "conditional" | "duplicate" | "canceled" | "unknown"

type AccImportOverride = {
  disposition?: AccImportDisposition
  rawEntryPatch?: Record<string, unknown>
  note: string
}

export const ACC_IMPORT_OVERRIDES: Record<string, AccImportOverride> = {
  "3176": {
    disposition: "approved",
    rawEntryPatch: {
      "55": "Approved",
      workflow_final_status: "approved",
    },
    note:
      "Preserve approved ACC disposition during reimport. WordPress/Gravity Flow workflow state for GF entry 3176 is inconsistent and must not override the native Neon decision.",
  },
}

export function getAccImportOverride(sourceEntryId: string | null | undefined): AccImportOverride | null {
  if (!sourceEntryId) return null
  return ACC_IMPORT_OVERRIDES[sourceEntryId] ?? null
}
