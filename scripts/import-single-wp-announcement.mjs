import dotenv from "dotenv"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const wpAnnouncement = {
  id: 35744,
  date: "2026-02-22T18:03:43",
  date_gmt: "2026-02-22T23:03:43",
  modified: "2026-02-22T18:04:58",
  modified_gmt: "2026-02-22T23:04:58",
  slug: "tree-trimming-in-the-st-ives-median",
  status: "publish",
  type: "announcements",
  title: { rendered: "Tree Trimming in the St. Ives Median" },
  content: {
    rendered:
      '<p dir="auto"><strong>Tree Trimming in the St. Ives Median</strong></p>\n<p dir="auto">Tree trimming will begin tomorrow in the median along St. Ives Boulevard. The work is expected to take several days, weather and conditions permitting.</p>\n<p dir="auto">Partial lane closures will be in place during the project for crew safety. Please drive with caution and allow extra time when traveling through the area.</p>\n<p dir="auto">Thank you for your patience and cooperation while we maintain our community’s appearance and safety.</p>\n<p dir="auto">Questions? Contact the HOA office.</p>\n<p dir="auto">HOA Board</p>\n',
  },
  class_list: [
    "post-35744",
    "announcements",
    "type-announcements",
    "status-publish",
    "has-post-thumbnail",
    "hentry",
    "announcement-placement-announcement",
    "announcement-placement-portal",
  ],
}

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
}

function decodeHtml(html) {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
}

function stripTags(input) {
  return decodeHtml(input.replace(/<[^>]+>/g, "")).trim()
}

function htmlToPortableText(html) {
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  const blocks = []
  let match
  let index = 0

  while ((match = paragraphRegex.exec(html)) !== null) {
    const raw = (match[1] || "").trim()
    if (!raw) continue

    const isStrongOnly = /^<strong>[\s\S]*<\/strong>$/i.test(raw)
    const text = stripTags(raw)
    if (!text) continue

    blocks.push({
      _type: "block",
      _key: key(`block-${index}`),
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: key(`span-${index}`),
          text,
          marks: isStrongOnly ? ["strong"] : [],
        },
      ],
    })
    index += 1
  }

  return blocks
}

function mapVisibility(classList) {
  const isPortal = classList.includes("announcement-placement-portal")
  const isPublic = classList.includes("announcement-placement-announcement")
  if (isPortal && isPublic) return "both"
  if (isPublic) return "public"
  return "portal"
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !dataset || !token) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN")
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    token,
  })

  const stripped = stripTags(wpAnnouncement.content.rendered)
  const excerpt = stripped.length > 200 ? `${stripped.slice(0, 197)}...` : stripped

  const doc = {
    _id: `wp-announcement-${wpAnnouncement.id}`,
    _type: "announcement",
    title: wpAnnouncement.title.rendered,
    slug: {
      _type: "slug",
      current: wpAnnouncement.slug,
    },
    content: htmlToPortableText(wpAnnouncement.content.rendered),
    excerpt,
    category: "maintenance",
    priority: "normal",
    publishDate: new Date(wpAnnouncement.date_gmt).toISOString(),
    pinned: false,
    published: wpAnnouncement.status === "publish",
    visibility: mapVisibility(wpAnnouncement.class_list),
  }

  const result = await client.createOrReplace(doc)
  console.log("Imported announcement into Sanity.")
  console.log(`Document ID: ${result._id}`)
  console.log(`Title: ${doc.title}`)
  console.log(`Visibility: ${doc.visibility}`)
}

main().catch((error) => {
  console.error("Import failed:", error)
  process.exit(1)
})
