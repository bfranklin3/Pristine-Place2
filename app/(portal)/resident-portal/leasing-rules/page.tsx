// app/(portal)/resident-portal/leasing-rules/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { FileText, AlertCircle, Mail, Phone, CheckCircle2 } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Rules for Renting/Leasing a Property | ${siteConfig.name} Resident Portal`,
  description: "Learn about the Board of Directors requirements and approval process for renting or leasing your property at Pristine Place.",
}

export default function LeasingRulesPage() {
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
            <FileText style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Rules for Renting/Leasing a Property in Pristine Place</h1>
        </div>
      </section>

      {/* ── Main Content ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            {/* Core rules */}
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <p className="text-fluid-base font-bold" style={{ color: "var(--pp-navy-dark)", lineHeight: 1.7 }}>
                Pristine Place has rules regarding property rentals and leases that are established by the Board of Directors.
              </p>

              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Property owners cannot rent out their property or allow anyone other than immediate family to live there
                without first getting approval from the Association&rsquo;s Board of Directors. All leases must be in writing,
                follow the Association&rsquo;s rules, and last between 3 and 12 months, with a limit of two rentals per year.
                Owners must notify the Board at least 15 days before signing a lease, pay a fee, and get the lease approved
                before the renter can move in. Owners must also provide renters with the Association&rsquo;s governing documents.
                Owners must have lived in the property as their main home for 12 months before renting it out, unless they
                inherited the property or transferred it to a trust for their benefit.
              </p>

              <div
                style={{
                  padding: "var(--space-s) var(--space-m)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--pp-slate-100)",
                  borderLeft: "3px solid var(--pp-navy-dark)",
                }}
              >
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                  Please refer to{" "}
                  <span className="font-semibold">Section 21 of the Amendment to the Declaration of Covenants (2024)</span>{" "}
                  or contact the HOA directly for guidelines concerning property rentals.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Key Requirements ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Key Requirements at a Glance</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "var(--space-s)",
              }}
            >
              {[
                { label: "Board Approval Required", detail: "Before any lease is signed" },
                { label: "Written Lease Only", detail: "All agreements must be in writing" },
                { label: "3–12 Month Duration", detail: "Lease must fall within this range" },
                { label: "Two Rentals Per Year Max", detail: "Frequency limit applies" },
                { label: "15-Day Notice", detail: "Notify Board before signing" },
                { label: "12-Month Owner Occupancy", detail: "Required before first rental (with exceptions)" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    padding: "var(--space-s)",
                  }}
                >
                  <CheckCircle2 style={{ width: "1rem", height: "1rem", color: "var(--pp-navy-dark)", flexShrink: 0, marginTop: "0.2rem" }} />
                  <div>
                    <p className="text-fluid-sm font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                      {item.label}
                    </p>
                    <p className="text-fluid-xs" style={{ color: "var(--pp-slate-500)", marginTop: "0.125rem" }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Approval Process ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>How to Request Approval</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", lineHeight: 1.7 }}>
                If you are planning to lease your property, follow these steps to ensure compliance with HOA requirements.
              </p>
            </div>

            <div className="stack" style={{ gap: "var(--space-m)" }}>

              {/* Step 1 */}
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-navy-dark)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                  1. Verify Eligibility
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Confirm you have lived in the property as your primary residence for at least 12 months, unless the
                  property was inherited or transferred to a trust for your benefit.
                </p>
              </div>

              {/* Step 2 */}
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                  2. Contact the Board
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Notify the Board of Directors at least 15 days before you plan to sign a lease. Provide details about
                  the proposed lease term, tenant information, and rental dates.
                </p>
              </div>

              {/* Step 3 */}
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                  3. Pay Required Fee
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Submit the required leasing approval fee. Contact the HOA office for current fee amounts and
                  payment instructions.
                </p>
              </div>

              {/* Step 4 */}
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                  4. Obtain Written Approval
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Wait for written approval from the Board before signing your lease or allowing the tenant to move in.
                </p>
              </div>

              {/* Step 5 */}
              <div className="card" style={{ padding: "var(--space-m)", borderLeft: "3px solid var(--pp-slate-400)" }}>
                <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                  5. Provide Governing Documents
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Supply your tenant with a copy of the Association&rsquo;s governing documents, including covenants,
                  restrictions, and community rules.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Important Notice ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-l)",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "50%",
                  background: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertCircle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-white)" }} />
              </div>
              <div className="stack-xs">
                <h3 className="text-step-1 font-semibold" style={{ color: "#991b1b" }}>
                  Non-Compliance May Result in Penalties
                </h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                  Renting your property without Board approval or failing to follow Association leasing rules may result
                  in fines, legal action, or other enforcement measures as outlined in the governing documents. Contact
                  the Board with any questions before proceeding with a rental arrangement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Questions About Leasing Your Property?</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* Email */}
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Mail style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Email
                  </span>
                </div>
                <a
                  href="mailto:board@pristineplace.us"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  board@pristineplace.us
                </a>
              </div>

              {/* Phone */}
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Phone style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Phone
                  </span>
                </div>
                <a
                  href="tel:+13525969496"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  (352) 596-9496
                </a>
              </div>

              {/* Documents */}
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Governing Documents
                  </span>
                </div>
                <Link
                  href="/documents"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  View Documents →
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

    </>
  )
}
