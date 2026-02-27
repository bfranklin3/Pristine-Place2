// app/(portal)/resident-portal/announcements/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { Shield, Megaphone } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { getAnnouncements } from "@/lib/sanity/queries"

export const metadata: Metadata = {
  title: "Announcements | Resident Portal",
  description: `Community announcements, updates, and policy changes for ${siteConfig.name} residents.`,
}

const categoryStyles: Record<string, { bg: string; text: string; label: string }> = {
  general: { bg: "var(--pp-navy)", text: "var(--pp-white)", label: "General" },
  maintenance: { bg: "var(--pp-warning)", text: "var(--pp-white)", label: "Maintenance" },
  community: { bg: "var(--pp-navy-dark)", text: "var(--pp-white)", label: "Community" },
  important: { bg: "var(--pp-gold)", text: "var(--pp-navy-dark)", label: "Important" },
  emergency: { bg: "var(--pp-error)", text: "var(--pp-white)", label: "Emergency" },
}

export default async function PortalAnnouncementsPage() {
  // Fetch announcements from Sanity for portal
  const announcements = await getAnnouncements("portal")

  // Transform and sort by date (newest first)
  const sorted = announcements
    .map((a) => ({
      slug: a.slug.current,
      title: a.title,
      category: a.category,
      priority: a.priority,
      date: a.publishDate,
      excerpt: a.excerpt || "",
      pinned: a.pinned,
    }))
    .sort((a, b) => {
      // Pinned items first
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // Then by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return (
    <>
      {/* Hero Section */}
      <section
        style={{
          background: "linear-gradient(135deg, #1C2418 0%, #2F3826 60%, #3A4232 100%)",
          color: "var(--pp-white)",
          paddingBlock: "var(--space-xl)",
        }}
      >
        <div className="container stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span className="text-fluid-sm" style={{ color: "var(--pp-gold-light)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Resident Portal
            </span>
          </div>
          <h1 className="text-step-4 font-bold" style={{ color: "var(--pp-white)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Megaphone style={{ width: "2rem", height: "2rem", color: "var(--pp-gold-light)" }} />
            Announcements
          </h1>
          <p className="text-fluid-lg" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "60ch" }}>
            Important updates, community news, and policy changes for Pristine Place residents
          </p>
        </div>
      </section>

      {/* Announcements List */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container stack" style={{ gap: "var(--space-m)" }}>
          {sorted.length === 0 ? (
            <div className="card" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
              <p className="text-fluid-lg text-pp-slate-500">No announcements at this time.</p>
            </div>
          ) : (
            sorted.map((a) => {
              const categoryStyle = categoryStyles[a.category] || categoryStyles.general
              const isPriority = a.priority === "urgent" || a.priority === "high"

              return (
                <Link
                  key={a.slug}
                  href={`/resident-portal/announcements/${a.slug}`}
                  className="card card-hover"
                  style={{
                    textDecoration: "none",
                    padding: "var(--space-l)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-m)",
                    background: "var(--pp-white)",
                    borderLeft: isPriority ? `4px solid ${categoryStyle.bg}` : undefined,
                  }}
                >
                  <div className="cluster" style={{ gap: "var(--space-s)", alignItems: "center", flexWrap: "wrap" }}>
                    {a.pinned && (
                      <span
                        className="badge"
                        style={{
                          background: "var(--pp-gold)",
                          color: "var(--pp-navy-dark)",
                          fontWeight: 700,
                        }}
                      >
                        📌 Pinned
                      </span>
                    )}
                    <span
                      className="badge"
                      style={{
                        background: categoryStyle.bg,
                        color: categoryStyle.text,
                      }}
                    >
                      {categoryStyle.label}
                    </span>
                    {isPriority && (
                      <span
                        className="badge"
                        style={{
                          background: a.priority === "urgent" ? "var(--pp-error)" : "var(--pp-warning)",
                          color: "var(--pp-white)",
                          fontWeight: 700,
                        }}
                      >
                        {a.priority === "urgent" ? "🚨 URGENT" : "⚠️ High Priority"}
                      </span>
                    )}
                    <span className="text-fluid-sm text-pp-slate-400">
                      {new Date(a.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="text-step-2 font-semibold text-pp-navy-dark">{a.title}</h2>
                  {a.excerpt && (
                    <p className="text-fluid-base text-pp-slate-600">{a.excerpt}</p>
                  )}
                  <span className="text-fluid-sm font-medium" style={{ color: "var(--pp-navy-dark)", marginTop: "var(--space-xs)" }}>
                    Read more →
                  </span>
                </Link>
              )
            })
          )}
        </div>
      </section>
    </>
  )
}
