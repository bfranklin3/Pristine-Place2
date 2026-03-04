// app/documents/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { FileText, ExternalLink } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { getDocuments, type SanityDocument } from "@/lib/sanity/documents"

export const metadata: Metadata = {
  title: "Documents & Forms",
  description: `Access governing documents and forms for ${siteConfig.name}.`,
  openGraph: {
    title: `Documents & Forms | ${siteConfig.name}`,
    description: `HOA documents and forms for ${siteConfig.name}.`,
    url: `${siteConfig.url}/documents`,
  },
  alternates: { canonical: `${siteConfig.url}/documents` },
}

const content = {
  hero: {
    title: "Documents & Forms",
    subtitle: "Governing documents and applications for Pristine Place residents.",
  },
  forms: {
    title: "Forms & Applications",
    description: "Submit forms for architectural changes or other resident requests. Contact the HOA office if you have questions about which form to use.",
    name: "Architectural Review Application",
    detail:
      "Paper Architectural Review Application forms are available in the Clubhouse lobby and are reviewed monthly by the Architectural Control Committee (ACC). For faster processing, log into the Resident Portal to submit your application online — online submissions are typically reviewed within one week.",
  },
}

interface GoverningSection {
  id: "covenants" | "bylaws"
  title: string
  intro: string
  docs: SanityDocument[]
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function hasKeyword(value: string, keywords: string[]) {
  const normalized = normalize(value)
  return keywords.some((keyword) => normalized.includes(keyword))
}

function docText(doc: SanityDocument) {
  return normalize(`${doc.title} ${doc.description || ""}`)
}

function sortByDateThenTitle(a: SanityDocument, b: SanityDocument) {
  const aTime = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0
  const bTime = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0
  if (aTime !== bTime) return bTime - aTime
  return a.title.localeCompare(b.title)
}

function buildGoverningSections(docs: SanityDocument[]): GoverningSection[] {
  const isBylaws = (d: SanityDocument) => {
    const text = docText(d)
    return hasKeyword(text, ["bylaw", "articles of incorporation", "incorporation", "articles"])
  }

  const covenants = docs
    .filter((d) => {
      const category = normalize(d.category)
      if (category === "governing-docs" && !isBylaws(d)) return true
      return normalize(d.categoryParent) === "hoa" && normalize(d.categoryChild) === "covenants"
    })
    .sort(sortByDateThenTitle)

  const bylawsAndArticles = docs
    .filter((d) => {
      const category = normalize(d.category)
      if (category === "governing-docs" && isBylaws(d)) return true
      return normalize(d.categoryParent) === "hoa" && normalize(d.categoryChild) === "bylaws & articles"
    })
    .sort(sortByDateThenTitle)

  return [
    {
      id: "covenants",
      title: "Declaration of Covenants, Conditions & Restrictions (CC&Rs)",
      intro:
        "The Declaration of Covenants, Conditions & Restrictions is the foundational legal document of Pristine Place HOA.",
      docs: covenants,
    },
    {
      id: "bylaws",
      title: "Articles of Incorporation & Bylaws",
      intro:
        "These documents establish the legal existence of Pristine Place HOA and define how the association is governed.",
      docs: bylawsAndArticles,
    },
  ]
}

function sourceHref(doc: SanityDocument): string | null {
  return doc.file?.asset?.url || doc.externalFileUrl || null
}

export default async function DocumentsPage() {
  const docs = await getDocuments("public")
  const governingSections = buildGoverningSections(docs)

  return (
    <>
      {/* Hero */}
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
        <div className="hero-overlay" />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle" style={{ maxWidth: "var(--measure)" }}>{content.hero.subtitle}</p>
        </div>
      </section>

      {/* Document Categories */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container stack" style={{ gap: "var(--space-xl)" }}>
          <div className="stack" style={{ gap: "var(--space-m)" }}>
            <div style={{ borderBottom: "2px solid var(--pp-navy)", paddingBottom: "var(--space-xs)" }}>
              <h2 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>Governing Documents</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", marginTop: "0.375rem" }}>
                Foundational legal documents for Pristine Place HOA. Expand each section to view available source documents.
              </p>
            </div>

            <div className="stack" style={{ gap: "var(--space-s)" }}>
              {governingSections.map((section) => (
                <details key={section.id} className="card" style={{ padding: "var(--space-m)" }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-m)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
                      <div
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          borderRadius: "var(--radius-md)",
                          background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FileText style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
                      </div>
                      <div className="stack-xs">
                        <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                          {section.title}
                        </h3>
                        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.55 }}>
                          {section.intro}
                        </p>
                      </div>
                    </div>
                    <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                      {section.docs.length} source{section.docs.length === 1 ? "" : "s"}
                    </span>
                  </summary>

                  <div style={{ marginTop: "var(--space-s)", paddingTop: "var(--space-s)", borderTop: "1px solid var(--pp-slate-200)", display: "grid", gap: "var(--space-s)" }}>
                    {section.docs.length === 0 ? (
                      <div className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                        No source documents are currently available in this section.
                      </div>
                    ) : (
                      section.docs.map((doc) => {
                        const href = sourceHref(doc)
                        return (
                          <div
                            key={doc._id}
                            className="card cluster"
                            style={{ justifyContent: "space-between", padding: "var(--space-s) var(--space-m)", gap: "var(--space-s)" }}
                          >
                            <div className="stack-xs" style={{ minWidth: 0 }}>
                              <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-slate-800)" }}>
                                {doc.title}
                              </p>
                              {doc.effectiveDate ? (
                                <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                                  Effective {new Date(doc.effectiveDate).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }}>
                                <ExternalLink style={{ width: "0.875rem", height: "0.875rem" }} />
                                Open
                              </a>
                            ) : (
                              <span className="text-fluid-sm" style={{ color: "var(--pp-slate-400)", whiteSpace: "nowrap" }}>
                                Source unavailable
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="stack" style={{ gap: "var(--space-m)" }}>
            <div style={{ borderBottom: "2px solid var(--pp-navy)", paddingBottom: "var(--space-xs)" }}>
              <h2 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{content.forms.title}</h2>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", marginTop: "0.375rem" }}>
                {content.forms.description}
              </p>
            </div>

            <details className="card group" style={{ padding: "var(--space-m)" }}>
              <summary
                className="cursor-pointer list-none"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-m)", flexWrap: "nowrap" }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
                </div>
                <span
                  className="text-fluid-base font-medium"
                  style={{ color: "var(--pp-slate-800)", lineHeight: 1.4, flex: 1, minWidth: 0 }}
                >
                  {content.forms.name}
                </span>
                <span
                  className="text-pp-slate-400 group-open:rotate-45 transition-transform text-step-2 shrink-0"
                  style={{ lineHeight: 1 }}
                >
                  +
                </span>
              </summary>
              <div style={{ marginTop: "var(--space-s)", paddingTop: "var(--space-s)", borderTop: "1px solid var(--pp-slate-200)" }}>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6, marginBottom: "var(--space-s)" }}>
                  {content.forms.detail}
                </p>
                <Link href="/resident-portal" className="btn btn-primary btn-sm">
                  Access the Resident Portal
                </Link>
              </div>
            </details>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", paddingTop: "var(--space-s)" }}>
            <Link href="/contact" className="btn btn-primary">
              Contact the HOA Office
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
