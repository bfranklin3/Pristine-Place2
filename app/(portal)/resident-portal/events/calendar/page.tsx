import type { Metadata } from "next"
import { CalendarDays, Shield } from "lucide-react"
import { PortalEventsCalendarServer } from "@/components/portal/portal-events-calendar-server"
import { parseMonthParam } from "@/lib/calendar/month"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Monthly Calendar | ${siteConfig.name} Resident Portal`,
  description: `View ${siteConfig.name} HOA community events in a monthly calendar format.`,
}

export default async function EventsCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] | undefined }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const monthDate = parseMonthParam(resolvedSearchParams?.month)

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Monthly Calendar</h1>
          <p className="hero-subtitle">
            View HOA meetings, social events, and community activities in a monthly calendar view.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              color: "var(--pp-gold-light)",
              fontWeight: 700,
            }}
          >
            <CalendarDays style={{ width: "1rem", height: "1rem" }} />
            HOA Local Time
          </div>
        </div>
      </section>

      <PortalEventsCalendarServer monthDate={monthDate} />
    </>
  )
}
