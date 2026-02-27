# Sanity CMS Data Integration Guide

This guide explains how to display Sanity content on your Next.js pages.

## ✅ Completed Setup

1. **Visibility Controls** - Added to all schemas (Events, Announcements, Documents)
2. **Sanity Client** - Created at `lib/sanity/client.ts`
3. **Query Functions** - Created at `lib/sanity/queries.ts` with TypeScript types
4. **Import Script** - Created at `scripts/import-placeholder-data.ts`

---

## 📋 Quick Start: Import Placeholder Data

Before wiring up the pages, let's import your placeholder announcements and events into Sanity Studio:

```bash
npx tsx scripts/import-placeholder-data.ts
```

This will create:
- 3 Announcements (Annual Meeting, Pool Closure, Gate Remote)
- 4 Events (Annual Meeting, Neighborhood Watch, Spring Cleanup, Easter Egg Hunt)

After running this, visit `http://localhost:3000/studio` to see your content!

---

## 🔌 Wiring Up Pages to Sanity Data

### Example: Resident Portal Home Page

Here's how to update the resident portal home page to fetch announcements from Sanity:

**Before (Hardcoded):**
```typescript
const announcements = [
  { id: 1, title: "...", /* hardcoded data */ },
]
```

**After (Sanity Data):**
```typescript
import { getAnnouncements, getUpcomingEvents } from "@/lib/sanity/queries"

export default async function ResidentPortalHomePage() {
  // Fetch data from Sanity
  const announcements = await getAnnouncements("portal")
  const upcomingEvents = await getUpcomingEvents("portal", 4)

  return (
    // ... JSX using announcements and upcomingEvents
  )
}
```

### Data Transformation Helper

Since your current pages expect a specific data format, here's a helper to transform Sanity data:

```typescript
// Helper to transform Sanity announcement to display format
function transformAnnouncement(announcement: SanityAnnouncement) {
  return {
    id: announcement._id,
    badge: getCategoryLabel(announcement.category),
    badgeColor: getCategoryColor(announcement.category),
    title: announcement.title,
    body: announcement.excerpt || extractTextFromPortableText(announcement.content),
    date: `Posted ${new Date(announcement.publishDate).toLocaleDateString()}`,
  }
}

// Helper to get category label
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "general": "General",
    "maintenance": "Maintenance",
    "community": "Community",
    "important": "Important",
    "emergency": "Emergency",
    "social-activity": "Social",
    "annual-meeting": "Meeting",
    "bod-meeting": "Meeting",
    "committee-meeting": "Meeting",
    "crime-watch": "Safety",
    "fitness-health": "Health",
    "special-event": "Event",
    "special-meeting": "Meeting",
  }
  return labels[category] || "General"
}

// Helper to get category color
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "emergency": "var(--pp-error)",
    "important": "var(--pp-warning)",
    "maintenance": "var(--pp-warning)",
    "annual-meeting": "var(--pp-navy-dark)",
    "bod-meeting": "var(--pp-navy-dark)",
    "committee-meeting": "var(--pp-navy-dark)",
    "crime-watch": "var(--pp-navy-dark)",
  }
  return colors[category] || "var(--pp-navy-dark)"
}

// Helper to extract plain text from Portable Text
function extractTextFromPortableText(blocks: any[]): string {
  return blocks
    .map((block) => {
      if (block._type !== "block" || !block.children) return ""
      return block.children.map((child: any) => child.text).join("")
    })
    .join(" ")
}
```

### Complete Page Update Pattern

1. **Make the page component async:**
   ```typescript
   export default async function ResidentPortalHomePage() {
   ```

2. **Fetch data at the top:**
   ```typescript
   const announcements = await getAnnouncements("portal")
   const events = await getUpcomingEvents("portal", 4)
   ```

3. **Transform the data if needed:**
   ```typescript
   const transformedAnnouncements = announcements.map(transformAnnouncement)
   ```

4. **Use the data in your JSX:**
   ```typescript
   {transformedAnnouncements.map((announcement) => (
     <div key={announcement.id}>
       {/* existing JSX */}
     </div>
   ))}
   ```

---

## 📄 Page-by-Page Integration

### Pages That Need Updating:

1. **Resident Portal Home** - `/app/(portal)/resident-portal/page.tsx`
   - Fetch: `getAnnouncements("portal")` and `getUpcomingEvents("portal", 4)`
   - Shows: Portal-only and "both" visibility items

2. **Public Home** - `/app/page.tsx` (if it shows announcements/events)
   - Fetch: `getAnnouncements("public")` and `getUpcomingEvents("public", 3)`
   - Shows: Public-only and "both" visibility items

3. **Events Page** - `/app/(portal)/resident-portal/events/page.tsx`
   - Fetch: `getEvents("portal")`
   - Shows: Full events calendar

4. **Documents Page** - `/app/(portal)/resident-portal/documents/page.tsx`
   - Fetch: `getDocuments("portal")`
   - Shows: All documents

5. **Board Page** - `/app/(portal)/resident-portal/board/page.tsx`
   - Fetch: `getBoardMembers()`
   - Shows: Active board members

---

## 🔍 Available Query Functions

All functions are in `lib/sanity/queries.ts`:

```typescript
// Get announcements for a site
await getAnnouncements("portal" | "public")

// Get events for a site
await getEvents("portal" | "public")

// Get upcoming events (limited)
await getUpcomingEvents("portal" | "public", limit)

// Get documents for a site
await getDocuments("portal" | "public")

// Get active board members (always shows on both sites)
await getBoardMembers()
```

---

## 🎨 Rendering Portable Text Content

Sanity stores rich content as "Portable Text". To render it properly:

### Install the package:
```bash
npm install @portabletext/react --legacy-peer-deps
```

### Use the component:
```typescript
import { PortableText } from "@portabletext/react"

// In your JSX:
<PortableText value={announcement.content} />
```

### Custom Components (optional):
```typescript
const components = {
  block: {
    h2: ({children}) => <h2 className="text-step-2">{children}</h2>,
    normal: ({children}) => <p className="text-fluid-base">{children}</p>,
  },
}

<PortableText value={announcement.content} components={components} />
```

---

## 🚀 Next Steps

1. **Run the import script** to populate Sanity with test data
2. **Start with one page** - Update the resident portal home page first
3. **Test thoroughly** - Make sure announcements display correctly
4. **Apply the pattern** to other pages (events, documents, board)
5. **Clean up** - Remove hardcoded placeholder data once Sanity data is working

---

## 💡 Tips

- **Use Next.js caching:** Add `export const revalidate = 60` to pages for ISR
- **Error handling:** Wrap queries in try/catch and show fallback UI
- **Loading states:** Use Next.js loading.tsx files for better UX
- **TypeScript:** Import types from `lib/sanity/queries.ts` for type safety

---

## 🐛 Troubleshooting

**Q: Data not showing up?**
- Check that documents are `published: true` in Sanity Studio
- Check that `visibility` is set correctly (portal/public/both)
- Verify publish date is not in the future
- Check expiry date hasn't passed

**Q: Getting empty arrays?**
- Run the import script to add test data
- Check your `.env.local` has correct Sanity credentials
- Make sure you're querying the right site ("portal" vs "public")

**Q: TypeScript errors?**
- Import types from `lib/sanity/queries.ts`
- Use the transformation helpers to match your current data structure
