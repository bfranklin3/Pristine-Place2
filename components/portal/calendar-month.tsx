import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock3, MapPin, Repeat } from "lucide-react"
import {
  buildMonthGrid,
  CALENDAR_WEEKDAY_LABELS,
  formatMonthParam,
  getMonthLabel,
  groupItemsByHoaDate,
  shiftHoaMonth,
} from "@/lib/calendar/month"
import type { PortalCalendarItem } from "@/lib/calendar/types"
import { formatTimeInHoaTimeZone } from "@/lib/timezone"

function itemSurfaceStyles(item: PortalCalendarItem) {
  if (item.source === "clubhouse_rental" && item.isBlocking) {
    return {
      background: "#fef2f2",
      borderColor: "#fecaca",
      accent: "#991b1b",
      meta: "#7f1d1d",
    }
  }

  if (item.source === "clubhouse_rental") {
    return {
      background: "#fff7ed",
      borderColor: "#fed7aa",
      accent: "#9a3412",
      meta: "#9a3412",
    }
  }

  return {
    background: "#f3f8f3",
    borderColor: "#dbe8df",
    accent: "var(--pp-navy-dark)",
    meta: "var(--pp-slate-600)",
  }
}

function itemLabel(item: PortalCalendarItem) {
  if (item.source === "clubhouse_rental" && item.isBlocking) return "Booked"
  if (item.source === "clubhouse_rental") return "Tentative"
  return "Event"
}

function formatTimeLabel(item: PortalCalendarItem) {
  if (item.allDay) return "All day"

  const start = new Date(item.start)
  const startLabel = formatTimeInHoaTimeZone(start)
  if (!item.end) return startLabel

  const end = new Date(item.end)
  const endLabel = formatTimeInHoaTimeZone(end)
  return `${startLabel} - ${endLabel}`
}

export function CalendarMonth({
  monthDate,
  items,
  basePath,
  backHref,
  backLabel,
  embedded = false,
  description = "Community events displayed in HOA local time.",
  showSourceLabels = true,
  compactMobileItems = false,
}: {
  monthDate: Date
  items: PortalCalendarItem[]
  basePath: string
  backHref?: string
  backLabel?: string
  embedded?: boolean
  description?: string
  showSourceLabels?: boolean
  compactMobileItems?: boolean
}) {
  const weeks = buildMonthGrid(monthDate)
  const itemsByDay = groupItemsByHoaDate(items)
  const prevMonth = shiftHoaMonth(monthDate, -1)
  const nextMonth = shiftHoaMonth(monthDate, 1)

  const content = (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      <div className="card" style={{ padding: "var(--space-l)", display: "grid", gap: "1rem" }}>
        {backHref && backLabel ? (
          <Link
            href={backHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              color: "var(--pp-navy-dark)",
              textDecoration: "none",
              fontWeight: 700,
              width: "fit-content",
            }}
          >
            <ChevronLeft style={{ width: "1rem", height: "1rem" }} />
            {backLabel}
          </Link>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{getMonthLabel(monthDate)}</h1>
            <p style={{ margin: "0.35rem 0 0 0", color: "var(--pp-slate-600)" }}>{description}</p>
          </div>

          <div style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href={`${basePath}?month=${formatMonthParam(prevMonth)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 0.95rem",
                borderRadius: "999px",
                border: "1px solid var(--pp-slate-200)",
                background: "var(--pp-white)",
                color: "var(--pp-navy-dark)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              <ChevronLeft style={{ width: "0.95rem", height: "0.95rem" }} />
              Previous
            </Link>
            <Link
              href={`${basePath}?month=${formatMonthParam(nextMonth)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 0.95rem",
                borderRadius: "999px",
                border: "1px solid var(--pp-slate-200)",
                background: "var(--pp-white)",
                color: "var(--pp-navy-dark)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Next
              <ChevronRight style={{ width: "0.95rem", height: "0.95rem" }} />
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            background: "var(--pp-navy-dark)",
            color: "var(--pp-gold-light)",
          }}
        >
          {CALENDAR_WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              style={{
                padding: "0.85rem 0.6rem",
                textAlign: "center",
                fontSize: "0.85rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateRows: `repeat(${weeks.length}, minmax(10rem, auto))` }}>
          {weeks.map((week, weekIndex) => (
            <div
              key={`week-${weekIndex + 1}`}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              }}
            >
              {week.map((day) => {
                const dayItems = itemsByDay.get(day.key) || []
                const visibleItems = dayItems.slice(0, 3)
                const hiddenCount = Math.max(0, dayItems.length - visibleItems.length)

                return (
                  <div
                    key={day.key}
                    style={{
                      minHeight: "10rem",
                      padding: compactMobileItems ? 0 : "0.4rem",
                      borderRight: "1px solid var(--pp-slate-200)",
                      borderBottom: "1px solid var(--pp-slate-200)",
                      background: day.inCurrentMonth ? "var(--pp-white)" : "var(--pp-slate-50)",
                      display: "grid",
                      alignContent: "start",
                      gap: "0.55rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: compactMobileItems ? "0.35rem 0.35rem 0" : 0,
                      }}
                    >
                      <span
                        style={{
                          width: "2rem",
                          height: "2rem",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: day.isToday ? "var(--pp-navy-dark)" : "transparent",
                          color: day.isToday
                            ? "var(--pp-gold-light)"
                            : day.inCurrentMonth
                              ? "var(--pp-navy-dark)"
                              : "var(--pp-slate-400)",
                          fontWeight: 800,
                        }}
                      >
                        {day.dayNumber}
                      </span>
                      {dayItems.length > 0 ? (
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--pp-slate-500)" }}>
                          {dayItems.length} item{dayItems.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: compactMobileItems ? 0 : "0.45rem",
                      }}
                    >
                      {visibleItems.map((item) => {
                        const surface = itemSurfaceStyles(item)
                        const content = (
                          <div
                            style={{
                              display: "grid",
                              gap: "0.25rem",
                              padding: compactMobileItems ? "0.35rem" : "0.55rem 0.6rem",
                              borderRadius: compactMobileItems ? 0 : "var(--radius-md)",
                              background: surface.background,
                              border: `1px solid ${surface.borderColor}`,
                              borderLeftWidth: compactMobileItems ? 0 : "1px",
                              borderRightWidth: compactMobileItems ? 0 : "1px",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            {compactMobileItems ? (
                              <>
                                <div className="grid gap-1 md:hidden">
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minHeight: "1.25rem",
                                      padding: "0.05rem 0.35rem",
                                      borderRadius: "999px",
                                      background: "rgba(255,255,255,0.75)",
                                      color: surface.accent,
                                      fontSize: "0.64rem",
                                      fontWeight: 800,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase",
                                      width: "100%",
                                    }}
                                  >
                                    {showSourceLabels ? itemLabel(item) : null}
                                  </span>
                                  {item.referenceNumber ? (
                                    <div style={{ color: surface.accent, fontWeight: 700, lineHeight: 1.2, fontSize: "0.8rem" }}>
                                      {item.referenceNumber}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="hidden md:grid" style={{ gap: "0.25rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: "1.25rem",
                                        padding: "0.05rem 0.45rem",
                                        borderRadius: "999px",
                                        background: "rgba(255,255,255,0.75)",
                                        color: surface.accent,
                                        fontSize: "0.7rem",
                                        fontWeight: 800,
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      {showSourceLabels ? itemLabel(item) : null}
                                    </span>
                                    <Clock3 style={{ width: "0.8rem", height: "0.8rem", color: "var(--pp-slate-500)" }} />
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: surface.meta }}>
                                      {formatTimeLabel(item)}
                                    </span>
                                    {item.isRecurring ? (
                                      <Repeat style={{ width: "0.8rem", height: "0.8rem", color: "var(--pp-gold-dark)" }} />
                                    ) : null}
                                  </div>
                                  <div style={{ color: surface.accent, fontWeight: 700, lineHeight: 1.35 }}>{item.title}</div>
                                  {item.location ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.3rem",
                                        color: surface.meta,
                                        fontSize: "0.78rem",
                                      }}
                                    >
                                      <MapPin style={{ width: "0.78rem", height: "0.78rem" }} />
                                      <span>{item.location}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minHeight: "1.25rem",
                                      padding: "0.05rem 0.45rem",
                                      borderRadius: "999px",
                                      background: "rgba(255,255,255,0.75)",
                                      color: surface.accent,
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {showSourceLabels ? itemLabel(item) : null}
                                  </span>
                                  <Clock3 style={{ width: "0.8rem", height: "0.8rem", color: "var(--pp-slate-500)" }} />
                                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: surface.meta }}>
                                    {formatTimeLabel(item)}
                                  </span>
                                  {item.isRecurring ? (
                                    <Repeat style={{ width: "0.8rem", height: "0.8rem", color: "var(--pp-gold-dark)" }} />
                                  ) : null}
                                </div>
                                <div style={{ color: surface.accent, fontWeight: 700, lineHeight: 1.35 }}>{item.title}</div>
                                {item.location ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                      color: surface.meta,
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    <MapPin style={{ width: "0.78rem", height: "0.78rem" }} />
                                    <span>{item.location}</span>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        )

                        if (!item.href) {
                          return <div key={item.id}>{content}</div>
                        }

                        return (
                          <Link key={item.id} href={item.href} style={{ textDecoration: "none", display: "block", width: "100%" }}>
                            {content}
                          </Link>
                        )
                      })}

                      {hiddenCount > 0 ? (
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--pp-slate-500)" }}>
                          +{hiddenCount} more
                        </div>
                      ) : null}

                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (embedded) return content

  return (
    <section className="section" style={{ background: "var(--pp-slate-50)" }}>
      <div className="container" style={{ maxWidth: "78rem" }}>
        {content}
      </div>
    </section>
  )
}
