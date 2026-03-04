// app/(portal)/resident-portal/committees/page.tsx

import type { Metadata } from "next"
import { Mail, Phone, Shield, Users, CalendarDays } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Committees | ${siteConfig.name} Resident Portal`,
  description: `Standing committees and resident interest groups that help maintain and improve life at ${siteConfig.name}.`,
}

/* ── Data ─────────────────────────────────────────────────── */

const hoaCommittees = [
  {
    name: "Architectural Control Committee (ACC)",
    purpose:
      "Reviews and approves all exterior modifications to ensure every improvement aligns with community standards and maintains the visual harmony of Pristine Place.",
    leadership: "Cheryl Franklin, Chair",
    schedule: "Second Wednesday of the month — Community Clubhouse",
    email: "acc@pristineplace.us",
    phone: null,
  },
  {
    name: "Access Control",
    purpose:
      "Issues and manages the barcodes and FOBs required for resident access through the gates, clubhouse, pool, and fitness center.",
    leadership: "Carol Ruland, Chair",
    schedule: "Monday 10:30 AM – 12:30 PM · Wednesday & Friday 6:30 PM – 8:00 PM",
    email: "cruland@tampabay.rr.com",
    phone: null,
  },
  {
    name: "Appeals Committee",
    purpose:
      "Provides residents with an impartial review process, ensuring fairness and due process in all compliance and enforcement matters.",
    leadership: "To be announced",
    schedule: "To be announced",
    email: "bod@pristineplace.us",
    phone: null,
  },
  {
    name: "Communications Committee",
    purpose:
      "Manages the community website, email notifications, monthly newsletter, social media channels, and resident event announcements.",
    leadership: "Bill Franklin, Chair",
    schedule: "To be announced",
    email: "communication@pristineplace.us",
    phone: null,
  },
  {
    name: "Maintenance Committee",
    purpose:
      "Monitors and maintains the clubhouse building and all community property and facilities surrounding it.",
    leadership: "Jeries Alnemat & Aaron Cherry, Co-Leads",
    schedule: "To be announced",
    email: "clubmaint@pristineplace.us",
    phone: null,
  },
  {
    name: "Landscaping Committee",
    purpose:
      "Oversees all common-area landscaping, seasonal plantings, and grounds improvement projects throughout Pristine Place.",
    leadership: "David Borsick, Chair",
    schedule: "To be announced",
    email: "landscaping@pristineplace.us",
    phone: null,
  },
  {
    name: "Social Committee",
    purpose:
      "Plans and organizes community events and social activities that bring Pristine Place residents together throughout the year.",
    leadership: "Kim Van Tine, Chair",
    schedule: "Second Tuesday of the month — Community Clubhouse",
    email: "pristinesc2@gmail.com",
    phone: null,
  },
  {
    name: "Deed Restriction Compliance",
    purpose:
      "Ensures that community standards and deed restrictions are upheld consistently and fairly, protecting the appearance and property values of every home in Pristine Place.",
    leadership: "Kim Pennington, Property Manager — Greenacre Properties",
    schedule: "Available at Board of Directors Meetings — Third Tuesday of the month",
    email: "Kpennington@greenacre.com",
    phone: null,
  },
]

const residentGroups = [
  {
    name: "Book Club",
    purpose: "To be announced",
    leadership: "Ann Adams",
    schedule: "To be announced",
    phone: "716-997-2329",
    email: null,
  },
  {
    name: "Clubhouse Rental",
    purpose:
      "The Grand Ballroom is a spectacular venue for weddings, birthday parties, and other celebratory events — available to Pristine Place residents for a nominal fee.",
    leadership: "Janet Fehlhaber, Primary Contact",
    schedule: "Janet available 2:30 – 8:30 PM · Doris Perez, backup: 352-325-1493",
    phone: "352-238-0097",
    email: "clubhouserentals22@gmail.com",
  },
  {
    name: "Document Committee",
    purpose:
      "Supports the Board of Directors in managing, maintaining, and updating the Declaration of Covenants and all essential HOA governing documents.",
    leadership: "To be announced",
    schedule: "To be announced",
    phone: null,
    email: "documents@pristineplace.us",
  },
  {
    name: "Exercise Group",
    purpose:
      "A low-impact exercise class open to all residents — a great way to stay active and connect with neighbors.",
    leadership: "Gali Dyer",
    schedule: "Monday, Wednesday & Friday — 10:00 AM — Community Clubhouse",
    phone: "352-683-2678",
    email: null,
  },
  {
    name: "Gates",
    purpose:
      "Manages and maintains the community entry and exit gate systems to ensure reliable, secure access for all residents.",
    leadership: "Neil Cook",
    schedule: "To be announced",
    phone: null,
    email: "BOD@pristineplace.us",
  },
  {
    name: "Library",
    purpose:
      "Curates and maintains the resident lending library located in the Community Clubhouse.",
    leadership: "Linda Fehl",
    schedule: "To be announced",
    phone: "724-664-3895",
    email: null,
  },
]

/* ── Sub-components ──────────────────────────────────────── */

function CommitteeCard({
  name,
  purpose,
  leadership,
  schedule,
  email,
  phone,
}: {
  name: string
  purpose: string
  leadership: string
  schedule: string
  email: string | null
  phone: string | null
}) {
  return (
    <div
      className="card stack"
      style={{
        gap: "var(--space-m)",
        padding: "var(--space-l)",
        borderTop: "3px solid var(--pp-navy-dark)",
      }}
    >
      {/* Name */}
      <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
        {name}
      </h3>

      {/* Purpose */}
      <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
        {purpose}
      </p>

      {/* Meta rows */}
      <dl className="stack-xs" style={{ borderTop: "1px solid var(--pp-slate-100)", paddingTop: "var(--space-s)" }}>

        {/* Leadership */}
        <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start" }}>
          <dt style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: "6.5rem", flexShrink: 0 }}>
            <Users style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-navy)" }} />
            <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Leadership
            </span>
          </dt>
          <dd className="text-fluid-sm" style={{ color: "var(--pp-navy-dark)", fontWeight: 500 }}>
            {leadership}
          </dd>
        </div>

        {/* Meeting Schedule */}
        <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start" }}>
          <dt style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: "6.5rem", flexShrink: 0 }}>
            <CalendarDays style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-navy)" }} />
            <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Schedule
            </span>
          </dt>
          <dd className="text-fluid-sm" style={{ color: "var(--pp-slate-600)" }}>
            {schedule}
          </dd>
        </div>

        {/* Contact */}
        <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start" }}>
          <dt style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: "6.5rem", flexShrink: 0 }}>
            <Mail style={{ width: "0.875rem", height: "0.875rem", color: "var(--pp-navy)" }} />
            <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-500)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Contact
            </span>
          </dt>
          <dd className="stack-xs">
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-fluid-sm font-medium hover:text-pp-navy transition-colors"
                style={{ color: "var(--pp-navy-dark)" }}
              >
                {email}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/[^0-9]/g, "")}`}
                className="text-fluid-sm font-medium hover:text-pp-navy transition-colors"
                style={{ color: "var(--pp-navy-dark)", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <Phone style={{ width: "0.75rem", height: "0.75rem" }} />
                {phone}
              </a>
            )}
            {!email && !phone && (
              <span className="text-fluid-sm" style={{ color: "var(--pp-slate-400)" }}>
                To be announced
              </span>
            )}
          </dd>
        </div>

      </dl>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────── */

export default function CommitteesPage() {
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
          <h1 className="hero-title">Committees</h1>
          <p className="hero-subtitle">
            Volunteer committees and resident groups that shape the quality of life at {siteConfig.name}.
          </p>
        </div>
      </section>

      {/* ── HOA Committees ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>

          {/* Section header */}
          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>HOA Committees</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", maxWidth: "60ch" }}>
              Standing committees appointed by the Board of Directors. Each plays a direct role in maintaining
              community standards, operations, and homeowner services.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {hoaCommittees.map((c) => (
              <CommitteeCard key={c.name} {...c} />
            ))}
          </div>

        </div>
      </section>

      {/* ── Resident Interest Groups ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>

          {/* Section header */}
          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Resident Interest Groups</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", maxWidth: "60ch" }}>
              Resident-led groups that enrich daily life, foster friendships, and strengthen the sense of community
              at Pristine Place. All residents are welcome to participate.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {residentGroups.map((g) => (
              <CommitteeCard key={g.name} {...g} />
            ))}
          </div>

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
                Interested in volunteering?
              </h3>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "50ch" }}>
                Committee openings are announced at Board meetings. Contact the Board of Directors to express your interest.
              </p>
            </div>
            <a
              href="mailto:bod@pristineplace.us"
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
              <Mail style={{ width: "1rem", height: "1rem" }} />
              Contact the Board
            </a>
          </div>
        </div>
      </section>

    </>
  )
}
