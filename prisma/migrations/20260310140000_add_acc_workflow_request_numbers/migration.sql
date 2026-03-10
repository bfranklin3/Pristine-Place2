-- AlterTable
ALTER TABLE "AccWorkflowRequest" ADD COLUMN     "requestNumber" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AccWorkflowRequestNumberSequence" (
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccWorkflowRequestNumberSequence_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccWorkflowRequest_requestNumber_key" ON "AccWorkflowRequest"("requestNumber");
