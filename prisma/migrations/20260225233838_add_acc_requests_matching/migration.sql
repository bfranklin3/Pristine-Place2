-- CreateEnum
CREATE TYPE "AccSourceSystem" AS ENUM ('wordpress_gf');

-- CreateEnum
CREATE TYPE "AccDisposition" AS ENUM ('approved', 'denied', 'conditional', 'duplicate', 'canceled', 'unknown');

-- CreateEnum
CREATE TYPE "AccImportMode" AS ENUM ('full', 'delta', 'final');

-- CreateEnum
CREATE TYPE "AccMatchMethod" AS ENUM ('auto_exact', 'auto_scored', 'manual_confirmed', 'manual_rejected');

-- CreateEnum
CREATE TYPE "AccMatchStatus" AS ENUM ('auto', 'needs_review', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "AccRequest" (
    "id" TEXT NOT NULL,
    "sourceSystem" "AccSourceSystem" NOT NULL,
    "sourceFormId" TEXT NOT NULL,
    "sourceEntryId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "updatedAtSource" TIMESTAMP(3),
    "statusRaw" TEXT,
    "disposition" "AccDisposition" NOT NULL DEFAULT 'unknown',
    "permitNumber" TEXT,
    "processDate" TIMESTAMP(3),
    "workType" TEXT,
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "authorizedRepName" TEXT,
    "addressRaw" TEXT,
    "addressNumber" TEXT,
    "streetName" TEXT,
    "addressCanonical" TEXT,
    "phase" TEXT,
    "lot" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "rawEntryJson" JSONB,
    "importBatchId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccRequestAttachment" (
    "id" TEXT NOT NULL,
    "accRequestId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "uploadedAtSource" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccImportRun" (
    "id" TEXT NOT NULL,
    "sourceSystem" "AccSourceSystem" NOT NULL,
    "sourceFormId" TEXT NOT NULL,
    "mode" "AccImportMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUnchanged" INTEGER NOT NULL DEFAULT 0,
    "attachmentsUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentAccMatch" (
    "id" TEXT NOT NULL,
    "residentProfileId" TEXT NOT NULL,
    "accRequestId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchMethod" "AccMatchMethod" NOT NULL,
    "status" "AccMatchStatus" NOT NULL,
    "signalsJson" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentAccMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccRequest_addressCanonical_idx" ON "AccRequest"("addressCanonical");

-- CreateIndex
CREATE INDEX "AccRequest_submittedAt_idx" ON "AccRequest"("submittedAt");

-- CreateIndex
CREATE INDEX "AccRequest_disposition_idx" ON "AccRequest"("disposition");

-- CreateIndex
CREATE INDEX "AccRequest_permitNumber_idx" ON "AccRequest"("permitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccRequest_sourceSystem_sourceFormId_sourceEntryId_key" ON "AccRequest"("sourceSystem", "sourceFormId", "sourceEntryId");

-- CreateIndex
CREATE INDEX "AccRequestAttachment_fieldId_idx" ON "AccRequestAttachment"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "AccRequestAttachment_accRequestId_fieldId_url_key" ON "AccRequestAttachment"("accRequestId", "fieldId", "url");

-- CreateIndex
CREATE INDEX "ResidentAccMatch_status_matchScore_idx" ON "ResidentAccMatch"("status", "matchScore");

-- CreateIndex
CREATE INDEX "ResidentAccMatch_residentProfileId_idx" ON "ResidentAccMatch"("residentProfileId");

-- CreateIndex
CREATE INDEX "ResidentAccMatch_accRequestId_idx" ON "ResidentAccMatch"("accRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentAccMatch_residentProfileId_accRequestId_key" ON "ResidentAccMatch"("residentProfileId", "accRequestId");

-- AddForeignKey
ALTER TABLE "AccRequestAttachment" ADD CONSTRAINT "AccRequestAttachment_accRequestId_fkey" FOREIGN KEY ("accRequestId") REFERENCES "AccRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAccMatch" ADD CONSTRAINT "ResidentAccMatch_residentProfileId_fkey" FOREIGN KEY ("residentProfileId") REFERENCES "ResidentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAccMatch" ADD CONSTRAINT "ResidentAccMatch_accRequestId_fkey" FOREIGN KEY ("accRequestId") REFERENCES "AccRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
