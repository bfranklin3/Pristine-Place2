// app/faq/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { PortableText } from "@portabletext/react"
import { getPublicFaqs } from "@/lib/sanity/faqs"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about living at ${siteConfig.name}, HOA dues, architectural reviews, and community rules.`,
  openGraph: {
    title: `FAQ | ${siteConfig.name}`,
    description: `Frequently asked questions about ${siteConfig.name}.`,
    url: `${siteConfig.url}/faq`,
  },
  alternates: { canonical: `${siteConfig.url}/faq` },
}

const content = {
  hero: {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers to the most common questions about community living at Pristine Place.",
  },
}

export default async function FAQPage() {
  const faqs = await getPublicFaqs()

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answerText,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section
        className="hero-section"
        style={{ background: 'var(--pp-navy)' }}
      >
        <div className="hero-overlay" style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy-light))" }} />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle">{content.hero.subtitle}</p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="section">
        <div className="wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          {faqs.map((faq) => (
            <details key={faq._id} className="card group">
              <summary className="cursor-pointer list-none" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-m)", flexWrap: "nowrap" }}>
                <h2 className="text-step-1 font-semibold text-pp-navy-dark" style={{ lineHeight: 1.4, flex: 1, minWidth: 0 }}>
                  {faq.question}
                </h2>
                <span className="text-pp-slate-400 group-open:rotate-45 transition-transform text-step-2 shrink-0" style={{ lineHeight: 1.4 }}>
                  +
                </span>
              </summary>
              <div className="flow" style={{ marginTop: "var(--space-s)" }}>
                <div className="text-fluid-base text-pp-slate-600">
                  <PortableText
                    value={faq.answer || []}
                    components={{
                      block: {
                        normal: ({ children }) => (
                          <p
                            style={{
                              whiteSpace: "pre-line",
                              marginTop: "0.75rem",
                              marginBottom: "0.75rem",
                              lineHeight: 1.65,
                            }}
                          >
                            {children}
                          </p>
                        ),
                        h3: ({ children }) => (
                          <h3
                            className="text-step-1 font-semibold"
                            style={{ color: "var(--pp-navy-dark)", marginTop: "1rem", marginBottom: "0.5rem" }}
                          >
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4
                            className="text-fluid-lg font-semibold"
                            style={{ color: "var(--pp-navy-dark)", marginTop: "0.875rem", marginBottom: "0.5rem" }}
                          >
                            {children}
                          </h4>
                        ),
                      },
                      list: {
                        bullet: ({ children }) => (
                          <ul
                            style={{
                              listStyle: "disc",
                              paddingLeft: "1.25rem",
                              display: "grid",
                              gap: "0.4rem",
                              marginTop: "0.6rem",
                              marginBottom: "0.6rem",
                            }}
                          >
                            {children}
                          </ul>
                        ),
                        number: ({ children }) => (
                          <ol
                            style={{
                              listStyle: "decimal",
                              paddingLeft: "1.25rem",
                              display: "grid",
                              gap: "0.4rem",
                              marginTop: "0.6rem",
                              marginBottom: "0.6rem",
                            }}
                          >
                            {children}
                          </ol>
                        ),
                      },
                      marks: {
                        link: ({ children, value }) => {
                          const href = String(value?.href || "")
                          const isExternal = href.startsWith("http")
                          return (
                            <a
                              href={href}
                              target={isExternal ? "_blank" : undefined}
                              rel={isExternal ? "noopener noreferrer" : undefined}
                              style={{ color: "var(--pp-navy-dark)", textDecoration: "underline" }}
                            >
                              {children}
                            </a>
                          )
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-pp-slate-50" style={{ textAlign: "center" }}>
        <div className="container stack" style={{ alignItems: "center" }}>
          <h2>Still Have Questions?</h2>
          <p className="text-fluid-lg text-pp-slate-500" style={{ maxWidth: "var(--measure)" }}>
            Our office is happy to help with anything not covered here.
          </p>
          <Link href="/contact" className="btn btn-primary">
            Contact Us
          </Link>
        </div>
      </section>
    </>
  )
}
