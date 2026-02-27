# Sanity CMS Setup Guide

Sanity is your content management system for managing board members, events, documents, and announcements. This guide explains how to set up and use Sanity Studio.

## What's Included

Your Sanity setup includes schemas for:

- **Board Members** - Manage board member profiles, positions, bios, and photos
- **Events** - Create and manage community events, board meetings, and social gatherings
- **Documents** - Upload and organize HOA documents, newsletters, ACC applications, etc.
- **Announcements** - Post and manage community announcements and updates

## Step 1: Create a Sanity Project

1. **Sign up for Sanity**
   - Go to https://www.sanity.io/manage
   - Sign up with GitHub, Google, or email

2. **Create a new project**
   - Click "Create project"
   - Choose a name (e.g., "Pristine Place HOA")
   - Choose a dataset name (use "production")
   - Choose a region (select closest to your users)

3. **Copy your Project ID**
   - After creating the project, you'll see your Project ID
   - Copy this ID - you'll need it in the next step

## Step 2: Configure Environment Variables

1. **Update `.env.local`**:
   ```env
   NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id-here
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=skXXXXXXXXXXXXXXXXXXXX  # We'll generate this in Step 3
   ```

2. **Get your API Token**:
   - In your Sanity project dashboard, go to **Settings → API → Tokens**
   - Click "Add API token"
   - Name it "Development Token" or "Production Token"
   - Select **Editor** permissions
   - Copy the token and add it to `.env.local`

## Step 3: Deploy Sanity Schema

Before you can use Sanity Studio, you need to deploy your schema (data models) to Sanity:

```bash
npm install -g @sanity/cli
sanity schema deploy
```

If this doesn't work, you can also deploy the schema through Sanity Studio (next step).

## Step 4: Access Sanity Studio

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the Studio**:
   - Open http://localhost:3000/studio
   - You'll be prompted to log in with your Sanity account
   - After logging in, you'll see the Sanity Studio interface

3. **Studio Interface**:
   - Left sidebar: Content types (Board Members, Events, Documents, Announcements)
   - Center panel: List of documents
   - Right panel: Edit document (when selected)

## Using Sanity Studio

### Adding Board Members

1. Click **Board Members** in the left sidebar
2. Click **+ Create** button
3. Fill in the fields:
   - Name (required)
   - Position (required) - Select from dropdown
   - Email, Phone
   - Biography
   - Photo - Upload image
   - Display Order (lower numbers appear first)
   - Active - Toggle to show/hide on website
4. Click **Publish** when ready

### Creating Events

1. Click **Events** in the left sidebar
2. Click **+ Create** button
3. Fill in the fields:
   - Event Title (required)
   - Click "Generate" next to Slug to auto-generate from title
   - Event Date & Time (required)
   - End Date & Time (optional)
   - Location
   - Description (rich text editor)
   - Featured Image
   - Category (Community Event, Board Meeting, etc.)
   - RSVP settings
   - Published - Toggle to make visible on website
4. Click **Publish**

### Uploading Documents

1. Click **Documents** in the left sidebar
2. Click **+ Create** button
3. Fill in the fields:
   - Document Title (required)
   - Generate slug from title
   - Category (CC&Rs, Bylaws, Newsletter, etc.)
   - Description
   - PDF File (required) - Upload your PDF
   - Publish Date (required)
   - Expiry Date (optional)
   - Featured - Highlight this document
   - Requires Login - Make visible only to logged-in residents
   - Published - Toggle to make visible
4. Click **Publish**

### Creating Announcements

1. Click **Announcements** in the left sidebar
2. Click **+ Create** button
3. Fill in the fields:
   - Title (required)
   - Generate slug from title
   - Content (rich text editor with images)
   - Excerpt (brief summary, max 200 characters)
   - Category (General, Maintenance, Important, etc.)
   - Priority (Normal, High, Urgent)
   - Publish Date (required)
   - Expiry Date (optional)
   - Pin to Top - Keep at top of list
   - Published - Toggle to make visible
4. Click **Publish**

## Fetching Content in Next.js

### Basic Query Example

```typescript
import { client } from "@/sanity/lib/client"

// Fetch all published board members
const boardMembers = await client.fetch(`
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
```

### Events Query Example

```typescript
import { client } from "@/sanity/lib/client"

// Fetch upcoming published events
const upcomingEvents = await client.fetch(`
  *[_type == "event" && published == true && eventDate > now()]
  | order(eventDate asc) {
    _id,
    title,
    slug,
    eventDate,
    location,
    description,
    featuredImage,
    category
  }
`)
```

### Documents Query Example

```typescript
import { client } from "@/sanity/lib/client"

// Fetch published documents by category
const newsletters = await client.fetch(`
  *[_type == "hoaDocument" && published == true && category == "newsletter"]
  | order(publishDate desc) {
    _id,
    title,
    slug,
    description,
    file,
    publishDate,
    featured
  }
`)
```

### Announcements Query Example

```typescript
import { client } from "@/sanity/lib/client"

// Fetch published, non-expired announcements
const announcements = await client.fetch(`
  *[_type == "announcement" && published == true &&
   (expiryDate > now() || !defined(expiryDate))]
  | order(pinned desc, publishDate desc) {
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

### Using Images

```typescript
import { urlFor } from "@/sanity/lib/image"

// In your component
<img
  src={urlFor(boardMember.photo).width(400).height(400).url()}
  alt={boardMember.name}
/>

// Or use the helper function
import { getImageUrl } from "@/sanity/lib/image"

<img
  src={getImageUrl(boardMember.photo, 400, 400)}
  alt={boardMember.name}
/>
```

## File Structure

```
sanity/
├── schemas/
│   ├── board-member.ts      # Board member schema
│   ├── event.ts             # Event schema
│   ├── document.ts          # Document schema
│   ├── announcement.ts      # Announcement schema
│   └── index.ts             # Exports all schemas
├── lib/
│   ├── client.ts            # Sanity client configuration
│   └── image.ts             # Image URL builder utilities

app/studio/[[...tool]]/
├── page.tsx                 # Studio interface
└── layout.tsx               # Studio layout (full height)

sanity.config.ts             # Sanity configuration
```

## Common Tasks

### Add a New Content Type

1. Create a new schema file in `sanity/schemas/`
2. Export it from `sanity/schemas/index.ts`
3. Restart your dev server
4. The new content type will appear in Studio

### Change Field Options

Edit the schema file (e.g., `sanity/schemas/board-member.ts`) and update the field options. Changes appear immediately in Studio during development.

### Customize Studio Appearance

Edit `sanity.config.ts` to customize Studio theme, plugins, and configuration.

## Production Deployment

### Deploy to Vercel (or your hosting provider)

Add the environment variables to your hosting provider:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-api-token
```

### Studio Access in Production

The Studio will be accessible at `https://yourdomain.com/studio`. You can:

1. **Restrict access** - Add authentication middleware to protect `/studio` routes
2. **Use Sanity's hosted Studio** - Deploy Studio separately at `yourproject.sanity.studio`
3. **Add team members** - Invite other board members to manage content in Sanity dashboard

## Troubleshooting

### "Project ID not found" error
- Double-check `NEXT_PUBLIC_SANITY_PROJECT_ID` in `.env.local`
- Restart your dev server after adding environment variables

### "Unauthorized" or "Forbidden" error
- Verify your `SANITY_API_TOKEN` has Editor permissions
- Make sure the token is from the correct project

### Studio shows "Schema not found"
- Run `sanity schema deploy` to deploy your schema
- Or open Studio and it should prompt you to deploy

### Images not loading
- Verify your project has CORS origins configured
- In Sanity dashboard, go to Settings → API → CORS Origins
- Add `http://localhost:3000` for development
- Add your production domain for production

### Content not appearing on website
- Check that documents are marked as "Published" in Studio
- Verify your queries are filtering for `published == true`
- Check date filters (events must be in future, announcements must not be expired)

## Security Notes

- **Never commit `.env.local`** to version control (it's in .gitignore)
- API tokens have different permission levels - use Editor for Studio, Viewer for frontend
- For production, use separate API tokens for Studio vs. frontend
- Consider adding authentication to protect `/studio` route in production

## Resources

- Sanity Documentation: https://www.sanity.io/docs
- GROQ Query Language: https://www.sanity.io/docs/groq
- Sanity Studio: https://www.sanity.io/docs/sanity-studio
- Next.js + Sanity: https://www.sanity.io/plugins/next-sanity
