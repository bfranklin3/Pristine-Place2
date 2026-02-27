// scripts/import-placeholder-data.ts
// Run this script to import placeholder announcements and events into Sanity Studio
// Usage: npx tsx scripts/import-placeholder-data.ts

import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@sanity/client"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

// Helper to generate unique keys for Portable Text blocks
function generateKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Placeholder Announcements
const announcements = [
  {
    _type: "announcement",
    title: "Annual HOA Meeting — March 15, 2026",
    slug: { _type: "slug", current: "annual-hoa-meeting-march-2026" },
    content: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "All homeowners are encouraged to attend the Annual Meeting. Agenda items include the 2026 budget review and board elections. The meeting will be held in the Clubhouse at 6:00 PM.",
          },
        ],
      },
    ],
    excerpt: "Annual Meeting - Budget review and board elections. Clubhouse at 6:00 PM.",
    category: "annual-meeting",
    priority: "high",
    publishDate: "2026-02-10T00:00:00.000Z",
    pinned: true,
    published: true,
    visibility: "both",
  },
  {
    _type: "announcement",
    title: "Pool Closure — March 3–5, 2026",
    slug: { _type: "slug", current: "pool-closure-march-2026" },
    content: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "The community pool will be closed for scheduled annual maintenance and equipment inspection. Normal hours resume March 6.",
          },
        ],
      },
    ],
    excerpt: "Pool closed March 3-5 for annual maintenance. Reopens March 6.",
    category: "maintenance",
    priority: "normal",
    publishDate: "2026-02-08T00:00:00.000Z",
    pinned: false,
    published: true,
    visibility: "both",
  },
  {
    _type: "announcement",
    title: "Gate Remote Re-registration Deadline",
    slug: { _type: "slug", current: "gate-remote-reregistration-2026" },
    content: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "All residents must re-register their gate remotes at the HOA office by April 30, 2026. Unregistered remotes will be deactivated. Please bring your photo ID.",
          },
        ],
      },
    ],
    excerpt: "Re-register gate remotes by April 30. Bring photo ID to HOA office.",
    category: "important",
    priority: "normal",
    publishDate: "2026-02-01T00:00:00.000Z",
    pinned: false,
    published: true,
    visibility: "portal",
  },
]

// Placeholder Events
const events = [
  {
    _type: "event",
    title: "Annual HOA Meeting",
    slug: { _type: "slug", current: "annual-hoa-meeting-2026" },
    eventDate: "2026-03-15T18:00:00.000Z",
    location: "Community Clubhouse",
    description: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "All homeowners are encouraged to attend the Annual Meeting. Agenda includes the 2026 budget review and board elections. Light refreshments will be served.",
          },
        ],
      },
    ],
    category: "annual-meeting",
    rsvpRequired: false,
    published: true,
    visibility: "both",
  },
  {
    _type: "event",
    title: "Neighborhood Watch Meeting",
    slug: { _type: "slug", current: "neighborhood-watch-march-2026" },
    eventDate: "2026-03-28T19:00:00.000Z",
    location: "Clubhouse — Room B",
    description: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "Join your neighbors for the monthly Neighborhood Watch meeting. Discuss local safety updates and coordinate community patrol schedules.",
          },
        ],
      },
    ],
    category: "crime-watch",
    rsvpRequired: false,
    published: true,
    visibility: "both",
  },
  {
    _type: "event",
    title: "Spring Community Cleanup",
    slug: { _type: "slug", current: "spring-cleanup-april-2026" },
    eventDate: "2026-04-05T08:00:00.000Z",
    location: "Common Areas",
    description: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "Help keep our community beautiful! Bring gloves and wear comfortable clothes. Supplies and breakfast refreshments provided for all volunteers.",
          },
        ],
      },
    ],
    category: "social-activity",
    rsvpRequired: false,
    published: true,
    visibility: "both",
  },
  {
    _type: "event",
    title: "Easter Egg Hunt",
    slug: { _type: "slug", current: "easter-egg-hunt-april-2026" },
    eventDate: "2026-04-19T10:00:00.000Z",
    location: "Community Park",
    description: [
      {
        _key: generateKey(),
        _type: "block",
        children: [
          {
            _key: generateKey(),
            _type: "span",
            text: "Fun for the whole family! Children ages 2–12 are welcome. Prizes awarded in each age group. Free admission for all Pristine Place residents.",
          },
        ],
      },
    ],
    category: "special-event",
    rsvpRequired: false,
    published: true,
    visibility: "both",
  },
]

async function importData() {
  console.log("🚀 Starting import of placeholder data to Sanity Studio...\n")

  try {
    // Import announcements
    console.log("📢 Importing announcements...")
    for (const announcement of announcements) {
      const result = await client.create(announcement)
      console.log(`✅ Created announcement: "${result.title}"`)
    }

    // Import events
    console.log("\n📅 Importing events...")
    for (const event of events) {
      const result = await client.create(event)
      console.log(`✅ Created event: "${result.title}"`)
    }

    console.log("\n🎉 Import complete! Check your Sanity Studio to see the new content.")
    console.log("🔗 Visit: http://localhost:3000/studio")
  } catch (error) {
    console.error("❌ Error importing data:", error)
    process.exit(1)
  }
}

importData()
