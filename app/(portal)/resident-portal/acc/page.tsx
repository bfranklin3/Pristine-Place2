// app/(portal)/resident-portal/acc/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { Shield, Mail, CalendarDays, CheckCircle2, XCircle, ExternalLink, ClipboardList, Palette, User } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { AccGuidelinesGrid } from "@/components/portal/acc-guidelines-grid"
import { getAccGuidelines } from "@/lib/sanity/acc-guidelines"

export const metadata: Metadata = {
  title: `Architectural Control Committee | ${siteConfig.name} Resident Portal`,
  description: `Learn about the ACC review process, which projects need approval, and how to submit an architectural change request at ${siteConfig.name}.`,
}

/* ── Data ───────────────────────────────────────────────────── */

const needsApproval = [
  "Tree removal",
  "Installing or enlarging plant beds",
  "Home additions and new construction",
  "Driveway replacement, extensions, and pavers",
  "Yard structures — playhouses, swing sets, pergolas, etc.",
  "Roof replacement",
  "Repainting the home exterior",
  "Installing or replacing a fence",
  "Installing or replacing a lanai or pool cage",
  "Installing or replacing outdoor appliances — pool heater, propane tank, water conditioner, etc.",
  "Solar panels and other energy equipment",
]

const noApprovalNeeded = [
  "Repairing or resurfacing a pool",
  "Repairing window, porch, lanai, or pool screening (privacy screening requires a permit)",
  "Replacing trees, shrubs, and flowers within an existing plant bed (changing more than 50% of plants in a bed requires a permit)",
  "Trimming trees and shrubs",
  "Cleaning and power washing of sidewalks, driveways, lanai, or pool areas",
]

/* ── Page ─────────────────────────────────────────────────────── */

export default async function AccPage() {
  const guidelines = await getAccGuidelines()

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
          <h1 className="hero-title">Architectural Control Committee</h1>
          <p className="hero-subtitle" style={{ maxWidth: "54ch" }}>
            Maintaining community standards and property values through thoughtful exterior design review.
          </p>
        </div>
      </section>

      {/* ── About the ACC ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>About the ACC</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                The Architectural Control Committee helps protect what makes Pristine Place exceptional — consistent,
                well-maintained homes and properties that reflect the pride of every resident. Before exterior work
                begins, the ACC reviews proposals to ensure they align with community standards and covenants.
              </p>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, marginTop: "0.75rem" }}>
                Working with the ACC is a benefit, not a burden. The review process is designed to help you — catching
                potential conflicts with community standards before work begins, not after — saving time, money, and
                the frustration of having to redo completed work.
              </p>
            </div>

            {/* Chair info */}
            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-m)",
                padding: "var(--space-m)",
                borderLeft: "4px solid var(--pp-navy-dark)",
                flexWrap: "wrap",
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
                <User style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
              </div>
              <div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Committee Chair: Cheryl Franklin
                </p>
                <a
                  href="mailto:acc@pristineplace.us"
                  className="text-fluid-sm hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  acc@pristineplace.us
                </a>
              </div>
            </div>

            {/* Scope list */}
            <div className="stack-xs">
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                Projects the ACC Reviews
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)" }}>
                The ACC reviews a wide range of exterior projects, including:
              </p>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))",
                  gap: "var(--space-xs) var(--space-l)",
                  paddingLeft: 0,
                  listStyle: "none",
                  marginTop: "var(--space-xs)",
                }}
              >
                {[
                  "Home additions and exterior renovations",
                  "Landscape modifications",
                  "Fences, decks, and patios",
                  "Exterior paint colors",
                  "Driveways and walkways",
                  "Solar panels and energy equipment",
                  "Playsets and recreational equipment",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <CheckCircle2 style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)", flexShrink: 0, marginTop: "0.2rem" }} />
                    <span className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Approval Lists ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
              gap: "var(--space-l)",
              alignItems: "start",
            }}
          >

            {/* Needs approval */}
            <div className="card stack" style={{ gap: "var(--space-m)", padding: "var(--space-l)", borderTop: "3px solid var(--pp-navy-dark)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <ClipboardList style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                <h2 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  Requires ACC Approval
                </h2>
              </div>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6 }}>
                The following projects require a submitted and approved ACC request before work begins.
                This list is not exhaustive — when in doubt, submit a request.
              </p>
              <ul className="stack" style={{ paddingLeft: 0, listStyle: "none", gap: "0" }}>
                {needsApproval.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", paddingBlock: "0.4rem", borderBottom: "1px solid var(--pp-slate-100)" }}>
                    <CheckCircle2 style={{ width: "1rem", height: "1rem", color: "var(--pp-navy-dark)", flexShrink: 0, marginTop: "0.2rem" }} />
                    <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* No approval needed */}
            <div className="card stack" style={{ gap: "var(--space-m)", padding: "var(--space-l)", borderTop: "3px solid var(--pp-slate-300)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <XCircle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-slate-400)" }} />
                <h2 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  No Approval Required
                </h2>
              </div>
              <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6 }}>
                These common maintenance and improvement tasks do not require an ACC form. HOA Rules &amp;
                Regulations still apply — some items carry additional permit conditions noted below.
              </p>
              <ul className="stack" style={{ paddingLeft: 0, listStyle: "none", gap: "0" }}>
                {noApprovalNeeded.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", paddingBlock: "0.4rem", borderBottom: "1px solid var(--pp-slate-100)" }}>
                    <XCircle style={{ width: "1rem", height: "1rem", color: "var(--pp-slate-300)", flexShrink: 0, marginTop: "0.2rem" }} />
                    <span className="text-fluid-sm" style={{ color: "var(--pp-slate-700)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Start Your Request ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>

          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Start Your Request</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", maxWidth: "58ch" }}>
              Submit an application online or review the community&rsquo;s approved exterior paint colors before
              planning your project.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >

            {/* Change Request card */}
            <Link
              href="/resident-portal/acc/submit"
              className="card card-hover"
              style={{ textDecoration: "none", padding: "var(--space-l)", display: "flex", flexDirection: "column", gap: "var(--space-s)" }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--pp-navy-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardList style={{ width: "1.375rem", height: "1.375rem", color: "var(--pp-gold-light)" }} />
              </div>
              <div>
                <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  Architectural Change Request
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.375rem", lineHeight: 1.6 }}>
                  Submit your project proposal online. Please provide as much detail as possible — plans, dimensions,
                  materials, and photos help the committee review your request quickly and accurately.
                </p>
              </div>
              <span
                className="text-fluid-sm font-semibold"
                style={{ color: "var(--pp-navy-dark)", marginTop: "auto" }}
              >
                Submit a request →
              </span>
            </Link>

            {/* Paint Colors card */}
            <a
              href="https://www.sherwin-williams.com/homeowners/color/find-and-explore-colors/hoa/spring-hill/fl/pristine-place/"
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover"
              style={{ textDecoration: "none", padding: "var(--space-l)", display: "flex", flexDirection: "column", gap: "var(--space-s)" }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--pp-navy-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Palette style={{ width: "1.375rem", height: "1.375rem", color: "var(--pp-gold-light)" }} />
              </div>
              <div>
                <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  Approved Exterior Paint Colors
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.375rem", lineHeight: 1.6 }}>
                  These are the only approved exterior paint colors for Pristine Place, hosted on the
                  Sherwin-Williams HOA portal. If the link is unavailable, contact the ACC directly for
                  the current approved palette.
                </p>
              </div>
              <span
                className="text-fluid-sm font-semibold"
                style={{ color: "var(--pp-navy-dark)", marginTop: "auto", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                View on Sherwin-Williams <ExternalLink style={{ width: "0.75rem", height: "0.75rem" }} />
              </span>
            </a>

          </div>
        </div>
      </section>

      {/* ── Contact & Meeting Schedule ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <h2 style={{ color: "var(--pp-navy-dark)" }}>Contact &amp; Meeting Schedule</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
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
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                  Application submissions and general inquiries
                </p>
                <a
                  href="mailto:acc@pristineplace.us"
                  className="text-fluid-base font-semibold hover:text-pp-navy transition-colors"
                  style={{ color: "var(--pp-navy-dark)" }}
                >
                  acc@pristineplace.us
                </a>
              </div>

              {/* Meeting schedule */}
              <div className="card stack-xs" style={{ padding: "var(--space-m)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CalendarDays style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Meeting Schedule
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Second Wednesday of each month — 6:30 PM
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                  Community Clubhouse
                </p>
                <div
                  style={{
                    marginTop: "var(--space-2xs)",
                    padding: "var(--space-xs) var(--space-s)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--pp-slate-100)",
                    borderLeft: "3px solid var(--pp-navy-dark)",
                  }}
                >
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                    <strong>Submission deadline:</strong> Applications must be submitted no later than two calendar
                    days (48 hours) before the scheduled meeting to be included in that month&rsquo;s agenda.
                    Late submissions are held for the following meeting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architectural Guidelines ── */}
      <section
        id="architectural-guidelines"
        className="section"
        style={{ background: "var(--pp-white)", scrollMarginTop: "6rem" }}
      >
        <div className="container stack" style={{ gap: "var(--space-l)" }}>

          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Architectural Guidelines</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", maxWidth: "60ch" }}>
              The ACC maintains detailed written guidelines covering specific topics. Filter by category to
              review currently published ACC guideline articles.
            </p>
          </div>

          <AccGuidelinesGrid guidelines={guidelines} />

        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="section-sm" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-m)",
            }}
          >
            <div className="stack-xs">
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-white)" }}>
                Ready to start your project?
              </h3>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "50ch" }}>
                All exterior modifications must be approved before work begins. Submitting early gives you
                the best chance of review at the next monthly meeting.
              </p>
            </div>
            <Link
              href="/resident-portal/acc/submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 1.4rem",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-gold-light)",
                color: "var(--pp-navy-dark)",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <ClipboardList style={{ width: "1rem", height: "1rem" }} />
              Submit an ACC Request
            </Link>
          </div>
        </div>
      </section>

    </>
  )
}
