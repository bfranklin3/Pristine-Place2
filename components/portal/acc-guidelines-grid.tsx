"use client"

// components/portal/acc-guidelines-grid.tsx

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield } from "lucide-react"
import type { SanityAccGuideline } from "@/lib/sanity/acc-guidelines"

/* ── Types ─────────────────────────────────────────────────── */

type Category = "construction" | "florida-friendly" | "general" | "house" | "landscaping"
type FilterKey = "all" | Category

/* ── Category colors ─────────────────────────────────────────── */

const CATEGORY_STYLE: Record<Category, { bg: string; color: string }> = {
  "construction":     { bg: "var(--pp-navy-dark)", color: "var(--pp-white)" },
  "florida-friendly": { bg: "#2d6a4f",             color: "#ffffff" },
  "general":          { bg: "var(--pp-slate-200)", color: "var(--pp-slate-800)" },
  "house":            { bg: "var(--pp-gold)",      color: "var(--pp-white)" },
  "landscaping":      { bg: "#52b788",             color: "#ffffff" },
}

const ALL_FILTERS: FilterKey[] = [
  "all",
  "construction",
  "florida-friendly",
  "general",
  "house",
  "landscaping",
]

function toCategoryLabel(category: Category) {
  if (category === "florida-friendly") return "Florida Friendly"
  if (category === "construction") return "Construction"
  if (category === "landscaping") return "Landscaping"
  if (category === "house") return "House"
  return "General"
}

/* ── Component ──────────────────────────────────────────────── */

export function AccGuidelinesGrid({ guidelines }: { guidelines: SanityAccGuideline[] }) {
  const [active, setActive] = useState<FilterKey>("all")
  const [page, setPage] = useState(1)
  const perPage = 15

  const normalized = guidelines.filter((g): g is SanityAccGuideline & { category: Category } =>
    ["construction", "florida-friendly", "general", "house", "landscaping"].includes(g.category),
  )

  const filtered = active === "all" ? normalized : normalized.filter((g) => g.category === active)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * perPage
  const endIndex = startIndex + perPage
  const visible = filtered.slice(startIndex, endIndex)

  useEffect(() => {
    setPage(1)
  }, [active])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-l)" }}>

      {/* ── Filter Buttons ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
        {ALL_FILTERS.map((key) => {
          const isActive = active === key
          const label = key === "all" ? "All Guidelines" : toCategoryLabel(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.45rem 1rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                border: isActive ? "none" : "1.5px solid var(--pp-slate-200)",
                background: isActive ? "var(--pp-navy-dark)" : "var(--pp-white)",
                color: isActive ? "var(--pp-white)" : "var(--pp-slate-600)",
                boxShadow: isActive ? "0 2px 8px rgba(58,90,64,0.25)" : "none",
              }}
            >
              {key !== "all" && (
                <span
                  style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: isActive ? "var(--pp-gold-light)" : CATEGORY_STYLE[key].bg,
                    flexShrink: 0,
                  }}
                />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Guidelines Grid ── */}
      {filtered.length === 0 ? (
        <p className="text-fluid-base" style={{ color: "var(--pp-slate-400)" }}>
          No guidelines in this category yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 13rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {visible.map((g) => {
              const cat = CATEGORY_STYLE[g.category]
              return (
                <div
                  key={g._id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "center",
                    padding: "var(--space-l) var(--space-m)",
                    minHeight: "13rem",
                    gap: "var(--space-s)",
                  }}
                >
                  {/* Icon + badge row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Shield style={{ width: "1.375rem", height: "1.375rem", color: cat.bg, flexShrink: 0 }} />
                    <span
                      className="text-fluid-xs font-semibold"
                      style={{
                        padding: "0.25rem 0.7rem",
                        borderRadius: "999px",
                        background: cat.bg,
                        color: cat.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {toCategoryLabel(g.category)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-step-1 font-bold"
                    style={{
                      color: "var(--pp-navy-dark)",
                      lineHeight: 1.25,
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {g.title}
                  </h3>

                  <Link
                    href={`/resident-portal/acc/${g.slug.current}`}
                    className="text-fluid-sm font-semibold"
                    style={{ color: "var(--pp-navy-dark)", textDecoration: "none" }}
                  >
                    View Details →
                  </Link>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage(pageNumber)}
                  style={safePage === pageNumber ? { background: "var(--pp-slate-100)", fontWeight: 700 } : undefined}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
