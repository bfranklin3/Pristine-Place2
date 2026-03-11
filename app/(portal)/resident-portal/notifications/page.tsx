import type { Metadata } from "next"
import { Bell, Clock3, Mail } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Notifications | ${siteConfig.name} Resident Portal`,
  description: "Email notification preferences and community update subscriptions.",
}

export default function NotificationsPage() {
  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Bell style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Stay Connected</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Never miss important community news, events, or announcements. Email preferences and subscription
            controls are planned for the near future but are not available in the portal yet.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "70rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div className="card" style={{ padding: "var(--space-l)", background: "#fffef9", border: "1px solid #e5efe8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
                <Mail style={{ width: "1.2rem", height: "1.2rem", color: "var(--pp-navy-dark)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>Notification Preferences</h2>
              </div>
              <p style={{ margin: 0, color: "var(--pp-slate-700)", maxWidth: "62ch" }}>
                This page will soon let you subscribe, unsubscribe, and manage your email preferences for Pristine
                Place news, events, and announcements. For now, those self-service controls are still being finalized.
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                background: "#f8fafc",
                border: "1px solid var(--pp-slate-200)",
                display: "grid",
                gap: "0.9rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <Clock3 style={{ width: "1.1rem", height: "1.1rem", color: "var(--pp-slate-600)" }} />
                <h3 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>Coming Soon</h3>
              </div>
              <p style={{ margin: 0, color: "var(--pp-slate-700)", maxWidth: "60ch" }}>
                Once this feature is released, you will be able to manage how Pristine Place communicates with you
                directly from your portal account.
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--pp-slate-700)", display: "grid", gap: "0.35rem" }}>
                <li>Subscribe to community updates and announcements</li>
                <li>Unsubscribe from optional email lists</li>
                <li>Update your notification preferences in one place</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
