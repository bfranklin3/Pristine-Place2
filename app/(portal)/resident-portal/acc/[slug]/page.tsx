import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { getAccGuidelineBySlug, getRelatedAccGuidelines } from "@/lib/sanity/acc-guidelines"
import { siteConfig } from "@/lib/site-config"

type PageProps = {
  params: Promise<{ slug: string }>
}

function categoryLabel(category: string) {
  if (category === "florida-friendly") return "Florida Friendly"
  if (category === "construction") return "Construction"
  if (category === "landscaping") return "Landscaping"
  if (category === "house") return "House"
  return "General"
}

function categoryStyle(category: string) {
  if (category === "construction") return { bg: "var(--pp-navy-dark)", color: "var(--pp-white)" }
  if (category === "florida-friendly") return { bg: "#2d6a4f", color: "#ffffff" }
  if (category === "house") return { bg: "var(--pp-gold)", color: "var(--pp-white)" }
  if (category === "landscaping") return { bg: "#52b788", color: "#ffffff" }
  return { bg: "var(--pp-slate-200)", color: "var(--pp-slate-800)" }
}

function renderSpan(
  span: { _key: string; text: string; marks?: string[] },
  markDefs: Array<{ _key: string; _type: "link"; href: string }> = [],
) {
  let content: ReactNode = span.text
  const marks = span.marks || []

  for (const mark of marks) {
    if (mark === "strong") content = <strong key={`${span._key}-strong`}>{content}</strong>
    else if (mark === "em") content = <em key={`${span._key}-em`}>{content}</em>
    else if (mark === "underline") content = <span key={`${span._key}-underline`} style={{ textDecoration: "underline" }}>{content}</span>
    else {
      const link = markDefs.find((def) => def._key === mark)
      if (link?.href) {
        content = (
          <a
            key={`${span._key}-${mark}`}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{ color: "var(--pp-navy-dark)", textDecoration: "underline" }}
          >
            {content}
            {link.href.startsWith("http") && <ExternalLink style={{ width: "0.75rem", height: "0.75rem", marginLeft: "0.2rem", display: "inline-block" }} />}
          </a>
        )
      }
    }
  }

  return content
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const guideline = await getAccGuidelineBySlug(slug)
  if (!guideline) {
    return {
      title: `ACC Guideline | ${siteConfig.name} Resident Portal`,
    }
  }

  return {
    title: `${guideline.title} | ACC Guideline | ${siteConfig.name}`,
  }
}

export default async function AccGuidelineDetailPage({ params }: PageProps) {
  const { slug } = await params
  const guideline = await getAccGuidelineBySlug(slug)
  if (!guideline) notFound()
  const relatedCategory = guideline.category === "florida-friendly" ? "landscaping" : guideline.category
  const related = await getRelatedAccGuidelines(relatedCategory, slug, 5)

  const badge = categoryStyle(guideline.category)

  return (
    <section className="section" style={{ background: "var(--pp-white)" }}>
      <div className="container" style={{ maxWidth: "52rem" }}>
        <div className="stack" style={{ gap: "var(--space-l)" }}>
          <Link
            href="/resident-portal/acc#architectural-guidelines"
            className="text-fluid-sm font-semibold"
            style={{ color: "var(--pp-navy-dark)", display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }}
          >
            <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
            Back to Architectural Guidelines
          </Link>

          <div className="stack-xs">
            <span
              className="text-fluid-xs font-semibold"
              style={{
                display: "inline-block",
                padding: "0.25rem 0.7rem",
                borderRadius: "999px",
                background: badge.bg,
                color: badge.color,
                width: "fit-content",
              }}
            >
              {categoryLabel(guideline.category)}
            </span>
            <h1 style={{ color: "var(--pp-navy-dark)" }}>{guideline.title}</h1>
          </div>

          <article className="card" style={{ padding: "var(--space-l)" }}>
            <div className="stack" style={{ gap: "0.85rem" }}>
              {guideline.content?.map((block) => {
                const children = (block.children || []).map((span) => (
                  <span key={span._key}>{renderSpan(span, block.markDefs || [])}</span>
                ))

                if (block.listItem === "bullet") {
                  return (
                    <div key={block._key} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ color: "var(--pp-navy-dark)", marginTop: "0.15rem" }}>•</span>
                      <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                        {children}
                      </p>
                    </div>
                  )
                }

                if (block.listItem === "number") {
                  return (
                    <div key={block._key} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ color: "var(--pp-navy-dark)", marginTop: "0.15rem" }}>#</span>
                      <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                        {children}
                      </p>
                    </div>
                  )
                }

                return (
                  <p key={block._key} className="text-fluid-base" style={{ color: "var(--pp-slate-700)", lineHeight: 1.7 }}>
                    {children}
                  </p>
                )
              })}
            </div>
          </article>

          {related.length > 0 && (
            <section className="card" style={{ padding: "var(--space-m)" }}>
              <div className="stack-xs">
                <h2 className="text-step-1 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
                  Related {categoryLabel(relatedCategory)} Guidelines
                </h2>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {related.map((item) => (
                    <Link
                      key={item._id}
                      href={`/resident-portal/acc/${item.slug.current}`}
                      className="text-fluid-base"
                      style={{ color: "var(--pp-navy-dark)", textDecoration: "none" }}
                    >
                      {item.title} →
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
