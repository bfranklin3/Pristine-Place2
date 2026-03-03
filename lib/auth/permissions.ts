import type { User } from "@clerk/nextjs/server"
import { normalizeCommitteeChairSlugs, normalizeCommitteeSlugs, type CommitteeSlug } from "@/lib/portal/committees"
import {
  CAPABILITY_KEYS,
  normalizeCapabilityOverrides,
  type CapabilityKey,
  type CapabilityOverrideValue,
} from "@/lib/auth/capabilities"

type CapabilitySource =
  | "admin"
  | "default"
  | "override_allow"
  | "override_deny"

export interface CapabilityDecision {
  key: CapabilityKey
  allowed: boolean
  source: CapabilitySource
}

type CommitteeRoleKey =
  | "board_of_directors"
  | "committee.acc.member"
  | "committee.acc.chair"
  | "committee.access_control.member"
  | "committee.access_control.chair"

const DEFAULT_ROLE_GRANTS: Record<CommitteeRoleKey, CapabilityKey[]> = {
  board_of_directors: ["acc.view", "access.view"],
  "committee.acc.member": ["acc.view"],
  "committee.acc.chair": ["acc.view", "acc.edit", "acc.workflow"],
  "committee.access_control.member": ["access.view"],
  "committee.access_control.chair": ["access.view", "access.edit"],
}

function parseCsvList(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function getPrimaryEmail(user: User | null): string {
  if (!user) return ""
  return (
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase() || ""
  )
}

function isPortalAdminUser(user: User | null): boolean {
  const metadataAdmin = user?.publicMetadata?.portalAdmin === true
  const email = getPrimaryEmail(user)
  const username = (user?.username || "").toLowerCase()
  const adminEmails = parseCsvList(process.env.PORTAL_ADMIN_EMAILS)
  const approverEmails = parseCsvList(process.env.PORTAL_APPROVER_EMAILS)
  const adminUsernames = parseCsvList(process.env.PORTAL_ADMIN_USERNAMES)

  return (
    metadataAdmin ||
    adminEmails.includes(email) ||
    approverEmails.includes(email) ||
    adminUsernames.includes(username)
  )
}

function getCommitteeChairsFromMetadata(user: User | null): CommitteeSlug[] {
  const raw = user?.publicMetadata?.committeeChairs
  return normalizeCommitteeChairSlugs(raw)
}

function getRoleKeys(user: User | null): CommitteeRoleKey[] {
  const roles: CommitteeRoleKey[] = []
  const committees = normalizeCommitteeSlugs(user?.publicMetadata?.committees)
  const chairs = getCommitteeChairsFromMetadata(user)

  if (committees.includes("board_of_directors")) {
    roles.push("board_of_directors")
  }
  if (committees.includes("acc")) {
    roles.push("committee.acc.member")
  }
  if (chairs.includes("acc")) {
    roles.push("committee.acc.chair")
  }
  if (committees.includes("access_control")) {
    roles.push("committee.access_control.member")
  }
  if (chairs.includes("access_control")) {
    roles.push("committee.access_control.chair")
  }

  return roles
}

function getDefaultGrants(user: User | null): Set<CapabilityKey> {
  const grants = new Set<CapabilityKey>()
  const roleKeys = getRoleKeys(user)
  for (const roleKey of roleKeys) {
    for (const capability of DEFAULT_ROLE_GRANTS[roleKey]) {
      grants.add(capability)
    }
  }
  return grants
}

export function getCapabilityOverridesFromMetadata(user: User | null): Partial<Record<CapabilityKey, CapabilityOverrideValue>> {
  return normalizeCapabilityOverrides(user?.publicMetadata?.capabilityOverrides)
}

export function resolveCapabilityDecision(
  user: User | null,
  key: CapabilityKey,
): CapabilityDecision {
  if (isPortalAdminUser(user)) {
    return { key, allowed: true, source: "admin" }
  }

  const defaults = getDefaultGrants(user)
  const overrides = getCapabilityOverridesFromMetadata(user)
  const override = overrides[key]

  if (override === "allow") return { key, allowed: true, source: "override_allow" }
  if (override === "deny") return { key, allowed: false, source: "override_deny" }

  return { key, allowed: defaults.has(key), source: "default" }
}

export function hasCapability(user: User | null, key: CapabilityKey): boolean {
  return resolveCapabilityDecision(user, key).allowed
}

export function getEffectiveCapabilitySummary(user: User | null): CapabilityDecision[] {
  return CAPABILITY_KEYS.map((key) => resolveCapabilityDecision(user, key))
}
