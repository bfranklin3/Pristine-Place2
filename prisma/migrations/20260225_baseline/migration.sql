-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('directory_code', 'barcode', 'fob', 'temp_code');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('active', 'disabled', 'lost', 'revoked');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('primary', 'secondary', 'tertiary', 'company_contact');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('resident_profile', 'household_member', 'gate_credential');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'revoke', 'approve', 'import');

-- CreateTable
CREATE TABLE "ResidentProfile" (
    "id" TEXT NOT NULL,
    "primaryUserId" TEXT,
    "residentCategory" TEXT,
    "phase" TEXT,
    "addressNumber" TEXT,
    "streetName" TEXT,
    "addressFull" TEXT,
    "entryCode" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confidentialPhone" BOOLEAN NOT NULL DEFAULT false,
    "includeInDirectory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ResidentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "residentProfileId" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateCredential" (
    "id" TEXT NOT NULL,
    "residentProfileId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "credentialLabel" TEXT,
    "credentialValue" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAuditLog" (
    "id" TEXT NOT NULL,
    "residentProfileId" TEXT,
    "actorUserId" TEXT,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdMember_residentProfileId_idx" ON "HouseholdMember"("residentProfileId");

-- CreateIndex
CREATE INDEX "GateCredential_residentProfileId_idx" ON "GateCredential"("residentProfileId");

-- CreateIndex
CREATE INDEX "GateCredential_status_idx" ON "GateCredential"("status");

-- CreateIndex
CREATE INDEX "AccessAuditLog_residentProfileId_idx" ON "AccessAuditLog"("residentProfileId");

-- CreateIndex
CREATE INDEX "AccessAuditLog_entityType_entityId_idx" ON "AccessAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_residentProfileId_fkey" FOREIGN KEY ("residentProfileId") REFERENCES "ResidentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateCredential" ADD CONSTRAINT "GateCredential_residentProfileId_fkey" FOREIGN KEY ("residentProfileId") REFERENCES "ResidentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_residentProfileId_fkey" FOREIGN KEY ("residentProfileId") REFERENCES "ResidentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

