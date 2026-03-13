import type { Metadata } from "next"
import DocumentsBrowser from "@/components/portal/documents-browser"
import { getDocuments, type SanityDocument } from "@/lib/sanity/documents"
import { getUpcomingEvents, type SanityEvent } from "@/lib/sanity/queries"
import { getTimePartsInZone, HOA_TIME_ZONE, formatTimeInHoaTimeZone } from "@/lib/timezone"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Governing Documents | ${siteConfig.name} Resident Portal`,
  description: `The complete document library for ${siteConfig.name} HOA — governing documents, adopted resolutions, board meeting records, and financial reports.`,
}

type DocType = "governing" | "policy" | "financial" | "archive"
type BoardRecordCategory = "agenda" | "minutes"

interface DisplayDoc {
  id: string
  slug?: string
  title: string
  description: string
  href?: string
  docType: DocType
  hasContentOnly: boolean
  effectiveDate?: string
  meetingDate?: string
  meetingTime?: string
  meetingKind?: string
  boardRecordCategory?: BoardRecordCategory
  relatedEvent?: {
    _id: string
    title: string
    slug?: string
    eventDate: string
  }
}

interface UpcomingBoardEvent {
  title: string
  slug?: string
  eventDate: string
  timeLabel: string
}

interface BoardMeetingGroups {
  upcomingAgendaDoc?: DisplayDoc
  upcomingAgendaEvent?: UpcomingBoardEvent | null
  upcomingAgendaMessage?: string
  agendaArchive: DisplayDoc[]
  minutesArchive: DisplayDoc[]
}

interface DocSection {
  id: string
  title: string
  intro: string
  note?: string
  docs: DisplayDoc[]
  boardMeetingGroups?: BoardMeetingGroups
}

interface DocFilters {
  docType: DocType | "all"
  year: string
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function toHoaIsoDate(value?: string | null) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  const parts = getTimePartsInZone(parsed, HOA_TIME_ZONE)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

function inferMeetingDateFromTitle(title: string) {
  const normalized = title.replace(/[–—]/g, "-")

  const named = normalized.match(
    /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:,)?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})/i,
  )
  if (named) {
    const monthLookup: Record<string, string> = {
      january: "01",
      jan: "01",
      february: "02",
      feb: "02",
      march: "03",
      mar: "03",
      april: "04",
      apr: "04",
      may: "05",
      june: "06",
      jun: "06",
      july: "07",
      jul: "07",
      august: "08",
      aug: "08",
      september: "09",
      sept: "09",
      sep: "09",
      october: "10",
      oct: "10",
      november: "11",
      nov: "11",
      december: "12",
      dec: "12",
    }

    const month = monthLookup[named[1].toLowerCase()]
    const day = pad2(Number.parseInt(named[2], 10))
    return `${named[3]}-${month}-${day}`
  }

  const numeric = normalized.match(/(\d{1,2})-(\d{1,2})-(20\d{2}|\d{2})/)
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]
    return `${year}-${pad2(Number.parseInt(numeric[1], 10))}-${pad2(Number.parseInt(numeric[2], 10))}`
  }

  return undefined
}

function getDisplayDocMeetingDate(doc: DisplayDoc) {
  return doc.meetingDate || inferMeetingDateFromTitle(doc.title) || doc.effectiveDate
}

function getSanityDocSortDate(doc: SanityDocument) {
  return doc.meetingDate || inferMeetingDateFromTitle(doc.title) || doc.effectiveDate
}

function sortByDateThenTitle(a: SanityDocument, b: SanityDocument) {
  const aDate = getSanityDocSortDate(a)
  const bDate = getSanityDocSortDate(b)
  const aTime = aDate ? new Date(aDate).getTime() : 0
  const bTime = bDate ? new Date(bDate).getTime() : 0
  if (aTime !== bTime) return bTime - aTime
  return a.title.localeCompare(b.title)
}

function hasKeyword(value: string, keywords: string[]) {
  const normalized = normalize(value)
  return keywords.some((keyword) => normalized.includes(keyword))
}

function docText(doc: SanityDocument) {
  return normalize(`${doc.title} ${doc.description || ""}`)
}

function toDisplayDoc(doc: SanityDocument, fallbackType: DocType): DisplayDoc {
  const href = doc.file?.asset?.url || doc.externalFileUrl || undefined
  const hasContentOnly = !href && Array.isArray(doc.content) && doc.content.length > 0
  const category = normalize(doc.category)
  const boardRecordCategory =
    category === "agendas" ? "agenda" : category === "minutes" ? "minutes" : undefined

  return {
    id: doc._id,
    slug: doc.slug?.current,
    title: doc.title,
    description: doc.description || "No description available.",
    href,
    docType: fallbackType,
    hasContentOnly,
    effectiveDate: doc.effectiveDate,
    meetingDate: doc.meetingDate,
    meetingTime: doc.meetingTime,
    meetingKind: doc.meetingKind,
    boardRecordCategory,
    relatedEvent: doc.relatedEvent
      ? {
          _id: doc.relatedEvent._id,
          title: doc.relatedEvent.title,
          slug: doc.relatedEvent.slug?.current,
          eventDate: doc.relatedEvent.eventDate,
        }
      : undefined,
  }
}

function filterDocs(
  docs: SanityDocument[],
  matcher: (doc: SanityDocument) => boolean,
  fallbackType: DocType
): DisplayDoc[] {
  return docs.filter(matcher).sort(sortByDateThenTitle).map((doc) => toDisplayDoc(doc, fallbackType))
}

function getDocYear(doc: DisplayDoc): string {
  const meetingDate = getDisplayDocMeetingDate(doc)
  if (meetingDate) {
    const parsed = new Date(meetingDate)
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear())
    const yearMatch = meetingDate.match(/\b(20\d{2})\b/)
    if (yearMatch) return yearMatch[1]
  }

  const titleYears = Array.from(doc.title.matchAll(/\b(20\d{2})\b/g)).map((m) => m[1])
  if (titleYears.length > 0) return titleYears[titleYears.length - 1]

  if (doc.effectiveDate) {
    const parsed = new Date(doc.effectiveDate)
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear())
  }

  return "Unknown"
}

function isBoardEvent(event: SanityEvent) {
  return ["bod-meeting", "special-meeting"].includes(event.category)
}

function toUpcomingBoardEvent(event: SanityEvent): UpcomingBoardEvent {
  return {
    title: event.title,
    slug: event.slug?.current,
    eventDate: event.eventDate,
    timeLabel: formatTimeInHoaTimeZone(new Date(event.eventDate)),
  }
}

function findUpcomingAgendaDoc(agendas: DisplayDoc[], nextBoardEvent: UpcomingBoardEvent | null) {
  if (!nextBoardEvent) return undefined

  const eventDateIso = toHoaIsoDate(nextBoardEvent.eventDate)
  if (!eventDateIso) return undefined

  return agendas.find((doc) => {
    if (doc.relatedEvent?.eventDate && toHoaIsoDate(doc.relatedEvent.eventDate) === eventDateIso) return true
    return getDisplayDocMeetingDate(doc) === eventDateIso
  })
}

function buildBoardMeetingGroups(meetingDocs: DisplayDoc[], nextBoardEvent: UpcomingBoardEvent | null): BoardMeetingGroups {
  const agendas = meetingDocs.filter((doc) => doc.boardRecordCategory === "agenda")
  const minutes = meetingDocs.filter((doc) => doc.boardRecordCategory === "minutes")
  const upcomingAgendaDoc = findUpcomingAgendaDoc(agendas, nextBoardEvent)
  const agendaArchive = agendas.filter((doc) => doc.id !== upcomingAgendaDoc?.id)

  let upcomingAgendaMessage: string | undefined
  if (!upcomingAgendaDoc) {
    upcomingAgendaMessage = nextBoardEvent
      ? "The agenda for the next Board meeting will be posted a few days before the meeting."
      : "No upcoming Board meeting is currently scheduled."
  }

  return {
    upcomingAgendaDoc,
    upcomingAgendaEvent: nextBoardEvent,
    upcomingAgendaMessage,
    agendaArchive,
    minutesArchive: minutes,
  }
}

function buildSections(docs: SanityDocument[], nextBoardEvent: UpcomingBoardEvent | null): DocSection[] {
  const isCovenant = (d: SanityDocument) => {
    const text = docText(d)
    return hasKeyword(text, ["covenant", "cc&r", "ccrs"])
  }

  const isBylaws = (d: SanityDocument) => {
    const text = docText(d)
    return hasKeyword(text, ["bylaw", "articles of incorporation", "articles"])
  }

  const isResolution = (d: SanityDocument) => {
    const text = docText(d)
    return hasKeyword(text, ["resolution", "regulation", "adopted rule", "rules"])
  }

  const isMeetingRecord = (d: SanityDocument) => {
    const category = normalize(d.category)
    if (category === "minutes" || category === "agendas") return true
    return normalize(d.categoryParent) === "meetings"
  }

  const isFinancial = (d: SanityDocument) => {
    const category = normalize(d.category)
    if (category === "budgets" || category === "income-statements" || category === "balance-sheets") return true
    return normalize(d.categoryParent) === "financial"
  }

  const isHistorical = (d: SanityDocument) => {
    const parent = normalize(d.categoryParent)
    const category = normalize(d.category)
    if (parent === "old-archived" || parent === "miscellaneous") return true
    if (category === "other") return true
    return false
  }

  const covenants = filterDocs(
    docs,
    (d) => {
      const category = normalize(d.category)
      if (category === "governing-docs" && isCovenant(d)) return true
      return normalize(d.categoryParent) === "hoa" && normalize(d.categoryChild) === "covenants"
    },
    "governing"
  )

  const bylaws = filterDocs(
    docs,
    (d) => {
      const category = normalize(d.category)
      if (category === "governing-docs" && isBylaws(d)) return true
      return normalize(d.categoryParent) === "hoa" && normalize(d.categoryChild) === "bylaws & articles"
    },
    "governing"
  )

  const resolutions = filterDocs(
    docs,
    (d) => {
      const category = normalize(d.category)
      if ((category === "policies" || category === "rules") && isResolution(d)) return true
      if (category === "governing-docs" && isResolution(d)) return true
      const parent = normalize(d.categoryParent)
      const child = normalize(d.categoryChild)
      return parent === "hoa" && (child === "resolutions" || child === "regulations" || child === "adopted rules")
    },
    "policy"
  )

  const covenantsIds = new Set(covenants.map((d) => d.id))
  const bylawsIds = new Set(bylaws.map((d) => d.id))
  const resolutionsIds = new Set(resolutions.map((d) => d.id))

  const meetingRecords = filterDocs(
    docs,
    (d) => isMeetingRecord(d) && !covenantsIds.has(d._id) && !bylawsIds.has(d._id) && !resolutionsIds.has(d._id),
    "archive"
  )

  const boardMeetingGroups = buildBoardMeetingGroups(meetingRecords, nextBoardEvent)

  const financials = filterDocs(docs, (d) => isFinancial(d), "financial")
  const meetingIds = new Set(meetingRecords.map((d) => d.id))
  const financialIds = new Set(financials.map((d) => d.id))

  const historical = filterDocs(
    docs,
    (d) =>
      isHistorical(d) &&
      !covenantsIds.has(d._id) &&
      !bylawsIds.has(d._id) &&
      !resolutionsIds.has(d._id) &&
      !meetingIds.has(d._id) &&
      !financialIds.has(d._id),
    "archive"
  )

  return [
    {
      id: "covenants",
      title: "Declaration of Covenants (CC&Rs)",
      intro:
        "The Declaration of Covenants, Conditions & Restrictions is the foundational legal document of Pristine Place HOA. It defines the rights and obligations of every homeowner and governs how the community is maintained and operated.",
      docs: covenants,
    },
    {
      id: "bylaws",
      title: "Articles of Incorporation & Bylaws",
      intro:
        "These documents establish the legal existence of Pristine Place HOA and define how the association is governed, including meeting procedures and board responsibilities.",
      docs: bylaws,
    },
    {
      id: "resolutions",
      title: "Adopted HOA Resolutions",
      intro:
        "Resolutions are formal policy decisions adopted by the Board of Directors. Each resolution below remains in effect unless explicitly superseded by a later resolution or amendment.",
      docs: resolutions,
    },
    {
      id: "meeting-records",
      title: "Board Meeting Records",
      intro:
        "Board of Directors meetings are open to all residents. Upcoming agendas and meeting minutes are published here as part of ongoing transparency.",
      docs: meetingRecords,
      boardMeetingGroups,
    },
    {
      id: "financials",
      title: "Financial Reports & Budgets",
      intro: "Annual budgets and monthly financial statements are published in the interest of financial transparency.",
      docs: financials,
    },
    {
      id: "historical",
      title: "Historical Records",
      intro:
        "Earlier governing documents and records retained for reference. These may have been superseded but are preserved for institutional history.",
      docs: historical,
    },
  ]
}

function applyDocFilters(docs: DisplayDoc[], filters: DocFilters): DisplayDoc[] {
  const byType = filters.docType
  const byYear = filters.year

  return docs.filter((doc) => {
    if (byType !== "all" && doc.docType !== byType) return false
    if (byYear !== "all" && getDocYear(doc) !== byYear) return false
    return true
  })
}

function applyBoardMeetingFilters(groups: BoardMeetingGroups | undefined, filters: DocFilters): BoardMeetingGroups | undefined {
  if (!groups) return groups

  const visibleUpcomingAgendaDoc =
    groups.upcomingAgendaDoc && applyDocFilters([groups.upcomingAgendaDoc], filters).length > 0
      ? groups.upcomingAgendaDoc
      : undefined

  const upcomingAgendaMessage =
    visibleUpcomingAgendaDoc || groups.upcomingAgendaMessage
      ? groups.upcomingAgendaMessage
      : groups.upcomingAgendaEvent
        ? "The agenda for the next Board meeting will be posted a few days before the meeting."
        : "No upcoming Board meeting is currently scheduled."

  return {
    ...groups,
    upcomingAgendaDoc: visibleUpcomingAgendaDoc,
    upcomingAgendaMessage,
    agendaArchive: applyDocFilters(groups.agendaArchive, filters),
    minutesArchive: applyDocFilters(groups.minutesArchive, filters),
  }
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [docs, upcomingEvents] = await Promise.all([
    getDocuments("portal"),
    getUpcomingEvents("portal", 20),
  ])

  const nextBoardEvent = upcomingEvents.filter(isBoardEvent)[0]
  const baseSections = buildSections(docs, nextBoardEvent ? toUpcomingBoardEvent(nextBoardEvent) : null)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const rawType = firstParam(resolvedSearchParams?.docType) || "all"
  const rawYear = firstParam(resolvedSearchParams?.year) || "all"
  const docType: DocType | "all" =
    rawType === "governing" || rawType === "policy" || rawType === "financial" || rawType === "archive"
      ? rawType
      : "all"

  const filters: DocFilters = {
    docType,
    year: rawYear,
  }

  const sections = baseSections.map((section) => ({
    ...section,
    docs: applyDocFilters(section.docs, filters),
    boardMeetingGroups: applyBoardMeetingFilters(section.boardMeetingGroups, filters),
  }))

  const allDocsCount = baseSections.reduce((sum, section) => sum + section.docs.length, 0)
  const filteredDocsCount = sections.reduce((sum, section) => sum + section.docs.length, 0)

  const allYears = Array.from(
    new Set(
      baseSections
        .flatMap((section) => section.docs)
        .map((doc) => getDocYear(doc))
        .filter((year) => year !== "Unknown")
    )
  ).sort((a, b) => Number(b) - Number(a))

  const hasActiveFilters = filters.docType !== "all" || filters.year !== "all"

  return (
    <DocumentsBrowser
      sections={sections}
      filters={filters}
      allDocsCount={allDocsCount}
      filteredDocsCount={filteredDocsCount}
      allYears={allYears}
      hasActiveFilters={hasActiveFilters}
    />
  )
}
