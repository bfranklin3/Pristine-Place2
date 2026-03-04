// app/events/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { getEvents } from "@/lib/sanity/queries"
import { EventsGrid } from "@/components/events-grid"
import { Button } from "@/components/ui/button"
import type { EventCategorySlug } from "@/lib/events"
import { formatTimeInHoaTimeZone } from "@/lib/timezone"

// ============================================================================
// METADATA
// ============================================================================
export const metadata: Metadata = {
  title: "Events & Calendar | Community Gatherings & Activities",
  description: `Upcoming events, meetings, and community activities at ${siteConfig.name} in ${siteConfig.contact.address.city}, ${siteConfig.contact.address.state}. Join us for social events, board meetings, and seasonal celebrations.`,
  openGraph: {
    title: `Events & Calendar | ${siteConfig.name}`,
    description: `Community events, meetings, and activities at ${siteConfig.name}.`,
    url: `${siteConfig.url}/events`,
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
  },
  alternates: { canonical: `${siteConfig.url}/events` },
}

// ============================================================================
// EDITABLE CONTENT
// ============================================================================
const content = {
  hero: {
    title: "Events & Calendar",
    subtitle: "Stay connected with community gatherings, meetings, and seasonal activities",
  },
  eventTypes: [
    {
      icon: Users,
      title: "Social & Community",
      description:
        "Pool parties, food truck nights, yard sales, and neighborhood gatherings that bring residents together.",
    },
    {
      icon: Calendar,
      title: "Board & HOA Meetings",
      description:
        "Monthly board meetings, annual homeowner meetings, and committee sessions. Open to all residents.",
    },
    {
      icon: MapPin,
      title: "Holidays & Seasonal",
      description:
        "Easter egg hunts, Memorial Day cookouts, holiday celebrations, and seasonal events for the whole family.",
    },
  ],
}

// Helper to map Sanity categories to EVENT_CATEGORIES keys
function mapSanityCategoryToEventCategory(sanityCategory: string): EventCategorySlug {
  const categoryMap: Record<string, EventCategorySlug> = {
    "general": "social",
    "maintenance": "maintenance",
    "community": "social",
    "important": "meeting",
    "emergency": "maintenance",
    "social-activity": "social",
    "annual-meeting": "meeting",
    "bod-meeting": "meeting",
    "committee-meeting": "meeting",
    "crime-watch": "meeting",
    "fitness-health": "social",
    "special-event": "holiday",
    "special-meeting": "meeting",
  }
  return categoryMap[sanityCategory] || "social"
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================
export default async function EventsPage() {
  // Fetch all events from Sanity
  const allEvents = await getEvents("public")
  const today = new Date()

  // Transform Sanity events to the format expected by EventsGrid
  const transformEvent = (event: any) => ({
    id: event._id,
    title: event.title,
    slug: event.slug.current,
    date: event.eventDate,
    time: formatTimeInHoaTimeZone(new Date(event.eventDate)),
    location: event.location || "",
    description: event.description ? event.description.map((block: any) =>
      block.children?.map((child: any) => child.text).join("") || ""
    ).join(" ") : "",
    category: mapSanityCategoryToEventCategory(event.category),
    rsvpRequired: event.rsvpRequired,
  })

  // Separate into upcoming and past events
  const upcomingEvents = allEvents
    .filter(event => new Date(event.eventDate) >= today)
    .map(transformEvent)
  const pastEvents = allEvents
    .filter(event => new Date(event.eventDate) < today)
    .map(transformEvent)

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="hero-section" style={{ background: "var(--pp-navy)" }}>
        <div
          className="hero-overlay"
          style={{
            background:
              "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy-light))",
          }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle max-w-3xl mx-auto">
            {content.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Events Card Grid */}
      <section
        className="bg-[var(--pp-slate-50)]"
        style={{ paddingBlock: "var(--space-2xl)" }}
      >
        <div className="container">
          <div className="text-center" style={{ marginBottom: "var(--space-l)" }}>
            <h2 className="text-step-3 font-bold text-[var(--pp-navy-dark)]" style={{ marginBottom: "var(--space-2xs)" }}>
              Upcoming Events
            </h2>
            <p className="text-step-0 text-[var(--pp-slate-500)] max-w-2xl mx-auto">
              Browse upcoming events by category
            </p>
          </div>

          <EventsGrid upcomingEvents={upcomingEvents} pastEvents={pastEvents} />

          {/* Calendar Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--pp-slate-400)]">
              Google Calendar integration coming soon &mdash; subscribe for automatic event updates.
            </p>
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section style={{ paddingBlock: "var(--space-2xl)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "var(--space-l)" }}>
            <h2 className="text-step-3 font-bold text-[var(--pp-navy-dark)]" style={{ marginBottom: "var(--space-xs)" }}>
              Types of Events We Host
            </h2>
            <p className="text-step-0 text-[var(--pp-slate-500)]">
              Something for everyone in our community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {content.eventTypes.map((type) => (
              <div key={type.title} className="card">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--pp-navy-dark)", color: "var(--pp-white)" }}
                >
                  <type.icon className="h-6 w-6" />
                </div>
                <h3 className="text-step-1 font-bold" style={{ marginBottom: "var(--space-2xs)" }}>
                  {type.title}
                </h3>
                <p className="text-step-0 text-[var(--pp-slate-600)] leading-relaxed">
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="text-white"
        style={{
          paddingBlock: "var(--space-2xl)",
          background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
        }}
      >
        <div className="container text-center" style={{ maxWidth: "56rem" }}>
          <h2 className="text-step-3 font-bold" style={{ marginBottom: "var(--space-xs)" }}>
            Stay Connected
          </h2>
          <p className="text-step-1 text-white/80" style={{ marginBottom: "var(--space-l)" }}>
            Don&apos;t miss out on upcoming events, meetings, and community gatherings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-[var(--pp-navy-dark)] hover:bg-[var(--pp-slate-100)]">
              <Link href="/contact">Get Event Updates</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[var(--pp-navy-dark)] bg-transparent"
            >
              <Link href="/announcements">View Announcements</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
