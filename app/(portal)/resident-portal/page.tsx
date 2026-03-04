// app/(portal)/resident-portal/page.tsx
// Portal Home — Dashboard landing page for residents.
// Placeholder data marked with // DATA: will be replaced by live API calls when auth is wired.

import type { Metadata } from "next"
import Link from "next/link"
import {
  CreditCard,
  ClipboardList,
  AlertTriangle,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Newspaper,
  BookOpen,
  Scale,
  ChevronRight,
  Megaphone,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react"
import { currentUser } from "@clerk/nextjs/server"
import { siteConfig } from "@/lib/site-config"
import { getAnnouncements, getUpcomingEvents } from "@/lib/sanity/queries"
import { HOA_TIME_ZONE, formatTimeInHoaTimeZone } from "@/lib/timezone"
import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextValue,
  SanityAnnouncement,
  SanityEvent,
} from "@/lib/sanity/queries"

export const metadata: Metadata = {
  title: "Dashboard | Resident Portal",
  description: "Your Pristine Place resident dashboard — account status, quick actions, announcements, and community events.",
}

/* ── Placeholder data — replace with API calls when auth is ready ── */

/* ── Helper Functions ── */

// Helper to get category label from category value
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "general": "General",
    "maintenance": "Maintenance",
    "community": "Community",
    "important": "Important",
    "emergency": "Emergency",
    "social-activity": "Social",
    "annual-meeting": "Meeting",
    "bod-meeting": "Meeting",
    "committee-meeting": "Meeting",
    "crime-watch": "Safety",
    "fitness-health": "Health",
    "special-event": "Event",
    "special-meeting": "Meeting",
  }
  return labels[category] || "General"
}

// Helper to get category color from category value
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "emergency": "var(--pp-error)",
    "important": "var(--pp-warning)",
    "maintenance": "var(--pp-warning)",
    "annual-meeting": "var(--pp-navy-dark)",
    "bod-meeting": "var(--pp-navy-dark)",
    "committee-meeting": "var(--pp-navy-dark)",
    "crime-watch": "var(--pp-navy-dark)",
  }
  return colors[category] || "var(--pp-navy-dark)"
}

// Helper to extract plain text from Portable Text
function extractTextFromPortableText(blocks: PortableTextValue): string {
  if (!blocks || blocks.length === 0) return ""
  return blocks
    .map((block: PortableTextBlock) => {
      if (block._type !== "block" || !block.children) return ""
      return block.children.map((child: PortableTextSpan) => child.text).join("")
    })
    .join(" ")
}

// Transform Sanity announcement to display format
function transformAnnouncement(announcement: SanityAnnouncement) {
  return {
    id: announcement._id,
    badge: getCategoryLabel(announcement.category),
    badgeColor: getCategoryColor(announcement.category),
    title: announcement.title,
    body: announcement.excerpt || extractTextFromPortableText(announcement.content),
    date: `Posted ${new Date(announcement.publishDate).toLocaleDateString()}`,
  }
}

// Transform Sanity event to display format
function transformEvent(event: SanityEvent) {
  const eventDate = new Date(event.eventDate)
  const month = eventDate.toLocaleDateString("en-US", { month: "short", timeZone: HOA_TIME_ZONE }).toUpperCase()
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: HOA_TIME_ZONE }).format(eventDate)
  const dateStr = eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: HOA_TIME_ZONE })
  const timeStr = formatTimeInHoaTimeZone(eventDate)

  return {
    id: event._id,
    month,
    day,
    date: dateStr,
    time: timeStr,
    title: event.title,
    location: event.location || "TBD",
    description: event.description ? extractTextFromPortableText(event.description) : "",
    category: getCategoryLabel(event.category),
    categoryColor: getCategoryColor(event.category),
    highlight: event.category === "annual-meeting" || event.category === "special-event",
    href: `/resident-portal/events/${event.slug.current}`,
  }
}

// DATA: Announcements now fetched from Sanity CMS in component (see below)

// DATA: Events now fetched from Sanity CMS in component (see below)

/* ── Quick Action Card data ── */
const quickActions = [
  {
    icon: CreditCard,
    label: "Pay HOA Fees",
    description: "Make a payment or view your payment history",
    href: "/resident-portal/pay-fees",
    accent: "var(--pp-navy-dark)",
    bg: "var(--pp-slate-50)",
  },
  {
    icon: ClipboardList,
    label: "Submit ACC Request",
    description: "Apply for an architectural modification or improvement",
    href: "/resident-portal/acc/submit",
    accent: "var(--pp-gold)",
    bg: "#f0f7f2",
  },
  {
    icon: AlertTriangle,
    label: "Report an Issue",
    description: "Report a common area maintenance or safety concern",
    href: "/resident-portal/report-issue",
    accent: "var(--pp-warning)",
    bg: "#fffbf0",
  },
  {
    icon: CalendarDays,
    label: "Book the Clubhouse",
    description: "Reserve the clubhouse for a private event",
    href: "/resident-portal/clubhouse/rental",
    accent: "var(--pp-navy-dark)",
    bg: "#f2f5f3",
  },
]

/* ── Resource links ── */
const resources = [
  { icon: FileText,  label: "HOA Documents",             href: "/resident-portal/documents",             desc: "Governing docs & policies" },
  { icon: BookOpen,  label: "Exterior Modifications",    href: "/resident-portal/exterior-modifications", desc: "ACC Improvement guidelines" },
  { icon: Scale,     label: "Leasing Rules",              href: "/resident-portal/leasing-rules",         desc: "Rental requirements" },
  { icon: Newspaper, label: "Newsletters",                href: "/resident-portal/newsletters",           desc: "Community newsletters" },
]

/* ── Component ── */
export default async function ResidentPortalHomePage() {
  const user = await currentUser()
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  const residentName = fullName || user?.username || "Resident"
  const residentEmail =
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress || ""

  // Fetch data from Sanity CMS
  const sanityAnnouncements = await getAnnouncements("portal")
  const sanityEvents = await getUpcomingEvents("portal", 4)

  // Transform data to match existing display format
  const announcements = sanityAnnouncements.map(transformAnnouncement)
  const upcomingEvents = sanityEvents.map(transformEvent)

  return (
    <>
      {/* ════ 1. Welcome Hero ════ */}
      <section
        style={{
          background: "linear-gradient(135deg, #1C2418 0%, #2F3826 60%, #3A4232 100%)",
          color: "var(--pp-white)",
          paddingBlock: "var(--space-xl)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle geometric overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 10% 80%, rgba(255,255,255,0.04) 0%, transparent 40%)",
            pointerEvents: "none",
          }}
        />

        <div className="container" style={{ position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))",
              gap: "var(--space-l)",
              alignItems: "center",
            }}
          >
            {/* Welcome text */}
            <div className="stack" style={{ gap: "var(--space-s)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                <span className="text-fluid-sm" style={{ color: "var(--pp-gold-light)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Resident Portal
                </span>
              </div>
              <h1
                className="text-step-4"
                style={{ color: "var(--pp-white)", fontWeight: 800, lineHeight: 1.15 }}
              >
                Welcome back,<br />
                <span style={{ color: "var(--pp-gold-light)" }}>{residentName}</span>
                {residentEmail && (
                  <span
                    className="text-fluid-lg"
                    style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500, marginLeft: "0.35rem" }}
                  >
                    ({residentEmail})
                  </span>
                )}
              </h1>
              <p className="text-fluid-lg" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "42ch" }}>
                Your Pristine Place homeowner dashboard — manage payments, submit requests, and stay connected to your community.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-s)", paddingTop: "var(--space-2xs)" }}>
                <Link href="/resident-portal/pay-fees" className="btn btn-accent">
                  Pay HOA Fees
                </Link>
                <Link
                  href="/resident-portal/acc/submit"
                  className="btn btn-outline-light"
                >
                  Submit ACC Request
                </Link>
              </div>
            </div>

            {/* Office Hours Card */}
            <div
              className="card stack-sm"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "var(--pp-white)",
              }}
            >
              <h2
                className="text-step-0 font-bold"
                style={{
                  color: "var(--pp-gold-light)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Clock style={{ width: "1rem", height: "1rem" }} />
                HOA Office Hours
              </h2>

              {/* Schedule */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { days: "Monday",              hours: "10:30 AM – 12:30 PM",         open: true },
                  { days: "Wednesday & Friday",  hours: "6:30 PM – 8:00 PM",           open: true },
                  { days: "All other times",     hours: "Closed / Unstaffed",          open: false },
                ].map(({ days, hours, open }) => (
                  <div
                    key={days}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBlock: "0.6rem",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-fluid-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{days}</span>
                    <span
                      className="text-fluid-sm font-semibold"
                      style={{ color: open ? "var(--pp-gold-light)" : "rgba(255,255,255,0.35)" }}
                    >
                      {hours}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-fluid-sm" style={{ color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>
                Closed on major federal holidays.
              </p>

              {/* Contact quick links */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  paddingTop: "var(--space-xs)",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  marginTop: "var(--space-xs)",
                }}
              >
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="text-fluid-sm hover:text-pp-gold-light transition-colors"
                  style={{ color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Phone style={{ width: "0.9rem", height: "0.9rem", flexShrink: 0 }} />
                  {siteConfig.contact.phone}
                </a>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-fluid-sm hover:text-pp-gold-light transition-colors"
                  style={{ color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Mail style={{ width: "0.9rem", height: "0.9rem", flexShrink: 0 }} />
                  {siteConfig.contact.email}
                </a>
              </div>

              <Link
                href="/resident-portal/contact-board"
                className="btn btn-outline-light"
                style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-2xs)" }}
              >
                Contact the Board
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════ 2. Quick Actions ════ */}
      <section className="section-sm" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-m)" }}>
          <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
            Quick Actions
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {quickActions.map(({ icon: Icon, label, description, href, accent, bg }) => (
              <Link
                key={label}
                href={href}
                className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                style={{
                  background: bg,
                  borderTop: `3px solid ${accent}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-s)",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "var(--radius-md)",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: "1.4rem", height: "1.4rem", color: "var(--pp-white)" }} />
                </div>
                <div>
                  <div className="text-step-0 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    {label}
                  </div>
                  <div className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", marginTop: "0.25rem" }}>
                    {description}
                  </div>
                </div>
                <div
                  className="text-fluid-sm font-semibold"
                  style={{ color: accent, display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "auto" }}
                >
                  Go <ChevronRight style={{ width: "1rem", height: "1rem" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════ 3. Announcements + Events ════ */}
      <section className="section-sm" style={{ background: "var(--pp-slate-50)" }}>
        <div
          className="container grid grid-cols-1 lg:grid-cols-3"
          style={{ gap: "var(--space-l)" }}
        >

          {/* Announcements */}
          <div className="stack lg:col-span-1" style={{ gap: "var(--space-m)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Megaphone style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                Announcements
              </h2>
              <Link
                href="/resident-portal/announcements"
                className="text-fluid-sm font-medium"
                style={{ color: "var(--pp-navy-dark)", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                View all <ChevronRight style={{ width: "1rem", height: "1rem" }} />
              </Link>
            </div>
            <div className="stack" style={{ gap: "var(--space-s)" }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="card"
                  style={{ background: "var(--pp-white)", borderLeft: `3px solid ${a.badgeColor}`, padding: "var(--space-m)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-s)" }}>
                    <span
                      className="text-fluid-sm font-bold"
                      style={{
                        background: a.badgeColor,
                        color: "var(--pp-white)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.15rem 0.6rem",
                        flexShrink: 0,
                      }}
                    >
                      {a.badge}
                    </span>
                    <span className="text-fluid-sm" style={{ color: "var(--pp-slate-400)" }}>{a.date}</span>
                  </div>
                  <h3 className="text-step-0 font-bold" style={{ color: "var(--pp-navy-dark)", marginTop: "0.5rem" }}>
                    {a.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", marginTop: "0.4rem", lineHeight: 1.6 }}>
                    {a.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="stack lg:col-span-2" style={{ gap: "var(--space-m)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CalendarDays style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                Upcoming Events
              </h2>
              <Link
                href="/resident-portal/events"
                className="text-fluid-sm font-medium"
                style={{ color: "var(--pp-navy-dark)", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                View all <ChevronRight style={{ width: "1rem", height: "1rem" }} />
              </Link>
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ gap: "var(--space-m)" }}
            >
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="card"
                  style={{
                    background: "var(--pp-white)",
                    borderTop: ev.highlight ? "3px solid var(--pp-gold)" : undefined,
                    display: "grid",
                    gridTemplateColumns: "4rem 1fr",
                    gap: "var(--space-m)",
                    padding: "var(--space-m)",
                    alignItems: "start",
                  }}
                >
                  {/* Date block */}
                  <div
                    style={{
                      textAlign: "center",
                      background: ev.highlight ? "var(--pp-navy-dark)" : "var(--pp-slate-100)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.5rem 0.25rem",
                    }}
                  >
                    <div
                      className="text-fluid-sm font-bold"
                      style={{
                        color: ev.highlight ? "var(--pp-gold-light)" : "var(--pp-navy-dark)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        lineHeight: 1,
                      }}
                    >
                      {ev.month}
                    </div>
                    <div
                      className="text-step-2 font-black"
                      style={{ color: ev.highlight ? "var(--pp-white)" : "var(--pp-navy-dark)", lineHeight: 1.1 }}
                    >
                      {ev.day}
                    </div>
                  </div>

                  {/* Event info */}
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <span
                      className="text-fluid-sm font-bold"
                      style={{
                        display: "inline-block",
                        alignSelf: "start",
                        background: ev.categoryColor,
                        color: "var(--pp-white)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.1rem 0.5rem",
                      }}
                    >
                      {ev.category}
                    </span>
                    <h3 className="text-step-0 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                      {ev.title}
                    </h3>
                    <div
                      className="text-fluid-sm"
                      style={{ color: "var(--pp-slate-500)", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Clock style={{ width: "0.8rem", height: "0.8rem", flexShrink: 0 }} />
                        {ev.date} · {ev.time}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <MapPin style={{ width: "0.8rem", height: "0.8rem", flexShrink: 0 }} />
                        {ev.location}
                      </span>
                    </div>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.55 }}>
                      {ev.description}
                    </p>
                    <Link
                      href={ev.href}
                      className="text-fluid-sm font-semibold hover:text-pp-gold transition-colors"
                      style={{ color: "var(--pp-navy-dark)", display: "inline-flex", alignItems: "center", gap: "0.2rem", marginTop: "0.15rem" }}
                    >
                      View Details <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ════ 4. Resources ════ */}
      <section className="section-sm" style={{ background: "var(--pp-white)" }}>
        <div className="container stack" style={{ gap: "var(--space-m)" }}>
          <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
            Resources
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {resources.map(({ icon: Icon, label, href, desc }) => (
              <Link
                key={label}
                href={href}
                className="card hover:border-pp-navy hover:bg-pp-slate-50 transition-colors duration-150"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-m)",
                  padding: "var(--space-m)",
                  textDecoration: "none",
                  border: "1px solid var(--pp-slate-200)",
                }}
              >
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
                  <Icon style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy-dark)" }} />
                </div>
                <div>
                  <div className="text-fluid-base font-semibold" style={{ color: "var(--pp-navy-dark)" }}>{label}</div>
                  <div className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════ 5. Need Help Strip ════ */}
      <section
        className="section-sm"
        style={{
          background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
          color: "var(--pp-white)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-m)",
          }}
        >
          <div className="stack" style={{ gap: "var(--space-2xs)" }}>
            <h2 className="text-step-2 font-bold">Need Help?</h2>
            <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.8)" }}>
              The HOA office is open Monday 10:30 AM – 12:30 PM and Wednesday & Friday 6:30 PM – 8:00 PM.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-s)" }}>
            <Link href="/resident-portal/contact-board" className="btn btn-accent">
              Contact the Board
            </Link>
            <Link href="/resident-portal/report-issue" className="btn btn-outline-light">
              Report an Issue
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
