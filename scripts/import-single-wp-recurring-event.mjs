import dotenv from "dotenv"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const wpAnnouncement = {
  id: 34813,
  date: "2025-09-03T16:18:10",
  date_gmt: "2025-09-03T20:18:10",
  modified: "2025-10-20T06:41:03",
  modified_gmt: "2025-10-20T10:41:03",
  slug: "social-committee-monthly-meeting",
  status: "publish",
  type: "announcements",
  title: { rendered: "Social Committee Monthly Meeting" },
  content: {
    rendered:
      '<p class="tribe-events-single-event-title">Come join us for our monthly Social Committee Meeting in the clubhouse. If you would like more info on what this is all about… simply contact either Kim Van Tine <a href="tel:7243166537">724-316-6537</a>, or Doris Perez <a href="tel:3523251493">352-325-1493</a>. You may also send them over an email at <a href="mailto:Pristinesc2@gmail.com">Pristinesc2@gmail.com</a>.</p>\n<p>&nbsp;</p>\n<p>Social Committee Monthly Meeting: We meet every second Tuesday @7:00PM</p>\n',
  },
  class_list: [
    "post-34813",
    "announcements",
    "type-announcements",
    "status-publish",
    "hentry",
    "announcement-placement-portal",
    "event-category-committee-meeting",
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
  return decodeHtml(input.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
}

function htmlToPortableText(html) {
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  const blocks = []
  let match
  let index = 0

  while ((match = paragraphRegex.exec(html)) !== null) {
    const raw = (match[1] || "").trim()
    if (!raw || raw === "&nbsp;") continue

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
          marks: [],
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

  // Inferred from source text: "every second Tuesday @7:00PM"
  const timezone = "America/New_York"
  const firstOccurrence = "2025-09-09T19:00:00-04:00"
  const recurrenceRule = "RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=+2TU"

  const doc = {
    _id: `wp-event-${wpAnnouncement.id}`,
    _type: "event",
    title: wpAnnouncement.title.rendered,
    slug: {
      _type: "slug",
      current: wpAnnouncement.slug,
    },
    isRecurring: true,
    eventDate: firstOccurrence,
    recurrence: {
      _type: "recurringDates",
      rrule: recurrenceRule,
      startDate: firstOccurrence,
      endDate: null,
      timezone,
    },
    location: "Clubhouse",
    description: htmlToPortableText(wpAnnouncement.content.rendered),
    category: "committee-meeting",
    rsvpRequired: false,
    published: wpAnnouncement.status === "publish",
    visibility: mapVisibility(wpAnnouncement.class_list),
  }

  const result = await client.createOrReplace(doc)
  console.log("Imported recurring event into Sanity.")
  console.log(`Document ID: ${result._id}`)
  console.log(`Title: ${doc.title}`)
  console.log(`RRULE: ${doc.recurrence.rrule}`)
  console.log(`Start: ${doc.eventDate}`)
}

main().catch((error) => {
  console.error("Import failed:", error)
  process.exit(1)
})
