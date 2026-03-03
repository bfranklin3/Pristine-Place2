-- CreateEnum
CREATE TYPE "CapabilityEffect" AS ENUM ('allow', 'deny');

-- CreateTable
CREATE TABLE "UserCapabilityOverride" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "effect" "CapabilityEffect" NOT NULL,
    "reason" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCapabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCapabilityOverrideAudit" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "beforeEffect" TEXT,
    "afterEffect" TEXT,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCapabilityOverrideAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCapabilityOverride_clerkUserId_capabilityKey_key" ON "UserCapabilityOverride"("clerkUserId", "capabilityKey");

-- CreateIndex
CREATE INDEX "UserCapabilityOverride_clerkUserId_idx" ON "UserCapabilityOverride"("clerkUserId");

-- CreateIndex
CREATE INDEX "UserCapabilityOverride_capabilityKey_idx" ON "UserCapabilityOverride"("capabilityKey");

-- CreateIndex
CREATE INDEX "UserCapabilityOverrideAudit_clerkUserId_createdAt_idx" ON "UserCapabilityOverrideAudit"("clerkUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserCapabilityOverrideAudit_capabilityKey_createdAt_idx" ON "UserCapabilityOverrideAudit"("capabilityKey", "createdAt");
