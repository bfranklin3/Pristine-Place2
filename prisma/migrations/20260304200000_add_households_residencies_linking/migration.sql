-- CreateEnum
CREATE TYPE "ResidencyType" AS ENUM ('owner', 'tenant', 'authorized_occupant', 'unknown');

-- CreateEnum
CREATE TYPE "ResidentState" AS ENUM ('current', 'past', 'unknown');

-- CreateEnum
CREATE TYPE "LinkMatchConfidence" AS ENUM ('high', 'medium', 'low', 'unresolved');

-- CreateEnum
CREATE TYPE "LinkAuditEntityType" AS ENUM ('acc_request', 'access_record', 'residency');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "addressRaw" TEXT,
    "addressCanonical" TEXT NOT NULL,
    "addressKey" TEXT NOT NULL,
    "lotNumber" TEXT,
    "phase" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Residency" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "residentType" "ResidencyType" NOT NULL DEFAULT 'unknown',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Residency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAudit" (
    "id" TEXT NOT NULL,
    "entityType" "LinkAuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousHouseholdId" TEXT,
    "newHouseholdId" TEXT,
    "previousResidencyId" TEXT,
    "newResidencyId" TEXT,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAudit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ResidentProfile"
ADD COLUMN "addressKey" TEXT,
ADD COLUMN "householdId" TEXT,
ADD COLUMN "residencyId" TEXT,
ADD COLUMN "residentState" "ResidentState" NOT NULL DEFAULT 'unknown',
ADD COLUMN "matchConfidence" "LinkMatchConfidence" NOT NULL DEFAULT 'unresolved',
ADD COLUMN "matchMethod" TEXT,
ADD COLUMN "matchedAt" TIMESTAMP(3),
ADD COLUMN "matchedBy" TEXT;

-- AlterTable
ALTER TABLE "AccRequest"
ADD COLUMN "addressKey" TEXT,
ADD COLUMN "householdId" TEXT,
ADD COLUMN "residencyId" TEXT,
ADD COLUMN "clerkUserId" TEXT,
ADD COLUMN "residentState" "ResidentState" NOT NULL DEFAULT 'unknown',
ADD COLUMN "matchConfidence" "LinkMatchConfidence" NOT NULL DEFAULT 'unresolved',
ADD COLUMN "matchMethod" TEXT,
ADD COLUMN "matchedAt" TIMESTAMP(3),
ADD COLUMN "matchedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Household_addressKey_key" ON "Household"("addressKey");

-- CreateIndex
CREATE INDEX "Household_addressCanonical_idx" ON "Household"("addressCanonical");

-- CreateIndex
CREATE INDEX "Household_lotNumber_idx" ON "Household"("lotNumber");

-- CreateIndex
CREATE INDEX "Residency_householdId_isCurrent_idx" ON "Residency"("householdId", "isCurrent");

-- CreateIndex
CREATE INDEX "Residency_clerkUserId_isCurrent_idx" ON "Residency"("clerkUserId", "isCurrent");

-- CreateIndex
CREATE INDEX "Residency_startDate_endDate_idx" ON "Residency"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LinkAudit_entityType_entityId_createdAt_idx" ON "LinkAudit"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "LinkAudit_actorUserId_createdAt_idx" ON "LinkAudit"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ResidentProfile_addressKey_idx" ON "ResidentProfile"("addressKey");

-- CreateIndex
CREATE INDEX "ResidentProfile_householdId_idx" ON "ResidentProfile"("householdId");

-- CreateIndex
CREATE INDEX "ResidentProfile_residencyId_idx" ON "ResidentProfile"("residencyId");

-- CreateIndex
CREATE INDEX "ResidentProfile_residentState_idx" ON "ResidentProfile"("residentState");

-- CreateIndex
CREATE INDEX "AccRequest_addressKey_idx" ON "AccRequest"("addressKey");

-- CreateIndex
CREATE INDEX "AccRequest_householdId_submittedAt_idx" ON "AccRequest"("householdId", "submittedAt");

-- CreateIndex
CREATE INDEX "AccRequest_residentState_submittedAt_idx" ON "AccRequest"("residentState", "submittedAt");

-- CreateIndex
CREATE INDEX "AccRequest_matchConfidence_submittedAt_idx" ON "AccRequest"("matchConfidence", "submittedAt");

-- AddForeignKey
ALTER TABLE "Residency" ADD CONSTRAINT "Residency_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentProfile" ADD CONSTRAINT "ResidentProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentProfile" ADD CONSTRAINT "ResidentProfile_residencyId_fkey" FOREIGN KEY ("residencyId") REFERENCES "Residency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccRequest" ADD CONSTRAINT "AccRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccRequest" ADD CONSTRAINT "AccRequest_residencyId_fkey" FOREIGN KEY ("residencyId") REFERENCES "Residency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
