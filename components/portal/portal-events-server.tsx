// components/portal/portal-events-server.tsx
// Server component: Fetches events from Sanity and passes to client component

import { client } from "@/lib/sanity/client"
import { getUpcomingEvents, type RecurringEvent } from "@/lib/sanity/recurring-events"
import { PortalEventsGrid } from "./portal-events-grid"

/**
 * Fetch all published events from Sanity
 */
async function getEvents(): Promise<RecurringEvent[]> {
  const query = `*[_type == "event" && published == true && (visibility == "portal" || visibility == "both")] | order(eventDate asc) {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    location,
    description,
    category,
    published,
    visibility,
    featuredImage {
      asset-> {
        _id,
        url
      }
    }
  }`

  try {
    const events = await client.fetch<RecurringEvent[]>(query, {}, {
      cache: "no-store" // Always fetch fresh data
    })
    return events
  } catch (error) {
    console.error("Error fetching events:", error)
    return []
  }
}

/**
 * Map Sanity category to portal category
 */
function mapCategory(sanityCategory?: string): string {
  const categoryMap: Record<string, string> = {
    "bod-meeting": "meeting",
    "committee-meeting": "meeting",
    "annual-meeting": "meeting",
    "special-meeting": "meeting",
    "social-activity": "social",
    "special-event": "social",
    "crime-watch": "safety",
    "fitness-health": "social",
    "maintenance": "maintenance",
  }

  return categoryMap[sanityCategory || ""] || "meeting"
}

export async function PortalEventsServer() {
  // Fetch events from Sanity
  const sanityEvents = await getEvents()

  // Generate all occurrences for the next 6 months
  const occurrences = getUpcomingEvents(sanityEvents, {
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
  })

  // Transform to the format expected by PortalEventsGrid
  const events = occurrences.map((occ) => {
    const eventDate = new Date(occ.date)
    const month = eventDate.toLocaleString("en-US", { month: "short" }).toUpperCase()
    const day = eventDate.getDate().toString()
    const dateStr = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    })
    const timeStr = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    return {
      id: occ._id,
      slug: occ.slug.current,
      month,
      day,
      category: mapCategory(occ.category),
      title: occ.title,
      date: dateStr,
      time: timeStr,
      location: occ.location || "TBD",
      description: occ.description
        ? // Extract plain text from Portable Text (simplified)
          occ.description
            .filter((block: any) => block._type === "block")
            .map((block: any) =>
              block.children
                ?.map((child: any) => child.text)
                .join("")
            )
            .join(" ")
            .slice(0, 200) + "..."
        : "Event details coming soon.",
      highlight: occ.category === "annual-meeting" || occ.category === "special-event",
      isRecurring: occ.isRecurring,
      originalEventId: occ.originalEventId,
    }
  })

  return <PortalEventsGrid events={events} />
}
