// lib/announcements.ts
// Local stub announcements — no external API. Add/edit entries here.

export interface Announcement {
  slug: string
  title: string
  date: string
  excerpt: string
  body: string
  category: "general" | "maintenance" | "social" | "policy"
}

export const announcements: Announcement[] = [
  {
    slug: "spring-landscaping-schedule",
    title: "Spring Landscaping Schedule",
    date: "2026-03-01",
    excerpt:
      "The HOA-contracted landscaping crew will begin spring planting and mulch refresh starting March 10.",
    body: "The HOA-contracted landscaping crew will begin spring planting and mulch refresh starting March 10. Common areas and entrance medians will be addressed first, followed by individual lot buffer zones. Please move any personal items from common landscape beds before March 8. Contact the office with questions.",
    category: "maintenance",
  },
  {
    slug: "pool-opening-2026",
    title: "Community Pool Opening Date",
    date: "2026-04-15",
    excerpt:
      "The community pool will open for the season on Saturday, April 25. Updated wristbands are required.",
    body: "The community pool will open for the season on Saturday, April 25. All residents must pick up updated wristbands from the clubhouse office between April 15–24 during business hours. A valid photo ID and proof of residency are required. Guest policies remain unchanged — see the Documents page for the full pool policy.",
    category: "social",
  },
  {
    slug: "updated-parking-guidelines",
    title: "Updated Parking Guidelines",
    date: "2026-02-10",
    excerpt:
      "Revised parking guidelines take effect March 1. Overnight street parking now requires a permit.",
    body: "After community feedback, the Board has approved revised parking guidelines effective March 1, 2026. Key changes include: overnight street parking (11 PM – 6 AM) now requires a free permit from the office; commercial vehicles over 10,000 lbs are no longer permitted in driveways; and guest parking in the clubhouse lot is now limited to 72 hours. Full details are available on the Documents page.",
    category: "policy",
  },
  {
    slug: "welcome-new-board-member",
    title: "Welcome New Board Member: Sarah Mitchell",
    date: "2026-01-20",
    excerpt:
      "The Board is pleased to welcome Sarah Mitchell, who will serve as the new Architectural Review Chair.",
    body: "The Board of Directors is pleased to announce that Sarah Mitchell has been appointed to fill the vacant Architectural Review Committee chair position. Sarah has been a Pristine Place resident for six years and brings professional experience in landscape architecture. She will begin reviewing submissions immediately. Welcome, Sarah!",
    category: "general",
  },
]

export function getAnnouncementBySlug(slug: string): Announcement | undefined {
  return announcements.find((a) => a.slug === slug)
}

export function getRecentAnnouncements(count = 3): Announcement[] {
  return [...announcements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}
