import { createClient } from "next-sanity"

export type FaqAboutCategory =
  | "understanding-community"
  | "community-standards"
  | "property-changes-acc"
  | "enforcement-appeals"
  | "governance-participation-services"

export interface SanityFaqForAbout {
  _id: string
  question: string
  slug: { current: string }
  answerText: string
  aboutCategory: FaqAboutCategory
  order?: number
}

export interface SanityFaqDetail {
  _id: string
  question: string
  slug: { current: string }
  answer: Array<{
    _type: "block"
    _key: string
    style?: string
    listItem?: "bullet" | "number"
    level?: number
    markDefs?: Array<{ _key: string; _type: "link"; href: string }>
    children?: Array<{ _key: string; _type: "span"; text: string; marks?: string[] }>
  }>
  category?: string
  aboutCategory?: FaqAboutCategory
  published: boolean
  visibility?: "portal" | "public" | "both"
}

export async function getAboutFaqs(): Promise<SanityFaqForAbout[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.error("About FAQs fetch skipped: missing Sanity environment variables.")
    return []
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  })

  const query = `*[
    _type == "faq"
    && published == true
    && (visibility == "both" || visibility == "portal")
    && defined(aboutCategory)
  ] | order(coalesce(order, 9999) asc, question asc) {
    _id,
    question,
    slug,
    "answerText": pt::text(answer),
    aboutCategory,
    order
  }`

  try {
    return await client.fetch(query)
  } catch (error) {
    console.error("Failed to fetch About FAQs from Sanity:", error)
    return []
  }
}

export async function getFaqBySlug(slug: string): Promise<SanityFaqDetail | null> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.error("FAQ detail fetch skipped: missing Sanity environment variables.")
    return null
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
  })

  const query = `*[
    _type == "faq"
    && slug.current == $slug
    && published == true
    && (visibility == "both" || visibility == "portal")
  ][0]{
    _id,
    question,
    slug,
    answer,
    category,
    aboutCategory,
    published,
    visibility
  }`

  try {
    return await client.fetch(query, { slug })
  } catch (error) {
    console.error("Failed to fetch FAQ detail from Sanity:", error)
    return null
  }
}
