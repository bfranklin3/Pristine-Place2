// lib/sanity/search.ts
// Search infrastructure for portal content (announcements, events)
// Uses GROQ queries to search Sanity CMS content

import { client } from "./client"

export interface SearchResult {
  type: "announcement" | "event" | "page" | "document" | "faq" | "committee" | "acc-guideline"
  id: string
  title: string
  excerpt: string
  href: string
  date?: string
  category?: string
  parentCategory?: string
  score?: number
}

export type SearchScope =
  | "all"
  | SearchResult["type"]
  | "board-records"
  | "meeting-minutes"
  | "meeting-agendas"

export interface SearchPage {
  results: SearchResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  scope: SearchScope
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function portableTextToPlainText(value: any): string {
  if (!Array.isArray(value)) return ""

  return collapseWhitespace(
    value
      .map((block: any) =>
        block._type === "block" && Array.isArray(block.children)
          ? block.children.map((child: any) => child.text || "").join("")
          : ""
      )
      .join(" ")
  )
}

function getQueryTerms(query: string): string[] {
  return Array.from(
    new Set(
      collapseWhitespace(query)
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.replace(/[^\w-]/g, ""))
        .filter((term) => term.length >= 2)
    )
  )
}

function findMatchIndex(text: string, query: string, terms: string[]): number {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = collapseWhitespace(query).toLowerCase()

  if (normalizedQuery) {
    const exactIndex = normalizedText.indexOf(normalizedQuery)
    if (exactIndex >= 0) return exactIndex
  }

  for (const term of terms) {
    const termIndex = normalizedText.indexOf(term)
    if (termIndex >= 0) return termIndex
  }

  return -1
}

function buildExcerpt(
  text: string,
  query: string,
  fallback: string,
  maxLength = 180
): string {
  const normalizedText = collapseWhitespace(text || "")
  const normalizedFallback = collapseWhitespace(fallback || "")

  if (!normalizedText) return normalizedFallback

  const terms = getQueryTerms(query)
  const matchIndex = findMatchIndex(normalizedText, query, terms)

  if (matchIndex < 0) {
    return normalizedText.length <= maxLength
      ? normalizedText
      : `${normalizedText.slice(0, maxLength).trimEnd()}...`
  }

  const halfWindow = Math.max(Math.floor(maxLength / 2), 60)
  let start = Math.max(0, matchIndex - halfWindow)
  const end = Math.min(normalizedText.length, start + maxLength)

  if (end === normalizedText.length) {
    start = Math.max(0, end - maxLength)
  }

  const snippet = normalizedText.slice(start, end).trim()
  return `${start > 0 ? "..." : ""}${snippet}${end < normalizedText.length ? "..." : ""}`
}

function scoreTextMatch(query: string, title: string, primaryText = "", secondaryText = ""): number {
  const normalizedQuery = collapseWhitespace(query).toLowerCase()
  const terms = getQueryTerms(query)
  const titleLower = title.toLowerCase()
  const primaryLower = primaryText.toLowerCase()
  const secondaryLower = secondaryText.toLowerCase()

  let score = 0

  if (titleLower.includes(normalizedQuery)) score += 120
  if (titleLower.startsWith(normalizedQuery)) score += 30
  if (primaryLower.includes(normalizedQuery)) score += 75
  if (secondaryLower.includes(normalizedQuery)) score += 45

  for (const term of terms) {
    if (titleLower.includes(term)) score += 14
    if (primaryLower.includes(term)) score += 9
    if (secondaryLower.includes(term)) score += 5
  }

  return score
}

function sortSearchResults(a: SearchResult, b: SearchResult): number {
  const scoreA = a.score || 0
  const scoreB = b.score || 0
  if (scoreB !== scoreA) return scoreB - scoreA

  const dateA = a.date ? new Date(a.date).getTime() : 0
  const dateB = b.date ? new Date(b.date).getTime() : 0
  if (dateB !== dateA) return dateB - dateA

  return a.title.localeCompare(b.title)
}

function normalizeSearchValue(value?: string | null): string {
  return (value || "").trim().toLowerCase()
}

function matchesScope(result: SearchResult, scope: SearchScope): boolean {
  const category = normalizeSearchValue(result.category)
  const parentCategory = normalizeSearchValue(result.parentCategory)
  const isMeetingMinute = result.type === "document" && category === "minutes"
  const isMeetingAgenda = result.type === "document" && category === "agendas"
  const isBoardRecord =
    result.type === "document" &&
    (parentCategory === "meetings" || isMeetingMinute || isMeetingAgenda)

  if (scope === "all") return true
  if (scope === "board-records") {
    return isBoardRecord
  }
  if (scope === "meeting-minutes") {
    return isMeetingMinute
  }
  if (scope === "meeting-agendas") {
    return isMeetingAgenda
  }

  return result.type === scope
}

async function fetchSearchPool(query: string, scope: SearchScope, desiredCount: number): Promise<SearchResult[]> {
  const perTypeLimit = Math.min(Math.max(desiredCount, 24), 80)

  if (scope === "announcement") return searchAnnouncements(query, perTypeLimit)
  if (scope === "event") return searchEvents(query, perTypeLimit)
  if (scope === "page") return searchPages(query, perTypeLimit)
  if (scope === "faq") return searchFAQs(query, perTypeLimit)
  if (scope === "committee") return searchCommittees(query, perTypeLimit)
  if (scope === "acc-guideline") return searchAccGuidelines(query, perTypeLimit)
  if (scope === "document" || scope === "board-records" || scope === "meeting-minutes" || scope === "meeting-agendas") {
    const documents = await searchDocuments(query, perTypeLimit)
    return documents.filter((result) => matchesScope(result, scope))
  }

  const [announcements, events, pages, documents, faqs, committees, accGuidelines] = await Promise.all([
    searchAnnouncements(query, perTypeLimit),
    searchEvents(query, perTypeLimit),
    searchPages(query, perTypeLimit),
    searchDocuments(query, perTypeLimit),
    searchFAQs(query, perTypeLimit),
    searchCommittees(query, perTypeLimit),
    searchAccGuidelines(query, perTypeLimit),
  ])

  return [...announcements, ...events, ...pages, ...documents, ...faqs, ...committees, ...accGuidelines]
}

/**
 * Search announcements by title and content
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchAnnouncements(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "announcement" && (
    title match $query ||
    pt::text(content) match $query
  )] | order(_createdAt desc) [0...${queryLimit}] {
    _id,
    title,
    content,
    _createdAt,
    slug
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`, // Wildcard for partial matching
    })

    return results
      .map((result: any) => {
        const contentText = portableTextToPlainText(result.content)
        const score = scoreTextMatch(query, String(result.title || ""), contentText)

        return {
          type: "announcement" as const,
          id: result._id,
          title: result.title,
          excerpt: buildExcerpt(contentText, query, result.title),
          href: `/resident-portal/announcements/${result.slug?.current || result._id}`,
          date: result._createdAt,
          score,
        }
      })
      .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching announcements:", error)
    return []
  }
}

/**
 * Search events by title and description
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchEvents(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "event" && (
    title match $query ||
    description match $query
  )] | order(startDateTime desc) [0...${queryLimit}] {
    _id,
    title,
    description,
    startDateTime,
    category,
    slug
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`, // Wildcard for partial matching
    })

    return results
      .map((result: any) => {
        const description = collapseWhitespace(String(result.description || ""))
        const score = scoreTextMatch(query, String(result.title || ""), description)

        return {
          type: "event" as const,
          id: result._id,
          title: result.title,
          excerpt: buildExcerpt(description, query, result.title),
          href: `/resident-portal/events/${result.slug?.current || result._id}`,
          date: result.startDateTime,
          category: result.category?.title || result.category,
          score,
        }
      })
      .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching events:", error)
    return []
  }
}

/**
 * Search pages by title and content
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchPages(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "page" && published == true && showInSearch == true && (
    title match $query ||
    pt::text(content) match $query ||
    excerpt match $query
  )] | order(title asc) [0...${queryLimit}] {
    _id,
    title,
    content,
    excerpt,
    category,
    slug,
    visibility,
    publishDate
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`, // Wildcard for partial matching
    })

    return results
      .map((result: any) => {
        const excerptText = collapseWhitespace(String(result.excerpt || ""))
        const contentText = portableTextToPlainText(result.content)
        const score = scoreTextMatch(query, String(result.title || ""), excerptText, contentText)

        return {
          type: "page" as const,
          id: result._id,
          title: result.title,
          excerpt: buildExcerpt(excerptText || contentText, query, result.title),
          // Portal search only returns portal-routable links.
          href: `/resident-portal/${result.slug?.current || result._id}`,
          date: result.publishDate,
          category: result.category,
          score,
        }
      })
      .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching pages:", error)
    return []
  }
}

/**
 * Search documents by title, description, and tags
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchDocuments(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 24), 160)

  const searchQuery = `*[_type == "hoaDocument" && published == true && showInSearch == true && (
    title match $query ||
    description match $query ||
    pt::text(content) match $query ||
    $query in tags[]
  )] [0...${queryLimit}] {
    _id,
    title,
    description,
    "contentText": pt::text(content),
    category,
    categoryParent,
    meetingDate,
    slug,
    visibility,
    effectiveDate
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`,
    })

    const normalizedQuery = query.trim().toLowerCase()
    const scored = results
      .map((result: any) => {
        const title = String(result.title || "")
        const description = String(result.description || "")
        const contentText = String(result.contentText || "")

        let score = scoreTextMatch(query, title, description, contentText)
        const titleLower = title.toLowerCase()

        const sortDate = result.meetingDate || result.effectiveDate || null
        const sortTime = sortDate ? new Date(sortDate).getTime() : 0

        if (description.toLowerCase().includes(normalizedQuery)) score += 10
        if (contentText.toLowerCase().includes(normalizedQuery)) score += 20
        if (titleLower.startsWith(normalizedQuery)) score += 10

        return {
          result,
          score,
          sortTime: Number.isFinite(sortTime) ? sortTime : 0,
        }
      })
      .sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime
        return String(a.result.title || "").localeCompare(String(b.result.title || ""))
      })
      .slice(0, limit)

    return scored.map(({ result }: any) => {
      const href = result.slug?.current
        ? `/resident-portal/documents/${result.slug.current}`
        : "/resident-portal/documents"
      return {
        type: "document" as const,
        id: result._id,
        title: result.title,
        excerpt: buildExcerpt(
          result.description && String(result.description).toLowerCase().includes(normalizedQuery)
            ? result.description
            : result.contentText || result.description || "",
          query,
          result.description || result.title
        ),
        href,
        date: result.meetingDate || result.effectiveDate,
        category: result.category,
        parentCategory: result.categoryParent,
        score: scored.find((item: any) => item.result._id === result._id)?.score || 0,
      }
    })
  } catch (error) {
    console.error("Error searching documents:", error)
    return []
  }
}

/**
 * Search FAQs by question and answer content
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchFAQs(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "faq" && published == true && showInSearch == true && (
    question match $query ||
    pt::text(answer) match $query ||
    $query in keywords[]
  )] | order(question asc) [0...${queryLimit}] {
    _id,
    question,
    answer,
    category,
    slug,
    visibility
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`,
    })

    return results
      .map((result: any) => {
        const answerText = portableTextToPlainText(result.answer)
        const score = scoreTextMatch(query, String(result.question || ""), answerText)

        return {
          type: "faq" as const,
          id: result._id,
          title: result.question,
          excerpt: buildExcerpt(answerText, query, result.question),
          href: `/resident-portal/faq/${result.slug?.current || result._id}`,
          category: result.category,
          score,
        }
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching FAQs:", error)
    return []
  }
}

/**
 * Search committees by name and description
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 5)
 */
export async function searchCommittees(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "committee" && published == true && showInSearch == true && active == true && (
    name match $query ||
    abbreviation match $query ||
    pt::text(description) match $query
  )] | order(name asc) [0...${queryLimit}] {
    _id,
    name,
    abbreviation,
    description,
    slug,
    visibility
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`,
    })

    return results
      .map((result: any) => {
        const descText = portableTextToPlainText(result.description)
        const displayName = result.abbreviation
          ? `${result.name} (${result.abbreviation})`
          : result.name
        const score = scoreTextMatch(query, String(displayName || ""), descText)

        return {
          type: "committee" as const,
          id: result._id,
          title: displayName,
          excerpt: buildExcerpt(descText, query, displayName),
          // Committee detail routes are not implemented; route to committees index.
          href: "/resident-portal/committees",
          score,
        }
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching committees:", error)
    return []
  }
}

export async function searchAccGuidelines(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const queryLimit = Math.min(Math.max(limit * 4, 12), 120)

  const searchQuery = `*[_type == "accGuideline" && published == true && (
    title match $query ||
    pt::text(content) match $query
  )] | order(title asc) [0...${queryLimit}] {
    _id,
    title,
    slug,
    category,
    content
  }`

  try {
    const results = await client.fetch(searchQuery, {
      query: `${query}*`,
    })

    return results
      .map((result: any) => {
        const contentText = portableTextToPlainText(result.content)
        const score = scoreTextMatch(query, String(result.title || ""), contentText)

        return {
          type: "acc-guideline" as const,
          id: result._id,
          title: result.title,
          excerpt: buildExcerpt(contentText, query, result.title),
          href: `/resident-portal/acc/${result.slug?.current || result._id}`,
          category: result.category,
          score,
        }
      })
      .sort(sortSearchResults)
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching ACC guidelines:", error)
    return []
  }
}

/**
 * Search across all content types (announcements, events, pages, documents, FAQs, committees)
 * Returns top results grouped by type, up to the specified total limit
 *
 * @param query - Search query string
 * @param totalLimit - Maximum total results to return (default: 10)
 */
export async function searchAll(
  query: string,
  totalLimit = 10
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  // Fetch more results per type so document-heavy searches can surface older but relevant matches.
  const perTypeLimit = Math.min(Math.max(Math.ceil(totalLimit / 2), 8), 20)

  const [announcements, events, pages, documents, faqs, committees, accGuidelines] = await Promise.all([
    searchAnnouncements(query, perTypeLimit),
    searchEvents(query, perTypeLimit),
    searchPages(query, perTypeLimit),
    searchDocuments(query, perTypeLimit),
    searchFAQs(query, perTypeLimit),
    searchCommittees(query, perTypeLimit),
    searchAccGuidelines(query, perTypeLimit),
  ])

  // Seed the combined result set with a balanced sample from each type.
  const combined: SearchResult[] = []
  const maxPerType = Math.max(4, Math.ceil(totalLimit / 5))

  // Add results from each type (up to maxPerType)
  combined.push(...announcements.slice(0, maxPerType))
  combined.push(...events.slice(0, maxPerType))
  combined.push(...pages.slice(0, maxPerType))
  combined.push(...documents.slice(0, maxPerType))
  combined.push(...faqs.slice(0, maxPerType))
  combined.push(...committees.slice(0, maxPerType))
  combined.push(...accGuidelines.slice(0, maxPerType))

  // If we have room for more results, add remaining from any type
  const remaining = totalLimit - combined.length
  if (remaining > 0) {
    const allRemaining = [
      ...announcements.slice(maxPerType),
      ...events.slice(maxPerType),
      ...pages.slice(maxPerType),
      ...documents.slice(maxPerType),
      ...faqs.slice(maxPerType),
      ...committees.slice(maxPerType),
      ...accGuidelines.slice(maxPerType),
    ]
    combined.push(...allRemaining.slice(0, remaining))
  }

  // Sort primarily by relevance, then use date as a tiebreaker.
  return combined
    .sort(sortSearchResults)
    .slice(0, totalLimit)
}

export async function searchPageResults(
  query: string,
  {
    page = 1,
    pageSize = 20,
    scope = "all",
  }: {
    page?: number
    pageSize?: number
    scope?: SearchScope
  } = {},
): Promise<SearchPage> {
  const normalizedPage = Math.max(1, Math.floor(page))
  const normalizedPageSize = Math.min(Math.max(Math.floor(pageSize), 1), 50)

  if (!query || query.trim().length < 2) {
    return {
      results: [],
      total: 0,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: 0,
      scope,
    }
  }

  const desiredCount = Math.min(Math.max(normalizedPage * normalizedPageSize + 20, 40), 120)
  const pool = await fetchSearchPool(query.trim(), scope, desiredCount)
  const filtered = pool
    .filter((result) => matchesScope(result, scope))
    .sort(sortSearchResults)

  const total = filtered.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / normalizedPageSize)
  const offset = (normalizedPage - 1) * normalizedPageSize

  return {
    results: filtered.slice(offset, offset + normalizedPageSize),
    total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalPages,
    scope,
  }
}
