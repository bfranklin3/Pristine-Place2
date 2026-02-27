// app/announcements/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { getAnnouncements } from "@/lib/sanity/queries"

export const metadata: Metadata = {
  title: "Announcements",
  description: `Community announcements, updates, and policy changes at ${siteConfig.name}.`,
  openGraph: {
    title: `Announcements | ${siteConfig.name}`,
    description: `Community announcements and updates at ${siteConfig.name}.`,
    url: `${siteConfig.url}/announcements`,
  },
  alternates: { canonical: `${siteConfig.url}/announcements` },
}

const categoryStyles: Record<string, string> = {
  general: "badge-primary",
  maintenance: "badge-muted",
  social: "badge-accent",
  policy: "badge-primary",
}

export default async function AnnouncementsPage() {
  // Fetch announcements from Sanity
  const announcements = await getAnnouncements("public")

  // Transform and sort by date (newest first)
  const sorted = announcements
    .map((a) => ({
      slug: a.slug.current,
      title: a.title,
      category: a.category,
      date: a.publishDate,
      excerpt: a.excerpt || "",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      <section
        className="hero-section"
        style={{ background: 'var(--pp-navy)' }}
      >
        <div className="hero-overlay" style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy-light))" }} />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">Announcements</h1>
          <p className="hero-subtitle">Important updates for Pristine Place residents</p>
        </div>
      </section>

      <section className="section" style={{ background: "linear-gradient(180deg, var(--pp-slate-50), var(--pp-white))" }}>
        <div className="container stack" style={{ gap: "var(--space-l)" }}>
          {sorted.map((a) => (
            <Link
              key={a.slug}
              href={`/announcements/${a.slug}`}
              className="card card-hover"
              style={{ textDecoration: "none", padding: "var(--space-l)", display: "flex", flexDirection: "column", gap: "var(--space-m)" }}
            >
              <div className="cluster" style={{ gap: "var(--space-s)", alignItems: "center" }}>
                <span className={`badge ${categoryStyles[a.category] ?? "badge-muted"}`}>
                  {a.category}
                </span>
                <span className="text-fluid-sm text-pp-slate-400">
                  {new Date(a.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h2 className="text-step-2 font-semibold text-pp-navy-dark">{a.title}</h2>
              <p className="text-fluid-base text-pp-slate-600">{a.excerpt}</p>
              <span className="text-fluid-sm font-medium" style={{ color: "var(--pp-navy-dark)", marginTop: "var(--space-xs)" }}>
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
