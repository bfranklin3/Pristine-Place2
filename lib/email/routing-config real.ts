// lib/email/routing-config.ts
// Email routing configuration for issue reports
// Update these email addresses as committees get established

export type IssueCategory =
  | "gate-access"
  | "landscaping"
  | "facilities"
  | "violation"
  | "neighbor-complaint"
  | "safety-security"
  | "other"

export interface CategoryConfig {
  id: IssueCategory
  label: string
  description: string
  icon: string // Lucide icon name
  primaryRecipient: string
  ccRecipients?: string[]
  needsLocation?: boolean
}

export const ISSUE_CATEGORIES: CategoryConfig[] = [
  {
    id: "gate-access",
    label: "Gate Access Issues",
    description: "Problems with gate codes, access cards, or entry system",
    icon: "KeyRound",
    primaryRecipient: "bod@pristineplace.us", // Will change to gate committee
    ccRecipients: ["bod@pristineplace.us"],
  },
  {
    id: "landscaping",
    label: "Common Area Landscaping",
    description: "Dead plants, irrigation issues, or grounds maintenance concerns",
    icon: "Trees",
    primaryRecipient: "bod@pristineplace.us", // Will change to landscaping committee
    ccRecipients: ["bod@pristineplace.us"],
    needsLocation: true,
  },
  {
    id: "facilities",
    label: "Facilities & Amenities",
    description: "Clubhouse, pool, tennis courts, or other facility issues",
    icon: "Building2",
    primaryRecipient: "bod@pristineplace.us", // Will change to facilities committee
    ccRecipients: ["bod@pristineplace.us"],
    needsLocation: true,
  },
  {
    id: "violation",
    label: "Deed Restriction / Property Violation",
    description: "Report a violation of community covenants or restrictions",
    icon: "ShieldAlert",
    primaryRecipient: "kpennington@greenacre.com", // Kim Pennington, property manager
    ccRecipients: ["bod@pristineplace.us"],
    needsLocation: true,
  },
  {
    id: "neighbor-complaint",
    label: "Neighbor Complaint / Nuisance",
    description: "Noise, parking, pets, or other neighbor-related concerns",
    icon: "Users",
    primaryRecipient: "bod@pristineplace.us",
    ccRecipients: [],
  },
  {
    id: "safety-security",
    label: "Safety or Security Concern",
    description: "Lighting, hazards, suspicious activity, or security issues",
    icon: "Shield",
    primaryRecipient: "bod@pristineplace.us",
    ccRecipients: [],
    needsLocation: true,
  },
  {
    id: "other",
    label: "Other / General Issue",
    description: "Anything else that doesn't fit the above categories",
    icon: "HelpCircle",
    primaryRecipient: "bod@pristineplace.us",
    ccRecipients: [],
  },
]

export function getCategoryConfig(categoryId: IssueCategory): CategoryConfig | undefined {
  return ISSUE_CATEGORIES.find((cat) => cat.id === categoryId)
}

export function getEmailRecipients(categoryId: IssueCategory): { to: string; cc?: string[] } {
  const config = getCategoryConfig(categoryId)
  if (!config) {
    return { to: "bod@pristineplace.us" } // Fallback to board
  }

  return {
    to: config.primaryRecipient,
    cc: config.ccRecipients && config.ccRecipients.length > 0 ? config.ccRecipients : undefined,
  }
}
