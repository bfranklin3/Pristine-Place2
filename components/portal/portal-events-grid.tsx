// components/portal/portal-events-grid.tsx
// Client component: filterable event card grid for the Resident Portal events page.

"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Calendar, MapPin, Clock, ChevronRight, Repeat } from "lucide-react"

/* ── Category config ─────────────────────────────────────────────── */
const CATEGORIES = {
  all:         { label: "All Events",  topBar: "var(--pp-navy-dark)" },
  meeting:     { label: "Meeting",     topBar: "var(--pp-navy)"      },
  social:      { label: "Social",      topBar: "var(--pp-gold)"      },
  safety:      { label: "Safety",      topBar: "#c0392b"             },
  volunteer:   { label: "Volunteer",   topBar: "#3d7a56"             },
  maintenance: { label: "Maintenance", topBar: "var(--pp-slate-500)" },
} as const

type CategoryKey = keyof typeof CATEGORIES

const BADGE_COLOR: Record<string, string> = {
  meeting:     "var(--pp-navy-dark)",
  social:      "var(--pp-gold)",
  safety:      "#c0392b",
  volunteer:   "#3d7a56",
  maintenance: "var(--pp-slate-500)",
}

/* ── Event type ──────────────────────────────────────────────────── */
interface Event {
  id: string
  slug?: string
  month: string
  day: string
  category: string
  title: string
  date: string
  time: string
  location: string
  description: string
  highlight: boolean
  isRecurring?: boolean
  originalEventId?: string
}

interface PortalEventsGridProps {
  events?: Event[]
}

/* ── Component ───────────────────────────────────────────────────── */
export function PortalEventsGrid({ events = [] }: PortalEventsGridProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all")

  const filtered = useMemo(() => {
    if (activeCategory === "all") return events
    return events.filter((e) => e.category === activeCategory)
  }, [activeCategory, events])

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="container" style={{ paddingBottom: "var(--space-l)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-xs)",
          }}
        >
          {/* Category pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", flex: 1 }}>
            {(Object.entries(CATEGORIES) as [CategoryKey, { label: string; topBar: string }][]).map(
              ([key, cat]) => {
                const active = activeCategory === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.4rem 0.9rem",
                      borderRadius: "9999px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                      border: active ? "none" : "1px solid var(--pp-slate-200)",
                      background: active ? "var(--pp-navy-dark)" : "var(--pp-white)",
                      color: active ? "var(--pp-white)" : "var(--pp-slate-600)",
                      boxShadow: active ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    {key !== "all" && (
                      <span
                        style={{
                          width: "0.45rem",
                          height: "0.45rem",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: active ? "rgba(255,255,255,0.65)" : cat.topBar,
                        }}
                      />
                    )}
                    {cat.label}
                  </button>
                )
              }
            )}
          </div>

          {/* Monthly View button */}
          <Link
            href="/resident-portal/events/calendar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.4rem 0.9rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "1.5px solid var(--pp-navy-dark)",
              background: "transparent",
              color: "var(--pp-navy-dark)",
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Calendar style={{ width: "0.875rem", height: "0.875rem" }} />
            Monthly View
          </Link>
        </div>
      </div>

      {/* ── Event Cards Grid ── */}
      <div className="container">
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-xl)",
              color: "var(--pp-slate-400)",
            }}
          >
            <p className="text-step-1">No events found.</p>
            <p className="text-fluid-sm" style={{ marginTop: "0.5rem" }}>
              {activeCategory === "all"
                ? "Check back soon for upcoming community events."
                : "Try selecting a different category."}
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: "var(--space-m)" }}
          >
            {filtered.map((ev) => {
              const topBar = CATEGORIES[ev.category as CategoryKey]?.topBar ?? "var(--pp-navy)"
              const badgeColor = BADGE_COLOR[ev.category] ?? "var(--pp-navy-dark)"
              const darkDate = ev.category === "meeting" || ev.highlight

              return (
                <div
                  key={ev.id}
                  className="card"
                  style={{
                    background: "var(--pp-white)",
                    overflow: "hidden",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderTop: ev.highlight ? `3px solid var(--pp-gold)` : undefined,
                  }}
                >
                  {/* Top color bar */}
                  {!ev.highlight && (
                    <div style={{ height: "3px", background: topBar, flexShrink: 0 }} />
                  )}

                  {/* Card body */}
                  <div
                    style={{
                      padding: "var(--space-m)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-s)",
                      flex: 1,
                    }}
                  >
                    {/* Date badge + category/title row */}
                    <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start" }}>

                      {/* Date badge */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: "3.5rem",
                          height: "3.5rem",
                          borderRadius: "var(--radius-md)",
                          background: darkDate ? "var(--pp-navy-dark)" : "var(--pp-slate-100)",
                          border: darkDate ? "none" : "1px solid var(--pp-slate-200)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          gap: "0.1rem",
                        }}
                      >
                        <span
                          style={{
                            color: darkDate ? "var(--pp-gold-light)" : "var(--pp-navy-dark)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            lineHeight: 1,
                            fontSize: "0.6rem",
                          }}
                        >
                          {ev.month}
                        </span>
                        <span
                          style={{
                            color: darkDate ? "var(--pp-white)" : "var(--pp-navy-dark)",
                            fontWeight: 900,
                            lineHeight: 1,
                            fontSize: "1.4rem",
                          }}
                        >
                          {ev.day}
                        </span>
                      </div>

                      {/* Title + badge */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: "0.3rem", display: "flex", gap: "0.25rem", alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              background: badgeColor,
                              color: "var(--pp-white)",
                              borderRadius: "var(--radius-sm)",
                              padding: "0.1rem 0.45rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {CATEGORIES[ev.category as CategoryKey]?.label ?? ev.category}
                          </span>
                          {ev.isRecurring && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                background: "var(--pp-slate-200)",
                                color: "var(--pp-slate-700)",
                                borderRadius: "var(--radius-sm)",
                                padding: "0.1rem 0.35rem",
                                fontSize: "0.6rem",
                                fontWeight: 600,
                              }}
                              title="Recurring event"
                            >
                              <Repeat style={{ width: "0.65rem", height: "0.65rem" }} />
                              RECURRING
                            </span>
                          )}
                        </div>
                        <h3
                          className="text-step-0 font-bold"
                          style={{ color: "var(--pp-navy-dark)", lineHeight: 1.3 }}
                        >
                          {ev.title}
                        </h3>
                      </div>
                    </div>

                    {/* Date / time / location */}
                    <div
                      className="text-fluid-sm"
                      style={{
                        color: "var(--pp-slate-500)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock style={{ width: "0.8rem", height: "0.8rem", flexShrink: 0 }} />
                        {ev.date} · {ev.time}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <MapPin style={{ width: "0.8rem", height: "0.8rem", flexShrink: 0 }} />
                        {ev.location}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className="text-fluid-sm"
                      style={{ color: "var(--pp-slate-600)", lineHeight: 1.55, flex: 1 }}
                    >
                      {ev.description}
                    </p>

                    {/* View details link */}
                    {ev.slug && (
                      <div>
                        <Link
                          href={`/resident-portal/events/${ev.slug}`}
                          className="text-fluid-sm font-semibold hover:text-pp-gold transition-colors"
                          style={{
                            color: "var(--pp-navy-dark)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                          }}
                        >
                          View Details
                          <ChevronRight style={{ width: "0.875rem", height: "0.875rem" }} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
