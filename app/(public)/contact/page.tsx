// app/contact/page.tsx

import type { Metadata } from "next"
import { Phone, MapPin, Clock } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { ContactBoardMessageForm } from "@/components/contact/contact-board-message-form"

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact the ${siteConfig.name} HOA office for questions, concerns, or requests.`,
  openGraph: {
    title: `Contact | ${siteConfig.name}`,
    description: `Get in touch with ${siteConfig.name}.`,
    url: `${siteConfig.url}/contact`,
  },
  alternates: { canonical: `${siteConfig.url}/contact` },
}

const content = {
  hero: {
    title: "Contact Us",
    subtitle: "We're here to help. Reach out to the HOA office with any questions.",
  },
  info: [
    {
      icon: Phone,
      label: "Phone",
      value: siteConfig.contact.phone,
      href: `tel:${siteConfig.contact.phoneRaw}`,
    },
    {
      icon: MapPin,
      label: "Address",
      value: `${siteConfig.contact.address.street}, ${siteConfig.contact.address.city}, ${siteConfig.contact.address.state} ${siteConfig.contact.address.zip}`,
    },
    {
      icon: Clock,
      label: "Office Hours",
      value: siteConfig.hours.office,
    },
  ],
}

export default function ContactPage() {
  return (
    <>
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

      <section className="section">
        <div className="container" style={{ maxWidth: "48rem" }}>
          <div className="stack-lg">
            <h2>Get in Touch</h2>
            <div>
              {content.info.map((item, index) => (
                <div
                  key={item.label}
                  className="cluster"
                  style={{
                    gap: "var(--space-m)",
                    alignItems: "start",
                    paddingBlock: "var(--space-m)",
                    borderBottom: index < content.info.length - 1 ? "1px solid var(--pp-slate-200)" : undefined,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--pp-navy-dark)", color: "var(--pp-white)" }}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="stack-xs">
                    <h3 className="text-step-1 font-semibold">{item.label}</h3>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-fluid-base text-pp-navy-dark hover:text-pp-navy transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : item.label === "Office Hours" ? (
                      <div className="stack-xs">
                        {item.value.split(" · ").map((line) => (
                          <p key={line} className="text-fluid-base text-pp-slate-600">{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-fluid-base text-pp-slate-600">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <hr className="divider" />

            <ContactBoardMessageForm />
          </div>
        </div>
      </section>
    </>
  )
}
