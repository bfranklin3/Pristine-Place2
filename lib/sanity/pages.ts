// lib/sanity/pages.ts
// Sanity queries for fetching page content

import { client } from "./client"

export interface SanityPage {
  _id: string
  title: string
  slug: { current: string }
  content: any[] // Portable Text array
  excerpt?: string
  category?: string
  featuredImage?: {
    asset: {
      _ref: string
      url?: string
    }
    alt?: string
  }
  visibility: "portal" | "public" | "both"
  showInSearch: boolean
  publishDate?: string
  lastUpdated?: string
}

/**
 * Fetch a single page by slug
 */
export async function getPageBySlug(
  slug: string,
  visibility: "portal" | "public" = "portal"
): Promise<SanityPage | null> {
  const query = `*[_type == "page" && slug.current == $slug && published == true && (visibility == $visibility || visibility == "both")][0] {
    _id,
    title,
    slug,
    content,
    excerpt,
    category,
    featuredImage {
      asset-> {
        _ref,
        url
      },
      alt
    },
    visibility,
    showInSearch,
    publishDate,
    lastUpdated
  }`

  try {
    const page = await client.fetch(query, { slug, visibility })
    return page
  } catch (error) {
    console.error("Error fetching page:", error)
    return null
  }
}

/**
 * Fetch all published pages for a given visibility
 */
export async function getPages(
  visibility: "portal" | "public" = "portal"
): Promise<SanityPage[]> {
  const query = `*[_type == "page" && published == true && (visibility == $visibility || visibility == "both")] | order(order asc, title asc) {
    _id,
    title,
    slug,
    excerpt,
    category,
    visibility,
    publishDate
  }`

  try {
    const pages = await client.fetch(query, { visibility })
    return pages
  } catch (error) {
    console.error("Error fetching pages:", error)
    return []
  }
}

/**
 * Get all page slugs for static generation
 */
export async function getAllPageSlugs(): Promise<string[]> {
  const query = `*[_type == "page" && published == true].slug.current`

  try {
    const slugs = await client.fetch(query)
    return slugs
  } catch (error) {
    console.error("Error fetching page slugs:", error)
    return []
  }
}
