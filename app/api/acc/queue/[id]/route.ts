import { NextRequest, NextResponse } from "next/server"
import { getAccWorkflowActorContext } from "@/lib/acc-workflow/actors"
import {
  approveWorkflowRequestInInitialReview,
  castCommitteeVoteForWorkflowRequest,
  getWorkflowRequestForManagement,
  overrideCommitteeVoteForWorkflowRequest,
  purgeWorkflowRequestForAdmin,
  rejectWorkflowRequestInInitialReview,
  requestMoreInfoForWorkflowRequest,
  sendWorkflowRequestToCommitteeVote,
  verifyApprovedWorkflowRequest,
} from "@/lib/acc-workflow/repository"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import { getPortalSession } from "@/lib/auth/portal-session"
import {
  sendAccWorkflowFinalDecisionNotification,
  sendAccWorkflowMoreInfoNotification,
  sendAccWorkflowSentToVoteNotification,
} from "@/lib/email/acc-workflow-notifications"

type QueueAction =
  | "request_more_info"
  | "approve"
  | "reject"
  | "send_to_vote"
  | "cast_vote"
  | "override"
  | "verify"
  | "purge"

function parseVoteDeadline(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function deliverFinalDecisionNotification(request: {
  id: string
  requestNumber?: string | null
  title?: string | null
  residentName?: string | null
  residentEmail?: string | null
  residentAddress?: string | null
  decisionNote?: string | null
  finalDecision?: "approve" | "reject" | null
}) {
  if (!request.finalDecision) return undefined
  return sendAccWorkflowFinalDecisionNotification({
    requestId: request.id,
    requestNumber: request.requestNumber,
    title: request.title,
    residentName: request.residentName,
    residentEmail: request.residentEmail,
    residentAddress: request.residentAddress,
    decisionNote: request.decisionNote,
    decision: request.finalDecision,
  })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { id } = await ctx.params

  try {
    const request = await getWorkflowRequestForManagement({
      requestId: id,
      viewerUserId: access.identity.clerkUserId,
    })

    if (!request) return NextResponse.json({ error: "ACC workflow request not found" }, { status: 404 })
    return NextResponse.json({ request })
  } catch (error) {
    console.error("ACC workflow queue detail failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC workflow request", detail }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { user } = await getPortalSession()
  const actor = getAccWorkflowActorContext(user)
  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as {
    action?: QueueAction
    note?: string
    decision?: "approve" | "reject"
    vote?: "approve" | "reject"
    voteDeadlineAt?: string
    confirmText?: string
  }

  const action = body.action
  if (!action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 })
  }

  try {
    let result:
      | Awaited<ReturnType<typeof requestMoreInfoForWorkflowRequest>>
      | Awaited<ReturnType<typeof approveWorkflowRequestInInitialReview>>
      | Awaited<ReturnType<typeof rejectWorkflowRequestInInitialReview>>
      | Awaited<ReturnType<typeof sendWorkflowRequestToCommitteeVote>>
      | Awaited<ReturnType<typeof castCommitteeVoteForWorkflowRequest>>
      | Awaited<ReturnType<typeof overrideCommitteeVoteForWorkflowRequest>>
      | Awaited<ReturnType<typeof verifyApprovedWorkflowRequest>>
      | Awaited<ReturnType<typeof purgeWorkflowRequestForAdmin>>
    let notificationResult: unknown = undefined

    if (action === "request_more_info") {
      if (!actor.canControlWorkflow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      result = await requestMoreInfoForWorkflowRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole,
        note: body.note || "",
      })

      if (result.kind === "ok") {
        notificationResult = await sendAccWorkflowMoreInfoNotification({
          requestId: result.request.id,
          requestNumber: result.request.requestNumber,
          title: result.request.title,
          residentName: result.request.residentName,
          residentEmail: result.request.residentEmail,
          residentAddress: result.request.residentAddress,
          residentActionNote: result.request.residentActionNote,
        })
      }
    } else if (action === "approve") {
      if (!actor.canControlWorkflow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      result = await approveWorkflowRequestInInitialReview({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole,
        note: body.note,
      })

      if (result.kind === "ok") {
        notificationResult = await deliverFinalDecisionNotification(result.request)
      }
    } else if (action === "reject") {
      if (!actor.canControlWorkflow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      result = await rejectWorkflowRequestInInitialReview({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole,
        note: body.note || "",
      })

      if (result.kind === "ok") {
        notificationResult = await deliverFinalDecisionNotification(result.request)
      }
    } else if (action === "send_to_vote") {
      if (!actor.canControlWorkflow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const voteDeadlineAt = parseVoteDeadline(body.voteDeadlineAt)
      if (!voteDeadlineAt) {
        return NextResponse.json({ error: "A valid vote deadline is required." }, { status: 400 })
      }

      result = await sendWorkflowRequestToCommitteeVote({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole,
        voteDeadlineAt,
      })

      if (result.kind === "ok") {
        notificationResult = await sendAccWorkflowSentToVoteNotification({
          requestId: result.request.id,
          requestNumber: result.request.requestNumber,
          title: result.request.title,
          residentName: result.request.residentName,
          residentEmail: result.request.residentEmail,
          residentAddress: result.request.residentAddress,
          voteDeadlineAt: result.request.voteDeadlineAt,
        })
      }
    } else if (action === "cast_vote") {
      if (!actor.canVote) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (body.vote !== "approve" && body.vote !== "reject") {
        return NextResponse.json({ error: "vote must be approve or reject." }, { status: 400 })
      }

      result = await castCommitteeVoteForWorkflowRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole,
        vote: body.vote,
      })

      if (result.kind === "ok" && result.request.voteSummary.total === 3 && result.request.finalDecision) {
        notificationResult = await deliverFinalDecisionNotification(result.request)
      }
    } else if (action === "override") {
      if (!actor.canOverrideVote) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (body.decision !== "approve" && body.decision !== "reject") {
        return NextResponse.json({ error: "decision must be approve or reject." }, { status: 400 })
      }

      result = await overrideCommitteeVoteForWorkflowRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: "chair",
        decision: body.decision,
        note: body.note || "",
      })

      if (result.kind === "ok") {
        notificationResult = await deliverFinalDecisionNotification(result.request)
      }
    } else if (action === "verify") {
      if (!actor.canVerify) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      result = await verifyApprovedWorkflowRequest({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        actorRole: actor.actorRole === "admin" ? "admin" : "chair",
        note: body.note,
      })
    } else {
      if (!actor.canPurge) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      result = await purgeWorkflowRequestForAdmin({
        requestId: id,
        actorUserId: access.identity.clerkUserId,
        confirmText: body.confirmText || "",
      })
    }

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "ACC workflow request not found." }, { status: 404 })
    }

    if (result.kind === "invalid_state") {
      return NextResponse.json(
        { error: "ACC workflow request cannot be updated from its current status.", status: result.status },
        { status: 409 },
      )
    }

    if (result.kind === "validation_error") {
      return NextResponse.json({ error: "Invalid ACC workflow action.", validationErrors: result.errors }, { status: 400 })
    }

    if (result.kind === "duplicate_vote") {
      return NextResponse.json({ error: "You have already voted on this request cycle." }, { status: 409 })
    }

    if (result.kind === "already_verified") {
      return NextResponse.json({ error: "This request has already been marked verified." }, { status: 409 })
    }

    if (result.kind === "not_allowed") {
      return NextResponse.json({ error: "That action is not allowed for this request." }, { status: 403 })
    }

    if ("deletedRequestId" in result) {
      return NextResponse.json({ deletedRequestId: result.deletedRequestId })
    }

    return NextResponse.json({
      request: result.request,
      notificationResult,
    })
  } catch (error) {
    console.error("ACC workflow queue mutation failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to update ACC workflow request", detail }, { status: 500 })
  }
}
