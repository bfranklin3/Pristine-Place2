// app/documents/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Download, Info } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

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
  categories: [
    {
      title: "Governing Documents",
      description: "The foundational legal documents that govern Pristine Place HOA — including the Declaration of Covenants, Bylaws, and community rules.",
      documents: [
        { name: "Declaration of Covenants, Conditions & Restrictions (CC&Rs)", type: "PDF" },
        { name: "Bylaws", type: "PDF" },
        { name: "Articles of Incorporation", type: "PDF" },
        { name: "Rules & Regulations", type: "PDF" },
      ],
    },
    {
      title: "Forms & Applications",
      description: "Submit forms for architectural changes or other resident requests. Contact the HOA office if you have questions about which form to use.",
      documents: [
        {
          name: "Architectural Review Application",
          detail: "Paper Architectural Review Application forms are available in the Clubhouse lobby and are reviewed monthly by the Architectural Control Committee (ACC). For faster processing, log into the Resident Portal to submit your application online — online submissions are typically reviewed within one week.",
        },
      ],
    },
  ],
  note: "Document downloads will be enabled once files are uploaded to the resident portal. Contact the HOA office to request any document in the meantime.",
}

export default function DocumentsPage() {
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

          {content.categories.map((cat) => (
            <div key={cat.title} className="stack" style={{ gap: "var(--space-m)" }}>
              {/* Section Header */}
              <div style={{ borderBottom: "2px solid var(--pp-navy)", paddingBottom: "var(--space-xs)" }}>
                <h2 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>{cat.title}</h2>
                <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", marginTop: "0.375rem" }}>
                  {cat.description}
                </p>
              </div>

              {/* Document List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
                {cat.documents.map((doc) =>
                  "detail" in doc && doc.detail ? (
                    /* Accordion variant — no PDF/Download buttons */
                    <details key={doc.name} className="card group" style={{ padding: "var(--space-m)" }}>
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
                          {doc.name}
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
                          {doc.detail}
                        </p>
                        <Link href="/resident-portal" className="btn btn-primary btn-sm">
                          Access the Resident Portal
                        </Link>
                      </div>
                    </details>
                  ) : (
                    /* Standard PDF row */
                    <div
                      key={doc.name}
                      className="card cluster"
                      style={{
                        justifyContent: "space-between",
                        padding: "var(--space-m)",
                        gap: "var(--space-m)",
                      }}
                    >
                      <div className="cluster" style={{ gap: "var(--space-s)", flex: 1, minWidth: 0 }}>
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
                          style={{ color: "var(--pp-slate-800)", lineHeight: 1.4 }}
                        >
                          {doc.name}
                        </span>
                      </div>
                      {"type" in doc && (
                        <div className="cluster shrink-0" style={{ gap: "var(--space-xs)" }}>
                          <span className="badge badge-muted">{doc.type}</span>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled
                            title="File coming soon"
                            style={{ opacity: 0.6, cursor: "default" }}
                          >
                            <Download style={{ width: "0.875rem", height: "0.875rem" }} />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Info note */}
          <div
            className="card cluster"
            style={{
              background: "linear-gradient(135deg, var(--pp-gold-light), var(--pp-slate-50))",
              borderLeft: "4px solid var(--pp-navy)",
              padding: "var(--space-m)",
              gap: "var(--space-s)",
              alignItems: "start",
            }}
          >
            <Info style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)", flexShrink: 0, marginTop: "0.1rem" }} />
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-700)" }}>
              {content.note}
            </p>
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
