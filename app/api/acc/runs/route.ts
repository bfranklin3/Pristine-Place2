import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"

type RunFilter = "all" | "rerun" | "import"

function toRunFilter(value: string | null): RunFilter {
  if (value === "rerun" || value === "import") return value
  return "all"
}

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const filter = toRunFilter(searchParams.get("filter"))
  const limitRaw = Number.parseInt(searchParams.get("limit") || "10", 10) || 10
  const limit = Math.max(1, Math.min(50, limitRaw))

  const where =
    filter === "rerun"
      ? { sourceFormId: "acc_match_rerun" }
      : filter === "import"
        ? { sourceFormId: { not: "acc_match_rerun" } }
        : {}

  try {
    const [items, rerunCount, importCount, totalCount] = await Promise.all([
      prisma.accImportRun.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
      }),
      prisma.accImportRun.count({ where: { sourceFormId: "acc_match_rerun" } }),
      prisma.accImportRun.count({ where: { sourceFormId: { not: "acc_match_rerun" } } }),
      prisma.accImportRun.count(),
    ])

    const rows = items.map((row) => ({
      id: row.id,
      runType: row.sourceFormId === "acc_match_rerun" ? "rerun" : "import",
      sourceFormId: row.sourceFormId,
      mode: row.mode,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      triggeredBy: row.triggeredBy,
      rowsRead: row.rowsRead,
      rowsUpserted: row.rowsUpserted,
      rowsUnchanged: row.rowsUnchanged,
      attachmentsUpserted: row.attachmentsUpserted,
      errorsJson: row.errorsJson,
    }))

    return NextResponse.json({
      items: rows,
      counts: {
        total: totalCount,
        rerun: rerunCount,
        import: importCount,
      },
      filter,
      limit,
    })
  } catch (error) {
    console.error("ACC run history failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load ACC run history", detail }, { status: 500 })
  }
}
