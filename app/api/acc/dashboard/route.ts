import { NextRequest, NextResponse } from "next/server"
import { requireManagementCapabilityAccess } from "@/lib/auth/portal-management-api"
import {
  listCombinedAccDashboardEntries,
  type CombinedAccDashboardSourceFilter,
  type CombinedAccDashboardStatusFilter,
  type CombinedAccDashboardViewMode,
} from "@/lib/acc-dashboard/repository"

function parseViewMode(value: string | null): CombinedAccDashboardViewMode {
  return value === "redacted" ? "redacted" : "full"
}

function parseSource(value: string | null): CombinedAccDashboardSourceFilter {
  return value === "native" || value === "legacy" ? value : "all"
}

function parseStatus(value: string | null): CombinedAccDashboardStatusFilter {
  if (
    value === "initial_review" ||
    value === "needs_more_info" ||
    value === "committee_vote" ||
    value === "approved" ||
    value === "rejected" ||
    value === "pending" ||
    value === "conditional" ||
    value === "duplicate" ||
    value === "canceled"
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
  const source = parseSource(searchParams.get("source"))
  const status = parseStatus(searchParams.get("status"))
  const viewMode = parseViewMode(searchParams.get("view"))
  const query = (searchParams.get("q") || "").trim()

  try {
    const response = await listCombinedAccDashboardEntries({
      viewMode,
      source,
      status,
      query,
      page,
      perPage,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Combined ACC dashboard failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load combined ACC dashboard", detail }, { status: 500 })
  }
}
