type AccImportDisposition = "approved" | "denied" | "conditional" | "duplicate" | "canceled" | "unknown"

type AccImportOverride = {
  disposition?: AccImportDisposition
  processDate?: string
  rawEntryPatch?: Record<string, unknown>
  note: string
}

export const ACC_IMPORT_OVERRIDES: Record<string, AccImportOverride> = {
  "3176": {
    disposition: "approved",
    processDate: "02/18/2026",
    rawEntryPatch: {
      "55": "Approved",
      "61": "02/18/2026",
      workflow_final_status: "approved",
    },
    note:
      "Preserve approved ACC disposition and process date during reimport. WordPress/Gravity Flow workflow state for GF entry 3176 is inconsistent and must not override the native Neon decision.",
  },
}

export function getAccImportOverride(sourceEntryId: string | null | undefined): AccImportOverride | null {
  if (!sourceEntryId) return null
  return ACC_IMPORT_OVERRIDES[sourceEntryId] ?? null
}
