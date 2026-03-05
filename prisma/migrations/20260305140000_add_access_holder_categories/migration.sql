-- CreateEnum
CREATE TYPE "AccessHolderCategory" AS ENUM (
  'owner_occupant',
  'owner_non_occupant',
  'tenant',
  'household_member',
  'trustee_or_owner_rep',
  'guardian',
  'vendor',
  'property_manager',
  'unspecified'
);

-- AlterTable
ALTER TABLE "GateCredential"
ADD COLUMN "householdMemberId" TEXT;

-- AlterTable
ALTER TABLE "HouseholdMember"
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "holderCategory" "AccessHolderCategory" NOT NULL DEFAULT 'unspecified',
ADD COLUMN "holderState" "ResidentState" NOT NULL DEFAULT 'unknown',
ADD COLUMN "notes" TEXT,
ADD COLUMN "organizationName" TEXT,
ADD COLUMN "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "HouseholdMember_holderCategory_holderState_idx" ON "HouseholdMember"("holderCategory", "holderState");

-- CreateIndex
CREATE INDEX "GateCredential_householdMemberId_status_idx" ON "GateCredential"("householdMemberId", "status");

-- AddForeignKey
ALTER TABLE "GateCredential"
ADD CONSTRAINT "GateCredential_householdMemberId_fkey"
FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

