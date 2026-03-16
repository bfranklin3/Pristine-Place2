# Resident 360 Identity and Data Linking Spec

Version: 1.0  
Last updated: March 4, 2026

## Purpose

Define the canonical model and migration/linking rules to relate users, addresses, ACC requests, and access-control records in the new platform.

This spec resolves a known source-system gap: WordPress stores these data domains separately and does not provide reliable relational links between them.

## Problem Statement

- WordPress user records do not reliably maintain household address.
- ACC and Access Control records both rely on address and person-name strings.
- Source tables are separate and often unlinked (`users`, `acc permits`, `access control`).
- Reports currently do not consistently distinguish current vs past residents.

## Canonical Data Model

### 1) `households` (property-centric anchor)

Required fields:
- `id` (UUID)
- `address_raw` (as imported)
- `address_canonical` (normalized canonical string)
- `address_key` (stable hash/key for joins)
- `lot_number` (nullable)
- `created_at`, `updated_at`

### 2) `users` (portal identity)

Required fields:
- `id` (Clerk user id)
- `email`
- `first_name`, `last_name`
- `portal_status` (approved/pending/etc.)
- `created_at`, `updated_at`

### 3) `residencies` (time-bound relationship between user and household)

Required fields:
- `id` (UUID)
- `user_id` (nullable for historical/unresolved records)
- `household_id`
- `resident_type` (`owner` | `tenant` | `authorized_occupant` | `unknown`)
- `start_date` (nullable)
- `end_date` (nullable)
- `is_current` (derived or maintained)
- `source_system`, `source_record_id`
- `created_at`, `updated_at`

### 4) `acc_requests`

Required linking fields:
- `id`
- `household_id` (nullable during staging, required after linkage pass)
- `residency_id` (nullable)
- `user_id` (nullable shortcut for app queries)
- `applicant_name_raw`
- `address_raw`, `address_canonical`, `address_key`
- existing ACC workflow/status fields

### 5) `access_control_records` (gate codes/devices)

Required linking fields:
- `id`
- `household_id` (nullable during staging, required after linkage pass)
- `residency_id` (nullable)
- `user_id` (nullable shortcut for app queries)
- `resident_name_raw`
- `address_raw`, `address_canonical`, `address_key`
- gate credential fields/status fields

## Address Canonicalization Standard

Canonicalization must run identically for Users, ACC, and Access imports.

Rules:
1. Uppercase all text.
2. Trim and collapse whitespace.
3. Normalize punctuation (remove commas/periods where non-semantic).
4. Normalize street suffixes (`STREET -> ST`, `AVENUE -> AVE`, etc.).
5. Normalize directional prefixes/suffixes (`NORTH -> N`, etc.).
6. Preserve unit data separately when present (`unit`, `apt`, `suite`).
7. Generate:
   - `address_canonical` (human-readable normalized string)
   - `address_key` (deterministic hash of canonical address components)

## Linking Rules

## Primary join path
1. Match by `address_key` to `households`.
2. Within household, match person to active residency/user using:
   - normalized name similarity
   - known email/phone (if available)
   - date overlap with record event date (ACC submit date, gate assignment date)

## Confidence tiers
- `high`: exact address_key + strong person/date match
- `medium`: exact address_key + partial person match
- `low`: address match only, ambiguous person
- `unresolved`: no acceptable household/person match

Persist per linked row:
- `match_confidence`
- `match_method`
- `matched_by` (`system` | `admin`)
- `matched_at`
- `match_notes` (optional)

## Current vs Past Resident Logic

`is_current` is determined from residency dates:
- current: `end_date IS NULL` (or future)
- past: `end_date < NOW()`
- unknown: no linked residency

Reporting rules:
- ACC Queue and Access Control pages must include resident-state badge:
  - `Current`
  - `Past`
  - `Unknown`
- Default filter: `Current + Unknown`
- Optional toggle: include `Past`

Resident 360 rules:
- Show current household context first.
- Preserve full historical records (ACC/access) regardless of current state.
- Clearly label historical entries as past residency context.

## Migration Sequencing (Required Order)

1. Build canonical address normalization + `households`.
2. Import/migrate users to Clerk-backed app users.
3. Create `residencies` (current and known historical spans).
4. Import ACC requests with address normalization fields.
5. Import Access Control records with address normalization fields.
6. Run linking job (household + residency/user).
7. Route unresolved/ambiguous rows to manual review queue.
8. Backfill links and rerun derived reporting.

## Manual Review Queue Requirements

Unresolved rows must surface in a review UI with:
- source domain (`acc` | `access`)
- source record id
- raw and canonical address
- candidate households
- candidate residents (current/past)
- confidence reason
- one-click assign + audit note

## Audit and Traceability

Any manual link/unlink/relink must record:
- actor
- timestamp
- previous linkage
- new linkage
- reason/note

No hard-delete of source-import records used for governance/history.

## Acceptance Criteria

1. Every ACC/access row has one of: linked household, unresolved reason.
2. Resident 360 can show user + household + ACC + access in one view.
3. ACC/Access reports expose Current/Past/Unknown resident state.
4. Historical records remain visible and attributed to past residencies.
5. Link decisions are auditable and exportable.

## Related Implementation Note

- [Resident 360 Native ACC Cutover Note](/Volumes/Data%20SSD/%20Software%20Development/Vercel-Next-JS/Pristine-Place-HOA/docs/resident-360-native-acc-cutover-note.md)
