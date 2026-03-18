import type { Metadata } from "next"
import Link from "next/link"
import {
  Shield,
  Download,
  FileText,
  CheckCircle2,
  Building2,
  UtensilsCrossed,
  BookOpen,
  User,
  Phone,
  Mail,
  CalendarDays,
} from "lucide-react"
import { ClubhouseRentalOnlineForm } from "@/components/portal/clubhouse-rental-online-form"
import { requirePortalRolePageAccess } from "@/lib/auth/portal-admin"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Clubhouse Rental Online | ${siteConfig.name} Resident Portal`,
  description:
    "Restricted-access preview of the future online clubhouse rental capability.",
}

const rentalRules = [
  "Reservations must be made at least 7 days in advance.",
  "The resident making the reservation must be present during the entire event.",
  "No smoking is permitted anywhere on the premises.",
  "Noise levels must be kept reasonable and respectful of neighbors.",
  "The facility must be cleaned and returned to its original condition after use.",
  "Any damage to the facility or equipment will result in forfeiture of the deposit.",
]

export default async function ClubhouseRentalOnlinePage() {
  await requirePortalRolePageAccess(
    ["admin", "board_of_directors", "clubhouse_maintenance"],
    "/resident-portal/management/clubhouse-rental-online",
  )

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
          <h1 className="hero-title">Clubhouse Rental Online</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Restricted-access preview of the future online clubhouse rental request workflow for Board members,
            and Clubhouse committee reviewers while the experience is reviewed and tested.
          </p>
          <div style={{ marginTop: "var(--space-s)" }}>
            <Link
              href="/resident-portal/clubhouse"
              className="text-fluid-sm"
              style={{
                color: "rgba(255,255,255,0.65)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              ← Clubhouse
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Rental Overview</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", maxWidth: "66ch", lineHeight: 1.7 }}>
              This prototype keeps the practical overview from the current rental page so the renter can understand the
              ballroom, fee structure, and key rules before starting the online request.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 13rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {[
              { label: "Capacity", value: "Up to 104", sub: "with tables and chairs" },
              { label: "Available Hours", value: "9:00 AM – 10:00 PM", sub: "daily" },
              { label: "Rental Fee", value: "$300", sub: "plus $300 refundable deposit" },
              {
                label: "Location",
                value: siteConfig.contact.address.street,
                sub: `${siteConfig.contact.address.city}, ${siteConfig.contact.address.state} ${siteConfig.contact.address.zip}`,
              },
            ].map(({ label, value, sub }) => (
              <div
                key={label}
                className="card"
                style={{ padding: "var(--space-m)", borderTop: "3px solid var(--pp-navy-dark)" }}
              >
                <p
                  className="text-fluid-xs font-bold"
                  style={{
                    color: "var(--pp-slate-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "0.375rem",
                  }}
                >
                  {label}
                </p>
                <p className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)", lineHeight: 1.2 }}>
                  {value}
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  {sub}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "var(--space-m) var(--space-l)",
              borderRadius: "var(--radius-md)",
              background: "var(--pp-slate-50)",
              borderLeft: "4px solid var(--pp-navy-dark)",
            }}
          >
            <p
              className="text-fluid-sm font-bold"
              style={{
                color: "var(--pp-slate-500)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: "var(--space-s)",
              }}
            >
              What&apos;s Included
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-m)",
              }}
            >
              {[
                { icon: Building2, label: "Grand Ballroom", sub: "Main event space" },
                { icon: UtensilsCrossed, label: "Full Kitchen", sub: "Food prep and catering" },
                { icon: BookOpen, label: "Library / Meeting Room", sub: "Additional overflow space" },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: "12rem" }}
                >
                  <div
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--pp-navy-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: "1rem", height: "1rem", color: "var(--pp-gold-light)" }} />
                  </div>
                  <div>
                    <p className="text-fluid-sm font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                      {label}
                    </p>
                    <p className="text-fluid-xs" style={{ color: "var(--pp-slate-500)" }}>
                      {sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-m)",
              padding: "var(--space-l)",
              borderLeft: "4px solid var(--pp-navy-dark)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
              <div
                style={{
                  width: "2.75rem",
                  height: "2.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--pp-navy-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Download style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
              </div>
              <div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Clubhouse Rental Agreement
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  Reference copy of the current paper agreement, checklist, and liability language.
                </p>
              </div>
            </div>
            <a
              href="https://www.pristineplace.us/wp-content/uploads/2026/02/PP-Clubhouse-Rental-Agreement-2026-v2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-navy-dark)",
                color: "var(--pp-white)",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Download style={{ width: "0.875rem", height: "0.875rem" }} />
              Download Form (PDF)
            </a>
          </div>

          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Contact the Rental Coordinator</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)" }}>
                For questions about availability, the rental process, or supporting paperwork.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {[
                { icon: User, label: "Coordinator", value: "Janet Fehlhaber", href: null, sub: "" },
                { icon: Phone, label: "Phone", value: "(352) 238-0097", href: "tel:+13522380097", sub: "Available 2:30 PM – 8:30 PM" },
                { icon: Mail, label: "Email", value: "clubhouserentals@pristineplace.us", href: "mailto:clubhouserentals@pristineplace.us", sub: "" },
              ].map(({ icon: Icon, label, value, href, sub }) => (
                <div
                  key={label}
                  className="card"
                  style={{
                    padding: "var(--space-m)",
                    background: "var(--pp-white)",
                    border: "1px solid var(--pp-slate-200)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-m)",
                  }}
                >
                  <div
                    style={{
                      width: "2.75rem",
                      height: "2.75rem",
                      borderRadius: "50%",
                      background: "var(--pp-navy-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                  </div>
                  <div>
                    <p
                      className="text-fluid-xs font-bold"
                      style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                    >
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        className="text-fluid-base font-semibold"
                        style={{ color: "var(--pp-navy-dark)", textDecoration: "none", wordBreak: "break-all" }}
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)", marginTop: "0.125rem" }}>
                        {value}
                      </p>
                    )}
                    {sub ? (
                      <p className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", marginTop: "0.125rem" }}>
                        {sub}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
              gap: "var(--space-l)",
              alignItems: "start",
            }}
          >
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                How the Online Request Should Work
              </h3>
              <ol style={{ listStyle: "none", paddingLeft: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "1.625rem",
                      height: "1.625rem",
                      borderRadius: "50%",
                      background: "var(--pp-navy-dark)",
                      color: "var(--pp-white)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: "0.1rem",
                    }}
                  >
                    1
                  </span>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6, margin: 0 }}>
                    Check the{" "}
                    <Link
                      href="/resident-portal/management/clubhouse-rental-availability"
                      style={{ color: "var(--pp-navy-dark)", fontWeight: 800, textDecoration: "underline" }}
                    >
                      clubhouse availability calendar
                    </Link>{" "}
                    before finalizing your event plans.
                  </p>
                </li>
                {[
                  "Complete the online rental request with event details, insurance information, and acknowledgements.",
                  "Upload the required insurance materials and any supporting documents.",
                  "Wait for review and final confirmation before treating the reservation as approved.",
                ].map((step, index) => (
                  <li key={step} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "1.625rem",
                        height: "1.625rem",
                        borderRadius: "50%",
                        background: "var(--pp-navy-dark)",
                        color: "var(--pp-white)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: "0.1rem",
                      }}
                    >
                      {index + 2}
                    </span>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6, margin: 0 }}>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>

              <div
                style={{
                  padding: "var(--space-m) var(--space-l)",
                  borderRadius: "var(--radius-md)",
                  background: "#f3f8f3",
                  borderLeft: "4px solid var(--pp-navy-dark)",
                  display: "grid",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-navy-dark)",
                      color: "var(--pp-gold-light)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CalendarDays style={{ width: "1.1rem", height: "1.1rem" }} />
                  </div>
                  <div>
                    <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)", margin: 0 }}>
                      Check Availability
                    </p>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6, margin: "0.3rem 0 0 0" }}>
                      Review the monthly clubhouse availability calendar before submitting or testing a rental request.
                      It combines HOA clubhouse events, approved rentals, and tentative requests in one view.
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    href="/resident-portal/management/clubhouse-rental-availability"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.65rem 1.1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-navy-dark)",
                      color: "var(--pp-white)",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <CalendarDays style={{ width: "0.95rem", height: "0.95rem" }} />
                    Open Clubhouse Availability
                  </Link>
                </div>
              </div>
            </div>

            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                Key Rules
              </h3>
              <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                {rentalRules.map((rule) => (
                  <li
                    key={rule}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      paddingBlock: "0.625rem",
                      borderBottom: "1px solid var(--pp-slate-200)",
                    }}
                  >
                    <CheckCircle2
                      style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-navy-dark)", flexShrink: 0, marginTop: "0.1rem" }}
                    />
                    <span className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="/documents"
                className="card card-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-m)",
                  padding: "var(--space-m)",
                  textDecoration: "none",
                  borderLeft: "4px solid var(--pp-navy-dark)",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--pp-navy-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                </div>
                <div style={{ flex: 1, minWidth: "12rem" }}>
                  <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                    Approved Clubhouse Rules &amp; Regulations
                  </p>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                    Full document — includes rules for the Clubhouse, Pool &amp; Exercise Room
                  </p>
                </div>
                <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-navy-dark)", whiteSpace: "nowrap" }}>
                  View document →
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <ClubhouseRentalOnlineForm />
    </>
  )
}
