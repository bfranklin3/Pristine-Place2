// lib/sanity/documents.ts
// Sanity queries for fetching HOA documents

import { client } from "./client"

export interface SanityDocument {
  _id: string
  title: string
  slug: { current: string }
  description?: string
  content?: unknown[]
  file?: {
    asset: {
      _ref: string
      url?: string
    }
  }
  externalFileUrl?: string
  fileType: string
  category: string
  categoryParent?: string
  categoryChild?: string
  version?: string
  effectiveDate?: string
  meetingDate?: string
  meetingTime?: string
  meetingKind?: string
  relatedEvent?: {
    _id: string
    title: string
    slug?: { current: string }
    eventDate: string
  }
  published: boolean
  visibility: "portal" | "public" | "both"
}

/**
 * Fetch a single document by slug
 */
export async function getDocumentBySlug(
  slug: string
): Promise<SanityDocument | null> {
  const query = `*[_type == "hoaDocument" && slug.current == $slug && published == true][0] {
    _id,
    title,
    slug,
    description,
    content,
    file {
      asset-> {
        _ref,
        url
      }
    },
    externalFileUrl,
    fileType,
    category,
    categoryParent,
    categoryChild,
    version,
    effectiveDate,
    meetingDate,
    meetingTime,
    meetingKind,
    relatedEvent->{
      _id,
      title,
      slug,
      eventDate
    },
    published,
    visibility
  }`

  try {
    const doc = await client.fetch(query, { slug })
    return doc
  } catch (error) {
    console.error("Error fetching document:", error)
    return null
  }
}

/**
 * Get all published documents for a given visibility
 */
export async function getDocuments(
  visibility: "portal" | "public" = "portal"
): Promise<SanityDocument[]> {
  const query = `*[_type == "hoaDocument" && published == true && (visibility == $visibility || visibility == "both")] | order(category asc, title asc) {
    _id,
    title,
    slug,
    description,
    content,
    file {
      asset-> {
        _ref,
        url
      }
    },
    externalFileUrl,
    fileType,
    category,
    categoryParent,
    categoryChild,
    version,
    effectiveDate,
    meetingDate,
    meetingTime,
    meetingKind,
    relatedEvent->{
      _id,
      title,
      slug,
      eventDate
    },
    visibility
  }`

  try {
    const docs = await client.fetch(query, { visibility })
    return docs
  } catch (error) {
    console.error("Error fetching documents:", error)
    return []
  }
}
