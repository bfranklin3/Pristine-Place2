// app/(portal)/resident-portal/events/[slug]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Mail, Repeat, Shield } from "lucide-react"
import { client } from "@/lib/sanity/client"
import { PortableText } from "@portabletext/react"
import { siteConfig } from "@/lib/site-config"
import { formatRecurrence } from "@/lib/sanity/recurring-events"
import { getOptimizedImageUrl, getImageDimensions, getImageSizes, type ImageLayout } from "@/lib/sanity/image-builder"
import { HOA_TIME_ZONE, formatTimeInHoaTimeZone } from "@/lib/timezone"

interface EventPageProps {
  params: Promise<{ slug: string }>
}

// Fetch event data
async function getEvent(slug: string) {
  const query = `*[_type == "event" && slug.current == $slug && published == true][0] {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    location,
    description,
    featuredImage {
      asset-> {
        url
      }
    },
    imageLayout,
    category,
    rsvpRequired,
    rsvpEmail,
    published,
    visibility
  }`

  const event = await client.fetch(query, { slug })
  return event
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)

  if (!event) {
    return {
      title: "Event Not Found",
    }
  }

  return {
    title: `${event.title} | Resident Portal | ${siteConfig.name}`,
    description: event.description
      ? event.description
          .filter((block: any) => block._type === "block")
          .map((block: any) =>
            block.children?.map((child: any) => child.text).join("")
          )
          .join(" ")
          .slice(0, 160)
      : event.title,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const event = await getEvent(slug)

  if (!event) {
    notFound()
  }

  const eventDate = new Date(event.eventDate)
  const endDate = event.endDate ? new Date(event.endDate) : null

  // Get image layout and optimized URL
  const layout = (event.imageLayout || 'hero') as ImageLayout
  const imageUrl = event.featuredImage ? getOptimizedImageUrl(event.featuredImage, layout) : null
  const imageSizes = getImageSizes(layout)

  return (
    <>
      {/* Back Link */}
      <div className="container" style={{ paddingTop: "var(--space-m)" }}>
        <Link
          href="/resident-portal/events"
          className="inline-flex items-center gap-2 text-fluid-sm text-pp-slate-600 hover:text-pp-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
      </div>

      {/* Event Details */}
      <article className="section">
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            {/* Featured Image - Hero Layout */}
            {imageUrl && layout === 'hero' && (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "400px",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={imageUrl}
                  alt={event.title}
                  fill
                  sizes={imageSizes}
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Side-by-Side Layout */}
            {imageUrl && layout === 'side' && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-l)", alignItems: "start" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                  <Image src={imageUrl} alt={event.title} fill sizes={imageSizes} className="object-cover" priority />
                </div>
                <div className="stack" style={{ gap: "var(--space-s)" }}>
                  <div className="cluster" style={{ gap: "var(--space-xs)", flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: "var(--pp-navy-dark)", color: "var(--pp-gold-light)" }}>
                      <Shield className="w-3 h-3" />
                      Resident Portal
                    </span>
                    {event.category && (
                      <span className="badge" style={{ background: "var(--pp-navy)", color: "var(--pp-white)", textTransform: "capitalize" }}>
                        {event.category.replace("-", " ")}
                      </span>
                    )}
                    {event.isRecurring && (
                      <span className="badge" style={{ background: "var(--pp-slate-200)", color: "var(--pp-slate-700)" }}>
                        <Repeat className="w-3 h-3" />
                        Recurring Event
                      </span>
                    )}
                  </div>
                  <h1 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{event.title}</h1>
                </div>
              </div>
            )}

            {/* Compact Layout */}
            {imageUrl && layout === 'compact' && (
              <div style={{ display: "flex", gap: "var(--space-m)", alignItems: "flex-start" }}>
                <div style={{ position: "relative", width: "150px", height: "150px", borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0 }}>
                  <Image src={imageUrl} alt={event.title} fill sizes={imageSizes} className="object-cover" />
                </div>
                <div className="stack" style={{ gap: "var(--space-xs)", flex: 1 }}>
                  <div className="cluster" style={{ gap: "var(--space-xs)", flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: "var(--pp-navy-dark)", color: "var(--pp-gold-light)" }}>
                      <Shield className="w-3 h-3" />
                      Resident Portal
                    </span>
                    {event.category && (
                      <span className="badge" style={{ background: "var(--pp-navy)", color: "var(--pp-white)", textTransform: "capitalize" }}>
                        {event.category.replace("-", " ")}
                      </span>
                    )}
                    {event.isRecurring && (
                      <span className="badge" style={{ background: "var(--pp-slate-200)", color: "var(--pp-slate-700)" }}>
                        <Repeat className="w-3 h-3" />
                        Recurring Event
                      </span>
                    )}
                  </div>
                  <h1 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{event.title}</h1>
                </div>
              </div>
            )}

            {/* Header - Only show for hero and none layouts */}
            {(layout === 'hero' || layout === 'none') && (
              <div className="stack" style={{ gap: "var(--space-m)" }}>
                {/* Title & Badges */}
                <div className="stack" style={{ gap: "var(--space-xs)" }}>
                  <div className="cluster" style={{ gap: "var(--space-xs)" }}>
                    <span
                      className="badge"
                      style={{
                        background: "var(--pp-navy-dark)",
                        color: "var(--pp-gold-light)",
                      }}
                    >
                      <Shield className="w-3 h-3" />
                      Resident Portal
                    </span>
                    {event.category && (
                      <span
                        className="badge"
                        style={{
                          background: "var(--pp-navy)",
                          color: "var(--pp-white)",
                          textTransform: "capitalize",
                        }}
                      >
                        {event.category.replace("-", " ")}
                      </span>
                    )}
                    {event.isRecurring && (
                      <span
                        className="badge"
                        style={{
                          background: "var(--pp-slate-200)",
                          color: "var(--pp-slate-700)",
                        }}
                      >
                        <Repeat className="w-3 h-3" />
                        Recurring Event
                      </span>
                    )}
                  </div>

                  <h1 className="text-step-4 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    {event.title}
                  </h1>
                </div>
              </div>
            )}

            {/* Event Info Cards - Show for all layouts */}
            <div className="stack" style={{ gap: "var(--space-m)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: "var(--space-s)",
                }}
              >
                {/* Date & Time */}
                <div className="card" style={{ padding: "var(--space-m)" }}>
                  <div className="stack-xs">
                    <Calendar
                      className="w-5 h-5"
                      style={{ color: "var(--pp-navy)" }}
                    />
                    <p className="text-fluid-xs font-bold text-pp-slate-500" style={{ textTransform: "uppercase" }}>
                      Date & Time
                    </p>
                    <p className="text-fluid-sm font-semibold text-pp-navy-dark">
                      {eventDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        timeZone: HOA_TIME_ZONE,
                      })}
                    </p>
                    <p className="text-fluid-sm text-pp-slate-600">
                      {formatTimeInHoaTimeZone(eventDate)}
                      {endDate &&
                        ` - ${formatTimeInHoaTimeZone(endDate)}`}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="card" style={{ padding: "var(--space-m)" }}>
                    <div className="stack-xs">
                      <MapPin
                        className="w-5 h-5"
                        style={{ color: "var(--pp-navy)" }}
                      />
                      <p className="text-fluid-xs font-bold text-pp-slate-500" style={{ textTransform: "uppercase" }}>
                        Location
                      </p>
                      <p className="text-fluid-sm font-semibold text-pp-navy-dark">
                        {event.location}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recurrence Info */}
                {event.isRecurring && event.recurrence?.rrule && (
                  <div className="card" style={{ padding: "var(--space-m)" }}>
                    <div className="stack-xs">
                      <Repeat
                        className="w-5 h-5"
                        style={{ color: "var(--pp-navy)" }}
                      />
                      <p className="text-fluid-xs font-bold text-pp-slate-500" style={{ textTransform: "uppercase" }}>
                        Repeats
                      </p>
                      <p className="text-fluid-sm font-semibold text-pp-navy-dark">
                        {formatRecurrence(event.recurrence.rrule)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* RSVP Info */}
              {event.rsvpRequired && event.rsvpEmail && (
                <div
                  className="card"
                  style={{
                    padding: "var(--space-m)",
                    background: "var(--pp-gold-light)",
                    border: "1px solid var(--pp-gold)",
                  }}
                >
                  <div className="cluster" style={{ gap: "var(--space-s)", alignItems: "center" }}>
                    <Mail className="w-5 h-5" style={{ color: "var(--pp-navy)" }} />
                    <div>
                      <p className="text-fluid-sm font-semibold text-pp-navy-dark">
                        RSVP Required
                      </p>
                      <p className="text-fluid-sm text-pp-slate-600">
                        Please confirm your attendance:{" "}
                        <a
                          href={`mailto:${event.rsvpEmail}`}
                          className="text-pp-navy hover:underline font-semibold"
                        >
                          {event.rsvpEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--pp-slate-200)" }} />

            {/* Description */}
            {event.description && (
              <div
                className="prose"
                style={{
                  color: "var(--pp-slate-700)",
                  fontSize: "var(--fluid-base)",
                  lineHeight: 1.7,
                }}
              >
                <PortableText value={event.description} />
              </div>
            )}

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--pp-slate-200)" }} />

            {/* Footer */}
            <div className="stack" style={{ gap: "var(--space-s)", alignItems: "center" }}>
              <Link href="/resident-portal/events" className="btn btn-outline">
                <ArrowLeft className="w-4 h-4" />
                Back to All Events
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
