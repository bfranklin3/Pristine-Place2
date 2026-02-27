// app/sitemap.ts

import { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"
import { announcements } from "@/lib/announcements"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/our-story`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/announcements`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/board`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/documents`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/gate-access`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ]

  const announcementPages: MetadataRoute.Sitemap = announcements.map((a) => ({
    url: `${base}/announcements/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...announcementPages]
}
