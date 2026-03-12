import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Shield } from "lucide-react"
import { requirePortalAdminPageAccess } from "@/lib/auth/portal-admin"
import { siteConfig } from "@/lib/site-config"
import { getClubhouseAvailability } from "@/lib/clubhouse-rental/availability"

export const metadata: Metadata = {
  title: `Clubhouse Availability | ${siteConfig.name} Resident Portal`,
  description: "Admin availability view for clubhouse rentals and clubhouse-related HOA events.",
}

function formatDateOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function badgeStyles(isBlocking: boolean) {
  return isBlocking
    ? { background: "#fee2e2", color: "#991b1b" }
    : { background: "#ffedd5", color: "#9a3412" }
}

export default async function ClubhouseRentalAvailabilityPage() {
  await requirePortalAdminPageAccess("/resident-portal/management/clubhouse-rental-availability")
  const availability = await getClubhouseAvailability()

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
              Management
            </span>
          </div>
          <h1 className="hero-title">Clubhouse Availability</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Combined availability view for clubhouse rental requests and Sanity HOA events. Approved rentals and
            Sanity events at <strong>Clubhouse</strong> or <strong>Clubhouse Ballroom</strong> are treated as blocking.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "76rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <p className="text-fluid-xs font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Range
                </p>
                <p className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  {formatDateOnly(availability.startDate)}
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  through {formatDateOnly(availability.endDate)}
                </p>
              </div>
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <p className="text-fluid-xs font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Blocking Entries
                </p>
                <p className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  {availability.blockingEntries.length}
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  approved rentals + clubhouse HOA events
                </p>
              </div>
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <p className="text-fluid-xs font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Tentative Entries
                </p>
                <p className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  {availability.tentativeEntries.length}
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  submitted / needs-more-info rental requests
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "var(--space-s) var(--space-m)",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-slate-50)",
                borderLeft: "4px solid var(--pp-navy-dark)",
                color: "var(--pp-slate-700)",
              }}
            >
              This first pass is a timeline-style admin view, not a full monthly calendar yet. It uses approved clubhouse
              rental requests plus published Sanity events with locations set to <strong>Clubhouse</strong> or{" "}
              <strong>Clubhouse Ballroom</strong>.
            </div>

            <div className="stack" style={{ gap: "var(--space-m)" }}>
              {availability.groupedDays.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-l)" }}>
                  <p style={{ margin: 0, color: "var(--pp-slate-700)" }}>
                    No clubhouse bookings or tentative rental requests were found in the current date range.
                  </p>
                </div>
              ) : (
                availability.groupedDays.map((group) => (
                  <section key={group.day} className="card" style={{ padding: "var(--space-l)", display: "grid", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <CalendarDays style={{ width: "1.15rem", height: "1.15rem", color: "var(--pp-navy-dark)" }} />
                      <h2 style={{ margin: 0, color: "var(--pp-navy-dark)" }}>{formatDateOnly(group.day)}</h2>
                    </div>

                    <div style={{ display: "grid", gap: "0.85rem" }}>
                      {group.entries.map((entry) => {
                        const styles = badgeStyles(entry.isBlocking)
                        return (
                          <div
                            key={entry.id}
                            style={{
                              padding: "0.95rem 1rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border)",
                              background: "#fffef9",
                              display: "grid",
                              gap: "0.45rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontWeight: 700, color: "var(--pp-navy-dark)" }}>{entry.title}</div>
                                <div style={{ marginTop: "0.2rem", color: "var(--pp-slate-600)" }}>{entry.subtitle}</div>
                              </div>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: "2rem",
                                  padding: "0.35rem 0.8rem",
                                  borderRadius: "999px",
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  background: styles.background,
                                  color: styles.color,
                                }}
                              >
                                {entry.statusLabel}
                              </span>
                            </div>
                            <div style={{ color: "var(--pp-slate-700)" }}>
                              <strong>{entry.locationLabel}</strong> · {entry.startLabel} - {entry.endLabel}
                            </div>
                            {entry.href ? (
                              <div>
                                <Link href={entry.href} style={{ color: "var(--pp-navy-dark)", fontWeight: 700, textDecoration: "none" }}>
                                  Open Source Record
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
