// app/board/page.tsx

import type { Metadata } from "next"
import Image from "next/image"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Board & Committees",
  description: `Meet the Board of Directors and community committees at ${siteConfig.name}.`,
  openGraph: {
    title: `Board & Committees | ${siteConfig.name}`,
    description: `Board of Directors and committees at ${siteConfig.name}.`,
    url: `${siteConfig.url}/board`,
  },
  alternates: { canonical: `${siteConfig.url}/board` },
}

const content = {
  hero: {
    title: "Board & Committees",
    subtitle: "The volunteers who keep Pristine Place running smoothly.",
  },
  boardMembers: [
    { name: "David Abbott",     role: "President",         image: "/images/David-Abbott.png"    },
    { name: "Rich Ruland",      role: "Vice President",    image: "/images/Rich-Ruland.png"     },
    { name: "Deborah Hresko",   role: "Treasurer",         image: "/images/Deborah-Hresko.png"  },
    { name: "Pierre Richard",   role: "Secretary",         image: "/images/Pierre-Richard.png"  },
    { name: "Joshua Rodriguez", role: "Director at Large", image: "/images/Josh-Rodriquez.jpeg" },
  ],
  committees: [
    {
      name: "Architectural Review Committee",
      description: "Reviews and approves exterior modification requests to maintain community aesthetics.",
    },
    {
      name: "Social Committee",
      description: "Plans and organizes community events, holiday gatherings, and resident activities.",
    },
    {
      name: "Landscape Committee",
      description: "Advises the Board on common area landscaping, seasonal planting, and irrigation.",
    },
  ],
}

export default function BoardPage() {
  return (
    <>
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy)" }}
      >
        <div className="hero-overlay" style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy-light))" }} />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle">{content.hero.subtitle}</p>
        </div>
      </section>

      {/* Board Members */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          <div>
            <h2>Board of Directors</h2>
            <p className="text-fluid-base text-pp-slate-500" style={{ marginTop: "var(--space-xs)" }}>
              Elected volunteers who oversee the governance and operations of Pristine Place HOA.
            </p>
          </div>
          <div className="grid-auto-fit">
            {content.boardMembers.map((member) => (
              <div
                key={member.role}
                className="card stack"
                style={{ textAlign: "center", gap: "var(--space-m)", padding: "var(--space-xl)" }}
              >
                <div
                  className="relative rounded-full overflow-hidden mx-auto"
                  style={{ width: "6rem", height: "6rem", flexShrink: 0 }}
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-m)" }}>
                  <h3 className="text-step-1 font-semibold">{member.name}</h3>
                  <span className="badge badge-primary">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Committees */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          <div>
            <h2>Committees</h2>
            <p className="text-fluid-base text-pp-slate-500" style={{ marginTop: "var(--space-xs)" }}>
              Resident-led committees that support the Board and help shape daily life at Pristine Place.
            </p>
          </div>
          <div className="grid-auto-fit">
            {content.committees.map((c) => (
              <div
                key={c.name}
                className="card stack"
                style={{ gap: "var(--space-s)", padding: "var(--space-l)" }}
              >
                <h3 className="text-step-1 font-semibold text-pp-navy-dark">{c.name}</h3>
                <p className="text-fluid-base text-pp-slate-600">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
