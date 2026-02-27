// app/our-community/page.tsx

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { MapPin, School, ShoppingCart, HeartPulse, Users, Waves, Dumbbell, ShieldCheck } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Our Community",
  description: `Learn about Pristine Place — a premier gated residential community in Spring Hill, Florida. Discover our amenities, gates, and neighborhood map.`,
  openGraph: {
    title: `Our Community | ${siteConfig.name}`,
    description: `Learn about Pristine Place, Spring Hill FL.`,
    url: `${siteConfig.url}/our-community`,
  },
  alternates: { canonical: `${siteConfig.url}/our-community` },
}

const content = {
  hero: {
    title: "Our Community",
    subtitle: "Welcome to Pristine Place — The Jewel of Spring Hill, Florida.",
  },
  intro: {
    heading: "Life at Pristine Place",
    body: "Nestled in Spring Hill, Florida, Pristine Place is a beautifully maintained gated community at 4350 St. Ives Blvd, Spring Hill, FL 34609. With resort-style amenities, three secure gated entrances, and a warm sense of neighborhood, Pristine Place offers an exceptional quality of life for its residents.",
  },
  amenities: [
    {
      icon: Waves,
      title: "Resort-Style Pool",
      description: "A large community pool with a spacious lounging deck and adjacent children's playground — perfect for relaxing afternoons and weekend fun.",
    },
    {
      icon: Users,
      title: "Clubhouse & Event Space",
      description: "A fully equipped clubhouse featuring a catering kitchen, ballroom-style event space, and outdoor patio — available for community events and private reservations.",
    },
    {
      icon: Dumbbell,
      title: "Fitness Center",
      description: "A well-equipped exercise room for residents to stay active without leaving the neighborhood.",
    },
  ],
  gates: {
    heading: "Three Gated Entrances",
    subtitle: "Pristine Place features three secure entry points to keep the community safe and welcoming.",
    items: [
      {
        name: "Main Gate",
        description: "The primary entrance on Pristine Place Blvd — open to all residents, visitors, and authorized contractors. Equipped with a resident callbox directory.",
      },
      {
        name: "Mansfield Gate",
        description: "A secondary resident entrance for convenient access from Mansfield Blvd. Requires a resident gate remote or personal access code.",
      },
      {
        name: "Minnie Dr. Gate",
        description: "Available to residents, visitors, and contractors. Staffed during designated access control hours for additional security.",
      },
    ],
    accessHours: "Access Control Hours: Monday 10:30 AM – 12:30 PM · Wednesday & Friday 6:30 PM – 8:00 PM",
    accessContact: "Access control: 352-683-9853 · Carol Ruland: 352-684-2628",
  },
  map: {
    heading: "Neighborhood Map",
    subtitle: "Explore the layout of Pristine Place — gates, amenities, and community landmarks at a glance.",
    src: "/images/PP-All-Gates.png",
    alt: "Pristine Place neighborhood map showing all three gates and community amenities",
  },
  nearby: {
    heading: "Convenient to Everything",
    subtitle: "Pristine Place puts essential services within easy reach.",
    items: [
      { icon: ShoppingCart, label: "Publix Grocery", distance: "0.6 miles" },
      { icon: School, label: "Powell Middle School", distance: "0.1 miles" },
      { icon: School, label: "Pine Grove Elementary", distance: "5.1 miles" },
      { icon: School, label: "Central High School", distance: "6.5 miles" },
      { icon: HeartPulse, label: "HCA Florida Oak Hill Hospital", distance: "4.2 miles" },
      { icon: HeartPulse, label: "TGH Brooksville", distance: "4.5 miles" },
    ],
  },
  management: {
    heading: "Community Management",
    body: "Pristine Place is professionally managed by Greenacre Property Management. For community questions, maintenance requests, or HOA inquiries, please contact our property manager.",
    manager: "Kim Pennington, Greenacre Property Manager",
    phone: "352-515-9420",
  },
  values: {
    heading: "Community Values",
    body: "Respect, communication, and stewardship are at the heart of everything we do. Whether it's maintaining common areas, organizing social events, or responding to resident concerns, we strive to be responsive, consistent, and community-minded. Every decision the Board makes is guided by transparency, fairness, and a deep respect for our residents.",
  },
}

export default function OurCommunityPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="hero-section"
        style={{ '--hero-h': 'clamp(260px, 28vw + 6rem, 440px)', background: 'var(--pp-navy-dark)' } as React.CSSProperties}
      >
        <div className="hero-overlay" />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle">{content.hero.subtitle}</p>
        </div>
      </section>

      {/* Intro */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="wrapper stack" style={{ gap: "var(--space-m)", textAlign: "center" }}>
          <h2 className="text-step-4">{content.intro.heading}</h2>
          <p className="text-fluid-lg" style={{ color: "var(--pp-slate-600)" }}>{content.intro.body}</p>
          <div className="cluster" style={{ justifyContent: "center", gap: "var(--space-xs)" }}>
            <MapPin style={{ color: "var(--pp-navy)", width: "1.125rem", height: "1.125rem" }} />
            <span style={{ color: "var(--pp-navy-dark)", fontWeight: 600 }}>4350 St. Ives Blvd, Spring Hill, FL 34609</span>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div style={{ textAlign: "center" }}>
            <h2>Community Amenities</h2>
            <p className="text-fluid-lg" style={{ color: "var(--pp-slate-500)", maxWidth: "var(--measure)", marginInline: "auto" }}>
              Resort-style living steps from your front door.
            </p>
          </div>
          <div className="grid-auto-fit">
            {content.amenities.map((a, index) => (
              <div key={a.title} className="card stack" style={{ gap: "var(--space-s)" }}>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: index % 2 === 0
                      ? "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))"
                      : "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
                    color: "var(--pp-white)",
                  }}
                >
                  <a.icon className="w-6 h-6" />
                </div>
                <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{a.title}</h3>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)" }}>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhood Map */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div style={{ textAlign: "center" }}>
            <h2>{content.map.heading}</h2>
            <p className="text-fluid-lg" style={{ color: "var(--pp-slate-500)", maxWidth: "var(--measure)", marginInline: "auto" }}>
              {content.map.subtitle}
            </p>
          </div>
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              boxShadow: "var(--shadow-xl)",
              border: "1px solid var(--pp-slate-200)",
            }}
          >
            <Image
              src={content.map.src}
              alt={content.map.alt}
              width={1200}
              height={800}
              className="w-full h-auto"
              style={{ display: "block" }}
            />
          </div>

          {/* Gate details below map */}
          <div style={{ textAlign: "center" }}>
            <h3 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)", marginBottom: "var(--space-xs)" }}>
              {content.gates.heading}
            </h3>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>{content.gates.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.gates.items.map((gate) => (
              <div
                key={gate.name}
                className="card stack-sm"
                style={{ borderTop: "3px solid var(--pp-navy)" }}
              >
                <div className="cluster" style={{ gap: "var(--space-xs)" }}>
                  <ShieldCheck style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-navy)", flexShrink: 0 }} />
                  <h4 className="font-bold" style={{ color: "var(--pp-navy-dark)" }}>{gate.name}</h4>
                </div>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)" }}>{gate.description}</p>
              </div>
            ))}
          </div>
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, var(--pp-gold-light), var(--pp-slate-50))",
              borderLeft: "4px solid var(--pp-navy)",
              padding: "var(--space-m)",
            }}
          >
            <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
              🕐 {content.gates.accessHours}
            </p>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.25rem" }}>
              📞 {content.gates.accessContact}
            </p>
          </div>
        </div>
      </section>

      {/* Nearby Services */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div style={{ textAlign: "center" }}>
            <h2>{content.nearby.heading}</h2>
            <p className="text-fluid-lg" style={{ color: "var(--pp-slate-500)", maxWidth: "var(--measure)", marginInline: "auto" }}>
              {content.nearby.subtitle}
            </p>
          </div>
          <div className="grid-auto-fit">
            {content.nearby.items.map((item) => (
              <div
                key={item.label}
                className="card cluster"
                style={{ justifyContent: "space-between", gap: "var(--space-s)", padding: "var(--space-m)" }}
              >
                <div className="cluster" style={{ gap: "var(--space-xs)" }}>
                  <item.icon style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)", flexShrink: 0 }} />
                  <span className="font-medium" style={{ color: "var(--pp-slate-700)" }}>{item.label}</span>
                </div>
                <span
                  className="badge"
                  style={{ background: "var(--pp-gold-light)", color: "var(--pp-navy-dark)", fontWeight: 600 }}
                >
                  {item.distance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Values */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="wrapper stack" style={{ gap: "var(--space-m)" }}>
          <h2 style={{ color: "var(--pp-navy-dark)" }}>{content.values.heading}</h2>
          <p className="text-fluid-lg" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
            {content.values.body}
          </p>
        </div>
      </section>

      {/* Management + CTA */}
      <section
        className="section"
        style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))", color: "var(--pp-white)", textAlign: "center" }}
      >
        <div className="container stack" style={{ alignItems: "center", gap: "var(--space-m)" }}>
          <h2>{content.management.heading}</h2>
          <p className="text-fluid-lg" style={{ maxWidth: "var(--measure)", opacity: 0.9 }}>
            {content.management.body}
          </p>
          <div
            className="card cluster"
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              color: "var(--pp-white)",
              gap: "var(--space-l)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p className="text-fluid-sm" style={{ opacity: 0.7, marginBottom: "0.25rem" }}>Property Manager</p>
              <p className="font-semibold">{content.management.manager}</p>
            </div>
            <div>
              <p className="text-fluid-sm" style={{ opacity: 0.7, marginBottom: "0.25rem" }}>Phone</p>
              <a
                href={`tel:${content.management.phone}`}
                className="font-semibold"
                style={{ color: "var(--pp-green-light)", textDecoration: "none" }}
              >
                {content.management.phone}
              </a>
            </div>
          </div>
          <Link href="/contact" className="btn btn-accent btn-lg">
            Contact the HOA Office
          </Link>
        </div>
      </section>
    </>
  )
}
