import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import XLSX from "xlsx"

type WpExportRow = {
  user_email?: string
  first_name?: string
  last_name?: string
  user_login?: string
  user_pass?: string
  role?: string
}

type PasswordMapping =
  | { ok: true; hasher: "phpass" | "bcrypt"; digest: string }
  | { ok: false; reason: string; wpWrapped?: boolean }

type RoleMapping = {
  portalAdmin: boolean
  committees: string[]
  committeeChairs: string[]
}

type ClerkUser = {
  id: string
  email_addresses?: Array<{ email_address?: string }>
  emailAddresses?: Array<{ emailAddress?: string }>
}

type ActionResult = {
  email: string
  status: "create" | "skip_existing" | "skip_invalid" | "error"
  reason?: string
  role?: string
  clerkUserId?: string
}

const CLERK_API_BASE = "https://api.clerk.com/v1"
const MIGRATION_BY = "wp-user-migration-script"

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i < 0) return undefined
  return process.argv[i + 1]
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function toStr(value: unknown) {
  return String(value ?? "").trim()
}

function parseOnlyEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeUsername(input: string): string | undefined {
  const next = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32)
  return next || undefined
}

function makeTemporaryPassword() {
  const token = crypto.randomBytes(18).toString("base64url")
  return `Tmp!${token}9aA`
}

function mapWpRole(roleRaw: string): RoleMapping {
  const role = roleRaw.toLowerCase()
  if (role === "administrator") {
    return { portalAdmin: true, committees: ["board_of_directors"], committeeChairs: [] }
  }
  if (role === "suremember-acc-chair") {
    return { portalAdmin: false, committees: ["acc"], committeeChairs: ["acc"] }
  }
  if (role === "suremember-access-control") {
    return { portalAdmin: false, committees: ["access_control"], committeeChairs: [] }
  }
  if (role === "suremember-hoa-director") {
    return { portalAdmin: false, committees: ["board_of_directors"], committeeChairs: [] }
  }
  return { portalAdmin: false, committees: [], committeeChairs: [] }
}

function mapPasswordDigest(wpHashRaw: string): PasswordMapping {
  const wpHash = wpHashRaw.trim()
  if (!wpHash) return { ok: false, reason: "Missing user_pass hash." }

  // WP 6.8+ style hashes use "$wp$" prefix and are WordPress-specific wrappers.
  // They are not directly compatible with Clerk bcrypt digest verification.
  // Use the first-login bridge or force password reset for these users.
  if (/^\$wp\$\$?2[aby]\$/i.test(wpHash) || /^\$wp\$2[aby]\$/i.test(wpHash)) {
    return {
      ok: false,
      reason:
        "Unsupported WordPress hash format ($wp$...). Use the WP first-login bridge (wp_check_password) or password reset.",
      wpWrapped: true,
    }
  }
  if (/^\$2[aby]\$/i.test(wpHash)) {
    return { ok: true, hasher: "bcrypt", digest: wpHash }
  }
  if (wpHash.startsWith("$P$") || wpHash.startsWith("$H$")) {
    return { ok: true, hasher: "phpass", digest: wpHash }
  }

  return { ok: false, reason: `Unsupported WP password hash format: ${wpHash.slice(0, 12)}...` }
}

async function clerkFetch<T>(secretKey: string, endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CLERK_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clerk API ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as T
}

async function findClerkUserByEmail(secretKey: string, email: string): Promise<ClerkUser | null> {
  const encoded = encodeURIComponent(email)
  const result = await clerkFetch<unknown>(secretKey, `/users?email_address[]=${encoded}&limit=1`)

  // Clerk list shape may vary by SDK/API version.
  const rows = Array.isArray(result)
    ? result
    : Array.isArray((result as { data?: unknown[] }).data)
      ? (result as { data: unknown[] }).data
      : []

  const normalized = email.toLowerCase()
  const matched = rows.find((row) => {
    const user = row as ClerkUser
    const emails = [
      ...(user.email_addresses || []).map((e) => String(e.email_address || "").toLowerCase()),
      ...(user.emailAddresses || []).map((e) => String(e.emailAddress || "").toLowerCase()),
    ].filter(Boolean)
    return emails.includes(normalized)
  }) as ClerkUser | undefined

  return matched || null
}

async function createClerkUserFromWpRow(secretKey: string, row: WpExportRow, allowWpBridgeCreate = false) {
  const email = toStr(row.user_email).toLowerCase()
  const firstName = toStr(row.first_name)
  const lastName = toStr(row.last_name)
  const userLogin = toStr(row.user_login)
  const role = toStr(row.role)
  const roleMapping = mapWpRole(role)
  const password = mapPasswordDigest(toStr(row.user_pass))

  if (!isValidEmail(email)) {
    return { status: "skip_invalid", reason: `Invalid email: ${email}` } as const
  }
  const isWpWrapped = !password.ok && password.wpWrapped
  if (!password.ok && !(allowWpBridgeCreate && isWpWrapped)) {
    return { status: "skip_invalid", reason: password.reason } as const
  }

  const existing = await findClerkUserByEmail(secretKey, email)
  if (existing) {
    return { status: "skip_existing", reason: "User already exists in Clerk.", clerkUserId: existing.id } as const
  }

  const nowIso = new Date().toISOString()
  const username = normalizeUsername(userLogin)
  const payload: Record<string, unknown> = {
    email_address: [email],
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    username,
    public_metadata: {
      portalApproved: true,
      portalRegistrationSubmitted: true,
      portalAdmin: roleMapping.portalAdmin,
      committees: roleMapping.committees,
      committeeChairs: roleMapping.committeeChairs,
      committeesUpdatedAt: nowIso,
      committeesUpdatedBy: MIGRATION_BY,
      portalRegistrationReviewedAt: nowIso,
      portalRegistrationReviewedBy: MIGRATION_BY,
      wpPasswordMigrationRequired: isWpWrapped ? true : undefined,
    },
    unsafe_metadata: {
      portalRegistration: {
        firstName: firstName,
        lastName: lastName,
        username: userLogin,
        emailAddress: email,
        submittedAt: nowIso,
        status: "approved",
        approvedAt: nowIso,
        approvedBy: MIGRATION_BY,
      },
      wpMigration: {
        sourceRole: role,
        sourceUserLogin: userLogin,
        migratedAt: nowIso,
        hashType: isWpWrapped ? "wp-wrapped-bcrypt" : "direct-import",
      },
    },
  }

  if (password.ok) {
    payload.password_digest = password.digest
    payload.password_hasher = password.hasher
    payload.skip_password_checks = true
  } else if (isWpWrapped) {
    payload.password = makeTemporaryPassword()
  }

  const created = await clerkFetch<{ id: string }>(secretKey, "/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return { status: "create", clerkUserId: created.id } as const
}

async function main() {
  const fileArg = getArg("--file")
  const limitArg = getArg("--limit")
  const onlyEmails = parseOnlyEmails(getArg("--only-emails"))
  const execute = hasFlag("--execute")
  const allowWpBridgeCreate = hasFlag("--allow-wp-bridge-create")
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!fileArg) {
    throw new Error(
      "Missing --file. Example: npx tsx scripts/migrate-wp-users-to-clerk.ts --file '/path/My WP User Export.xls' --execute",
    )
  }
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY in environment.")
  }

  const filePath = path.resolve(fileArg)
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("Workbook contains no sheets.")

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error("Unable to read first worksheet.")

  const rows = XLSX.utils.sheet_to_json<WpExportRow>(sheet, { defval: "" })
  const limit = limitArg ? Math.max(1, Number.parseInt(limitArg, 10) || rows.length) : rows.length
  const selected = rows
    .slice(0, limit)
    .filter((row) => (onlyEmails.size ? onlyEmails.has(toStr(row.user_email).toLowerCase()) : true))

  const results: ActionResult[] = []

  for (const row of selected) {
    const email = toStr(row.user_email).toLowerCase()
    const role = toStr(row.role)
    try {
      if (!execute) {
        const password = mapPasswordDigest(toStr(row.user_pass))
        if (!isValidEmail(email)) {
          results.push({ email, role, status: "skip_invalid", reason: "Invalid email format." })
          continue
        }
        const isWpWrapped = !password.ok && password.wpWrapped
        if (!password.ok && !(allowWpBridgeCreate && isWpWrapped)) {
          results.push({ email, role, status: "skip_invalid", reason: password.reason })
          continue
        }
        const existing = await findClerkUserByEmail(secretKey, email)
        if (existing) {
          results.push({
            email,
            role,
            status: "skip_existing",
            clerkUserId: existing.id,
            reason: "User already exists in Clerk.",
          })
          continue
        }
        results.push({ email, role, status: "create", reason: "Dry run: would create user." })
        continue
      }

      const created = await createClerkUserFromWpRow(secretKey, row, allowWpBridgeCreate)
      results.push({
        email,
        role,
        status: created.status,
        reason: created.reason,
        clerkUserId: created.clerkUserId,
      })
    } catch (error) {
      results.push({
        email,
        role,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const summary = {
    mode: execute ? "execute" : "dry-run",
    filePath,
    selectedRows: selected.length,
    created: results.filter((r) => r.status === "create").length,
    skippedExisting: results.filter((r) => r.status === "skip_existing").length,
    skippedInvalid: results.filter((r) => r.status === "skip_invalid").length,
    errors: results.filter((r) => r.status === "error").length,
  }

  console.log(JSON.stringify({ summary, results }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
