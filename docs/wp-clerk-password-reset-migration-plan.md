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
