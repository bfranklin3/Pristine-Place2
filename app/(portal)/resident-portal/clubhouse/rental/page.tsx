// app/(portal)/resident-portal/clubhouse/rental/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import {
  Shield, Download, FileText, User, Phone, Mail, CheckCircle2,
  Building2, UtensilsCrossed, BookOpen,
} from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Grand Ballroom Rental | ${siteConfig.name} Resident Portal`,
  description: `Reserve the Pristine Place Grand Ballroom for your private event. Up to 104 guests, available daily 9:00 AM – 10:00 PM, $300 rental fee plus refundable deposit.`,
}

/* ── Booking steps ─────────────────────────────────────────── */

const bookingSteps = [
  "Contact the rental coordinator to check availability before planning your event.",
  "Download and complete the Clubhouse Rental Agreement.",
  "Submit the completed form along with the rental fee ($300) and refundable deposit ($300).",
  "Include a copy of your insurance with your submission.",
  "Your reservation is confirmed when all documents and payment are received by the coordinator.",
]

/* ── Rental rules ──────────────────────────────────────────── */

const rentalRules = [
  "Reservations must be made at least 7 days in advance.",
  "The resident making the reservation must be present during the entire event.",
  "No smoking is permitted anywhere on the premises.",
  "Noise levels must be kept reasonable and respectful of neighbors.",
  "The facility must be cleaned and returned to its original condition after use.",
  "Any damage to the facility or equipment will result in forfeiture of the deposit.",
]

/* ── Page ─────────────────────────────────────────────────── */

export default function ClubhouseRentalPage() {
  return (
    <>

      {/* ── Hero ── */}
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
          <h1 className="hero-title">Grand Ballroom Rental</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Host your next event at the heart of Pristine Place. The Grand Ballroom seats up to 104 guests
            and is available to residents for private events year-round.
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
              ← Clubhouse &amp; Amenities
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 1: Reserve the Grand Ballroom ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>

          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Reserve the Grand Ballroom</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", maxWidth: "66ch", lineHeight: 1.7 }}>
              The Grand Ballroom is available to Pristine Place residents for a nominal fee. Its versatile
              layout accommodates weddings, birthday parties, holiday celebrations, and more. Reservations
              are currently being accepted.
            </p>
          </div>

          {/* Spec cards */}
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

          {/* What's Included */}
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
              What&rsquo;s Included
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

          {/* Rental Agreement download */}
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
                  Required for all reservations — includes rental terms, liability waiver, and cleaning checklist.
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

          {/* How to Book */}
          <div className="stack" style={{ gap: "var(--space-m)", maxWidth: "44rem" }}>
            <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
              How to Book
            </h3>
            <ol style={{ listStyle: "none", paddingLeft: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
              {bookingSteps.map((step, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
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
                    {i + 1}
                  </span>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            {/* Disclaimer */}
            <div
              style={{
                padding: "var(--space-s) var(--space-m)",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-slate-100)",
                borderLeft: "3px solid var(--pp-slate-300)",
              }}
            >
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6, fontStyle: "italic" }}>
                All dates are subject to availability at the time of booking. Your reservation is not confirmed
                until the completed form, payment, and copy of insurance are received by the coordinator.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 2: Rules & Regulations ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Rules &amp; Regulations</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                By making a reservation, you agree to the following rental rules. These apply to all events
                held in the Grand Ballroom.
              </p>
            </div>

            {/* Rental rules */}
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

            {/* Full rules document link */}
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
      </section>

      {/* ── Section 3: Contact the Rental Coordinator ── */}
      <section className="section" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-white)" }}>Contact the Rental Coordinator</h2>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)" }}>
                For questions about availability, the rental process, or to check open dates.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* Coordinator */}
              <div
                className="card"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
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
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                </div>
                <div>
                  <p
                    className="text-fluid-xs font-bold"
                    style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Coordinator
                  </p>
                  <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-white)", marginTop: "0.125rem" }}>
                    Janet Fehlhaber
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div
                className="card"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
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
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Phone style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                </div>
                <div>
                  <p
                    className="text-fluid-xs font-bold"
                    style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Phone
                  </p>
                  <a
                    href="tel:+13522380097"
                    className="text-fluid-base font-semibold"
                    style={{ color: "var(--pp-white)", textDecoration: "none" }}
                  >
                    (352) 238-0097
                  </a>
                  <p className="text-fluid-xs" style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.125rem" }}>
                    Available 2:30 PM – 8:30 PM
                  </p>
                </div>
              </div>

              {/* Email */}
              <div
                className="card"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
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
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Mail style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                </div>
                <div>
                  <p
                    className="text-fluid-xs font-bold"
                    style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Email
                  </p>
                  <a
                    href="mailto:clubhouserentals@pristineplace.us"
                    className="text-fluid-base font-semibold"
                    style={{ color: "var(--pp-white)", textDecoration: "none", wordBreak: "break-all" }}
                  >
                    clubhouserentals@pristineplace.us
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    </>
  )
}
