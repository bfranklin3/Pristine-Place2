# Sanity Integration Example

This guide shows how to replace hardcoded content with Sanity CMS data using your Board page as an example.

## Current Board Page (Hardcoded)

Your current board page at [`app/(portal)/resident-portal/board/page.tsx`](app/(portal)/resident-portal/board/page.tsx) has hardcoded board members:

```typescript
const boardMembers = [
  { name: "David Abbott", role: "President", image: "/images/David-Abbott.png" },
  { name: "Rich Ruland", role: "Vice President", image: "/images/Rich-Ruland.png" },
  // ... etc
]
```

## Updated Board Page (Sanity-Powered)

Here's how to fetch board members from Sanity instead:

### Step 1: Add Board Members in Sanity Studio

1. Go to http://localhost:3000/studio
2. Click **Board Members**
3. Add each board member with:
   - Name, Position, Email, Phone
   - Bio (optional)
   - Photo (upload from `public/images/`)
   - Display Order: 1, 2, 3, 4, 5
   - Active: ✓ checked
4. Click **Publish** for each

### Step 2: Update the Page to Fetch from Sanity

Replace the hardcoded array with a Sanity query:

```typescript
// app/(portal)/resident-portal/board/page.tsx

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Mail, Shield, CalendarDays, FileText } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { client } from "@/sanity/lib/client"
import { urlFor } from "@/sanity/lib/image"

export const metadata: Metadata = {
  title: `Board of Directors | ${siteConfig.name} Resident Portal`,
  description: `Meet the elected Board of Directors overseeing the governance and operations of ${siteConfig.name} HOA.`,
}

// ✨ NEW: Fetch board members from Sanity
async function getBoardMembers() {
  return await client.fetch(`
    *[_type == "boardMember" && active == true] | order(order asc) {
      _id,
      name,
      position,
      email,
      phone,
      bio,
      photo
    }
  `)
}

export default async function BoardPage() {
  // ✨ NEW: Get board members from Sanity
  const boardMembers = await getBoardMembers()

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        {/* ... existing hero code ... */}
      </section>

      {/* ── Board Members ── */}
      <section className="section">
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          <div className="stack-xs">
            <h2 style={{ color: "var(--pp-navy-dark)" }}>Board of Directors</h2>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
              Elected volunteers who oversee the governance and operations of {siteConfig.name} HOA.
            </p>
          </div>

          <div className="grid-auto-fit" style={{ gridAutoRows: "1fr" }}>
            {/* ── Board Member Cards ── */}
            {boardMembers.map((member) => (
              <div
                key={member._id}
                className="card stack"
                style={{
                  textAlign: "center",
                  gap: "var(--space-m)",
                  padding: "var(--space-xl)",
                  justifyContent: "center",
                }}
              >
                {/* Photo - ✨ NOW FROM SANITY */}
                <div
                  className="relative rounded-full overflow-hidden mx-auto"
                  style={{
                    width: "6rem",
                    height: "6rem",
                    flexShrink: 0,
                    boxShadow: "0 0 0 3px var(--pp-gold), 0 0 0 5px rgba(58,90,64,0.15)",
                  }}
                >
                  {member.photo && (
                    <Image
                      src={urlFor(member.photo).width(200).height(200).url()}
                      alt={member.name}
                      fill
                      className="object-cover object-top"
                    />
                  )}
                </div>

                {/* Info */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <h3 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                    {member.name}
                  </h3>

                  {/* Position badge */}
                  <span className="badge badge-primary">
                    {member.position === "president" && "President"}
                    {member.position === "vice-president" && "Vice President"}
                    {member.position === "secretary" && "Secretary"}
                    {member.position === "treasurer" && "Treasurer"}
                    {member.position === "member-at-large" && "Member at Large"}
                  </span>

                  {/* ✨ NEW: Show bio if available */}
                  {member.bio && (
                    <p
                      className="text-fluid-sm"
                      style={{
                        color: "var(--pp-slate-600)",
                        marginTop: "var(--space-xs)",
                        lineHeight: 1.5,
                      }}
                    >
                      {member.bio}
                    </p>
                  )}

                  {/* ✨ NEW: Show contact info if available */}
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="text-fluid-sm"
                      style={{
                        color: "var(--pp-navy)",
                        textDecoration: "none",
                        marginTop: "var(--space-2xs)",
                      }}
                    >
                      <Mail
                        style={{
                          width: "0.875rem",
                          height: "0.875rem",
                          display: "inline",
                          marginRight: "0.25rem",
                        }}
                      />
                      {member.email}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* ── Contact the Board Card ── */}
            {/* ... existing contact card code ... */}
          </div>
        </div>
      </section>

      {/* ── Board Info Strip ── */}
      {/* ... existing board info code ... */}
    </>
  )
}
```

### What Changed?

1. **Import Sanity utilities**:
   ```typescript
   import { client } from "@/sanity/lib/client"
   import { urlFor } from "@/sanity/lib/image"
   ```

2. **Create fetch function**:
   ```typescript
   async function getBoardMembers() {
     return await client.fetch(`
       *[_type == "boardMember" && active == true] | order(order asc) {
         _id, name, position, email, phone, bio, photo
       }
     `)
   }
   ```

3. **Make component async and fetch data**:
   ```typescript
   export default async function BoardPage() {
     const boardMembers = await getBoardMembers()
     // ... rest of component
   }
   ```

4. **Use Sanity image URLs**:
   ```typescript
   <Image
     src={urlFor(member.photo).width(200).height(200).url()}
     alt={member.name}
     fill
   />
   ```

5. **Display dynamic fields**:
   ```typescript
   {member.bio && <p>{member.bio}</p>}
   {member.email && <a href={`mailto:${member.email}`}>{member.email}</a>}
   ```

## Benefits of Using Sanity

### Before (Hardcoded):
- ❌ Need developer to update board members
- ❌ Requires code deployment to change
- ❌ No bio or contact info
- ❌ Images stored in repository

### After (Sanity):
- ✅ Board members update content themselves
- ✅ Changes appear instantly (no deployment)
- ✅ Rich bios and contact info
- ✅ Optimized image delivery via Sanity CDN
- ✅ Control who's active/inactive
- ✅ Easy reordering with display order field

## More Examples

### Events Page Integration

```typescript
// Fetch upcoming events
const upcomingEvents = await client.fetch(`
  *[_type == "event" &&
    published == true &&
    eventDate > now()]
  | order(eventDate asc) [0...10] {
    _id,
    title,
    slug,
    eventDate,
    endDate,
    location,
    description,
    featuredImage,
    category,
    rsvpRequired,
    rsvpEmail
  }
`)
```

### Documents Page Integration

```typescript
// Fetch documents by category
const newsletters = await client.fetch(`
  *[_type == "hoaDocument" &&
    published == true &&
    category == "newsletter"]
  | order(publishDate desc) {
    _id,
    title,
    slug,
    description,
    "fileUrl": file.asset->url,
    publishDate,
    featured
  }
`)
```

### Announcements on Portal Home

```typescript
// Fetch active announcements
const announcements = await client.fetch(`
  *[_type == "announcement" &&
    published == true &&
    (expiryDate > now() || !defined(expiryDate))]
  | order(pinned desc, publishDate desc) [0...5] {
    _id,
    title,
    slug,
    excerpt,
    category,
    priority,
    publishDate,
    pinned
  }
`)
```

## TypeScript Types (Optional)

For better TypeScript support, create type definitions:

```typescript
// types/sanity.ts

export interface BoardMember {
  _id: string
  name: string
  position: "president" | "vice-president" | "secretary" | "treasurer" | "member-at-large"
  email?: string
  phone?: string
  bio?: string
  photo?: {
    _type: "image"
    asset: {
      _ref: string
      _type: "reference"
    }
  }
  order: number
  active: boolean
}

export interface Event {
  _id: string
  title: string
  slug: { current: string }
  eventDate: string
  endDate?: string
  location?: string
  description: any[] // Portable Text
  featuredImage?: any
  category?: string
  rsvpRequired: boolean
  rsvpEmail?: string
  published: boolean
}

// Use in your component:
import type { BoardMember } from "@/types/sanity"

async function getBoardMembers(): Promise<BoardMember[]> {
  return await client.fetch(`...`)
}
```

## Next Steps

1. **Add board members in Sanity Studio** (http://localhost:3000/studio)
2. **Test the integration** by updating the board page
3. **Integrate events** into the events page
4. **Add documents** to the documents page
5. **Create announcements** for the portal home page

Once you see how easy it is to manage content through Sanity Studio, you'll never want to go back to hardcoded data! 🎉
