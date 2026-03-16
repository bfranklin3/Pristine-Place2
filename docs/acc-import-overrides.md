# ACC Import Overrides

These overrides are intentional exceptions applied during the Gravity Forms to Neon ACC import.

They exist to preserve correct Neon-side operational state when legacy WordPress or Gravity Flow metadata is known to be inconsistent.

## Current Overrides

### GF Entry 3176

- Resident: `Carole Fumano`
- Permit: `26-034`
- Address: `13363 Twinberry Drive`
- Rule: force imported `disposition` to `approved` and preserve `processDate` as `2026-02-18`
- Reason: WordPress / Gravity Flow workflow metadata for this entry can revert to `complete` or otherwise inconsistent values during restart/reset attempts. The native Neon ACC record should continue to be treated as approved.
- Implementation:
  - import override in [scripts/lib/acc-import-overrides.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/scripts/lib/acc-import-overrides.ts)
  - applied by [scripts/import-acc-from-gf.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/scripts/import-acc-from-gf.ts)

## Operational Guidance

- Keep this override in place for the final pre-cutover ACC reimport unless the legacy WordPress workflow state for GF entry `3176` is fully repaired and validated.
- Do not rely on Gravity Flow workflow meta for this entry as the source of truth.
- The Neon `AccRequest.disposition` value is the authoritative status for this exception.
