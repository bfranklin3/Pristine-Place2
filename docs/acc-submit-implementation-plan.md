# ACC Submit Form Implementation Plan

Page: `/resident-portal/acc/submit`

## Execution Strategy

- Phase 1 (transition): submit writes to WordPress GF Form 44 and existing Gravity Flow processes the workflow.
- Phase 2 (cutover): after final GF re-migration and validation, switch submit path to Neon-native ACC workflow.

## Tracking Legend

- Status values: `Not Started`, `In Progress`, `Blocked`, `Done`
- Owner placeholder: assign name/role (example: `Bill`, `Dev`, `ACC Chair`)

## Tracked Checklist

| ID | Item | Priority | Effort | Owner | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| ACC-SUB-01 | Wire submit to backend (Phase 1 WordPress GF 44) | P0 | Medium | Dev | Not Started | Submit creates a new GF Form 44 entry with mapped fields; request is visible in WP/Gravity View and follows Gravity Flow path. |
| ACC-SUB-02 | Implement Save & Continue Later draft persistence | P0 | Medium | Dev | Not Started | Clicking save stores a draft and allows resume; user sees "draft saved" timestamp; no data loss on refresh. |
| ACC-SUB-03 | Project type cards drive conditional sections | P0 | Medium | Dev | Done | Selecting Paint/Roof/Fence/Landscaping/Other immediately shows only relevant fields/rules and hides unrelated sections. |
| ACC-SUB-04 | Conditional required validation by project type | P0 | Medium | Dev | Done | Required checks only apply to visible project-specific fields; invalid fields show inline messages. |
| ACC-SUB-05 | Remove Confirm Email field | P0 | Quick Win | Dev | Done | Form has one owner email field only; no confirm-email UI or validation references remain. |
| ACC-SUB-06 | Make Phase optional dropdown (Phase 1-6) | P0 | Quick Win | Dev | Done | Phase is select input with values Phase 1..Phase 6 and can be left blank. |
| ACC-SUB-07 | Make Lot# optional | P0 | Quick Win | Dev | Done | Lot# is not required and submit succeeds without it. |
| ACC-SUB-08 | Inline validation + accessibility attributes | P1 | Medium | Dev | Done | Field-level errors render under each invalid input with `aria-invalid` and `aria-describedby`; status area uses `aria-live`. |
| ACC-SUB-09 | Date logic validation | P1 | Quick Win | Dev | Not Started | Completion date cannot be earlier than start date; clear error shown inline and at summary. |
| ACC-SUB-10 | Improve upload UX (types/size/list/progress) | P1 | Medium | Dev | Not Started | Users can see allowed types/size, selected files list, and upload state; failures are actionable. |
| ACC-SUB-11 | Primary/secondary CTA polish and microcopy | P2 | Quick Win | Dev | Done | Submit and Save actions are visually distinct and explanatory help text is present. |
| ACC-SUB-12 | Mobile layout pass for long form | P2 | Quick Win | Dev | Not Started | Form is usable at mobile breakpoints without horizontal overflow; touch targets are comfortable. |
| ACC-SUB-13 | Wire email notifications (resident + ACC chairs) | P2 | Medium | Dev + Bill | Not Started | On successful submit, resident receives confirmation and chair recipients receive intake notification. |
| ACC-SUB-14 | Phase 2 switch: submit path to Neon workflow | P0 (Cutover) | Medium | Dev + Bill | Not Started | Submit creates Neon ACC request + events; WordPress dependency removed for this page. |

## Data Mapping Notes (Phase 1)

WordPress Form 44 field IDs currently used:

- `23` owner name
- `58` street address
- `6` owner phone
- `20` owner email
- `4` phase
- `5` lot
- `24` role confirmation
- `44` authorized rep name
- `27` work type
- `14` project description
- `15` estimated start date
- `16` estimated completion date
- `18` supporting docs choice
- `19` resident file upload

## Cutover Gate (for ACC submit path)

- [ ] Final GF re-migration completed and validated
- [ ] Neon workflow routes tested in staging
- [ ] ACC/admin UAT signoff completed
- [ ] Production switch window approved
