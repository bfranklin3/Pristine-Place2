// lib/site-config.ts
// Centralized site configuration — single source of truth for metadata, contact, and branding.

export const siteConfig = {
  name: "Pristine Place",
  tagline: "Where Community Comes Home",
  description:
    "Welcome to Pristine Place — a thoughtfully managed residential community. Stay connected with events, announcements, board updates, and resident resources.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pristineplacehoa.com",
  ogImage: "/images/og-default.jpg",
  locale: "en_US",

  contact: {
    phone: "(352) 515-9420",
    phoneRaw: "+13525159420",
    email: "bod@pristineplace.us",
    address: {
      street: "4350 St Ives Blvd",
      city: "Spring Hill",
      state: "FL",
      zip: "34609",
      country: "US",
    },
  },

  hours: {
    office: "Monday 10:30 AM – 12:30 PM · Wednesday & Friday 6:30 PM – 8:00 PM",
    closed: "All other times: closed / unstaffed",
  },

  social: {
    facebook: "https://www.facebook.com/pristineplacehoa",
  },

  management: {
    company: "Pristine Place HOA Board of Directors",
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "Our Community", href: "/our-community" },
    { label: "Events", href: "/events" },
    { label: "Announcements", href: "/announcements" },
    { label: "Board", href: "/board" },
    { label: "Documents", href: "/documents" },
    { label: "Gate Access", href: "/gate-access" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],

  megaNav: {
    community: {
      label: "Community",
      description: "Life at Pristine Place",
      items: [
        {
          label: "Our Community",
          href: "/our-community",
          description: "Learn about Pristine Place",
          featured: true,
        },
        {
          label: "Board & Committees",
          href: "/board",
          description: "Meet your HOA leadership team",
          featured: true,
        },
        {
          label: "Events",
          href: "/events",
          description: "Community gatherings and activities",
        },
        {
          label: "Announcements",
          href: "/announcements",
          description: "Latest community news and updates",
        },
      ],
    },
    residents: {
      label: "Residents",
      description: "Resources & resident services",
      items: [
        {
          label: "Documents & Forms",
          href: "/documents",
          description: "Governing docs, applications, and policies",
          featured: true,
        },
        {
          label: "Gate Access",
          href: "/gate-access",
          description: "Visitor entry, remotes, and contractor access",
          featured: true,
        },
        {
          label: "FAQ",
          href: "/faq",
          description: "Quick answers to common questions",
        },
        {
          label: "Resident Portal",
          href: "/resident-portal",
          description: "Account login and online services",
          badge: "COMING SOON",
        },
      ],
    },
  },

  footerNav: {
    community: [
      { label: "Our Community", href: "/our-community" },
      { label: "Board & Committees", href: "/board" },
      { label: "Events", href: "/events" },
      { label: "Announcements", href: "/announcements" },
    ],
    residents: [
      { label: "Resident Portal", href: "/resident-portal" },
      { label: "Documents", href: "/documents" },
      { label: "Gate Access", href: "/gate-access" },
      { label: "FAQ", href: "/faq" },
    ],
    legal: [
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
} as const
