// app/gate-access/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { PhoneCall, UserCheck, HardHat, KeyRound, AlertTriangle, Clock } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Gate Access",
  description: `Visitor and contractor gate access instructions for ${siteConfig.name} — a gated community in Spring Hill, Florida.`,
  openGraph: {
    title: `Gate Access | ${siteConfig.name}`,
    description: `Gate access information for residents, visitors, and contractors at ${siteConfig.name}.`,
    url: `${siteConfig.url}/gate-access`,
  },
  alternates: { canonical: `${siteConfig.url}/gate-access` },
}

const content = {
  hero: {
    title: "Gate Access",
    subtitle: "Keeping our community safe and welcoming — entry instructions for residents, visitors, and contractors.",
  },
  callbox: {
    heading: "Using the Entry Callbox",
    steps: [
      "Pull up to the callbox at the main gate on Pristine Place Blvd.",
      "Use the keypad to dial the resident's name (listed alphabetically) or enter their 4-digit directory code.",
      "The resident will receive a call and can grant access by pressing 9 on their phone.",
      "The gate will open automatically. Please allow it to fully close before proceeding.",
    ],
    note: "Do not tailgate through the gate. Each vehicle must be granted access individually.",
  },
  sections: [
    {
      icon: UserCheck,
      title: "Visiting a Resident",
      color: "var(--pp-navy)",
      steps: [
        "Ask your host to provide their 4-digit callbox code in advance for a smoother entry.",
        "Alternatively, use the callbox to call your host directly — they'll open the gate remotely.",
        "Residents may also register expected guests with the HOA office for day-of entry without a callback.",
        "Delivery drivers (UPS, FedEx, Amazon) use a shared access code managed by the HOA — no callbox required.",
      ],
    },
    {
      icon: HardHat,
      title: "Contractor & Service Provider Access",
      color: "var(--pp-navy-dark)",
      steps: [
        "All contractors must be pre-authorized by the homeowner prior to arrival.",
        "Contact the HOA office at least 24 hours in advance with the contractor's name, company, and expected work dates.",
        "A temporary single-day access code will be issued and shared with the homeowner.",
        "Contractors working on community common areas (landscaping, pool service, etc.) are cleared automatically by the HOA.",
        "Contractors must park in designated areas only and may not block the roadway or other driveways.",
      ],
    },
    {
      icon: KeyRound,
      title: "Resident Gate Remotes & Codes",
      color: "var(--pp-navy)",
      steps: [
        "Each household is issued up to two (2) gate remotes at no charge.",
        "Additional or replacement remotes are available at the HOA office for a $35 replacement fee.",
        "To pick up a remote, bring a valid photo ID and proof of residency (lease, deed, or utility bill).",
        "Residents may also use the keypad at the gate — enter your personal 4-digit resident code to open.",
        "To update or reset your resident code, visit the HOA office or call during business hours.",
      ],
    },
  ],
  hours: {
    heading: "HOA Office Hours",
    schedule: [
      { days: "Monday", hours: "10:30 AM – 12:30 PM" },
      { days: "Wednesday & Friday", hours: "6:30 PM – 8:00 PM" },
      { days: "All other times", hours: "Closed / Unstaffed" },
    ],
    note: "Office is also closed on major federal holidays and outside posted windows.",
  },
  emergency: {
    heading: "Gate Malfunction & Emergency Access",
    body: "If the gate malfunctions or you are locked out, contact the HOA. The number and email is posted on the Contact page. For a genuine emergency involving police, fire, or EMS, emergency vehicles have a universal gate override and do not require resident assistance.",
    icon: AlertTriangle,
  },
  rules: {
    heading: "Gate Etiquette & Rules",
    items: [
      "Do not tailgate — each vehicle must enter with their own authorization.",
      "Never prop the gate open or allow it to remain open unattended.",
      "Do not share your personal resident code with non-residents.",
      "Report any gate malfunction or suspicious activity to the HOA office immediately.",
      "Vehicles blocking the gate area are subject to towing at the owner's expense.",
    ],
  },
}

export default function GateAccessPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
        <div className="hero-overlay" />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle" style={{ maxWidth: "var(--measure)" }}>{content.hero.subtitle}</p>
        </div>
      </section>

      {/* Callbox Instructions — highlighted intro card */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div
            className="card stack"
            style={{
              borderLeft: "4px solid var(--pp-navy)",
              background: "linear-gradient(135deg, var(--pp-gold-light), var(--pp-slate-50))",
            }}
          >
            <div className="cluster" style={{ gap: "var(--space-s)" }}>
              <PhoneCall
                style={{ width: "2rem", height: "2rem", color: "var(--pp-navy)", flexShrink: 0 }}
              />
              <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                {content.callbox.heading}
              </h2>
            </div>
            <ol className="flow" style={{ paddingLeft: "1.25rem", listStyle: "decimal" }}>
              {content.callbox.steps.map((step) => (
                <li key={step} className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
                  {step}
                </li>
              ))}
            </ol>
            <p
              className="text-fluid-sm"
              style={{
                background: "var(--pp-gold-light)",
                border: "1px solid var(--pp-navy-light)",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 0.875rem",
                color: "var(--pp-navy-dark)",
                fontWeight: 600,
              }}
            >
              ⚠ {content.callbox.note}
            </p>
          </div>
        </div>
      </section>

      {/* Three access scenario sections */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          {content.sections.map((s) => (
            <div key={s.title} className="card" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-m)", alignItems: "start" }}>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: s.color, color: "var(--pp-white)" }}
              >
                <s.icon className="w-6 h-6" />
              </div>
              <div className="stack-sm">
                <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{s.title}</h2>
                <ol style={{ paddingLeft: "1.25rem", listStyle: "decimal", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {s.steps.map((step) => (
                    <li key={step} className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Office Hours + Gate Rules — two-column */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))", gap: "var(--space-l)" }}>

          {/* Office Hours */}
          <div className="card stack-sm">
            <div className="cluster" style={{ gap: "var(--space-xs)" }}>
              <Clock style={{ width: "1.5rem", height: "1.5rem", color: "var(--pp-navy)" }} />
              <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                {content.hours.heading}
              </h2>
            </div>
            <div style={{ borderTop: "1px solid var(--pp-slate-200)", paddingTop: "var(--space-s)" }}>
              {content.hours.schedule.map(({ days, hours }) => (
                <div
                  key={days}
                  className="cluster"
                  style={{ justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--pp-slate-100)" }}
                >
                  <span className="text-fluid-base" style={{ color: "var(--pp-slate-700)", fontWeight: 500 }}>{days}</span>
                  <span className="text-fluid-base" style={{ color: "var(--pp-navy-dark)", fontWeight: 600 }}>{hours}</span>
                </div>
              ))}
            </div>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>{content.hours.note}</p>
          </div>

          {/* Gate Rules */}
          <div className="card stack-sm">
            <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
              {content.rules.heading}
            </h2>
            <ul style={{ paddingLeft: "1.25rem", listStyle: "disc", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {content.rules.items.map((item) => (
                <li key={item} className="text-fluid-base" style={{ color: "var(--pp-slate-600)" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Emergency Access */}
      <section className="section" style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))", color: "var(--pp-white)" }}>
        <div className="container stack" style={{ alignItems: "center", textAlign: "center", gap: "var(--space-m)" }}>
          <content.emergency.icon style={{ width: "3rem", height: "3rem", color: "var(--pp-gold-light)", opacity: 1 }} />
          <h2 className="text-step-3 font-bold">{content.emergency.heading}</h2>
          <p className="text-fluid-lg" style={{ maxWidth: "var(--measure)", opacity: 0.9 }}>
            {content.emergency.body}
          </p>
          <Link href="/contact" className="btn btn-accent btn-lg">
            View Contact Information
          </Link>
        </div>
      </section>
    </>
  )
}
