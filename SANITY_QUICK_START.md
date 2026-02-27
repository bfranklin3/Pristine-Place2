# Sanity Quick Start

## ✅ What's Installed

Sanity CMS is now fully integrated into your HOA portal with:

- **Sanity Studio** at `/studio` route
- **4 Content Types**:
  - Board Members (name, position, bio, photo, contact info)
  - Events (community events, meetings, with RSVP options)
  - Documents (PDFs for newsletters, CC&Rs, bylaws, etc.)
  - Announcements (community updates with priority levels)

## 🚀 Next Steps

### 1. Create a Sanity Project (5 minutes)

1. Go to **https://www.sanity.io/manage**
2. Sign up/login (GitHub or Google)
3. Click **"Create project"**
4. Name it "Pristine Place HOA"
5. Dataset: `production`
6. **Copy your Project ID** (looks like: `abc1de2f`)

### 2. Generate API Token

1. In your Sanity project dashboard:
   - Go to **Settings → API → Tokens**
   - Click **"Add API token"**
   - Name: "Development"
   - Permission: **Editor**
   - **Copy the token** (starts with `sk`)

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Sanity credentials:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=abc1de2f
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=skXXXXXXXXXXXXXXXXXXXX
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Access Sanity Studio

Open **http://localhost:3000/studio**

You'll be prompted to log in with your Sanity account. After logging in, you can start adding content!

## 📝 Adding Your First Content

### Add a Board Member

1. Go to http://localhost:3000/studio
2. Click **"Board Members"** in the left sidebar
3. Click **"+ Create"** button
4. Fill in:
   - Name: "John Smith"
   - Position: Select "President"
   - Email: john.smith@example.com
   - Bio: Brief description
   - Photo: Upload image
   - Display Order: 1
   - Active: ✓ checked
5. Click **"Publish"**

### Add an Event

1. Click **"Events"** in the left sidebar
2. Click **"+ Create"**
3. Fill in:
   - Title: "Board Meeting - March 2026"
   - Click "Generate" next to Slug
   - Event Date & Time: Select date/time
   - Location: "Clubhouse"
   - Description: Add details
   - Category: "Board Meeting"
   - Published: ✓ checked
4. Click **"Publish"**

### Upload a Document

1. Click **"Documents"** in the left sidebar
2. Click **"+ Create"**
3. Fill in:
   - Title: "February 2026 Newsletter"
   - Click "Generate" next to Slug
   - Category: "Newsletter"
   - Description: "Monthly community update"
   - PDF File: Upload your PDF
   - Publish Date: Select date
   - Published: ✓ checked
4. Click **"Publish"**

## 🎨 Using Content on Your Website

Once you've added content in Sanity Studio, you can fetch and display it in your Next.js pages:

### Example: Fetch Board Members

```typescript
import { client } from "@/sanity/lib/client"

// In your page.tsx or component
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

### Example: Display Board Member Photo

```typescript
import { urlFor } from "@/sanity/lib/image"

<img
  src={urlFor(boardMember.photo).width(400).height(400).url()}
  alt={boardMember.name}
  className="rounded-full"
/>
```

## 📚 Full Documentation

For detailed instructions, queries, and troubleshooting, see:
- **[SANITY_SETUP.md](SANITY_SETUP.md)** - Complete setup guide with examples

## 🆘 Need Help?

Common issues:

- **"Project ID not found"** → Check `.env.local` and restart dev server
- **"Unauthorized"** → Verify API token has Editor permissions
- **Studio won't load** → Make sure all environment variables are set
- **Images not showing** → Add `http://localhost:3000` to CORS origins in Sanity dashboard

Full troubleshooting guide in [SANITY_SETUP.md](SANITY_SETUP.md#troubleshooting)

## 🎯 Current Schema

Your content types and their fields:

**Board Members**: name, position, email, phone, bio, photo, order, active
**Events**: title, date, location, description, category, RSVP, published
**Documents**: title, PDF file, category, publish date, featured, published
**Announcements**: title, content, priority, category, expiry date, pinned, published

Need to add or modify fields? Edit files in `sanity/schemas/`
