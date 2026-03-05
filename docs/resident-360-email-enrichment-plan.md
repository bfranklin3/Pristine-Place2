# Resident 360 Email Enrichment Plan (Future)

## Goal
Add reliable email visibility to Resident 360 by enriching resident/profile data from trusted sources.

## Source Priority
1. Portal User Management (Clerk/portal account email) as highest-trust source for current residents.
2. ACC Permit Requests as secondary/historical source.

## Merge Policy
- Do not overwrite high-trust current email with lower-trust ACC email.
- Use ACC email to fill gaps or store as alternate/candidate email.
- Track source + confidence for each applied email value.

## Data Model Direction
- Store resolved/normalized email in the shared household/residency/profile model used by Access + Resident 360.
- Keep source attribution so conflicts remain auditable.

## Rollout (Later)
1. Define exact linking rules and precedence logic.
2. Run dry-run backfill report to identify conflicts.
3. Execute backfill migration.
4. Perform manual cleanup for low-confidence/conflict rows.
5. Enable Resident 360 display of primary + optional alternate email(s).
