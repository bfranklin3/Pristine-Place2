import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"

type Row = Record<string, unknown>

const prisma = new PrismaClient()

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const next = String(value).trim()
  return next.length ? next : null
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function stableId(prefix: string, input: string): string {
  const hash = crypto.createHash("sha1").update(input).digest("hex").slice(0, 16)
  return `${prefix}-${hash}`
}

function pickAddress(row: Row): { addressFull: string | null; addressNumber: string | null; streetName: string | null } {
  const full =
    asString(row["Address & Street"]) ||
    [asString(row["Address"]), asString(row["Street"])].filter(Boolean).join(" ").trim() ||
    null

  if (!full) return { addressFull: null, addressNumber: null, streetName: null }

  const normalized = normalizeSpace(full)
  const match = normalized.match(/^(\d+)\s+(.*)$/)
  if (!match) return { addressFull: normalized, addressNumber: null, streetName: null }

  return {
    addressFull: normalized,
    addressNumber: match[1] || null,
    streetName: match[2] || null,
  }
}

function credentialRows(row: Row) {
  const values: Array<{ label: string; value: string }> = []
  const a = asString(row["DIR_A"])
  const b = asString(row["DIR_B"])
  const c = asString(row["DIR_C"])
  if (a) values.push({ label: "A", value: a })
  if (b) values.push({ label: "B", value: b })
  if (c) values.push({ label: "C", value: c })
  return values
}

async function main() {
  const fileArg = getArg("--file")
  const limitArg = getArg("--limit")
  const dryRun = hasFlag("--dry-run")

  if (!fileArg) {
    throw new Error("Missing --file. Example: npm run import:access:xlsx -- --file '/path/to/file.xlsx' --dry-run")
  }

  const filePath = path.resolve(fileArg)
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error("Workbook has no sheets")
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error("Unable to load first worksheet")

  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" })
  const limit = limitArg ? Math.max(1, Number.parseInt(limitArg, 10) || rows.length) : rows.length
  const selected = rows.slice(0, limit)

  let residentsUpserted = 0
  let membersUpserted = 0
  let credentialsUpserted = 0
  let auditsCreated = 0
  let skippedEmptyRow = 0
  let companyRowsIncluded = 0

  for (const row of selected) {
    const parsedAddress = pickAddress(row)

    const primaryFirst = asString(row["First Name - Resident A"])
    const primaryLast = asString(row["Last Name A or Company Name"])
    const primaryPhone = asString(row["Phone_A"])
    const secondaryFirst = asString(row["First Name - Resident B"])
    const secondaryPhone = asString(row["Phone_B"])
    const secondaryEmail = asString(row["Email_B"])
    const tertiaryPhone = asString(row["Phone_C"])
    const phase = asString(row["Phase"])
    const residentCategory = asString(row["Resident Category"])
    const comments = asString(row["Comments"])
    const entryCode = asString(row["ENT"])

    // Company/vendor rows often have no address. Keep them by giving a synthetic searchable address label.
    let addressFull = parsedAddress.addressFull
    let addressNumber = parsedAddress.addressNumber
    let streetName = parsedAddress.streetName
    if (!addressFull) {
      const fallbackName =
        normalizeSpace(
          [primaryFirst, primaryLast]
            .filter(Boolean)
            .join(" "),
        ) || null
      if (!fallbackName) {
        skippedEmptyRow += 1
        continue
      }
      addressFull = `Company: ${fallbackName}`
      addressNumber = null
      streetName = null
      companyRowsIncluded += 1
    }

    const residentKey = normalizeSpace(`${addressFull}|${primaryFirst || ""}|${primaryLast || ""}`)
    const residentId = stableId("rp", residentKey.toLowerCase())

    if (!dryRun) {
      await prisma.residentProfile.upsert({
        where: { id: residentId },
        create: {
          id: residentId,
          residentCategory,
          phase,
          addressNumber,
          streetName,
          addressFull,
          entryCode,
          comments,
        },
        update: {
          residentCategory,
          phase,
          addressNumber,
          streetName,
          addressFull,
          entryCode,
          comments,
        },
      })
    }
    residentsUpserted += 1

    const memberCandidates = [
      {
        role: "primary" as const,
        firstName: primaryFirst,
        lastName: primaryLast,
        phone: primaryPhone,
        email: null,
        isPrimaryContact: true,
      },
      {
        role: "secondary" as const,
        firstName: secondaryFirst,
        lastName: primaryLast,
        phone: secondaryPhone,
        email: secondaryEmail,
        isPrimaryContact: false,
      },
      {
        role: "tertiary" as const,
        firstName: null,
        lastName: null,
        phone: tertiaryPhone,
        email: null,
        isPrimaryContact: false,
      },
    ].filter((m) => m.firstName || m.lastName || m.phone || m.email)

    for (const member of memberCandidates) {
      const memberKey = normalizeSpace(
        `${residentId}|${member.role}|${member.firstName || ""}|${member.lastName || ""}|${member.phone || ""}|${member.email || ""}`,
      )
      const memberId = stableId("hm", memberKey.toLowerCase())

      if (!dryRun) {
        await prisma.householdMember.upsert({
          where: { id: memberId },
          create: {
            id: memberId,
            residentProfileId: residentId,
            role: member.role,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email,
            isPrimaryContact: member.isPrimaryContact,
          },
          update: {
            residentProfileId: residentId,
            role: member.role,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email,
            isPrimaryContact: member.isPrimaryContact,
          },
        })
      }
      membersUpserted += 1
    }

    for (const credential of credentialRows(row)) {
      const credKey = normalizeSpace(`${residentId}|directory_code|${credential.label}|${credential.value}`)
      const credentialId = stableId("cred", credKey.toLowerCase())

      if (!dryRun) {
        await prisma.gateCredential.upsert({
          where: { id: credentialId },
          create: {
            id: credentialId,
            residentProfileId: residentId,
            credentialType: "directory_code",
            credentialLabel: credential.label,
            credentialValue: credential.value,
            status: "active",
          },
          update: {
            residentProfileId: residentId,
            credentialType: "directory_code",
            credentialLabel: credential.label,
            credentialValue: credential.value,
            status: "active",
          },
        })
      }
      credentialsUpserted += 1
    }

    if (!dryRun) {
      await prisma.accessAuditLog.create({
        data: {
          residentProfileId: residentId,
          actorUserId: null,
          entityType: "resident_profile",
          entityId: residentId,
          action: "import",
          reason: "Initial XLSX import",
          afterJson: {
            source: path.basename(filePath),
            phase,
            residentCategory,
            addressFull,
          },
        },
      })
    }
    auditsCreated += 1
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        sourceFile: filePath,
        rowsRead: rows.length,
        rowsProcessed: selected.length,
        skippedEmptyRow,
        companyRowsIncluded,
        residentsUpserted,
        membersUpserted,
        credentialsUpserted,
        auditsCreated,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
