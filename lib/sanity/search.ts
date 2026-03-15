// lib/sanity/search.ts
// Search infrastructure for portal content (announcements, events)
// Uses GROQ queries to search Sanity CMS content

import { client } from "./client"

export interface SearchResult {
  type: "announcement" | "event" | "page" | "document" | "faq" | "committee"
  id: string
  title: string
  excerpt: string
  href: string
  date?: string
  category?: string
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

  const searchQuery = `*[_type == "announcement" && (
    title match $query ||
    pt::text(content) match $query
  )] | order(_createdAt desc) [0...${limit}] {
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

    return results.map((result: any) => {
      // Extract plain text from Portable Text content for excerpt
      const contentText = result.content
        ?.map((block: any) =>
          block._type === "block" && block.children
            ? block.children.map((child: any) => child.text).join("")
            : ""
        )
        .join(" ")
        .substring(0, 150)

      return {
        type: "announcement" as const,
        id: result._id,
        title: result.title,
        excerpt: contentText || result.title,
        href: `/resident-portal/announcements/${result.slug?.current || result._id}`,
        date: result._createdAt,
      }
    })
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

  const searchQuery = `*[_type == "event" && (
    title match $query ||
    description match $query
  )] | order(startDateTime desc) [0...${limit}] {
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

    return results.map((result: any) => ({
      type: "event" as const,
      id: result._id,
      title: result.title,
      excerpt: result.description?.substring(0, 150) || result.title,
      href: `/resident-portal/events/${result.slug?.current || result._id}`,
      date: result.startDateTime,
      category: result.category?.title || result.category,
    }))
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

  const searchQuery = `*[_type == "page" && published == true && showInSearch == true && (
    title match $query ||
    pt::text(content) match $query ||
    excerpt match $query
  )] | order(title asc) [0...${limit}] {
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

    return results.map((result: any) => {
      // Use excerpt if available, otherwise extract from content
      let excerpt = result.excerpt
      if (!excerpt) {
        const contentText = result.content
          ?.map((block: any) =>
            block._type === "block" && block.children
              ? block.children.map((child: any) => child.text).join("")
              : ""
          )
          .join(" ")
          .substring(0, 150)
        excerpt = contentText || result.title
      }

      return {
        type: "page" as const,
        id: result._id,
        title: result.title,
        excerpt,
        // Portal search only returns portal-routable links.
        href: `/resident-portal/${result.slug?.current || result._id}`,
        date: result.publishDate,
        category: result.category,
      }
    })
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

  const queryLimit = Math.min(Math.max(limit * 8, 20), 80)

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

        let score = 0
        const titleLower = title.toLowerCase()
        const descriptionLower = description.toLowerCase()
        const contentLower = contentText.toLowerCase()

        if (titleLower.includes(normalizedQuery)) score += 120
        if (descriptionLower.includes(normalizedQuery)) score += 70
        if (contentLower.includes(normalizedQuery)) score += 40

        if (titleLower.startsWith(normalizedQuery)) score += 25

        const sortDate = result.meetingDate || result.effectiveDate || null
        const sortTime = sortDate ? new Date(sortDate).getTime() : 0

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
        excerpt: result.description || result.contentText?.slice(0, 150) || result.title,
        href,
        date: result.effectiveDate,
        category: result.category,
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

  const searchQuery = `*[_type == "faq" && published == true && showInSearch == true && (
    question match $query ||
    pt::text(answer) match $query ||
    $query in keywords[]
  )] | order(question asc) [0...${limit}] {
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

    return results.map((result: any) => {
      // Extract answer excerpt
      const answerText = result.answer
        ?.map((block: any) =>
          block._type === "block" && block.children
            ? block.children.map((child: any) => child.text).join("")
            : ""
        )
        .join(" ")
        .substring(0, 150)

      return {
        type: "faq" as const,
        id: result._id,
        title: result.question,
        excerpt: answerText || result.question,
        href: `/resident-portal/faq/${result.slug?.current || result._id}`,
        category: result.category,
      }
    })
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

  const searchQuery = `*[_type == "committee" && published == true && showInSearch == true && active == true && (
    name match $query ||
    abbreviation match $query ||
    pt::text(description) match $query
  )] | order(name asc) [0...${limit}] {
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

    return results.map((result: any) => {
      // Extract description excerpt
      const descText = result.description
        ?.map((block: any) =>
          block._type === "block" && block.children
            ? block.children.map((child: any) => child.text).join("")
            : ""
        )
        .join(" ")
        .substring(0, 150)

      const displayName = result.abbreviation
        ? `${result.name} (${result.abbreviation})`
        : result.name

      return {
        type: "committee" as const,
        id: result._id,
        title: displayName,
        excerpt: descText || displayName,
        // Committee detail routes are not implemented; route to committees index.
        href: "/resident-portal/committees",
      }
    })
  } catch (error) {
    console.error("Error searching committees:", error)
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

  // Fetch more results per type to ensure we get the best matches
  const perTypeLimit = Math.ceil(totalLimit / 6) + 2

  const [announcements, events, pages, documents, faqs, committees] = await Promise.all([
    searchAnnouncements(query, perTypeLimit),
    searchEvents(query, perTypeLimit),
    searchPages(query, perTypeLimit),
    searchDocuments(query, perTypeLimit),
    searchFAQs(query, perTypeLimit),
    searchCommittees(query, perTypeLimit),
  ])

  // Combine and interleave results for better UX
  const combined: SearchResult[] = []
  const maxPerType = Math.ceil(totalLimit / 6)

  // Add results from each type (up to maxPerType)
  combined.push(...announcements.slice(0, maxPerType))
  combined.push(...events.slice(0, maxPerType))
  combined.push(...pages.slice(0, maxPerType))
  combined.push(...documents.slice(0, maxPerType))
  combined.push(...faqs.slice(0, maxPerType))
  combined.push(...committees.slice(0, maxPerType))

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
    ]
    combined.push(...allRemaining.slice(0, remaining))
  }

  // Sort by date (most recent first) and limit to totalLimit
  return combined
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
    .slice(0, totalLimit)
}
