-- CreateEnum
CREATE TYPE "AccWorkflowRequestOrigin" AS ENUM ('portal_native', 'gravity_cutover_import');

-- CreateEnum
CREATE TYPE "AccWorkflowRequestStatus" AS ENUM ('initial_review', 'needs_more_info', 'committee_vote', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AccWorkflowDecision" AS ENUM ('approve', 'reject');

-- CreateEnum
CREATE TYPE "AccWorkflowVoteValue" AS ENUM ('approve', 'reject');

-- CreateEnum
CREATE TYPE "AccWorkflowActorRole" AS ENUM ('resident', 'member', 'chair', 'admin', 'system');

-- CreateEnum
CREATE TYPE "AccWorkflowAttachmentScope" AS ENUM ('resident', 'internal');

-- CreateEnum
CREATE TYPE "AccWorkflowEventType" AS ENUM ('request_submitted', 'request_updated', 'more_info_requested', 'resident_resubmitted', 'initial_review_approved', 'initial_review_rejected', 'sent_to_committee_vote', 'vote_cast', 'chair_override_approved', 'chair_override_rejected', 'request_verified', 'request_finalized', 'attachment_added', 'attachment_deleted');

-- CreateTable
CREATE TABLE "AccWorkflowRequest" (
    "id" TEXT NOT NULL,
    "origin" "AccWorkflowRequestOrigin" NOT NULL DEFAULT 'portal_native',
    "importedAccRequestId" TEXT,
    "residentClerkUserId" TEXT NOT NULL,
    "householdId" TEXT,
    "residencyId" TEXT,
    "residentNameSnapshot" TEXT NOT NULL,
    "residentEmailSnapshot" TEXT NOT NULL,
    "residentPhoneSnapshot" TEXT,
    "residentAddressSnapshot" TEXT,
    "addressCanonical" TEXT,
    "addressKey" TEXT,
    "phase" TEXT,
    "lot" TEXT,
    "workType" TEXT,
    "title" TEXT,
    "description" TEXT,
    "locationDetails" TEXT,
    "authorizedRepName" TEXT,
    "estimatedStartDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),
    "status" "AccWorkflowRequestStatus" NOT NULL DEFAULT 'initial_review',
    "reviewCycle" INTEGER NOT NULL DEFAULT 1,
    "residentActionNote" TEXT,
    "voteDeadlineAt" TIMESTAMP(3),
    "finalDecision" "AccWorkflowDecision",
    "finalDecisionAt" TIMESTAMP(3),
    "finalDecisionByUserId" TEXT,
    "finalDecisionByRole" "AccWorkflowActorRole",
    "decisionNote" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verificationNote" TEXT,
    "lockedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccWorkflowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccWorkflowVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewCycle" INTEGER NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "vote" "AccWorkflowVoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccWorkflowVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccWorkflowAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByRole" "AccWorkflowActorRole" NOT NULL,
    "scope" "AccWorkflowAttachmentScope" NOT NULL,
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

    CONSTRAINT "AccWorkflowAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccWorkflowEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewCycle" INTEGER NOT NULL,
    "eventType" "AccWorkflowEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "AccWorkflowActorRole" NOT NULL,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccWorkflowRequest_importedAccRequestId_key" ON "AccWorkflowRequest"("importedAccRequestId");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_residentClerkUserId_createdAt_idx" ON "AccWorkflowRequest"("residentClerkUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_householdId_createdAt_idx" ON "AccWorkflowRequest"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_residencyId_createdAt_idx" ON "AccWorkflowRequest"("residencyId", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_status_createdAt_idx" ON "AccWorkflowRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_status_voteDeadlineAt_idx" ON "AccWorkflowRequest"("status", "voteDeadlineAt");

-- CreateIndex
CREATE INDEX "AccWorkflowRequest_addressKey_idx" ON "AccWorkflowRequest"("addressKey");

-- CreateIndex
CREATE INDEX "AccWorkflowVote_requestId_reviewCycle_createdAt_idx" ON "AccWorkflowVote"("requestId", "reviewCycle", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowVote_voterUserId_createdAt_idx" ON "AccWorkflowVote"("voterUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccWorkflowVote_requestId_reviewCycle_voterUserId_key" ON "AccWorkflowVote"("requestId", "reviewCycle", "voterUserId");

-- CreateIndex
CREATE INDEX "AccWorkflowAttachment_requestId_scope_createdAt_idx" ON "AccWorkflowAttachment"("requestId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowAttachment_requestId_deletedAt_idx" ON "AccWorkflowAttachment"("requestId", "deletedAt");

-- CreateIndex
CREATE INDEX "AccWorkflowEvent_requestId_createdAt_idx" ON "AccWorkflowEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowEvent_requestId_reviewCycle_createdAt_idx" ON "AccWorkflowEvent"("requestId", "reviewCycle", "createdAt");

-- CreateIndex
CREATE INDEX "AccWorkflowEvent_eventType_createdAt_idx" ON "AccWorkflowEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "AccWorkflowRequest" ADD CONSTRAINT "AccWorkflowRequest_importedAccRequestId_fkey" FOREIGN KEY ("importedAccRequestId") REFERENCES "AccRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccWorkflowRequest" ADD CONSTRAINT "AccWorkflowRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccWorkflowRequest" ADD CONSTRAINT "AccWorkflowRequest_residencyId_fkey" FOREIGN KEY ("residencyId") REFERENCES "Residency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccWorkflowVote" ADD CONSTRAINT "AccWorkflowVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccWorkflowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccWorkflowAttachment" ADD CONSTRAINT "AccWorkflowAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccWorkflowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccWorkflowEvent" ADD CONSTRAINT "AccWorkflowEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccWorkflowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
