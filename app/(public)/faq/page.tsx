// app/faq/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
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
  faqs: [
    {
      question: "What are the HOA dues and when are they due?",
      answer:
        "Annual assessments are billed quarterly. Payment is due on the first of January, April, July, and October. Exact amounts are communicated each year after the Board approves the budget. You can find current rates on the Documents page.",
    },
    {
      question: "How do I submit an architectural review request?",
      answer:
        "Download the Architectural Review Application from the Documents page, complete it with project details and photos, and submit it to the HOA office. The Architectural Review Committee meets monthly and typically responds within 30 days.",
    },
    {
      question: "What are the community pool hours?",
      answer:
        "The pool is open seasonally from late April through early October. Hours are dawn to dusk daily. A valid resident wristband is required for entry. Guest policies are outlined in the pool rules posted at the gate.",
    },
    {
      question: "How do I report a maintenance issue in a common area?",
      answer:
        "Contact the HOA office by phone or email. For after-hours emergencies (irrigation leaks, downed trees, etc.), leave a voicemail and the property manager will be notified. You can find contact information on the Contact page.",
    },
    {
      question: "Can I rent out my home?",
      answer:
        "Leasing policies are governed by the community's Declaration of Covenants. Generally, a minimum lease term of 12 months is required. All tenants must be registered with the HOA office. Review the full policy on the Documents page.",
    },
    {
      question: "How do I get a gate remote or replacement?",
      answer:
        "Gate remotes are available at the HOA office during business hours. Bring a valid photo ID and proof of residency. A replacement fee may apply. See the Gate Access page for full details.",
    },
    {
      question: "When and where are Board meetings held?",
      answer:
        "The Board of Directors meets on the second Wednesday of each month at 6:30 PM in the Clubhouse Main Room. Meetings are open to all residents. Agendas are posted 48 hours in advance on the Documents page.",
    },
    {
      question: "How do I sign up for community event notifications?",
      answer:
        "Check the Events page regularly for upcoming activities. We also post announcements on the Announcements page. A resident email notification system is planned for a future update.",
    },
  ],
}

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
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
          {content.faqs.map((faq, i) => (
            <details key={i} className="card group">
              <summary className="cursor-pointer list-none" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-m)", flexWrap: "nowrap" }}>
                <h2 className="text-step-1 font-semibold text-pp-navy-dark" style={{ lineHeight: 1.4, flex: 1, minWidth: 0 }}>
                  {faq.question}
                </h2>
                <span className="text-pp-slate-400 group-open:rotate-45 transition-transform text-step-2 shrink-0" style={{ lineHeight: 1.4 }}>
                  +
                </span>
              </summary>
              <div className="flow" style={{ marginTop: "var(--space-s)" }}>
                <p className="text-fluid-base text-pp-slate-600">{faq.answer}</p>
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
