import type { User } from "@clerk/nextjs/server"
import type { AccWorkflowActorRole } from "@prisma/client"
import { isPortalAdmin } from "@/lib/auth/portal-admin"
import { hasCapability } from "@/lib/auth/permissions"
import { normalizeCommitteeChairSlugs, normalizeCommitteeSlugs } from "@/lib/portal/committees"

export interface AccWorkflowActorContext {
  actorRole: Exclude<AccWorkflowActorRole, "resident" | "system">
  isAdmin: boolean
  isAccMember: boolean
  isAccChair: boolean
  canViewQueue: boolean
  canControlWorkflow: boolean
  canVote: boolean
  canOverrideVote: boolean
  canVerify: boolean
  canPurge: boolean
}

export function getAccWorkflowActorContext(user: User | null): AccWorkflowActorContext {
  const isAdmin = isPortalAdmin(user)
  const committees = normalizeCommitteeSlugs(user?.publicMetadata?.committees)
  const committeeChairs = normalizeCommitteeChairSlugs(user?.publicMetadata?.committeeChairs)
  const isAccChair = committeeChairs.includes("acc")
  const isAccMember = isAccChair || committees.includes("acc")

  return {
    actorRole: isAdmin ? "admin" : isAccChair ? "chair" : "member",
    isAdmin,
    isAccMember,
    isAccChair,
    canViewQueue: isAdmin || hasCapability(user, "acc.view"),
    canControlWorkflow: isAdmin || hasCapability(user, "acc.workflow"),
    canVote: isAccMember,
    canOverrideVote: isAccChair,
    canVerify: isAdmin || isAccChair,
    canPurge: isAdmin,
  }
}
