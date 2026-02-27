import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, FileText, HelpCircle, Info, Shield, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { getAboutFaqs, type FaqAboutCategory, type SanityFaqForAbout } from "@/lib/sanity/faqs"

export const metadata: Metadata = {
  title: `About the HOA | ${siteConfig.name} Resident Portal`,
  description: "Your guide to understanding how Pristine Place works — from foundational questions to community standards and established procedures.",
}

type AboutSection = {
  key: FaqAboutCategory
  title: string
  icon: LucideIcon
  background: string
}

const ABOUT_SECTIONS: AboutSection[] = [
  {
    key: "understanding-community",
    title: "Understanding Our Community",
    icon: HelpCircle,
    background: "var(--pp-slate-50)",
  },
  {
    key: "community-standards",
    title: "Community Standards & Guidelines",
    icon: Shield,
    background: "var(--pp-white)",
  },
  {
    key: "property-changes-acc",
    title: "Property Changes (ACC)",
    icon: FileText,
    background: "var(--pp-slate-50)",
  },
  {
    key: "enforcement-appeals",
    title: "Enforcement & Appeals",
    icon: AlertTriangle,
    background: "var(--pp-white)",
  },
  {
    key: "governance-participation-services",
    title: "Governance, Participation & Services",
    icon: Users,
    background: "var(--pp-slate-50)",
  },
]

function excerpt(text: string, maxLength: number = 220): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength).trimEnd()}...`
}

export default async function AboutHoaPage() {
  const faqs = await getAboutFaqs()

  const faqsBySection = ABOUT_SECTIONS.reduce<Record<FaqAboutCategory, SanityFaqForAbout[]>>(
    (acc, section) => {
      acc[section.key] = faqs.filter((faq) => faq.aboutCategory === section.key)
      return acc
    },
    {
      "understanding-community": [],
      "community-standards": [],
      "property-changes-acc": [],
      "enforcement-appeals": [],
      "governance-participation-services": [],
    },
  )

  return (
    <>

      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Info style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">About the HOA</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Your guide to understanding how Pristine Place works — from foundational questions to community
            standards and established procedures.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <div className="stack" style={{ gap: "var(--space-m)" }}>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              Pristine Place is a self-governed community managed by an elected Board of Directors and supported by
              volunteer committees. Our governing documents, community guidelines, and established processes exist to
              protect the quality of life and property values that make this neighborhood exceptional.
            </p>
            <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
              This guide is designed to help every resident understand how our community works — and how to get the
              most out of living here.
            </p>
          </div>
        </div>
      </section>

      {ABOUT_SECTIONS.map((section) => {
        const Icon = section.icon
        const sectionFaqs = faqsBySection[section.key]

        return (
          <section key={section.key} className="section" style={{ background: section.background }}>
            <div className="container">
              <div className="stack" style={{ gap: "var(--space-l)" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Icon style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                  <h2 style={{ color: "var(--pp-navy-dark)" }}>{section.title}</h2>
                </div>

                {sectionFaqs.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                      gap: "var(--space-m)",
                    }}
                  >
                    {sectionFaqs.map((faq) => (
                      <FaqCard
                        key={faq._id}
                        question={faq.question}
                        summary={excerpt(faq.answerText || "")}
                        href={`/resident-portal/faq/${faq.slug.current}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="card"
                    style={{
                      padding: "var(--space-l)",
                    }}
                  >
                    <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
                      No FAQs have been assigned to this section yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      })}

      <section className="section-sm" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-m)",
            }}
          >
            <div className="stack-xs">
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-white)" }}>
                Still have questions?
              </h3>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "50ch" }}>
                The Board of Directors is here to help. Contact us with any questions about community governance,
                policies, or procedures.
              </p>
            </div>
            <a
              href="mailto:board@pristineplace.us"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 1.4rem",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-gold-light)",
                color: "var(--pp-navy-dark)",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Contact the Board
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

function FaqCard({ question, summary, href }: { question: string; summary: string; href: string }) {
  return (
    <div
      className="card"
      style={{
        textDecoration: "none",
        padding: "var(--space-l)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-s)",
      }}
    >
      <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
        {question}
      </h3>
      <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
        {summary || "Details available in this FAQ entry."}
      </p>
      <Link
        href={href}
        className="text-fluid-sm font-semibold"
        style={{
          color: "var(--pp-navy-dark)",
          marginTop: "auto",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        View Details
      </Link>
    </div>
  )
}
