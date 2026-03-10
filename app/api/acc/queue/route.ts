import { NextRequest, NextResponse } from "next/server"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import { listWorkflowRequestsForManagement, type AccWorkflowManagementStatusFilter } from "@/lib/acc-workflow/repository"

function parseStatusFilter(value: string | null): AccWorkflowManagementStatusFilter {
  if (
    value === "initial_review" ||
    value === "needs_more_info" ||
    value === "committee_vote" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value
  }

  return "all"
}

export async function GET(req: NextRequest) {
  const access = await requireManagementCapabilityAccess(["acc.view"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const perPageRaw = Number.parseInt(searchParams.get("per_page") || "25", 10) || 25
  const perPage = Math.max(5, Math.min(100, perPageRaw))
  const status = parseStatusFilter(searchParams.get("status"))
  const query = (searchParams.get("q") || "").trim()

  try {
    const queue = await listWorkflowRequestsForManagement({
      status,
      query,
      page,
      perPage,
    })

    return NextResponse.json(queue)
  } catch (error) {
    console.error("ACC workflow queue list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC workflow queue", detail }, { status: 500 })
  }
}
