import { createClient } from "next-sanity"

export type AccGuidelineCategory =
  | "landscaping"
  | "construction"
  | "florida-friendly"
  | "general"
  | "house"

export interface SanityAccGuideline {
  _id: string
  title: string
  slug: { current: string }
  category: AccGuidelineCategory
  published: boolean
}

export interface SanityAccGuidelineDetail extends SanityAccGuideline {
  content: Array<{
    _type: "block"
    _key: string
    style?: string
    listItem?: "bullet" | "number"
    level?: number
    markDefs?: Array<{ _key: string; _type: "link"; href: string }>
    children?: Array<{ _key: string; _type: "span"; text: string; marks?: string[] }>
  }>
}

export async function getAccGuidelines(): Promise<SanityAccGuideline[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.error("ACC guidelines fetch skipped: missing Sanity environment variables.")
    return []
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  })

  const query = `*[
    _type == "accGuideline"
    && published == true
  ] | order(title asc) {
    _id,
    title,
    slug,
    category,
    published
  }`

  try {
    return await client.fetch(query)
  } catch (error) {
    console.error("Failed to fetch ACC guidelines from Sanity:", error)
    return []
  }
}

export async function getAccGuidelineBySlug(slug: string): Promise<SanityAccGuidelineDetail | null> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.error("ACC guideline detail fetch skipped: missing Sanity environment variables.")
    return null
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  })

  const query = `*[
    _type == "accGuideline"
    && published == true
    && slug.current == $slug
  ][0]{
    _id,
    title,
    slug,
    category,
    published,
    content
  }`

  try {
    return await client.fetch(query, { slug })
  } catch (error) {
    console.error("Failed to fetch ACC guideline detail from Sanity:", error)
    return null
  }
}

export async function getRelatedAccGuidelines(
  category: AccGuidelineCategory,
  excludeSlug: string,
  limit: number = 5,
): Promise<SanityAccGuideline[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.error("Related ACC guidelines fetch skipped: missing Sanity environment variables.")
    return []
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  })

  const query = `*[
    _type == "accGuideline"
    && published == true
    && category == $category
    && slug.current != $excludeSlug
  ] | order(title asc) [0...$limit] {
    _id,
    title,
    slug,
    category,
    published
  }`

  try {
    return await client.fetch(query, { category, excludeSlug, limit })
  } catch (error) {
    console.error("Failed to fetch related ACC guidelines from Sanity:", error)
    return []
  }
}
