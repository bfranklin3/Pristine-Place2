// app/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Bell, FileText, ShieldCheck, CreditCard, ClipboardList, BookOpen, MapPin, CalendarDays, AlertTriangle, Newspaper } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { getUpcomingEvents as getSanityEvents, getAnnouncements } from "@/lib/sanity/queries"
import { formatTimeInHoaTimeZone } from "@/lib/timezone"

export const metadata: Metadata = {
  title: `${siteConfig.name} | ${siteConfig.tagline}`,
  description: siteConfig.description,
}

const content = {
  hero: {
    title: "Pristine Place Homeowners Association",
    subtitle:
      "Community information, resources, and resident services for homeowners of Pristine Place in Spring Hill, Florida.",
    cta: { text: "View Community Resources", href: "/our-community" },
    ctaSecondary: { text: "Access Resident Portal", href: "/resident-portal" },
  },
  features: [
    {
      icon: Calendar,
      title: "Events & Activities",
      description: "From food truck nights to holiday celebrations, there's always something happening.",
      href: "/events",
    },
    {
      icon: Bell,
      title: "Announcements",
      description: "Stay informed with the latest community updates, maintenance schedules, and policy changes.",
      href: "/announcements",
    },
    {
      icon: FileText,
      title: "Documents & Forms",
      description: "Access HOA governing documents, architectural review forms, and community policies.",
      href: "/documents",
    },
    {
      icon: ShieldCheck,
      title: "Gate Access",
      description: "Instructions for visitor entry, contractor access, and resident gate remotes.",
      href: "/gate-access",
    },
  ],
  highlights: {
    heading: "About Our Community",
    subtitle:
      "Pristine Place maintains a pool, clubhouse, and common areas for resident use, with regular community events and activities throughout the year.",
    items: [
      {
        title: "Pool & Clubhouse",
        description:
          "Resort-style pool, fully equipped clubhouse with kitchen, and patio — perfect for relaxation, parties, and community events.",
        image: "/images/Pool.jpeg",
        href: "/our-community",
      },
      {
        icon: MapPin,
        title: "Convenient Location",
        description:
          "Tucked just off the Suncoast Parkway, Pristine Place puts you minutes from top-rated schools, shopping, dining, and the full energy of the Tampa Bay area — the best of Florida living, right at your door.",
        image: "/images/Tampa.jpg",
        href: "/our-community",
      },
      {
        title: "Events & Social Life",
        description:
          "From community dinners to holiday events, Pristine Place hosts year-round events that bring neighbors together.",
        image: "/images/Clubhouse Event.jpeg",
        href: "/events",
      },
    ],
  },
  portal: {
    eyebrow: "Resident Access",
    heading: "Resident Portal",
    subtitle:
      "The Resident Portal provides homeowners with secure access to account management, architectural request submission, HOA documents, and community communications.",
    features: [
      {
        icon: CreditCard,
        title: "Pay Dues Online",
        description: "Securely pay your HOA dues anytime, from any device — no checks, no office visits required.",
      },
      {
        icon: CalendarDays,
        title: "Reserve the Clubhouse",
        description: "Submit a clubhouse rental request online and keep your event planning in one place.",
      },
      {
        icon: ClipboardList,
        title: "Submit & Track ACC Requests",
        description: "Submit Architectural Change Requests online — and track their status.",
      },
      {
        icon: AlertTriangle,
        title: "Report an Issue",
        description: "Report maintenance, safety, or common-area concerns to the appropriate HOA team.",
      },
      {
        icon: BookOpen,
        title: "Full Document Library",
        description: "Access meeting minutes, annual budgets, audit reports, and every governing document — all in one secure place.",
      },
      {
        icon: Newspaper,
        title: "Community Newsletters",
        description: "Browse community newsletters and stay up to date on neighborhood news and updates.",
      },
    ],
    cta: { text: "Access the Resident Portal", href: "/resident-portal" },
  },
  cta: {
    heading: "HOA Office & Contact Information",
    description: "For questions about dues, architectural requests, maintenance concerns, or general community information, please contact the HOA office.",
    button: { text: "Contact the HOA Office", href: "/contact" },
  },
}

export default async function HomePage() {
  // Fetch data from Sanity CMS 
  const sanityEvents = await getSanityEvents("public", 3)
  const sanityAnnouncements = await getAnnouncements("public")

  // Transform for display
  const upcomingEvents = sanityEvents.map((event) => ({
    id: event._id,
    title: event.title,
    category: event.category,
    date: event.eventDate,
    time: formatTimeInHoaTimeZone(new Date(event.eventDate)),
    description: event.description ? event.description.map(block =>
      block.children?.map((child: any) => child.text).join("") || ""
    ).join(" ") : "",
  }))

  const recentAnnouncements = sanityAnnouncements.slice(0, 3).map((announcement) => ({
    slug: announcement.slug.current,
    title: announcement.title,
    category: announcement.category,
    date: announcement.publishDate,
    excerpt: announcement.excerpt || "",
  }))

  return (
    <>
      {/* Hero */}
      <section className="hero-section" style={{ '--hero-h': 'clamp(380px, 40vw + 8rem, 620px)' } as React.CSSProperties}>
        <Image
          src="/images/Pristine-Place-Entrance-cropped.jpeg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          style={{ zIndex: 0 }}
        />
        {/* Multi-layer scrim: bottom-weighted dark gradient keeps text crisp over any sky/landscape photo */}
        <div className="hero-overlay" style={{ background: "linear-gradient(170deg, rgba(26,36,24,0.55) 0%, rgba(47,79,63,0.70) 45%, rgba(26,36,24,0.88) 100%)", zIndex: 1 }} />
        <div className="hero-content stack" style={{ gap: "var(--space-m)", zIndex: 2 }}>
          <span className="badge badge-accent" style={{ marginInline: "auto" }}>
            Spring Hill, Florida
          </span>
          <h1 className="hero-title text-balance text-shadow-lg">{content.hero.title}</h1>
          <p className="hero-subtitle text-shadow" style={{ maxWidth: "var(--measure)" }}>
            {content.hero.subtitle}
          </p>
          <div className="cluster" style={{ justifyContent: "center", gap: "var(--space-s)", width: "100%" }}>
            <Link href={content.hero.cta.href} className="btn btn-accent btn-lg">
              {content.hero.cta.text}
            </Link>
            <Link href={content.hero.ctaSecondary.href} className="btn btn-outline-light btn-lg">
              {content.hero.ctaSecondary.text}
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Features */}
      <section className="section" style={{ background: "linear-gradient(180deg, var(--pp-slate-50), var(--pp-white))" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div style={{ textAlign: "center" }}>
            <h2 className="text-balance">Community Resources & Services</h2>
            <p className="text-fluid-lg text-pp-slate-500" style={{ maxWidth: "var(--measure)", marginInline: "auto" }}>
              Key resources for Pristine Place homeowners — documents, announcements, events, and gate access information.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--grid-gap)]">
            {content.features.map((feature, index) => (
              <Link key={feature.href} href={feature.href} className="card card-hover stack" style={{ textDecoration: "none" }}>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: index % 2 === 0
                      ? "linear-gradient(135deg, var(--pp-navy), var(--pp-navy-light))"
                      : "linear-gradient(135deg, var(--pp-gold-dark), var(--pp-gold))",
                    color: "var(--pp-white)",
                  }}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-step-1 font-semibold text-pp-navy-dark">{feature.title}</h3>
                <p className="text-fluid-base text-pp-slate-600">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community Highlights — Pillar-style image cards */}
      <section className="section" style={{ background: "linear-gradient(180deg, var(--pp-white), var(--pp-slate-50))" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div style={{ textAlign: "center" }}>
            <h2 className="text-balance">{content.highlights.heading}</h2>
            <p
              className="text-fluid-lg text-pp-slate-500"
              style={{ maxWidth: "var(--measure)", marginInline: "auto" }}
            >
              {content.highlights.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.highlights.items.map((item) => (
              <div
                key={item.title}
                className="card flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="relative aspect-4/3">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1 stack-sm">
                  <h3 className="text-step-1 font-bold text-pp-navy-dark flex items-center gap-2">
                    {"icon" in item && item.icon && <item.icon className="w-5 h-5 shrink-0" style={{ color: "var(--pp-navy-dark)" }} />}
                    {item.title}
                  </h3>
                  <p className="text-fluid-base text-pp-slate-600 flex-1">
                    {item.description}
                  </p>
                  <Link href={item.href} className="btn btn-primary w-full">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resident Portal */}
      <section
        className="section"
        style={{
          background: "#253A28",
          color: "var(--pp-white)",
        }}
      >
        <div className="container stack" style={{ gap: "var(--space-xl)", alignItems: "center" }}>

          {/* Header */}
          <div className="stack" style={{ gap: "var(--space-s)", textAlign: "center", maxWidth: "var(--measure)" }}>
            <span
              className="badge badge-accent"
              style={{ marginInline: "auto" }}
            >
              {content.portal.eyebrow}
            </span>
            <h2 className="text-balance" style={{ color: "var(--pp-white)" }}>
              {content.portal.heading}
            </h2>
            <p className="text-fluid-lg" style={{ color: "var(--pp-navy-light)" }}>
              {content.portal.subtitle}
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ width: "100%" }}>
            {content.portal.features.map((f) => (
              <div
                key={f.title}
                className="stack"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-l)",
                  backdropFilter: "blur(4px)",
                  gap: "var(--space-s)",
                }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, var(--pp-gold), var(--pp-gold-dark))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <f.icon style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
                </div>
                <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-white)" }}>
                  {f.title}
                </h3>
                <p className="text-fluid-sm" style={{ color: "var(--pp-navy-light)" }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="stack" style={{ alignItems: "center", gap: "var(--space-xs)" }}>
            <Link href={content.portal.cta.href} className="btn btn-accent btn-lg">
              {content.portal.cta.text}
            </Link>
            <p className="text-fluid-sm" style={{ color: "var(--pp-navy-light)" }}>
              Have an account?{" "}
              <Link href={content.portal.cta.href} style={{ color: "var(--pp-white)", textDecoration: "underline" }}>
                Sign in →
              </Link>
            </p>
          </div>

        </div>
      </section>

      {/* Upcoming Events */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div className="cluster" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <h2>Upcoming Events</h2>
            <Link href="/events" className="btn btn-outline btn-sm">
              View All Events
            </Link>
          </div>
          <div className="grid-auto-fit">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="card stack-xs">
                <span className="badge badge-accent">{event.category}</span>
                <h3 className="text-step-1 font-semibold">{event.title}</h3>
                <p className="text-fluid-sm text-pp-slate-500">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  &middot; {event.time}
                </p>
                <p className="text-fluid-base text-pp-slate-600">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Announcements */}
      <section className="section" style={{ background: "linear-gradient(180deg, var(--pp-slate-50), var(--pp-white))" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          <div className="cluster" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <h2>Latest Announcements</h2>
            <Link href="/announcements" className="btn btn-outline btn-sm">
              View All
            </Link>
          </div>
          <div className="grid-auto-fit">
            {recentAnnouncements.map((a) => (
              <Link
                key={a.slug}
                href={`/announcements/${a.slug}`}
                className="card card-hover stack-xs"
                style={{ textDecoration: "none" }}
              >
                <span className="badge badge-muted">{a.category}</span>
                <h3 className="text-step-1 font-semibold text-pp-navy-dark">{a.title}</h3>
                <p className="text-fluid-sm text-pp-slate-500">
                  {new Date(a.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-fluid-base text-pp-slate-600">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section"
        style={{ backgroundColor: "var(--pp-navy-dark)", color: "var(--pp-white)", textAlign: "center" }}
      >
        <div className="container stack" style={{ alignItems: "center", gap: "var(--space-m)" }}>
          <h2 className="text-balance">{content.cta.heading}</h2>
          <p className="text-fluid-lg" style={{ maxWidth: "var(--measure)", opacity: 0.85 }}>
            {content.cta.description}
          </p>
          <Link href={content.cta.button.href} className="btn btn-accent btn-lg">
            {content.cta.button.text}
          </Link>
        </div>
      </section>
    </>
  )
}
