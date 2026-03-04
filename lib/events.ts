// lib/events.ts
// Event types, category definitions, and helpers for Pristine Place HOA.
// Phase 1: Stub data. Phase 2: Google Calendar integration.
import { HOA_TIME_ZONE } from "@/lib/timezone"

// ============================================================================
// CATEGORY CONFIGURATION
// ============================================================================
export const EVENT_CATEGORIES = {
  social: {
    slug: "social",
    label: "Social",
    color: "bg-[var(--pp-green)]",
    tagBg: "bg-[var(--pp-green-soft)]",
    tagText: "text-[var(--pp-green)]",
    icon: "🎉",
  },
  meeting: {
    slug: "meeting",
    label: "Board & Meetings",
    color: "bg-[var(--pp-navy)]",
    tagBg: "bg-[var(--pp-slate-100)]",
    tagText: "text-[var(--pp-navy)]",
    icon: "📋",
  },
  maintenance: {
    slug: "maintenance",
    label: "Maintenance",
    color: "bg-[var(--pp-warning)]",
    tagBg: "bg-amber-50",
    tagText: "text-amber-800",
    icon: "🔧",
  },
  holiday: {
    slug: "holiday",
    label: "Holidays & Seasonal",
    color: "bg-[var(--pp-gold)]",
    tagBg: "bg-blue-50",
    tagText: "text-[var(--pp-gold-dark)]",
    icon: "🎄",
  },
} as const

export type EventCategorySlug = keyof typeof EVENT_CATEGORIES

// ============================================================================
// EVENT INTERFACE
// ============================================================================
export interface CommunityEvent {
  id: string
  slug: string
  title: string
  date: string          // ISO date string
  time: string          // Display time
  endDate?: string      // For multi-day events
  location: string
  description: string
  category: EventCategorySlug
  isFeatured?: boolean
  isPast?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================
export function getShortMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", timeZone: HOA_TIME_ZONE }).toUpperCase()
}

export function getDayNumber(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: HOA_TIME_ZONE }).format(new Date(dateStr))
}

export function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: HOA_TIME_ZONE,
  })
}

function slugify(title: string, date: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${date}`
}

// ============================================================================
// STUB DATA
// ============================================================================
const stubEvents: CommunityEvent[] = [
  {
    id: "evt-001",
    slug: slugify("Board of Directors Meeting", "2026-03-12"),
    title: "Board of Directors Meeting",
    date: "2026-03-12",
    time: "6:30 PM",
    location: "Clubhouse Main Room",
    description:
      "Monthly Board meeting. Open to all residents. Agenda will be posted 48 hours in advance on the Documents page.",
    category: "meeting",
  },
  {
    id: "evt-002",
    slug: slugify("Community Yard Sale", "2026-03-22"),
    title: "Community Yard Sale",
    date: "2026-03-22",
    time: "8:00 AM – 1:00 PM",
    location: "Throughout the neighborhood",
    description:
      "Spring yard sale! Set up in your driveway or participate from the clubhouse lot. Register by March 15 to be included on the printed map.",
    category: "social",
    isFeatured: true,
  },
  {
    id: "evt-003",
    slug: slugify("Annual Easter Egg Hunt", "2026-04-04"),
    title: "Annual Easter Egg Hunt",
    date: "2026-04-04",
    time: "10:00 AM",
    location: "Community Park",
    description:
      "Ages 2–12 are invited to hunt for eggs across the park. Bring a basket! Sponsored by the Social Committee.",
    category: "holiday",
    isFeatured: true,
  },
  {
    id: "evt-004",
    slug: slugify("Irrigation System Maintenance", "2026-03-17"),
    title: "Irrigation System Maintenance",
    date: "2026-03-17",
    time: "7:00 AM – 12:00 PM",
    location: "Common areas",
    description:
      "Scheduled irrigation maintenance. Water will be temporarily shut off to common area zones. Individual homes are not affected.",
    category: "maintenance",
  },
  {
    id: "evt-005",
    slug: slugify("Food Truck Friday", "2026-04-10"),
    title: "Food Truck Friday",
    date: "2026-04-10",
    time: "5:00 PM – 8:00 PM",
    location: "Clubhouse parking lot",
    description:
      "Join your neighbors for an evening of food trucks, music, and lawn games. Bring chairs and blankets!",
    category: "social",
  },
  {
    id: "evt-006",
    slug: slugify("Pool Opening Day", "2026-04-25"),
    title: "Pool Opening Day",
    date: "2026-04-25",
    time: "10:00 AM – 6:00 PM",
    location: "Community Pool",
    description:
      "Kick off pool season with a splash! DJ, food vendors, and games for all ages. Free for residents and their guests.",
    category: "social",
    isFeatured: true,
  },
  {
    id: "evt-007",
    slug: slugify("Annual Meeting of Homeowners", "2026-05-08"),
    title: "Annual Meeting of Homeowners",
    date: "2026-05-08",
    time: "7:00 PM",
    location: "Clubhouse Main Room",
    description:
      "Annual membership meeting with budget review, board elections, and community updates. All homeowners are encouraged to attend or submit a proxy.",
    category: "meeting",
  },
  {
    id: "evt-008",
    slug: slugify("Memorial Day Cookout", "2026-05-25"),
    title: "Memorial Day Cookout",
    date: "2026-05-25",
    time: "12:00 PM – 4:00 PM",
    location: "Pavilion by the Pool",
    description:
      "Burgers, hot dogs, and sides provided by the Social Committee. Please RSVP by May 20. Bring a dish to share!",
    category: "holiday",
  },
]

// ============================================================================
// DATA ACCESS
// ============================================================================
export function getEvents(): CommunityEvent[] {
  return [...stubEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

export function getUpcomingEvents(count = 3): CommunityEvent[] {
  const now = new Date()
  return getEvents()
    .filter((e) => new Date(e.date) >= now)
    .slice(0, count)
}

export function getPastEvents(): CommunityEvent[] {
  const now = new Date()
  return getEvents()
    .filter((e) => new Date(e.date) < now)
    .map((e) => ({ ...e, isPast: true }))
}

export function getEventBySlug(slug: string): CommunityEvent | undefined {
  return getEvents().find((e) => e.slug === slug)
}
