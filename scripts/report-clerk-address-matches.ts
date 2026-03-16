import "dotenv/config"
import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { canonicalizeAddressParts } from "../lib/address-normalization"

const prisma = new PrismaClient()
const CLERK_API_BASE = "https://api.clerk.com/v1"

type ClerkUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  firstName?: string | null
  lastName?: string | null
  primary_email_address_id?: string | null
  primaryEmailAddressId?: string | null
  email_addresses?: Array<{ id?: string; email_address?: string | null }>
  emailAddresses?: Array<{ id?: string; emailAddress?: string | null }>
  public_metadata?: Record<string, unknown>
  publicMetadata?: Record<string, unknown>
  unsafe_metadata?: Record<string, unknown>
  unsafeMetadata?: Record<string, unknown>
}

type ReportRow = {
  clerkUserId: string
  fullName: string
  emailAddress: string
  status: string
  homeAddress: string
  homeAddressCanonical: string | null
  matchCategory:
    | "missing_home_address"
    | "invalid_home_address"
    | "clean_household_and_profile"
    | "clean_household_only"
    | "clean_profile_only"
    | "ambiguous_household"
    | "ambiguous_profile"
    | "conflicting_profile_household"
    | "no_match"
  householdMatches: Array<{
    householdId: string
    addressCanonical: string
    addressRaw: string | null
  }>
  profileMatches: Array<{
    residentProfileId: string
    addressFull: string | null
    householdId: string | null
    residencyId: string | null
    primaryUserId: string | null
  }>
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function getPrimaryEmail(user: ClerkUser) {
  const primaryId = user.primary_email_address_id || user.primaryEmailAddressId || ""
  const emailAddresses = [
    ...(user.email_addresses || []),
    ...(user.emailAddresses || []).map((row) => ({
      id: row.id,
      email_address: row.emailAddress,
    })),
  ]
  return (
    emailAddresses.find((row) => row.id === primaryId)?.email_address ||
    emailAddresses.find((row) => row.email_address)?.email_address ||
    ""
  )
}

function getRegistration(user: ClerkUser) {
  return ((user.unsafe_metadata || user.unsafeMetadata || {}).portalRegistration || {}) as Record<string, unknown>
}

function getPublicMetadata(user: ClerkUser) {
  return (user.public_metadata || user.publicMetadata || {}) as Record<string, unknown>
}

function getStatus(user: ClerkUser) {
  const registration = getRegistration(user)
  const publicMetadata = getPublicMetadata(user)
  const registrationStatus = String(registration.status || "").toLowerCase()
  if (registrationStatus === "approved" || publicMetadata.portalApproved === true) return "approved"
  if (registrationStatus === "rejected") return "rejected"
  if (registrationStatus === "pending" || publicMetadata.portalRegistrationSubmitted === true) return "pending"
  return "not_submitted"
}

function getHomeAddress(user: ClerkUser) {
  const registration = getRegistration(user)
  return String(registration.homeAddress || "").trim()
}

function canonicalizeHomeAddress(raw: string) {
  const canonical = canonicalizeAddressParts(raw).canonical
  return canonical || null
}

async function clerkFetch<T>(secretKey: string, endpoint: string): Promise<T> {
  const res = await fetch(`${CLERK_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clerk API ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as T
}

async function fetchAllClerkUsers(secretKey: string) {
  const users: ClerkUser[] = []
  const limit = 100
  let offset = 0

  while (true) {
    const result = await clerkFetch<unknown>(secretKey, `/users?limit=${limit}&offset=${offset}`)
    const rows = Array.isArray(result)
      ? (result as ClerkUser[])
      : Array.isArray((result as { data?: unknown[] }).data)
        ? ((result as { data: unknown[] }).data as ClerkUser[])
        : []

    users.push(...rows)
    if (rows.length < limit) break
    offset += limit
    if (offset >= 5000) break
  }

  return users
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY in environment.")

  const asJson = hasFlag("--json")
  const clerkUsers = await fetchAllClerkUsers(secretKey)
  const households = await prisma.household.findMany({
    select: {
      id: true,
      addressCanonical: true,
      addressRaw: true,
    },
  })
  const residentProfiles = await prisma.residentProfile.findMany({
    select: {
      id: true,
      addressFull: true,
      addressNumber: true,
      streetName: true,
      householdId: true,
      residencyId: true,
      primaryUserId: true,
    },
  })

  const householdsByCanonical = new Map<string, Array<(typeof households)[number]>>()
  for (const household of households) {
    const list = householdsByCanonical.get(household.addressCanonical) || []
    list.push(household)
    householdsByCanonical.set(household.addressCanonical, list)
  }

  const profilesWithCanonical = residentProfiles.map((profile) => {
    const rawAddress = profile.addressFull || `${profile.addressNumber || ""} ${profile.streetName || ""}`.trim()
    return {
      ...profile,
      derivedAddressCanonical: canonicalizeAddressParts(rawAddress).canonical || null,
    }
  })

  const profilesByCanonical = new Map<string, Array<(typeof profilesWithCanonical)[number]>>()
  for (const profile of profilesWithCanonical) {
    if (!profile.derivedAddressCanonical) continue
    const list = profilesByCanonical.get(profile.derivedAddressCanonical) || []
    list.push(profile)
    profilesByCanonical.set(profile.derivedAddressCanonical, list)
  }

  const rows: ReportRow[] = clerkUsers.map((user) => {
    const fullName =
      [user.first_name || user.firstName || "", user.last_name || user.lastName || ""].filter(Boolean).join(" ").trim() ||
      "—"
    const emailAddress = getPrimaryEmail(user)
    const status = getStatus(user)
    const homeAddress = getHomeAddress(user)
    const homeAddressCanonical = canonicalizeHomeAddress(homeAddress)

    if (!homeAddress) {
      return {
        clerkUserId: user.id,
        fullName,
        emailAddress,
        status,
        homeAddress,
        homeAddressCanonical: null,
        matchCategory: "missing_home_address",
        householdMatches: [],
        profileMatches: [],
      }
    }

    if (!homeAddressCanonical) {
      return {
        clerkUserId: user.id,
        fullName,
        emailAddress,
        status,
        homeAddress,
        homeAddressCanonical: null,
        matchCategory: "invalid_home_address",
        householdMatches: [],
        profileMatches: [],
      }
    }

    const householdMatches = (householdsByCanonical.get(homeAddressCanonical) || []).map((row) => ({
      householdId: row.id,
      addressCanonical: row.addressCanonical,
      addressRaw: row.addressRaw,
    }))
    const profileMatches = (profilesByCanonical.get(homeAddressCanonical) || []).map((row) => ({
      residentProfileId: row.id,
      addressFull: row.addressFull,
      householdId: row.householdId,
      residencyId: row.residencyId,
      primaryUserId: row.primaryUserId,
    }))

    let matchCategory: ReportRow["matchCategory"] = "no_match"

    if (householdMatches.length > 1) {
      matchCategory = "ambiguous_household"
    } else if (profileMatches.length > 1) {
      matchCategory = "ambiguous_profile"
    } else if (householdMatches.length === 1 && profileMatches.length === 1) {
      matchCategory =
        profileMatches[0].householdId === householdMatches[0].householdId
          ? "clean_household_and_profile"
          : "conflicting_profile_household"
    } else if (householdMatches.length === 1) {
      matchCategory = "clean_household_only"
    } else if (profileMatches.length === 1) {
      matchCategory = "clean_profile_only"
    }

    return {
      clerkUserId: user.id,
      fullName,
      emailAddress,
      status,
      homeAddress,
      homeAddressCanonical,
      matchCategory,
      householdMatches,
      profileMatches,
    }
  })

  const summary = {
    totalClerkUsers: rows.length,
    missingHomeAddress: rows.filter((row) => row.matchCategory === "missing_home_address").length,
    invalidHomeAddress: rows.filter((row) => row.matchCategory === "invalid_home_address").length,
    cleanHouseholdAndProfile: rows.filter((row) => row.matchCategory === "clean_household_and_profile").length,
    cleanHouseholdOnly: rows.filter((row) => row.matchCategory === "clean_household_only").length,
    cleanProfileOnly: rows.filter((row) => row.matchCategory === "clean_profile_only").length,
    ambiguousHousehold: rows.filter((row) => row.matchCategory === "ambiguous_household").length,
    ambiguousProfile: rows.filter((row) => row.matchCategory === "ambiguous_profile").length,
    conflictingProfileHousehold: rows.filter((row) => row.matchCategory === "conflicting_profile_household").length,
    noMatch: rows.filter((row) => row.matchCategory === "no_match").length,
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    rows,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  await fs.mkdir(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `clerk-address-matches-${Date.now()}.json`)
  await fs.writeFile(reportPath, JSON.stringify(payload, null, 2))

  if (asJson) {
    console.log(JSON.stringify({ reportPath, ...payload }, null, 2))
  } else {
    console.log(`Report written to ${reportPath}`)
    console.log(JSON.stringify(summary, null, 2))
    console.table(
      rows.slice(0, 20).map((row) => ({
        clerkUserId: row.clerkUserId,
        fullName: row.fullName,
        status: row.status,
        homeAddress: row.homeAddress,
        matchCategory: row.matchCategory,
        householdMatches: row.householdMatches.length,
        profileMatches: row.profileMatches.length,
      })),
    )
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
