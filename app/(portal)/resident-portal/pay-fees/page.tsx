// app/(portal)/resident-portal/pay-fees/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { CreditCard, Calendar, Clock, HelpCircle, Mail, Phone, ExternalLink } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Pay HOA Fees | ${siteConfig.name} Resident Portal`,
  description: "Pay your homeowner association fees online through Greenacre Property Management's secure payment portal.",
}

/* ── Styles ── */
const paymentButtonStyles = `
  .payment-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.9rem 2rem;
    border-radius: var(--radius-md);
    background: var(--pp-gold-light);
    color: var(--pp-navy-dark);
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .payment-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  }
`

export default function PayFeesPage() {
  return (
    <>
      <style>{paymentButtonStyles}</style>

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
            <CreditCard style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Pay HOA Fees</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Pay your homeowner association fees online through Greenacre Property Management's secure payment portal.
          </p>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-m)" }}>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              Pristine Place HOA has partnered with Greenacre Property Management to provide a convenient, secure
              online payment system for all homeowner association fees. You can make payments 24/7 from any device
              using a variety of payment methods.
            </p>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              Your HOA fees help maintain our community's common areas, amenities, landscaping, security systems,
              and more — keeping Pristine Place beautiful and secure for all residents.
            </p>
          </div>
        </div>
      </section>

      {/* ── Make a Payment CTA ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-xl)",
              textAlign: "center",
              background: "linear-gradient(135deg, var(--pp-navy-dark) 0%, #2c4a32 100%)",
            }}
          >
            <div className="stack" style={{ gap: "var(--space-m)", alignItems: "center" }}>
              <div
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "50%",
                  background: "var(--pp-gold-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditCard style={{ width: "1.75rem", height: "1.75rem", color: "var(--pp-navy-dark)" }} />
              </div>

              <div className="stack-xs">
                <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-white)" }}>
                  Ready to Make a Payment?
                </h2>
                <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.85)", maxWidth: "50ch", margin: "0 auto" }}>
                  Click the button below to securely log in to Greenacre Property Management's payment portal and
                  complete your transaction.
                </p>
              </div>

              <a
                href="https://home.greenacre.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="payment-button"
              >
                Pay Online Now
                <ExternalLink style={{ width: "1.125rem", height: "1.125rem" }} />
              </a>

              <p className="text-fluid-sm" style={{ color: "rgba(255,255,255,0.65)", fontStyle: "italic" }}>
                You will be redirected to Greenacre's secure payment portal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Payment Information ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Payment Information</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* Payment Methods */}
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-s)" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-slate-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CreditCard style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                  </div>
                  <div className="stack-xs">
                    <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                      Payment Methods
                    </h3>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                      Pay with credit card, debit card, or electronic bank transfer (ACH) through Greenacre's
                      secure payment system.
                    </p>
                  </div>
                </div>
              </div>

              {/* Due Dates */}
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-s)" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-slate-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Calendar style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                  </div>
                  <div className="stack-xs">
                    <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                      Payment Schedule
                    </h3>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                      HOA fees are due monthly. Check your billing statement or contact Greenacre for your
                      specific due date and amount.
                    </p>
                  </div>
                </div>
              </div>

              {/* Processing Time */}
              <div className="card" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-s)" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-slate-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Clock style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                  </div>
                  <div className="stack-xs">
                    <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                      Processing Time
                    </h3>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                      Credit and debit card payments post immediately. ACH bank transfers may take 2-3 business
                      days to process.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── What Your Fees Cover ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>What Your HOA Fees Cover</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", lineHeight: 1.7 }}>
                Your monthly homeowner association fees fund essential services and amenities that maintain our
                community's quality of life and property values.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
                gap: "var(--space-s)",
              }}
            >
              {[
                "Common area maintenance",
                "Landscaping and irrigation",
                "Clubhouse operations",
                "Pool and fitness facility upkeep",
                "Tennis and pickleball courts",
                "Community insurance",
                "Reserve fund contributions",
                "Professional management services",
                "Architectural review administration",
                "Legal and compliance costs",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "var(--space-2xs)",
                  }}
                >
                  <div
                    style={{
                      width: "0.375rem",
                      height: "0.375rem",
                      borderRadius: "50%",
                      background: "var(--pp-navy-dark)",
                      flexShrink: 0,
                    }}
                  />
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Late Fees & Payment Issues ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-m)" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <HelpCircle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Late Fees & Payment Issues</h2>
            </div>

            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                borderLeft: "4px solid #f59e0b",
              }}
            >
              <div className="stack-xs">
                <h3 className="text-step-1 font-semibold" style={{ color: "#92400e" }}>
                  Avoid Late Fees
                </h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                  Late fees may be assessed on past-due accounts according to the Association's governing documents
                  and Florida law. To avoid penalties, ensure payments are submitted before the due date listed on
                  your billing statement. Contact Greenacre Property Management immediately if you are experiencing
                  difficulty making a payment — they may be able to work with you on a payment arrangement.
                </p>
              </div>
            </div>

            <div className="stack-xs">
              <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                Payment Confirmation
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                After submitting your payment through the Greenacre portal, you should receive an email confirmation.
                If you do not receive confirmation or if your payment is not reflected on your account within the
                expected processing time, contact Greenacre directly for assistance.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Questions About Payments?</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", lineHeight: 1.7 }}>
                For billing questions, payment assistance, or account inquiries, contact Greenacre Property
                Management directly.
              </p>
            </div>

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
                  href="mailto:info@greenacreproperties.com"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  info@greenacreproperties.com
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
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Contact via email for phone assistance
                </p>
              </div>

              {/* Payment Portal */}
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ExternalLink style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Payment Portal
                  </span>
                </div>
                <a
                  href="https://home.greenacre.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  home.greenacre.com →
                </a>
              </div>

            </div>

          </div>
        </div>
      </section>

    </>
  )
}
