import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PortableText } from "@portabletext/react"
import { ArrowLeft } from "lucide-react"
import { getFaqBySlug } from "@/lib/sanity/faqs"
import { siteConfig } from "@/lib/site-config"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const faq = await getFaqBySlug(slug)

  if (!faq) {
    return {
      title: `FAQ | ${siteConfig.name} Resident Portal`,
    }
  }

  return {
    title: `${faq.question} | FAQ | ${siteConfig.name}`,
  }
}

export default async function ResidentFaqDetailPage({ params }: PageProps) {
  const { slug } = await params
  const faq = await getFaqBySlug(slug)
  if (!faq) notFound()

  return (
    <section className="section" style={{ background: "var(--pp-white)" }}>
      <div className="container" style={{ maxWidth: "52rem" }}>
        <div className="stack" style={{ gap: "var(--space-l)" }}>
          <Link
            href="/resident-portal/about"
            className="text-fluid-sm font-semibold"
            style={{
              color: "var(--pp-navy-dark)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              textDecoration: "none",
            }}
          >
            <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
            Back to About the HOA
          </Link>

          <h1 style={{ color: "var(--pp-navy-dark)" }}>{faq.question}</h1>

          <article className="card" style={{ padding: "var(--space-l)" }}>
            <div className="stack" style={{ gap: "0.85rem", color: "var(--pp-slate-700)" }}>
              <PortableText
                value={faq.answer || []}
                components={{
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
          </article>
        </div>
      </div>
    </section>
  )
}
