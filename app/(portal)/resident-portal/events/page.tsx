// app/(portal)/resident-portal/events/page.tsx

import type { Metadata } from "next"
import { Shield } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { PortalEventsServer } from "@/components/portal/portal-events-server"

export const metadata: Metadata = {
  title: `Events & Calendar | ${siteConfig.name} Resident Portal`,
  description: `Community events, HOA meetings, social activities, and volunteer opportunities for ${siteConfig.name} residents.`,
}

export default function EventsPage() {
  return (
    <>

      {/* ── Hero ── */}
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
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
          <h1 className="hero-title">Events &amp; Calendar</h1>
          <p className="hero-subtitle">
            Stay connected with community meetings, social events, and activities at {siteConfig.name}.
          </p>
        </div>
      </section>

      {/* ── Events Grid ── */}
      <section
        className="section"
        style={{ background: "var(--pp-slate-50)" }}
      >
        <PortalEventsServer />
      </section>

    </>
  )
}
