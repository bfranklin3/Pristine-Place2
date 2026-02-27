// app/(portal)/resident-portal/exterior-modifications/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { Home, CheckCircle2, XCircle, ClipboardList, Palette, ExternalLink, Lightbulb, FileCheck, AlertTriangle, Calendar } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Exterior Modifications Guide | ${siteConfig.name} Resident Portal`,
  description: "A comprehensive guide to planning and executing exterior home modifications at Pristine Place, including what requires approval and best practices.",
}

/* ── Data (borrowed from ACC page) ────────────────────────── */

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

/* ── Page ───────────────────────────────────────────────────── */

export default function ExteriorModificationsPage() {
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
            <Home style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Exterior Modifications Guide</h1>
          <p className="hero-subtitle" style={{ maxWidth: "56ch" }}>
            Your complete resource for planning exterior home improvements — from understanding approval
            requirements to executing your project successfully.
          </p>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Why This Guide Matters</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Your home is your most valuable investment, and exterior modifications can significantly enhance
                both its beauty and value. Whether you&rsquo;re planning a fresh coat of paint, a new fence, or a
                complete landscape redesign, understanding the approval process before you start saves time, money,
                and frustration.
              </p>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, marginTop: "0.75rem" }}>
                At Pristine Place, the Architectural Control Committee (ACC) exists to maintain community standards
                while helping you achieve your vision. This guide walks you through what you need to know to plan
                successfully and avoid common pitfalls.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Planning Your Project ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Planning Your Project</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", maxWidth: "60ch" }}>
                Successful exterior modifications start with proper planning. Follow these key steps to ensure
                your project goes smoothly from concept to completion.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >

              {/* Step 1 */}
              <div className="card" style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-navy-dark)" }}>
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: "var(--pp-navy-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "var(--space-s)",
                  }}
                >
                  <Lightbulb style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-gold-light)" }} />
                </div>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-xs)" }}>
                  1. Define Your Vision
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Gather inspiration, sketch ideas, and create a clear picture of what you want to achieve.
                  Consider functionality, aesthetics, and how the modification will complement your home&rsquo;s
                  existing style.
                </p>
              </div>

              {/* Step 2 */}
              <div className="card" style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-slate-400)" }}>
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: "var(--pp-slate-600)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "var(--space-s)",
                  }}
                >
                  <FileCheck style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
                </div>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-xs)" }}>
                  2. Check Requirements
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  Review the approval lists below to determine if your project requires ACC approval. When in doubt,
                  submit a request — it&rsquo;s better to ask than to proceed incorrectly and face compliance issues
                  later.
                </p>
              </div>

              {/* Step 3 */}
              <div className="card" style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-gold)" }}>
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: "var(--pp-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "var(--space-s)",
                  }}
                >
                  <Calendar style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
                </div>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-xs)" }}>
                  3. Submit Early
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                  The ACC meets monthly on the second Wednesday. Submit your application at least 48 hours before
                  the meeting to be included in that month&rsquo;s agenda. Early submissions allow time for questions
                  and revisions if needed.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── Common Modifications Overview ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Common Modifications Overview</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", lineHeight: 1.7 }}>
                Understanding the most common types of exterior modifications can help you plan more effectively
                and anticipate what the ACC will need to review your request.
              </p>
            </div>

            {/* Landscaping */}
            <div>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                Landscaping &amp; Plant Beds
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Landscape modifications that change the overall appearance of your property require approval. This
                includes removing trees, installing new plant beds, or significantly altering existing landscaping.
                Simple maintenance like trimming shrubs or replacing a few plants within an existing bed does not
                require approval.
              </p>
            </div>

            {/* Paint */}
            <div>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                Exterior Paint Colors
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                All exterior paint projects require ACC approval, and colors must be selected from the community&rsquo;s
                approved palette hosted on the Sherwin-Williams HOA portal. This ensures visual harmony throughout
                the community. The approved palette includes a wide variety of tasteful options for main body, trim,
                and accent colors.
              </p>
            </div>

            {/* Structures */}
            <div>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                Fences, Decks &amp; Outdoor Structures
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Installing or replacing fences, pergolas, playsets, or other yard structures requires approval to
                ensure they meet community standards for materials, height, and placement. The ACC reviews these
                requests for compliance with county codes and HOA covenants, as well as visual compatibility with
                neighboring properties.
              </p>
            </div>

            {/* Hardscaping */}
            <div>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-2xs)" }}>
                Driveways, Walkways &amp; Hardscaping
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Replacing or extending driveways, adding paver walkways, or installing decorative hardscaping features
                require ACC review. The committee evaluates materials, drainage considerations, and visual impact to
                ensure modifications enhance rather than detract from your property&rsquo;s curb appeal.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Approval Lists (borrowed from ACC page) ── */}
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

      {/* ── Start Your Request (borrowed from ACC page) ── */}
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

      {/* ── Additional Resources ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div
            className="card"
            style={{
              padding: "var(--space-l)",
              borderLeft: "4px solid var(--pp-navy-dark)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "50%",
                  background: "var(--pp-navy-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
              </div>
              <div className="stack-xs">
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Need More Information?
                </h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                  This guide provides an overview of the exterior modification process. For detailed architectural
                  guidelines, meeting schedules, submission deadlines, and contact information, visit the{" "}
                  <Link
                    href="/resident-portal/acc"
                    className="font-semibold hover:text-pp-navy transition-colors"
                    style={{ color: "var(--pp-navy-dark)", textDecoration: "underline" }}
                  >
                    ACC page
                  </Link>
                  . If you have specific questions about your project, contact the committee at{" "}
                  <a
                    href="mailto:acc@pristineplace.us"
                    className="font-semibold hover:text-pp-navy transition-colors"
                    style={{ color: "var(--pp-navy-dark)" }}
                  >
                    acc@pristineplace.us
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
