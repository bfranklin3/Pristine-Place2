import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireManagementApiAccess } from "@/lib/auth/portal-management-api"
import { canonicalizeAddressParts } from "@/lib/address-normalization"

type PriorityFilter = "all" | "address_exact" | "other"
type AgeBucket = "all" | "0_7" | "8_30" | "31_90" | "91_plus"

function canonicalizeAddress(raw: string | null | undefined): string {
  return canonicalizeAddressParts(raw).canonical
}

function asPriorityFilter(value: string | null): PriorityFilter {
  if (value === "address_exact" || value === "other") return value
  return "all"
}

function asAgeBucket(value: string | null): AgeBucket {
  if (value === "0_7" || value === "8_30" || value === "31_90" || value === "91_plus") return value
  return "all"
}

function toAgeDays(submittedAt: Date | null): number | null {
  if (!submittedAt) return null
  const now = Date.now()
  const ts = submittedAt.getTime()
  if (Number.isNaN(ts)) return null
  if (ts > now) return 0
  return Math.floor((now - ts) / (1000 * 60 * 60 * 24))
}

function toAgeBucket(days: number | null): Exclude<AgeBucket, "all"> {
  if (days === null) return "91_plus"
  if (days <= 7) return "0_7"
  if (days <= 30) return "8_30"
  if (days <= 90) return "31_90"
  return "91_plus"
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const access = await requireManagementApiAccess(["admin"])
  if (!access.ok) return access.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()
  const priority = asPriorityFilter(searchParams.get("priority"))
  const ageBucket = asAgeBucket(searchParams.get("ageBucket"))
  const exportFormat = searchParams.get("export")
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25
  const pageSize = Math.max(5, Math.min(100, pageSizeRaw))

  try {
    const [requests, residents] = await Promise.all([
      prisma.accRequest.findMany({
        where: {
          matches: {
            none: {
              status: "confirmed",
            },
          },
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        include: {
          matches: {
            include: {
              residentProfile: {
                select: {
                  id: true,
                  addressFull: true,
                  addressNumber: true,
                  streetName: true,
                },
              },
            },
          },
        },
      }),
      prisma.residentProfile.findMany({
        select: {
          id: true,
          addressFull: true,
          addressNumber: true,
          streetName: true,
        },
      }),
    ])

    const residentAddressMap = new Map<string, Array<{ id: string; address: string }>>()
    for (const r of residents) {
      const address = r.addressFull || `${r.addressNumber || ""} ${r.streetName || ""}`.trim()
      const canonical = canonicalizeAddress(address)
      if (!canonical) continue
      const arr = residentAddressMap.get(canonical) || []
      arr.push({ id: r.id, address })
      residentAddressMap.set(canonical, arr)
    }

    const rows = requests.map((row) => {
      const canonical = canonicalizeAddress(row.addressCanonical || row.addressRaw)
      const addressCandidatesFromMap = canonical ? residentAddressMap.get(canonical) || [] : []
      const addressExactFromSignals = row.matches.some((m) => {
        const obj = typeof m.signalsJson === "object" && m.signalsJson ? (m.signalsJson as Record<string, unknown>) : null
        return obj?.addressExact === true
      })
      const hasAddressExactCandidate = addressExactFromSignals || addressCandidatesFromMap.length > 0

      const candidateResidents = row.matches.map((m) => ({
        residentProfileId: m.residentProfileId,
        address:
          m.residentProfile.addressFull ||
          `${m.residentProfile.addressNumber || ""} ${m.residentProfile.streetName || ""}`.trim() ||
          "—",
        status: m.status,
        score: m.matchScore,
      }))

      const dedupMap = new Map<string, { residentProfileId: string; address: string; status: string; score: number }>()
      for (const c of candidateResidents) dedupMap.set(c.residentProfileId, c)
      for (const c of addressCandidatesFromMap) {
        if (!dedupMap.has(c.id)) {
          dedupMap.set(c.id, {
            residentProfileId: c.id,
            address: c.address,
            status: "none",
            score: 0,
          })
        }
      }

      return {
        id: row.id,
        sourceEntryId: row.sourceEntryId,
        permitNumber: row.permitNumber,
        submittedAt: row.submittedAt,
        ownerName: row.ownerName,
        ownerPhone: row.ownerPhone,
        ownerEmail: row.ownerEmail,
        addressRaw: row.addressRaw,
        addressCanonical: canonical,
        workType: row.workType,
        disposition: row.disposition,
        priority: hasAddressExactCandidate ? "address_exact" : "other",
        ageDays: toAgeDays(row.submittedAt),
        ageBucket: toAgeBucket(toAgeDays(row.submittedAt)),
        candidateCount: dedupMap.size,
        candidates: Array.from(dedupMap.values()).sort((a, b) => b.score - a.score),
      }
    })

    const filtered = rows.filter((row) => {
      if (priority !== "all" && row.priority !== priority) return false
      if (ageBucket !== "all" && row.ageBucket !== ageBucket) return false
      if (!q) return true
      const haystack = [
        row.sourceEntryId,
        row.permitNumber || "",
        row.ownerName || "",
        row.addressRaw || "",
        row.workType || "",
        row.disposition || "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    const counts = {
      total: rows.length,
      address_exact: rows.filter((r) => r.priority === "address_exact").length,
      other: rows.filter((r) => r.priority === "other").length,
      age_0_7: rows.filter((r) => r.ageBucket === "0_7").length,
      age_8_30: rows.filter((r) => r.ageBucket === "8_30").length,
      age_31_90: rows.filter((r) => r.ageBucket === "31_90").length,
      age_91_plus: rows.filter((r) => r.ageBucket === "91_plus").length,
    }

    if (exportFormat === "csv") {
      const header = [
        "sourceEntryId",
        "permitNumber",
        "submittedAt",
        "ageDays",
        "ageBucket",
        "priority",
        "ownerName",
        "ownerPhone",
        "ownerEmail",
        "addressRaw",
        "workType",
        "disposition",
        "candidateCount",
        "topCandidateResidentId",
        "topCandidateAddress",
        "topCandidateStatus",
        "topCandidateScore",
      ]
      const lines = [header.map(csvEscape).join(",")]
      for (const row of filtered) {
        const top = row.candidates[0]
        const csvRow = [
          row.sourceEntryId,
          row.permitNumber || "",
          row.submittedAt ? row.submittedAt.toISOString() : "",
          row.ageDays ?? "",
          row.ageBucket,
          row.priority,
          row.ownerName || "",
          row.ownerPhone || "",
          row.ownerEmail || "",
          row.addressRaw || "",
          row.workType || "",
          row.disposition,
          row.candidateCount,
          top?.residentProfileId || "",
          top?.address || "",
          top?.status || "",
          top?.score ?? "",
        ]
        lines.push(csvRow.map(csvEscape).join(","))
      }

      const csv = `${lines.join("\n")}\n`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="acc-unmatched-queue.csv"',
          "Cache-Control": "no-store",
        },
      })
    }

    return NextResponse.json({
      items,
      counts,
      filters: {
        priority,
        ageBucket,
        q,
      },
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
    })
  } catch (error) {
    console.error("ACC unmatched list failed:", error)
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to load unmatched ACC queue", detail }, { status: 500 })
  }
}
