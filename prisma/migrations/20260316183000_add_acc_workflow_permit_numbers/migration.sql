ALTER TABLE "AccWorkflowRequest"
ADD COLUMN "permitNumber" TEXT;

CREATE TABLE "AccWorkflowPermitNumberSequence" (
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccWorkflowPermitNumberSequence_pkey" PRIMARY KEY ("year")
);

CREATE UNIQUE INDEX "AccWorkflowRequest_permitNumber_key" ON "AccWorkflowRequest"("permitNumber");
