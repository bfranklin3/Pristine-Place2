# WordPress -> Clerk Migration Plan (Password Reset First Login)

## Decision
- Use Clerk email-based account import/create only.
- Do not migrate WordPress password hashes.
- Require users to set a new password on first login via reset flow.
- Remove and keep removed all WordPress password bridge code paths.

## Implementation Plan
1. Import/create users in Clerk by email (no password digest migration).
2. Mark imported users with `public_metadata.migrationPasswordResetRequired = true`.
3. Send each user a Clerk password-reset email that points to `/welcome-set-password`, a welcome page that uses the same reset flow as "Forgot password."
4. User sets a new Clerk password.
5. Optionally clear `migrationPasswordResetRequired` after first successful sign-in/password set for clean tracking.
6. Keep WordPress bridge endpoint and Next.js bridge route/page disabled/removed.

## Resident Experience
1. Resident opens `/welcome-set-password` (password reset entry point).
2. Resident enters email and requests reset.
3. Resident receives email, creates a new password.
4. Resident signs in normally afterward.

## Why This Approach
- No WordPress bridge secrets to manage.
- No cross-system password verification endpoint.
- Lower security/operations overhead.
- Simpler support workflow for residents and admins.

## Operations Notes
- Keep a report/list of users with `migrationPasswordResetRequired = true` for follow-up reminders.
- After rollout, remove any temporary migration UI copy that is no longer needed.

## Current Status (2026-03-09)
- Full WordPress export import was started from `/Users/billfranklin/Downloads/My WP User Export.xls`.
- Dry run with bridge-compatible import flag succeeded:
  - `selectedRows: 726`, `created: 725`, `skippedExisting: 1`, `skippedInvalid: 0`, `errors: 0`.
- Execute run partially completed, then stopped:
  - `selectedRows: 726`, `created: 95`, `errors: 631`.
- Primary stop reason: Clerk **Development instance** hard cap of **100 users** (`user_quota_exceeded`).
- Secondary issue on some rows: source formatting/validation errors (username/name cleanup needed).

## Resume Checklist
1. Move auth to a Clerk **Production instance** (or otherwise increase user quota) before resuming bulk import.
2. Re-run the import from the same file after production instance is ready.
3. Apply username/name sanitization improvements in the migration script before the next full execute run.
4. Use the same password-reset-first flow:
   - keep `migrationPasswordResetRequired` set for imported users.
   - direct residents to `/welcome-set-password` for first-time password setup.
