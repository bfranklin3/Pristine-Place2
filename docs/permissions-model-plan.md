# Permissions Model Plan

Scope: Resident Directory + management page authorization foundation

## Objective

Implement a scalable hybrid authorization model:

- Keep committee-role defaults for normal UX.
- Add per-user capability overrides for exceptions.
- Compute effective capabilities consistently in one resolver.

Phase 1 in this document is backend-only: schema + resolver + auth helper integration stubs (no UI editing experience yet).

## Tracking Legend

- Status values: `Not Started`, `In Progress`, `Blocked`, `Done`
- Owner placeholder: assign name/role (example: `Bill`, `Dev`, `ACC Chair`)

## Tracked Checklist

| ID | Item | Priority | Effort | Owner | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| PERM-01 | Define capability key taxonomy | P0 | Quick Win | Dev | Done | Canonical capability keys are documented and used by resolver constants. |
| PERM-02 | Define role-grant matrix (admin/board/member/chair) | P0 | Quick Win | Dev + Bill | Done | Resolver has explicit default grants by role and committee chair/member state. |
| PERM-03 | Add capability override schema models (Prisma) | P0 | Medium | Dev | Done | Prisma schema includes override/audit structures keyed by Clerk user ID and capability key. |
| PERM-04 | Implement effective capability resolver | P0 | Medium | Dev | Done | Resolver returns per-capability decision and source (`default` vs `override`). |
| PERM-05 | Implement server auth helper for capability checks | P0 | Quick Win | Dev | Done | New API/page helper checks one or more capabilities and returns 401/403 consistently. |
| PERM-06 | Preserve backward compatibility with committee-role checks | P0 | Quick Win | Dev | Done | Existing committee-based access helpers continue to work unchanged. |
| PERM-07 | Add tests for grant + override precedence | P1 | Medium | Dev | Not Started | Unit tests cover allow/deny/default precedence and chair/member role combinations. |
| PERM-08 | Wire Resident Directory UI for committee chair toggles | P1 | Medium | Dev | Not Started | UI can assign member/chair by committee and persists metadata cleanly. |
| PERM-09 | Add Advanced Overrides accordion (tri-state) | P1 | Medium | Dev + Bill | Not Started | UI exposes per-capability `Default/Allow/Deny` with reason and save controls. |
| PERM-10 | Add effective-access read-only summary in UI | P1 | Quick Win | Dev | Not Started | Directory detail panel shows resolved capabilities and source. |
| PERM-11 | Migrate management routes to capability checks | P0 | Medium | Dev | Not Started | ACC/Access/Workflow pages enforce capability-based guards in API and page routes. |
| PERM-12 | Audit logging for override changes | P1 | Medium | Dev | Not Started | Override create/update/delete writes structured audit records. |

## Capability Matrix (Default Grants)

- `admin`:
  - all capabilities `true`

- `board_of_directors`:
  - `acc.view`
  - `access.view`

- `committee.acc.member`:
  - `acc.view`

- `committee.acc.chair`:
  - `acc.view`
  - `acc.edit`
  - `acc.workflow`

- `committee.access_control.member`:
  - `access.view`

- `committee.access_control.chair`:
  - `access.view`
  - `access.edit`

Future-ready capabilities included in resolver key set:

- `announcement.submit`

## Resolution Rule

`effective = override if exists else default-role-grant`

Override effects:

- `allow` => `true`
- `deny` => `false`

No override row/value => use defaults.

## Phase 1 Deliverables (implemented)

- Capability constants and role-grant matrix in server resolver module.
- Effective resolver helpers:
  - capability decision
  - source tracing
  - bulk summary
- New auth helper for capability-based API access.
- Prisma schema additions for user capability overrides + audit log.

## Notes

- Phase 1 intentionally does not change management page behavior yet.
- Existing committee checks remain source of truth until routes are migrated in PERM-11.
