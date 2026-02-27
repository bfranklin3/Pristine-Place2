// app/(portal)/resident-portal/events/calendar/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Monthly Calendar | ${siteConfig.name} Resident Portal`,
  description: `View ${siteConfig.name} HOA community events in a monthly calendar format.`,
}

export default function EventsCalendarPage() {
  return (
    <>

      {/* ── Header bar ── */}
      <div
        style={{
          background: "var(--pp-white)",
          borderBottom: "1px solid var(--pp-slate-200)",
          paddingBlock: "var(--space-s)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-s)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-s)" }}>
            <Link
              href="/resident-portal/events"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                color: "var(--pp-navy-dark)",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
              Back to Events
            </Link>
            <span style={{ color: "var(--pp-slate-300)" }}>|</span>
            <h1
              className="text-step-1 font-bold"
              style={{ color: "var(--pp-navy-dark)" }}
            >
              Monthly Calendar
            </h1>
          </div>
        </div>
      </div>

      {/* ── Calendar placeholder ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "var(--space-xl)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-m)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                background: "var(--pp-slate-100)",
                border: "3px solid var(--pp-navy-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays
                style={{ width: "2.25rem", height: "2.25rem", color: "var(--pp-navy-dark)" }}
              />
            </div>

            {/* Text */}
            <div className="stack-xs" style={{ gap: "var(--space-s)" }}>
              <h2
                className="text-step-2 font-bold"
                style={{ color: "var(--pp-navy-dark)" }}
              >
                Monthly Calendar Coming Soon
              </h2>
              <p
                className="text-fluid-base"
                style={{
                  color: "var(--pp-slate-500)",
                  maxWidth: "42ch",
                  marginInline: "auto",
                  lineHeight: 1.6,
                }}
              >
                An interactive monthly calendar view is in development. In the
                meantime, use the Events list to browse all upcoming community
                events.
              </p>
            </div>

            {/* Back button */}
            <Link
              href="/resident-portal/events"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-navy-dark)",
                color: "var(--pp-white)",
                fontWeight: 600,
                textDecoration: "none",
                marginTop: "var(--space-xs)",
              }}
            >
              <ArrowLeft style={{ width: "0.875rem", height: "0.875rem" }} />
              View Events List
            </Link>
          </div>
        </div>
      </section>

    </>
  )
}
