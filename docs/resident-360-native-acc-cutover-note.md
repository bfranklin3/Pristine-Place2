# Resident 360 Native ACC Cutover Note

Date: March 16, 2026

## Problem

Resident 360 currently shows ACC history only through legacy imported ACC rows linked by `ResidentAccMatch`.

Current Resident 360 APIs:
- [app/api/resident-360/route.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/api/resident-360/route.ts)
- [app/api/resident-360/[residentProfileId]/route.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/api/resident-360/%5BresidentProfileId%5D/route.ts)

These routes include only:
- `residentProfile.accMatches`
- filtered to `status: "confirmed"`

That works for WordPress-imported ACC data, but it does not include native Neon workflow requests from `AccWorkflowRequest`.

Result:
- once WordPress ACC is retired, new native ACC requests will not appear in Resident 360 with the current implementation

## Current Data Available for Native ACC

Native ACC requests already store the relationship fields needed for Resident 360:
- `residentClerkUserId`
- `householdId`
- `residencyId`
- `residentNameSnapshot`
- `residentAddressSnapshot`
- `status`
- `finalDecision`
- `finalDecisionAt`
- `workType`
- `title`
- `description`

Schema reference:
- [prisma/schema.prisma](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/prisma/schema.prisma)

So this is a read-model gap, not a missing-data-model gap.

## Recommended Query Changes

## 1. Resident 360 list route

Update [app/api/resident-360/route.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/api/resident-360/route.ts) to include native ACC counts.

Current list behavior:
- `confirmedAccCount` is based only on confirmed legacy matches
- `latestAccSubmittedAt` is based only on confirmed legacy matches

Recommended list behavior:
- keep legacy confirmed count
- also count native ACC workflow requests linked by the resident profile's `householdId` or `residencyId`

Recommended list fields:
- `confirmedLegacyAccCount`
- `nativeAccCount`
- `combinedAccCount`
- `latestAccSubmittedAt`

Recommended matching rule for native requests:
- if `residentProfile.residencyId` exists, include native requests where `residencyId` matches
- otherwise if `residentProfile.householdId` exists, include native requests where `householdId` matches

Preferred list display:
- keep the existing single summary count in the table for now
- back it with `combinedAccCount`

## 2. Resident 360 detail route

Update [app/api/resident-360/[residentProfileId]/route.ts](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/app/api/resident-360/%5BresidentProfileId%5D/route.ts) to load both:
- legacy confirmed ACC requests
- native ACC workflow requests

Recommended response shape:
- keep `confirmedAccRequests` for legacy rows
- add `nativeAccRequests`
- optionally add a merged `accHistory` array later if the UI should be unified

Recommended native query:
- `accWorkflowRequest.findMany`
- where:
  - `residencyId = row.residencyId` when available
  - otherwise `householdId = row.householdId`
- ordered by:
  - `submittedAt desc`

Recommended selected native fields:
- `id`
- `requestNumber`
- `submittedAt`
- `status`
- `finalDecision`
- `finalDecisionAt`
- `reviewCycle`
- `isVerified`
- `workType`
- `title`
- `description`
- `residentNameSnapshot`
- `residentAddressSnapshot`
- `decisionNote`
- `residentActionNote`
- `attachments`

## UI Changes

Current detail UI in [components/portal/resident-360-table.tsx](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/components/portal/resident-360-table.tsx) has one section:
- `Confirmed ACC Requests`

Recommended near-term UI:
- rename section to `ACC History`
- split into two blocks inside it:
  - `Native ACC Workflow`
  - `Legacy Confirmed ACC Requests`

Why split instead of merging immediately:
- lower risk
- clearer source labeling during transition
- easier to validate before cutover

Recommended card fields for native requests:
- request number
- work type or title
- submitted date
- workflow status
- final decision, if finalized
- short description

Recommended source badge:
- `Native`
- `Legacy`

## Status Mapping for Native ACC

Resident 360 should show native workflow statuses directly:
- `initial_review`
- `needs_more_info`
- `committee_vote`
- `approved`
- `rejected`

Recommended display labels:
- `Initial Review`
- `Needs More Info`
- `Committee Vote`
- `Approved`
- `Rejected`

If `finalDecision` exists, it should be shown alongside or instead of the workflow status when helpful.

## Count and Search Behavior

Resident 360 search should continue to work from the resident profile anchor, not by querying ACC rows directly.

Recommended list search update:
- include native ACC workflow text in the resident search `OR` conditions:
  - `requestNumber`
  - `workType`
  - `title`
  - `description`
  - `residentAddressSnapshot`

This allows searching a resident by native ACC request details after cutover.

## Cutover-Safe Rollout

1. Add native ACC data to Resident 360 APIs.
2. Render native ACC block in the detail panel.
3. Update count logic in the list view.
4. Verify a resident with:
   - legacy-only ACC history
   - native-only ACC history
   - both legacy and native ACC history
5. Keep legacy ACC block in place until WordPress ACC is fully retired.

## Recommendation

Implement this before ACC production cutover.

Without this change:
- native approved/rejected ACC requests will exist in Neon
- but Resident 360 will still look incomplete because it will only show legacy linked ACC history

With this change:
- Resident 360 becomes cutover-safe for ACC
- no manual linking step is needed for native ACC requests because the native workflow already stores household/residency linkage
