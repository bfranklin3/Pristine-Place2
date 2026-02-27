# WordPress-Backed Management Page Pattern

This documents the temporary bridge pattern used for:

- `/resident-portal/management/wp-access` (WordPress-backed)
- while keeping `/resident-portal/management/access` on Neon/Prisma

## Overview

1. Keep a dedicated Next.js page for WordPress data.
2. Use a server API proxy route in Next.js to call WordPress securely.
3. Keep credentials in env vars only.
4. Normalize WordPress payloads in one place (UI adapter layer).
5. For editing, proxy single-entry updates through a separate route.

## Current routes

- List/read proxy: `app/api/wp-access-report/route.ts`
- Single-entry update proxy: `app/api/wp-access-report/[entryId]/route.ts`

## Environment variables

Required:

- `WORDPRESS_API_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`
- `WORDPRESS_ACCESS_REPORT_URL`

Current working source:

- `WORDPRESS_ACCESS_REPORT_URL="https://www.pristineplace.us/wp-json/gf/v2/forms/66/entries"`

## Gravity Forms field mapping (form 66)

- `3`: Last Name A or Company Name
- `7`: First Name - Resident A
- `8`: Phone_A
- `10`: First Name - Resident B
- `11`: Last Name - Resident B
- `30`: Phone_B
- `40`: Phone_C
- `39`: Resident Category
- `17`: Comments
- `1`: Phase
- `37`: Address number
- `38`: Street name
- `35`: ENT (Gate Code)
- `29`: DIR_A
- `33`: DIR_B
- `32`: DIR_C
- `23.1`: Include in directory (Yes/blank)
- `25.1`: Confidential phone (Yes/blank)

## UI component

- `components/portal/wp-access-management-table.tsx`
- Supports:
  - read from `/api/wp-access-report`
  - edit/save via `/api/wp-access-report/:entryId`
  - error diagnostics (`status`, `detail`, `upstream`)
  - last refreshed timestamp

## Reuse for other WordPress-backed pages

1. Create a page-specific proxy route in `app/api/...` (read + update as needed).
2. Keep WordPress endpoint URL in an env var.
3. Add a dedicated table component (do not reuse Neon hooks).
4. Add explicit temporary-mode note in page UI.
5. Add payload field mapping in this docs folder.

