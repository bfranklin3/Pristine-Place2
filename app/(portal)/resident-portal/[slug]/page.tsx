// app/(portal)/resident-portal/[slug]/page.tsx
// Dynamic page route for Sanity CMS pages

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar } from "lucide-react"
import { getPageBySlug, getAllPageSlugs } from "@/lib/sanity/pages"
import { PortableTextRenderer } from "@/components/PortableTextRenderer"
import { siteConfig } from "@/lib/site-config"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug, "portal")

  if (!page) {
    return { title: "Page Not Found" }
  }

  return {
    title: page.title,
    description: page.excerpt || `${page.title} - ${siteConfig.name}`,
    openGraph: {
      title: `${page.title} | ${siteConfig.name}`,
      description: page.excerpt || page.title,
      url: `${siteConfig.url}/resident-portal/${slug}`,
    },
    alternates: {
      canonical: `${siteConfig.url}/resident-portal/${slug}`,
    },
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug, "portal")

  if (!page) {
    notFound()
  }

  return (
    <section className="section">
      <div className="wrapper">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link
            href="/resident-portal"
            className="inline-flex items-center gap-2 text-pp-navy-dark hover:text-pp-navy transition-colors text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal Home
          </Link>

          {/* Page header */}
          <header className="mb-8 pb-6 border-b border-pp-slate-200">
            {page.category && (
              <div className="mb-3">
                <span className="inline-block px-3 py-1 bg-pp-slate-100 text-pp-slate-700 rounded-full text-sm font-medium">
                  {page.category}
                </span>
              </div>
            )}

            <h1 className="text-fluid-3xl font-bold text-pp-navy-dark mb-3">
              {page.title}
            </h1>

            {page.excerpt && (
              <p className="text-fluid-lg text-pp-slate-600 leading-relaxed">
                {page.excerpt}
              </p>
            )}

            {page.publishDate && (
              <div className="flex items-center gap-2 text-sm text-pp-slate-500 mt-4">
                <Calendar className="w-4 h-4" />
                <time dateTime={page.publishDate}>
                  Published {new Date(page.publishDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                {page.lastUpdated && page.lastUpdated !== page.publishDate && (
                  <span>
                    • Updated {new Date(page.lastUpdated).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* Page content */}
          <article className="prose prose-lg max-w-none">
            <PortableTextRenderer content={page.content} />
          </article>
        </div>
      </div>
    </section>
  )
}
