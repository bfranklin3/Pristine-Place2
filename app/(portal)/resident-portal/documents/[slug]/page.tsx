import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, FileText } from "lucide-react"
import { PortableText } from "@portabletext/react"
import { getDocumentBySlug } from "@/lib/sanity/documents"
import { siteConfig } from "@/lib/site-config"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = await getDocumentBySlug(slug)

  if (!doc) return { title: "Document Not Found" }

  return {
    title: `${doc.title} | ${siteConfig.name} Resident Portal`,
    description: doc.description || doc.title,
    alternates: {
      canonical: `${siteConfig.url}/resident-portal/documents/${slug}`,
    },
  }
}

export default async function DocumentDetailPage({ params }: Props) {
  const { slug } = await params
  const doc = await getDocumentBySlug(slug)

  if (!doc) notFound()

  const fileUrl = doc.file?.asset?.url || doc.externalFileUrl
  const hasContent = Array.isArray(doc.content) && doc.content.length > 0

  return (
    <section className="section">
      <div className="wrapper">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/resident-portal/documents"
            className="inline-flex items-center gap-2 text-pp-navy-dark hover:text-pp-navy transition-colors text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Governing Documents
          </Link>

          <header className="mb-8 pb-6 border-b border-pp-slate-200">
            <h1 className="text-fluid-3xl font-bold text-pp-navy-dark mb-3">{doc.title}</h1>
            {doc.description && (
              <p className="text-fluid-lg text-pp-slate-600 leading-relaxed">{doc.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-pp-navy-dark text-white text-sm font-semibold hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Document
                </a>
              )}
              {!fileUrl && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-pp-slate-100 text-pp-slate-700 text-sm font-semibold">
                  <FileText className="w-4 h-4" />
                  Content-only record
                </span>
              )}
            </div>
          </header>

          {hasContent ? (
            <article className="prose prose-lg max-w-none">
              <PortableText value={doc.content || []} />
            </article>
          ) : (
            <div className="card p-6 text-pp-slate-600">
              This document does not include inline content. Use <strong>Open Document</strong> to view the source
              file.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
