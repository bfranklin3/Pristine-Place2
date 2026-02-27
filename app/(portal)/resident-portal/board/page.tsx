// app/(portal)/resident-portal/board/page.tsx

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Mail, Shield, CalendarDays, FileText } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Board of Directors | ${siteConfig.name} Resident Portal`,
  description: `Meet the elected Board of Directors overseeing the governance and operations of ${siteConfig.name} HOA.`,
}

const boardMembers = [
  { name: "David Abbott",     role: "President",         image: "/images/David-Abbott.png"    },
  { name: "Rich Ruland",      role: "Vice President",    image: "/images/Rich-Ruland.png"     },
  { name: "Deborah Hresko",   role: "Treasurer",         image: "/images/Deborah-Hresko.png"  },
  { name: "Pierre Richard",   role: "Secretary",         image: "/images/Pierre-Richard.png"  },
  { name: "Joshua Rodriguez", role: "Director at Large", image: "/images/Josh-Rodriquez.jpeg" },
]

export default function BoardPage() {
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
          <h1 className="hero-title">Board of Directors</h1>
          <p className="hero-subtitle">
            Elected volunteers who oversee the governance and operations of {siteConfig.name} HOA.
          </p>
        </div>
      </section>

      {/* ── Board Members ── */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>

          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Board of Directors</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
              Elected volunteers who oversee the governance and operations of {siteConfig.name} HOA.
            </p>
          </div>

          <div className="grid-auto-fit" style={{ gridAutoRows: "1fr" }}>

            {/* ── 5 Member Cards ── */}
            {boardMembers.map((member) => (
              <div
                key={member.role}
                className="card stack"
                style={{ textAlign: "center", gap: "var(--space-m)", padding: "var(--space-xl)", justifyContent: "center" }}
              >
                {/* Photo */}
                <div
                  className="relative rounded-full overflow-hidden mx-auto"
                  style={{
                    width: "6rem",
                    height: "6rem",
                    flexShrink: 0,
                    boxShadow: "0 0 0 3px var(--pp-gold), 0 0 0 5px rgba(58,90,64,0.15)",
                  }}
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                {/* Info */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-m)" }}>
                  <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                    {member.name}
                  </h3>
                  <span className="badge badge-primary">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}

            {/* ── 6th Card: Contact the Board ── */}
            <div
              className="card stack"
              style={{
                textAlign: "center",
                gap: "var(--space-s)",
                padding: "var(--space-l)",
                justifyContent: "center",
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: "6rem",
                  height: "6rem",
                  borderRadius: "50%",
                  background: "var(--pp-slate-100)",
                  border: "3px solid var(--pp-navy-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginInline: "auto",
                  flexShrink: 0,
                }}
              >
                <Mail style={{ width: "2.25rem", height: "2.25rem", color: "var(--pp-navy-dark)" }} />
              </div>

              {/* Text */}
              <div className="stack-xs">
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Contact the Board
                </h3>
                <p
                  className="text-fluid-sm"
                  style={{ color: "var(--pp-slate-500)", maxWidth: "22ch", marginInline: "auto", lineHeight: 1.55 }}
                >
                  Questions, concerns, or suggestions? Reach the full board directly.
                </p>
              </div>

              {/* Email link */}
              <a
                href="mailto:bod@pristineplace.us"
                className="badge badge-primary hover:bg-pp-navy hover:text-white transition-colors"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  justifyContent: "center",
                  marginInline: "auto",
                  marginTop: "var(--space-xs)",
                  textDecoration: "none",
                }}
              >
                <Mail style={{ width: "0.75rem", height: "0.75rem" }} />
                bod@pristineplace.us
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── Board Info Strip ── */}
      <section className="section-sm" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div
            className="card"
            style={{
              background: "var(--pp-white)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-l)",
              padding: "var(--space-l)",
              borderLeft: "4px solid var(--pp-navy-dark)",
            }}
          >

            {/* Text */}
            <div className="stack-xs" style={{ flex: "1 1 28rem" }}>
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                Board Meetings
              </h3>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                Board meetings are open to all residents and are held monthly at the Community Clubhouse.
                Residents may attend to ask questions during the open forum portion of the agenda.
                Check the events calendar for upcoming meeting dates and agendas.
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", flexShrink: 0 }}>
              <Link
                href="/resident-portal/events"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--pp-navy-dark)",
                  color: "var(--pp-white)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <CalendarDays style={{ width: "1rem", height: "1rem" }} />
                View Events Calendar
              </Link>
              <Link
                href="/resident-portal/documents"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--pp-navy-dark)",
                  color: "var(--pp-navy-dark)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  background: "transparent",
                }}
              >
                <FileText style={{ width: "1rem", height: "1rem" }} />
                Meeting Minutes &amp; Documents
              </Link>
            </div>

          </div>
        </div>
      </section>

    </>
  )
}
