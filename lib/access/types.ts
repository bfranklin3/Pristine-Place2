export type AccessCredentialType = "directory_code" | "barcode" | "fob" | "temp_code"
export type AccessCredentialStatus = "active" | "disabled" | "lost" | "revoked"
export type HouseholdRole = "primary" | "secondary" | "tertiary" | "company_contact"
export type AccessAuditEntityType = "resident_profile" | "household_member" | "gate_credential"
export type AccessAuditAction = "create" | "update" | "revoke" | "approve" | "import"

export interface AccessContact {
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
}

export interface AccessCredentialSummary {
  id: string
  type: AccessCredentialType
  label: string | null
  valueMasked: string
  status: AccessCredentialStatus
}

export interface AccessResidentListItem {
  residentProfileId: string
  addressFull: string | null
  phase: string | null
  residentCategory: string | null
  includeInDirectory: boolean
  confidentialPhone: boolean
  entryCode: string | null
  comments: string | null
  primaryContact: AccessContact | null
  secondaryContact: AccessContact | null
  credentials: AccessCredentialSummary[]
  updatedAt: string
}

export interface AccessResidentsListResponse {
  items: AccessResidentListItem[]
  total: number
  page: number
  pageSize: number
}

export interface AccessHouseholdMember {
  id: string
  role: HouseholdRole
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  isPrimaryContact: boolean
  createdAt: string
  updatedAt: string
}

export interface AccessCredential {
  id: string
  credentialType: AccessCredentialType
  credentialLabel: string | null
  credentialValue: string
  status: AccessCredentialStatus
  notes: string | null
  issuedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AccessAuditEntry {
  id: string
  actorUserId: string | null
  entityType: AccessAuditEntityType
  entityId: string
  action: AccessAuditAction
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
  reason: string | null
  createdAt: string
}

export interface AccessResidentDetail {
  residentProfileId: string
  primaryUserId: string | null
  residentCategory: string | null
  includeInDirectory: boolean
  confidentialPhone: boolean
  phase: string | null
  addressNumber: string | null
  streetName: string | null
  addressFull: string | null
  entryCode: string | null
  comments: string | null
  householdMembers: AccessHouseholdMember[]
  credentials: AccessCredential[]
  audit: AccessAuditEntry[]
  createdAt: string
  updatedAt: string
}
