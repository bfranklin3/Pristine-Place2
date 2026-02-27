// components/events-grid.tsx
"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Calendar, Clock, MapPin, ArrowRight, Filter, ChevronDown } from "lucide-react"
import {
  type CommunityEvent,
  EVENT_CATEGORIES,
  type EventCategorySlug,
  getShortMonth,
  getDayNumber,
  formatEventDate,
} from "@/lib/events"

const INITIAL_COUNT = 6
const LOAD_MORE_COUNT = 6

interface EventsGridProps {
  upcomingEvents: CommunityEvent[]
  pastEvents: CommunityEvent[]
}

// ============================================================================
// EVENT CARD
// ============================================================================
function EventCard({ event }: { event: CommunityEvent }) {
  const cat = EVENT_CATEGORIES[event.category]

  return (
    <Link href={`/events/${event.slug}`} className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-[var(--border)]">
      {/* Top Color Bar */}
      <div className={`h-1.5 ${cat.color}`} />

      <div className="p-5 sm:p-6">
        {/* Date Badge + Category */}
        <div className="flex items-start gap-4 mb-4">
          {/* Calendar Date Badge */}
          <div className="shrink-0 w-16 h-16 rounded-lg border border-[var(--border)] flex flex-col items-center justify-center text-center bg-[var(--pp-slate-50)]">
            <span className="text-xs font-bold text-[var(--pp-navy-dark)] uppercase tracking-wider leading-none">
              {getShortMonth(event.date)}
            </span>
            <span className="text-2xl font-bold text-[var(--pp-slate-900)] leading-none mt-0.5">
              {getDayNumber(event.date)}
            </span>
          </div>

          {/* Title + Tag */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.tagBg} ${cat.tagText}`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </span>
              {event.isFeatured && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  ⭐ Featured
                </span>
              )}
              {event.isPast && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--pp-slate-100)] text-[var(--pp-slate-500)]">
                  Past Event
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[var(--pp-slate-900)] group-hover:text-[var(--pp-gold)] transition-colors line-clamp-2">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-sm text-[var(--pp-slate-600)] mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--pp-gold)] shrink-0" />
            <span>{formatEventDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--pp-gold)] shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--pp-gold)] shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-[var(--pp-slate-500)] line-clamp-2 mb-4">
            {event.description}
          </p>
        )}

        {/* View Details Link */}
        <div className="flex items-center text-[var(--pp-gold)] font-semibold text-sm group-hover:translate-x-1 transition-transform">
          View Details
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </Link>
  )
}

// ============================================================================
// FEATURED EVENT CARD (larger, hero-style)
// ============================================================================
function FeaturedEventCard({ event }: { event: CommunityEvent }) {
  const cat = EVENT_CATEGORIES[event.category]

  return (
    <Link href={`/events/${event.slug}`} className="group block bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-[var(--border)] md:col-span-2 lg:col-span-3">
      <div className="md:flex">
        {/* Left: Gradient panel */}
        <div className="relative md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-[var(--pp-navy)] to-[var(--pp-navy-light)]">
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">{cat.icon}</div>
              <div className="text-3xl font-bold">{getShortMonth(event.date)}</div>
              <div className="text-5xl font-bold leading-none">{getDayNumber(event.date)}</div>
            </div>
          </div>
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-[var(--pp-navy-dark)] shadow-sm">
              ⭐ Featured Event
            </span>
          </div>
        </div>

        {/* Right: Content */}
        <div className="p-6 md:p-8 md:flex-1 flex flex-col justify-center">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.tagBg} ${cat.tagText} w-fit mb-3`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </span>
          <h3 className="text-step-3 font-bold text-[var(--pp-slate-900)] group-hover:text-[var(--pp-gold)] transition-colors mb-3">
            {event.title}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--pp-slate-600)] mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[var(--pp-gold)]" />
              {formatEventDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--pp-gold)]" />
              {event.time}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[var(--pp-gold)]" />
              {event.location}
            </span>
          </div>
          {event.description && (
            <p className="text-[var(--pp-slate-500)] line-clamp-3 mb-4">{event.description}</p>
          )}
          <div className="flex items-center text-[var(--pp-gold)] font-bold group-hover:translate-x-1 transition-transform">
            View Event Details
            <ArrowRight className="h-5 w-5 ml-2" />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ============================================================================
// MAIN EVENTS GRID WITH FILTERING
// ============================================================================
export function EventsGrid({ upcomingEvents, pastEvents }: EventsGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [showPast, setShowPast] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
    setVisibleCount(INITIAL_COUNT)
  }, [])

  // Get categories that actually have events
  const availableCategories = useMemo(() => {
    const allEvents = [...upcomingEvents, ...pastEvents]
    const cats = new Set(allEvents.map((e) => e.category))
    return Object.entries(EVENT_CATEGORIES).filter(([slug]) =>
      cats.has(slug as EventCategorySlug)
    )
  }, [upcomingEvents, pastEvents])

  // Filter events by active category
  const filteredUpcoming = useMemo(() => {
    if (activeCategory === "all") return upcomingEvents
    return upcomingEvents.filter((e) => e.category === activeCategory)
  }, [upcomingEvents, activeCategory])

  const filteredPast = useMemo(() => {
    if (activeCategory === "all") return pastEvents
    return pastEvents.filter((e) => e.category === activeCategory)
  }, [pastEvents, activeCategory])

  // Separate featured from regular
  const featuredEvents = filteredUpcoming.filter((e) => e.isFeatured)
  const regularUpcoming = filteredUpcoming.filter((e) => !e.isFeatured)

  return (
    <div>
      {/* Category Filter Bar */}
      <div className="mb-8">
        {/* Mobile: Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-[var(--border)] rounded-lg font-semibold text-[var(--pp-slate-700)]"
            type="button"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {activeCategory === "all"
                ? "All Categories"
                : EVENT_CATEGORIES[activeCategory as EventCategorySlug]?.label || "All"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </button>
          {filterOpen && (
            <div className="mt-2 bg-white border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => { handleCategoryChange("all"); setFilterOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-[var(--pp-navy-dark)] text-white"
                    : "hover:bg-[var(--pp-slate-50)]"
                }`}
                type="button"
              >
                📅 All Categories
              </button>
              {availableCategories.map(([slug, config]) => (
                <button
                  key={slug}
                  onClick={() => { handleCategoryChange(slug); setFilterOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-t border-[var(--border)] ${
                    activeCategory === slug
                      ? "bg-[var(--pp-navy-dark)] text-white"
                      : "hover:bg-[var(--pp-slate-50)]"
                  }`}
                  type="button"
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: Pill Buttons */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === "all"
                  ? "bg-[var(--pp-navy-dark)] text-white shadow-md"
                  : "bg-white text-[var(--pp-slate-600)] border border-[var(--border)] hover:border-[var(--pp-gold)] hover:text-[var(--pp-gold)]"
              }`}
              type="button"
            >
              📅 All Events
            </button>
            {availableCategories.map(([slug, config]) => (
              <button
                key={slug}
                onClick={() => handleCategoryChange(slug)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeCategory === slug
                    ? "bg-[var(--pp-navy-dark)] text-white shadow-md"
                    : "bg-white text-[var(--pp-slate-600)] border border-[var(--border)] hover:border-[var(--pp-gold)] hover:text-[var(--pp-gold)]"
                }`}
                type="button"
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <div className="mb-10">
          <div className="grid gap-6">
            {featuredEvents.map((event) => (
              <FeaturedEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events Grid */}
      {regularUpcoming.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {regularUpcoming.slice(0, visibleCount).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Load More */}
          {visibleCount < regularUpcoming.length && (
            <div className="text-center mb-12">
              <button
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                type="button"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[var(--pp-gold)] font-semibold rounded-lg border-2 border-[var(--pp-gold)] hover:bg-[var(--pp-gold)] hover:text-white transition-colors shadow-sm hover:shadow-md"
              >
                Load More Events
                <span className="text-sm font-normal opacity-75">
                  ({regularUpcoming.length - visibleCount} remaining)
                </span>
              </button>
            </div>
          )}
        </>
      ) : filteredUpcoming.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[var(--border)] mb-12">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-step-2 font-semibold text-[var(--pp-slate-700)] mb-2">No Upcoming Events</h3>
          <p className="text-[var(--pp-slate-500)] max-w-md mx-auto">
            {activeCategory !== "all"
              ? `No upcoming ${EVENT_CATEGORIES[activeCategory as EventCategorySlug]?.label || ""} events right now. Check other categories or view past events.`
              : "No upcoming events scheduled right now. Check back soon!"}
          </p>
        </div>
      ) : null}

      {/* Past Events Section */}
      {filteredPast.length > 0 && (
        <div className="border-t border-[var(--border)] pt-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-step-2 font-semibold text-[var(--pp-slate-700)]">Past Events</h3>
            <button
              onClick={() => setShowPast(!showPast)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--pp-gold)] hover:text-[var(--pp-gold-dark)] transition-colors"
              type="button"
            >
              {showPast ? "Hide" : `Show ${filteredPast.length} Past Events`}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showPast && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPast.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
