# ACC Submit Page Follow-Ups

Page: `/resident-portal/acc/submit`

## Status

The new ACC submit page UI is implemented, but submission persistence is intentionally deferred.

Current plan is phased:

- Transition phase: submit path writes to WordPress GF Form 44 (workflow handled by Gravity Flow).
- Cutover phase: after final GF re-migration + validation, submit path switches to Neon-native ACC workflow.

## Pending Implementation

- [ ] Wire **Submit My Request** to real backend persistence (WordPress GF Form 44 first, Neon-native flow at cutover).
- [ ] Implement **Save & Continue Later** draft behavior (recommended: server-side draft record + optional local backup).
- [ ] Add file upload persistence for supporting documents to the selected backend path.
- [ ] Add final success redirect/confirmation behavior and email notifications.

## Notes

- Current behavior is client-side validation + status messaging only.
- `View Architectural Guidelines` link now targets: `/resident-portal/acc#architectural-guidelines`.
