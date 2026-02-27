// app/(portal)/resident-portal/crime-watch/page.tsx

import type { Metadata } from "next"
import { Shield, Users, Calendar, ExternalLink, Phone, Mail, User } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Crime Watch | ${siteConfig.name} Resident Portal`,
  description: `Pristine Place Crime Watch is a resident-led safety program in partnership with the Hernando County Sheriff's Office.`,
}

export default function CrimeWatchPage() {
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
          <h1 className="hero-title">Crime Watch</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Pristine Place Crime Watch is a resident-led safety program operating in partnership with the
            Hernando County Sheriff&rsquo;s Office. Our volunteers help maintain the security, awareness,
            and peace of mind that make Pristine Place an exceptional place to call home.
          </p>
        </div>
      </section>

      {/* ── Section 1: About Crime Watch ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>About Crime Watch</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Crime Watch members are trained volunteers who work alongside the Hernando County
                Sheriff&rsquo;s Office to support community safety initiatives. Through the Sheriff&rsquo;s
                Workforce Citizen Volunteer Corps, members receive training, access to resources, and direct
                communication with law enforcement.
              </p>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, marginTop: "0.75rem" }}>
                Our volunteers help keep residents informed about local safety concerns, distribute alerts,
                and maintain the visible presence that deters crime and builds trust among neighbors.
              </p>
            </div>

            {/* What Crime Watch Does */}
            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                borderLeft: "4px solid var(--pp-navy-dark)",
              }}
            >
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-s)" }}>
                What Crime Watch Members Do
              </h3>
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-xs)",
                  paddingLeft: "1.25rem",
                  color: "var(--pp-slate-700)",
                }}
              >
                <li className="text-fluid-base" style={{ lineHeight: 1.6 }}>
                  Serve as trained liaisons between residents and the Hernando County Sheriff&rsquo;s Office
                </li>
                <li className="text-fluid-base" style={{ lineHeight: 1.6 }}>
                  Distribute safety alerts and crime prevention information to the community
                </li>
                <li className="text-fluid-base" style={{ lineHeight: 1.6 }}>
                  Participate in neighborhood awareness programs and community events
                </li>
                <li className="text-fluid-base" style={{ lineHeight: 1.6 }}>
                  Access supplemental training and resources through the Sheriff&rsquo;s Workforce Citizen Volunteer Corps
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 2: Join Crime Watch ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Join Crime Watch</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Crime Watch members play an active role in keeping Pristine Place safe and informed — and
                benefit from direct access to training, resources, and communication channels through the
                Hernando County Sheriff&rsquo;s Workforce Citizen Volunteer Corps.
              </p>
            </div>

            {/* Meeting info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              <div className="card" style={{ padding: "var(--space-m)", borderTop: "3px solid var(--pp-navy-dark)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "var(--space-xs)" }}>
                  <Calendar style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span
                    className="text-fluid-xs font-bold"
                    style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Meetings
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Last Wednesday of Each Month
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  Community Clubhouse
                </p>
              </div>

              <div className="card" style={{ padding: "var(--space-m)", borderTop: "3px solid var(--pp-navy-dark)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "var(--space-xs)" }}>
                  <Users style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
                  <span
                    className="text-fluid-xs font-bold"
                    style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Open to All
                  </span>
                </div>
                <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Residents Welcome
                </p>
                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                  All Pristine Place residents are invited to attend and get involved
                </p>
              </div>
            </div>

            {/* Application CTA */}
            <div
              className="card"
              style={{
                padding: "var(--space-l)",
                borderLeft: "4px solid var(--pp-navy-dark)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-m)",
              }}
            >
              <div>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Apply to Volunteer
                </h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7, marginTop: "var(--space-xs)" }}>
                  To become an official Crime Watch volunteer, complete the Hernando County Sheriff&rsquo;s
                  Office Citizen Volunteer Corps application. New volunteers begin at Level I and receive
                  training and credentials through the Sheriff&rsquo;s Office.
                </p>
              </div>
              <div>
                {/* TODO: Replace href="#" with actual Sheriff's Office volunteer application URL */}
                <a
                  href="https://hernandosheriffvolunteer.applicantstack.com/x/detail/a2w5nvj3m6ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1.4rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--pp-navy-dark)",
                    color: "var(--pp-white)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Apply to Join Crime Watch
                  <ExternalLink style={{ width: "0.875rem", height: "0.875rem" }} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 3: County Resources ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-navy-dark)" }}>Hernando County Resources</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                The Hernando County Sheriff&rsquo;s Office offers two supplemental safety programs available
                to all Pristine Place residents.
              </p>
            </div>

            {/* Care Line */}
            <div className="card" style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-slate-300)" }}>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-s)" }}>
                Hernando County Care Line
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                The Hernando County Sheriff&rsquo;s Office has established a program for the security and
                well-being of those people living alone who would like daily contact with someone who cares.
              </p>
              <div style={{ marginTop: "var(--space-s)" }}>
                {/* TODO: Replace href="#" with actual Care Line program URL */}
                <a
                  href="https://www.pristineplace.us/wp-content/uploads/2025/04/Updated_Care-Line-Brochure.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluid-base font-semibold"
                  style={{
                    color: "var(--pp-navy-dark)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  Learn More
                  <ExternalLink style={{ width: "0.75rem", height: "0.75rem" }} />
                </a>
              </div>
            </div>

            {/* Project Safe Return */}
            <div className="card" style={{ padding: "var(--space-l)", borderTop: "3px solid var(--pp-slate-300)" }}>
              <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-s)" }}>
                Hernando County Project Safe Return
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
                Project Safe Return (PSR) is a program initiated by the Hernando County Sheriff&rsquo;s
                Office to assist law enforcement in facilitating the safe return home of individuals with
                cognitive and/or behavioral disorders who have wandered away from home or become lost.
              </p>
              <div style={{ marginTop: "var(--space-s)" }}>
                {/* TODO: Replace href="#" with actual Project Safe Return program URL */}
                <a
                  href="https://www.hernandosheriff.org/applications/ProjectSafeReturn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluid-base font-semibold"
                  style={{
                    color: "var(--pp-navy-dark)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  Learn More
                  <ExternalLink style={{ width: "0.75rem", height: "0.75rem" }} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 4: Contact ── */}
      <section className="section" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <h2 style={{ color: "var(--pp-white)" }}>Contact Crime Watch</h2>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)" }}>
                For questions about Crime Watch, meeting schedules, or volunteer opportunities.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15rem), 1fr))",
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
                  <p
                    className="text-fluid-xs font-bold"
                    style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    Chair
                  </p>
                  <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-white)", marginTop: "0.125rem" }}>
                    Joshua Rodriguez
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
                    href="mailto:hazie2300@gmail.com"
                    className="text-fluid-base font-semibold"
                    style={{ color: "var(--pp-white)", textDecoration: "none", wordBreak: "break-all" }}
                  >
                    hazie2300@gmail.com
                  </a>
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
                    href={`tel:${siteConfig.contact.phoneRaw}`}
                    className="text-fluid-base font-semibold"
                    style={{ color: "var(--pp-white)", textDecoration: "none" }}
                  >
                    {siteConfig.contact.phone}
                  </a>
                  <p className="text-fluid-xs" style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.125rem" }}>
                    {siteConfig.hours.office}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    </>
  )
}
