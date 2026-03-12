import { client } from "./client"

export interface PortableTextSpan {
  _type: "span"
  text: string
  [key: string]: unknown
}

export interface PortableTextBlock {
  _type: "block"
  children?: PortableTextSpan[]
  [key: string]: unknown
}

export type PortableTextValue = PortableTextBlock[]

// TypeScript types
export interface SanityAnnouncement {
  _id: string
  title: string
  slug: { current: string }
  content: PortableTextValue
  excerpt?: string
  category: string
  priority: "normal" | "high" | "urgent"
  publishDate: string
  expiryDate?: string
  pinned: boolean
  published: boolean
  visibility: "portal" | "public" | "both"
}

export interface SanityEvent {
  _id: string
  title: string
  slug: { current: string }
  eventDate: string
  endDate?: string
  isRecurring?: boolean
  recurrence?: {
    rrule?: string
    dtstart?: string
    dtend?: string
    startDate?: string
    endDate?: string
    tzid?: string
  }
  location?: string
  description?: PortableTextValue
  featuredImage?: {
    asset: {
      _ref: string
      url?: string
    }
  }
  imageLayout?: "hero" | "side" | "compact" | "none"
  category: string
  rsvpRequired: boolean
  rsvpEmail?: string
  published: boolean
  visibility: "portal" | "public" | "both"
}

export interface SanityDocument {
  _id: string
  title: string
  slug: { current: string }
  category: string
  description?: string
  content?: PortableTextValue
  file?: {
    asset?: {
      _ref?: string
      url?: string
    }
  }
  externalFileUrl?: string
  publishDate: string
  expiryDate?: string
  featured: boolean
  requiresLogin: boolean
  published: boolean
  visibility: "portal" | "public" | "both"
}

export interface SanityBoardMember {
  _id: string
  name: string
  position: string
  bio?: PortableTextValue
  email?: string
  phone?: string
  photo?: {
    asset: {
      _ref: string
      url?: string
    }
  }
  displayOrder: number
  active: boolean
}

// Query functions

/**
 * Fetch announcements for a specific site (public or portal)
 */
export async function getAnnouncements(site: "public" | "portal"): Promise<SanityAnnouncement[]> {
  const today = new Date().toISOString()

  const query = `*[
    _type == "announcement"
    && published == true
    && (visibility == "${site}" || visibility == "both")
    && publishDate <= "${today}"
    && (!defined(expiryDate) || expiryDate >= "${today}")
  ] | order(pinned desc, publishDate desc) {
    _id,
    title,
    slug,
    content,
    excerpt,
    category,
    priority,
    publishDate,
    expiryDate,
    pinned,
    published,
    visibility
  }`

  return await client.fetch(query)
}

/**
 * Fetch events for a specific site (public or portal)
 */
export async function getEvents(site: "public" | "portal"): Promise<SanityEvent[]> {
  const query = `*[
    _type == "event"
    && published == true
    && (visibility == "${site}" || visibility == "both")
  ] | order(eventDate asc) {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    location,
    description,
    featuredImage,
    imageLayout,
    category,
    rsvpRequired,
    rsvpEmail,
    published,
    visibility
  }`

  return await client.fetch(query)
}

/**
 * Fetch all published events regardless of portal/public visibility.
 * Used for internal operational views such as facility availability.
 */
export async function getAllPublishedEvents(): Promise<SanityEvent[]> {
  const query = `*[
    _type == "event"
    && published == true
  ] | order(eventDate asc) {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    location,
    description,
    featuredImage,
    imageLayout,
    category,
    rsvpRequired,
    rsvpEmail,
    published,
    visibility
  }`

  return await client.fetch(query)
}

/**
 * Fetch upcoming events (for homepage/portal dashboard)
 * This function now expands recurring events into individual occurrences
 */
export async function getUpcomingEvents(site: "public" | "portal", limit: number = 4): Promise<SanityEvent[]> {
  // Fetch all published events (including recurring ones)
  const query = `*[
    _type == "event"
    && published == true
    && (visibility == "${site}" || visibility == "both")
  ] | order(eventDate asc) {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    isRecurring,
    recurrence,
    location,
    description,
    featuredImage,
    imageLayout,
    category,
    rsvpRequired,
    rsvpEmail,
    published,
    visibility
  }`

  const events = await client.fetch(query)

  // Import the recurring events helper
  const { getUpcomingEvents: expandRecurringEvents } = await import("./recurring-events")

  // Generate occurrences for all events (next 90 days)
  const occurrences = expandRecurringEvents(events, {
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    limit,
  })

  // Convert occurrences back to SanityEvent format
  return occurrences.slice(0, limit).map(occ => ({
    _id: occ._id,
    title: occ.title,
    slug: occ.slug,
    eventDate: occ.date.toISOString(),
    endDate: occ.endDate?.toISOString(),
    location: occ.location,
    description: occ.description,
    category: occ.category || "general",
    rsvpRequired: false,
    published: true,
    visibility: "both" as const,
  }))
}

/**
 * Fetch documents for a specific site (public or portal)
 */
export async function getDocuments(site: "public" | "portal"): Promise<SanityDocument[]> {
  const today = new Date().toISOString()

  const query = `*[
    _type == "hoaDocument"
    && published == true
    && (visibility == "${site}" || visibility == "both")
    && (!defined(expiryDate) || expiryDate >= "${today}")
  ] | order(featured desc, publishDate desc) {
    _id,
    title,
    slug,
    category,
    description,
    content,
    "file": file.asset->{url},
    externalFileUrl,
    publishDate,
    expiryDate,
    featured,
    requiresLogin,
    published,
    visibility
  }`

  return await client.fetch(query)
}

/**
 * Fetch active board members
 */
export async function getBoardMembers(): Promise<SanityBoardMember[]> {
  const query = `*[
    _type == "boardMember"
    && active == true
  ] | order(displayOrder asc) {
    _id,
    name,
    position,
    bio,
    email,
    phone,
    "photo": photo.asset->{url},
    displayOrder,
    active
  }`

  return await client.fetch(query)
}
