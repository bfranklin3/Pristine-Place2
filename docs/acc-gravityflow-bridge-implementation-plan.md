# ACC Gravity Flow Bridge Implementation Plan

Page: `/resident-portal/management/acc-queue`

## Execution Strategy

- Transition phase: keep WordPress + Gravity Flow as workflow authority and use Next.js only as the management UI.
- Cutover phase: retire this bridge when Neon-native ACC workflow is production-ready.

## Tracking Legend

- Status values: `Not Started`, `In Progress`, `Blocked`, `Done`
- Owner placeholder: assign name/role (example: `Bill`, `Dev`, `ACC Chair`)

## Tracked Checklist

| ID | Item | Priority | Effort | Owner | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|
| ACC-GF-01 | Define role contract (ACC Chair action, ACC/Admin read-only) | P0 | Quick Win | Dev + Bill | Not Started | Role matrix is documented and applied in both Next.js UI and WordPress endpoint permission checks. |
| ACC-GF-02 | Define API contract for status + action bridge | P0 | Quick Win | Dev | Not Started | Endpoint contracts for `GET /pp/v1/acc-workflow-status` and `POST /pp/v1/acc-workflow-action` are documented with request/response examples and error codes. |
| ACC-GF-03 | WordPress status endpoint hardening in WPCodeBox | P0 | Medium | Dev | In Progress | `acc-workflow-status` returns authoritative workflow/disposition status for entry IDs and handles missing/invalid IDs safely. |
| ACC-GF-04 | WordPress action endpoint in WPCodeBox (`approve`/`reject` + note) | P0 | Medium | Dev | Not Started | Endpoint executes Gravity Flow action for current step, stores note, and returns updated status payload; unsupported states return explicit 4xx. |
| ACC-GF-05 | WordPress endpoint permission hardening (allow-list roles/users) | P0 | Medium | Dev + Bill | Not Started | Authenticated requests are required; non-authorized users receive 403; authorized users can execute actions. |
| ACC-GF-06 | Next.js bridge route `POST /api/gf-workflow-action` | P0 | Medium | Dev | Not Started | Server route validates payload, forwards to WP endpoint, normalizes success/error response, and never exposes WP credentials to client. |
| ACC-GF-07 | Chair-only action controls in ACC queue modal | P0 | Medium | Dev | Not Started | Approve/Reject buttons + note input render only for chair; non-chair users see read-only workflow details. |
| ACC-GF-08 | Action confirmation, optimistic UX, and refresh | P1 | Quick Win | Dev | Not Started | Confirm prompt shown before action; success/error messages are clear; row/modal reflects updated status after action. |
| ACC-GF-09 | Audit logging for workflow actions | P1 | Medium | Dev | Not Started | Each action attempt logs actor, entry ID, action, note hash/length, timestamp, and result (success/failure). |
| ACC-GF-10 | Error handling and fallback behavior | P1 | Quick Win | Dev | Not Started | Invalid step, already-completed workflow, or WP/API errors surface actionable UI messages without breaking queue load. |
| ACC-GF-11 | Feature flag + rollback controls | P1 | Quick Win | Dev | Not Started | Workflow action UI/API are gated behind `ACC_WORKFLOW_ACTIONS_ENABLED`; disabling flag immediately returns queue to read-only mode. |
| ACC-GF-12 | UAT + rollout checklist execution | P0 | Medium | Dev + Bill + ACC Chair | Not Started | Chair/non-chair scenarios pass in staging; at least one real pending request approved/rejected successfully; rollback steps validated. |

## API Contract Draft

### 1) Status Endpoint (WordPress)

- Method: `GET`
- URL: `/wp-json/pp/v1/acc-workflow-status?entry_ids=3178,3177`
- Auth: WordPress Application Password (Basic)
- Response (summary):
  - per entry: `ok`, `acc_disposition`, `workflow_status`, `resolved_status`

### 2) Action Endpoint (WordPress)

- Method: `POST`
- URL: `/wp-json/pp/v1/acc-workflow-action`
- Auth: WordPress Application Password (Basic)
- Request body:
  - `entry_id` (number)
  - `action` (`approve` | `reject`)
  - `note` (string, optional but recommended)
  - `requested_by` (string; Next.js actor ID/email for audit)
- Response (summary):
  - `ok`, `entry_id`, `workflow_status`, `resolved_status`, `action_applied`, `message`

## Security Notes

- Never call WordPress workflow action endpoint directly from browser client code.
- Only call through Next.js server route.
- Enforce authorization in two places:
  - UI (hide controls for non-chair)
  - WordPress endpoint permission callback (hard enforcement)

## Rollout Sequence

1. Finalize and enable WPCodeBox action endpoint in staging.
2. Verify status/action endpoints with curl.
3. Implement Next.js bridge route and chair-only UI controls.
4. Run UAT scenarios (approve/reject/note/permission failure).
5. Enable feature flag in production.

## Rollback Sequence

1. Set `ACC_WORKFLOW_ACTIONS_ENABLED=false` in app env.
2. Redeploy Next.js (UI/API become read-only).
3. Disable WPCodeBox action snippet if needed.

## Dependencies

- WordPress: Gravity Forms + Gravity Flow active
- WordPress custom endpoints: `pp/v1/acc-workflow-status`, `pp/v1/acc-workflow-action`
- Next.js env vars:
  - `WORDPRESS_API_URL`
  - `WORDPRESS_USERNAME`
  - `WORDPRESS_APP_PASSWORD`
  - `ACC_WORKFLOW_ACTIONS_ENABLED`
