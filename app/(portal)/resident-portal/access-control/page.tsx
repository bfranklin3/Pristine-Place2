// app/(portal)/resident-portal/access-control/page.tsx

import type { Metadata } from "next"
import { Shield, KeyRound, Hash, MapPin, Clock, Phone, Mail, Lock, AlertCircle, User } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Access Control | ${siteConfig.name} Resident Portal`,
  description: `Gate access credentials, callbox instructions, and contact information for the Pristine Place Access Control Committee.`,
}

/* ── Credential definitions ────────────────────────────────── */

const credentials = [
  {
    icon: KeyRound,
    label: "Barcode",
    description:
      "A windshield barcode sticker that reads automatically as you drive up to the gate — no stopping, no keypads required. New and replacement barcodes are the same price.",
    badge: "$10",
    badgeLabel: "new or replacement",
  },
  {
    icon: KeyRound,
    label: "Key Fob",
    description:
      "A small handheld remote that opens any gate at the press of a button. Useful as a backup credential or for residents who prefer not to use a windshield barcode.",
    badge: "$10",
    badgeLabel: "new or replacement",
  },
  {
    icon: Hash,
    label: "Gate Code",
    description:
      "A shared numeric code entered at the gate keypad, available to all current residents at no charge. Convenient for on-foot access or as a backup when other credentials are unavailable.",
    badge: "Free",
    badgeLabel: "available to all residents",
  },
]

/* ── Pricing rows ────────────────────────────────────────────── */

const pricing = [
  {
    item: "Barcode",
    cost: "$10",
    notes: "New and replacement barcodes are the same price — no additional charge for a lost or damaged barcode.",
  },
  {
    item: "Key Fob",
    cost: "$10",
    notes: "—",
  },
  {
    item: "Gate Code",
    cost: "Free",
    notes: "Provided to all current residents on request. No purchase required.",
  },
]

/* ── Callbox steps ────────────────────────────────────────────── */

const callboxSteps = [
  {
    step: "1",
    text: "Your visitor arrives at the Minnie Drive entrance and uses the keypad to find your name in the directory.",
  },
  {
    step: "2",
    text: "The system calls your registered phone number automatically.",
  },
  {
    step: "3",
    text: "You answer and press 9 on your phone to open the gate and grant entry.",
  },
  {
    step: "4",
    text: "Press any other key — or simply don't answer — to deny entry.",
  },
]

/* ── Page ─────────────────────────────────────────────────────── */

export default function AccessControlPage() {
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
          <h1 className="hero-title">Access Control</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Pristine Place is a private, gated community. Our access control system ensures that only
            residents, authorized guests, and verified visitors may enter — protecting the security
            and tranquility of every home.
          </p>
        </div>
      </section>

      {/* ── Section 1: What You Need to Enter ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>

          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>What You Need to Enter</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, maxWidth: "60ch" }}>
              There are three ways to enter a Pristine Place gate. Most residents use a barcode or fob
              as their primary credential and keep the gate code as a backup.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {credentials.map((cred) => {
              const Icon = cred.icon
              return (
                <div
                  key={cred.label}
                  className="card"
                  style={{
                    padding: "var(--space-l)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-s)",
                    borderTop: "3px solid var(--pp-navy-dark)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        borderRadius: "var(--radius-md)",
                        background: "var(--pp-navy-dark)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-gold-light)" }} />
                    </div>
                    <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                      {cred.label}
                    </h3>
                  </div>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                    {cred.description}
                  </p>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span
                      className="text-step-1 font-bold"
                      style={{ color: "var(--pp-navy-dark)" }}
                    >
                      {cred.badge}
                    </span>
                    <span className="text-fluid-xs" style={{ color: "var(--pp-slate-400)" }}>
                      {cred.badgeLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── Section 2: How to Obtain Your Credentials ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>How to Obtain Your Credentials</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Credentials are issued in person at the Pristine Place Clubhouse. Stop by during office
                hours — no appointment needed.
              </p>
            </div>

            {/* Office hours + address */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span
                    className="text-fluid-sm font-bold"
                    style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Office Hours
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  {siteConfig.hours.office}
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-400)" }}>
                  {siteConfig.hours.closed}
                </p>
              </div>

              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MapPin style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span
                    className="text-fluid-sm font-bold"
                    style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Location
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Pristine Place Clubhouse
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                  {siteConfig.contact.address.street}<br />
                  {siteConfig.contact.address.city}, {siteConfig.contact.address.state}{" "}
                  {siteConfig.contact.address.zip}
                </p>
              </div>
            </div>

            {/* Pricing table */}
            <div className="stack-xs">
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                Pricing
              </h3>
              <div
                className="card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--pp-navy-dark)" }}>
                      <th
                        className="text-fluid-sm font-semibold"
                        style={{ color: "var(--pp-gold-light)", padding: "0.7rem var(--space-m)", textAlign: "left" }}
                      >
                        Credential
                      </th>
                      <th
                        className="text-fluid-sm font-semibold"
                        style={{ color: "var(--pp-gold-light)", padding: "0.7rem var(--space-m)", textAlign: "left", whiteSpace: "nowrap" }}
                      >
                        Cost
                      </th>
                      <th
                        className="text-fluid-sm font-semibold"
                        style={{ color: "var(--pp-gold-light)", padding: "0.7rem var(--space-m)", textAlign: "left" }}
                      >
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map((row, i) => (
                      <tr
                        key={row.item}
                        style={{
                          borderBottom: i < pricing.length - 1 ? "1px solid var(--pp-slate-100)" : "none",
                        }}
                      >
                        <td
                          className="text-fluid-sm font-semibold"
                          style={{ color: "var(--pp-navy-dark)", padding: "0.8rem var(--space-m)", verticalAlign: "top" }}
                        >
                          {row.item}
                        </td>
                        <td
                          className="text-fluid-sm font-bold"
                          style={{ color: "var(--pp-navy)", padding: "0.8rem var(--space-m)", verticalAlign: "top", whiteSpace: "nowrap" }}
                        >
                          {row.cost}
                        </td>
                        <td
                          className="text-fluid-sm"
                          style={{ color: "var(--pp-slate-500)", padding: "0.8rem var(--space-m)", verticalAlign: "top", lineHeight: 1.6 }}
                        >
                          {row.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6 }}>
                Cash or check accepted. Make checks payable to <strong>Pristine Place HOA</strong>.
                Payment is due at the time of pickup.
              </p>
            </div>

            {/* Vendor / contractor note */}
            <div
              style={{
                padding: "var(--space-s) var(--space-m)",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-slate-100)",
                borderLeft: "3px solid var(--pp-slate-300)",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-400)", flexShrink: 0, marginTop: "0.15rem" }} />
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                <strong>Contractors and service providers</strong> may receive temporary day-access through the
                Access Control Committee. Vendors must present a business card upon check-in. To arrange
                contractor access, contact Access Control in advance using the information below.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 3: Using the Gate Callbox ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Using the Gate Callbox</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Barcode and fob access is available at all three community gates. The visitor callbox
                is located at the <strong>Minnie Drive entrance</strong> (St. Ives Blvd &amp; Minnie Dr).
                Guests who do not have a barcode or fob can call you directly from the callbox directory.
              </p>
            </div>

            {/* How it works */}
            <div className="stack-xs">
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                How It Works
              </h3>
              <ol style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
                {callboxSteps.map((s) => (
                  <li key={s.step} style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start" }}>
                    <span
                      className="text-fluid-sm font-bold"
                      style={{
                        minWidth: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "50%",
                        background: "var(--pp-navy-dark)",
                        color: "var(--pp-white)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {s.step}
                    </span>
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.65, paddingTop: "0.15rem" }}>
                      {s.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Phone number callout */}
            <div
              style={{
                padding: "var(--space-s) var(--space-m)",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-slate-100)",
                borderLeft: "3px solid var(--pp-navy-dark)",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <Phone style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)", flexShrink: 0, marginTop: "0.15rem" }} />
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                <strong>Keep your phone number current.</strong> Your registered number must be on file with
                Access Control to appear in the gate callbox directory. If your number has changed, contact
                Access Control to update your record — otherwise visitors will be unable to reach you from
                the gate.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 4: Keeping Your Access Current ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Keeping Your Access Current</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Keeping access credentials current is an important part of maintaining the security of
                our community. When circumstances change, please take a moment to notify Access Control
                so that gate access reflects only current, authorized residents.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* When residents move */}
              <div
                className="card stack-xs"
                style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-navy-dark)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Lock style={{ width: "1.1rem", height: "1.1rem", color: "var(--pp-navy)" }} />
                  <h3 className="text-step-0 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    When a Resident Moves or Household Changes
                  </h3>
                </div>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  When a resident moves, a lease ends, or household members change, please contact
                  Access Control to deactivate any barcodes, fobs, or codes that are no longer needed.
                  Deactivating outdated credentials promptly ensures that only current residents retain
                  gate access.
                </p>
              </div>

              {/* Phone number updates */}
              <div
                className="card stack-xs"
                style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-slate-300)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Phone style={{ width: "1.1rem", height: "1.1rem", color: "var(--pp-slate-400)" }} />
                  <h3 className="text-step-0 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    Updating Your Phone Number
                  </h3>
                </div>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  Your phone number must be registered with Access Control to appear in the gate callbox
                  directory. If your number changes, or if you want your number added or removed from the
                  directory, contact Access Control directly to update your record.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Section 5: Contact Access Control (CTA strip) ── */}
      <section className="section" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-white)" }}>Contact Access Control</h2>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                For new credentials, replacement credentials, contractor access, or any changes to
                your gate access record, reach out to the Access Control Committee.
              </p>
            </div>

            {/* Contact cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* Chair */}
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
                  <p className="text-fluid-sm font-semibold" style={{ color: "var(--pp-gold-light)" }}>
                    Committee Chair
                  </p>
                  <p className="text-fluid-base font-bold" style={{ color: "var(--pp-white)" }}>
                    Carol Ruland
                  </p>
                </div>
              </div>

              {/* Email */}
              <div
                className="card stack-xs"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Mail style={{ width: "1rem", height: "1rem", color: "var(--pp-gold-light)" }} />
                  <span
                    className="text-fluid-sm font-bold"
                    style={{ color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Email
                  </span>
                </div>
                <a
                  href="mailto:accesscontrol@pristineplace.us"
                  className="text-fluid-base font-semibold"
                  style={{ color: "var(--pp-white)", textDecoration: "none" }}
                >
                  accesscontrol@pristineplace.us
                </a>
              </div>

              {/* Phone */}
              <div
                className="card stack-xs"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Phone style={{ width: "1rem", height: "1rem", color: "var(--pp-gold-light)" }} />
                  <span
                    className="text-fluid-sm font-bold"
                    style={{ color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Phone
                  </span>
                </div>
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="text-fluid-base font-semibold"
                  style={{ color: "var(--pp-white)", textDecoration: "none" }}
                >
                  {siteConfig.contact.phone}
                </a>
              </div>

              {/* Hours */}
              <div
                className="card stack-xs"
                style={{
                  padding: "var(--space-m)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock style={{ width: "1rem", height: "1rem", color: "var(--pp-gold-light)" }} />
                  <span
                    className="text-fluid-sm font-bold"
                    style={{ color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Office Hours
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-white)", lineHeight: 1.5 }}>
                  {siteConfig.hours.office}
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

    </>
  )
}
