-- CreateEnum
CREATE TYPE "ClubhouseRentalRequestStatus" AS ENUM ('submitted', 'needs_more_info', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ClubhouseRentalDecision" AS ENUM ('approve', 'reject');

-- CreateEnum
CREATE TYPE "ClubhouseRentalActorRole" AS ENUM ('resident', 'member', 'admin', 'system');

-- CreateEnum
CREATE TYPE "ClubhouseRentalAttachmentScope" AS ENUM ('resident', 'internal');

-- CreateEnum
CREATE TYPE "ClubhouseRentalEventType" AS ENUM ('request_submitted', 'more_info_requested', 'resident_resubmitted', 'request_approved', 'request_rejected', 'request_finalized', 'attachment_added', 'attachment_deleted');

-- CreateTable
CREATE TABLE "ClubhouseRentalRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "residentClerkUserId" TEXT NOT NULL,
    "householdId" TEXT,
    "residencyId" TEXT,
    "residentNameSnapshot" TEXT NOT NULL,
    "residentEmailSnapshot" TEXT NOT NULL,
    "residentPhoneSnapshot" TEXT,
    "residentAddressSnapshot" TEXT,
    "addressCanonical" TEXT,
    "addressKey" TEXT,
    "eventType" TEXT NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "reservationStartLabel" TEXT NOT NULL,
    "reservationEndLabel" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "requestedSpace" TEXT NOT NULL,
    "eventDescription" TEXT NOT NULL,
    "specialRequests" TEXT,
    "vendorsInvolved" BOOLEAN NOT NULL,
    "vendorDetails" TEXT,
    "insuranceCompany" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "typedConfirmationName" TEXT NOT NULL,
    "clubhouseAgreementInitials" TEXT NOT NULL,
    "insuranceInitials" TEXT NOT NULL,
    "decorationInitials" TEXT NOT NULL,
    "acknowledgeRentalRules" BOOLEAN NOT NULL,
    "acknowledgeDepositResponsibility" BOOLEAN NOT NULL,
    "acknowledgeAttendanceResponsibility" BOOLEAN NOT NULL,
    "acknowledgeCapacitySafety" BOOLEAN NOT NULL,
    "formDataJson" JSONB,
    "status" "ClubhouseRentalRequestStatus" NOT NULL DEFAULT 'submitted',
    "reviewCycle" INTEGER NOT NULL DEFAULT 1,
    "residentActionNote" TEXT,
    "finalDecision" "ClubhouseRentalDecision",
    "finalDecisionAt" TIMESTAMP(3),
    "finalDecisionByUserId" TEXT,
    "finalDecisionByRole" "ClubhouseRentalActorRole",
    "decisionNote" TEXT,
    "lockedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubhouseRentalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubhouseRentalRequestNumberSequence" (
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubhouseRentalRequestNumberSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "ClubhouseRentalAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByRole" "ClubhouseRentalActorRole" NOT NULL,
    "scope" "ClubhouseRentalAttachmentScope" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageBucket" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubhouseRentalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubhouseRentalEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewCycle" INTEGER NOT NULL,
    "eventType" "ClubhouseRentalEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "ClubhouseRentalActorRole" NOT NULL,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubhouseRentalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubhouseRentalRequest_requestNumber_key" ON "ClubhouseRentalRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_residentClerkUserId_createdAt_idx" ON "ClubhouseRentalRequest"("residentClerkUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_householdId_createdAt_idx" ON "ClubhouseRentalRequest"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_residencyId_createdAt_idx" ON "ClubhouseRentalRequest"("residencyId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_status_createdAt_idx" ON "ClubhouseRentalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_reservationDate_status_idx" ON "ClubhouseRentalRequest"("reservationDate", "status");

-- CreateIndex
CREATE INDEX "ClubhouseRentalRequest_addressKey_idx" ON "ClubhouseRentalRequest"("addressKey");

-- CreateIndex
CREATE INDEX "ClubhouseRentalAttachment_requestId_scope_createdAt_idx" ON "ClubhouseRentalAttachment"("requestId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalAttachment_requestId_deletedAt_idx" ON "ClubhouseRentalAttachment"("requestId", "deletedAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalEvent_requestId_createdAt_idx" ON "ClubhouseRentalEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalEvent_requestId_reviewCycle_createdAt_idx" ON "ClubhouseRentalEvent"("requestId", "reviewCycle", "createdAt");

-- CreateIndex
CREATE INDEX "ClubhouseRentalEvent_eventType_createdAt_idx" ON "ClubhouseRentalEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "ClubhouseRentalRequest" ADD CONSTRAINT "ClubhouseRentalRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubhouseRentalRequest" ADD CONSTRAINT "ClubhouseRentalRequest_residencyId_fkey" FOREIGN KEY ("residencyId") REFERENCES "Residency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubhouseRentalAttachment" ADD CONSTRAINT "ClubhouseRentalAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClubhouseRentalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubhouseRentalEvent" ADD CONSTRAINT "ClubhouseRentalEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClubhouseRentalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
