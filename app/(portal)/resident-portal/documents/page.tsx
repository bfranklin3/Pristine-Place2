import type { Metadata } from "next"
import DocumentsBrowser from "@/components/portal/documents-browser"
import { getDocuments, type SanityDocument } from "@/lib/sanity/documents"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Governing Documents | ${siteConfig.name} Resident Portal`,
  description: `The complete document library for ${siteConfig.name} HOA — governing documents, adopted resolutions, board meeting records, and financial reports.`,
}

type DocType = "governing" | "policy" | "financial" | "archive"

interface DisplayDoc {
  id: string
  slug?: string
  title: string
  description: string
  href?: string
  docType: DocType
  hasContentOnly: boolean
  effectiveDate?: string
}

interface DocSection {
  id: string
  title: string
  intro: string
  note?: string
  docs: DisplayDoc[]
}

interface DocFilters {
  docType: DocType | "all"
  year: string
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function sortByDateThenTitle(a: SanityDocument, b: SanityDocument) {
  const aTime = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0
  const bTime = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0
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

  return {
    id: doc._id,
    slug: doc.slug?.current,
    title: doc.title,
    description: doc.description || "No description available.",
    href,
    docType: fallbackType,
    hasContentOnly,
    effectiveDate: doc.effectiveDate,
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
  const titleYears = Array.from(doc.title.matchAll(/\b(20\d{2})\b/g)).map((m) => m[1])
  if (titleYears.length > 0) return titleYears[titleYears.length - 1]

  if (doc.effectiveDate) {
    const parsed = new Date(doc.effectiveDate)
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear())
  }

  return "Unknown"
}

function buildSections(docs: SanityDocument[]): DocSection[] {
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
        "Board of Directors meetings are open to all residents. Agendas and approved minutes are published here as part of ongoing transparency.",
      docs: meetingRecords,
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

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const docs = await getDocuments("portal")
  const baseSections = buildSections(docs)
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
