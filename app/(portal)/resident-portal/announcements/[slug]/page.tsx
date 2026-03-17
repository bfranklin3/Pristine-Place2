// app/(portal)/resident-portal/announcements/[slug]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, Tag, AlertCircle, Shield } from "lucide-react"
import { client } from "@/lib/sanity/client"
import { PortableText } from "@portabletext/react"
import { siteConfig } from "@/lib/site-config"
import { getOptimizedImageUrl, getImageSizes, type ImageFit, type ImageLayout } from "@/lib/sanity/image-builder"

interface AnnouncementPageProps {
  params: Promise<{ slug: string }>
}

async function getAnnouncement(slug: string) {
  const query = `*[_type == "announcement" && slug.current == $slug && published == true][0] {
    _id,
    title,
    slug,
    content,
    excerpt,
    featuredImage {
      asset-> {
        url,
        metadata {
          dimensions {
            width,
            height
          }
        }
      }
    },
    imageLayout,
    imageFit,
    category,
    priority,
    publishDate,
    expiryDate,
    pinned,
    published,
    visibility
  }`

  return client.fetch(query, { slug })
}

export async function generateMetadata({ params }: AnnouncementPageProps): Promise<Metadata> {
  const { slug } = await params
  const announcement = await getAnnouncement(slug)

  if (!announcement) {
    return {
      title: "Announcement Not Found",
    }
  }

  return {
    title: `${announcement.title} | Resident Portal | ${siteConfig.name}`,
    description: announcement.excerpt || announcement.title,
  }
}

export default async function AnnouncementPage({ params }: AnnouncementPageProps) {
  const { slug } = await params
  const announcement = await getAnnouncement(slug)

  if (!announcement) {
    notFound()
  }

  const categoryColors: Record<string, string> = {
    general: "var(--pp-navy)",
    maintenance: "var(--pp-slate-600)",
    community: "#3d7a56",
    important: "#d97706",
    emergency: "#c0392b",
  }

  const categoryColor = categoryColors[announcement.category] || "var(--pp-navy)"

  const priorityConfig: Record<string, { label: string; color: string }> = {
    normal: { label: "Notice", color: "var(--pp-slate-500)" },
    high: { label: "Important", color: "#d97706" },
    urgent: { label: "Urgent", color: "#c0392b" },
  }

  const priority = priorityConfig[announcement.priority] || priorityConfig.normal
  const layout = (announcement.imageLayout || "hero") as ImageLayout
  const imageFit = (announcement.imageFit || "cover") as ImageFit
  const imageUrl = announcement.featuredImage ? getOptimizedImageUrl(announcement.featuredImage, layout, imageFit) : null
  const imageSizes = getImageSizes(layout)
  const imageWidth = announcement.featuredImage?.asset?.metadata?.dimensions?.width || 1600
  const imageHeight = announcement.featuredImage?.asset?.metadata?.dimensions?.height || 600

  const badges = (
    <div className="cluster" style={{ gap: "var(--space-xs)", flexWrap: "wrap" }}>
      <span
        className="badge"
        style={{
          background: "var(--pp-navy-dark)",
          color: "var(--pp-gold-light)",
        }}
      >
        <Shield className="w-3 h-3" />
        Resident Portal
      </span>
      <span
        className="badge"
        style={{
          background: categoryColor,
          color: "var(--pp-white)",
          textTransform: "capitalize",
        }}
      >
        <Tag className="w-3 h-3" />
        {announcement.category}
      </span>
      {announcement.priority !== "normal" && (
        <span
          className="badge"
          style={{
            background: priority.color,
            color: "var(--pp-white)",
          }}
        >
          <AlertCircle className="w-3 h-3" />
          {priority.label}
        </span>
      )}
    </div>
  )

  const renderFeaturedImage = (priority = false) => {
    if (!imageUrl) return null

    if (imageFit === "contain") {
      return (
        <Image
          src={imageUrl}
          alt={announcement.title}
          width={imageWidth}
          height={imageHeight}
          sizes={imageSizes}
          priority={priority}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "left top",
          }}
        />
      )
    }

    return (
      <Image
        src={imageUrl}
        alt={announcement.title}
        fill
        sizes={imageSizes}
        style={{ objectFit: "cover" }}
        priority={priority}
      />
    )
  }

  return (
    <>
      <div className="container" style={{ paddingTop: "var(--space-m)" }}>
        <Link
          href="/resident-portal"
          className="inline-flex items-center gap-2 text-fluid-sm text-pp-slate-600 hover:text-pp-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Home
        </Link>
      </div>

      <article className="section">
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            {imageUrl && layout === "hero" && (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "400px",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  background: imageFit === "contain" ? "transparent" : undefined,
                }}
              >
                {renderFeaturedImage(true)}
              </div>
            )}

            {imageUrl && layout === "side" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-l)", alignItems: "start" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    background: imageFit === "contain" ? "transparent" : undefined,
                  }}
                >
                  {renderFeaturedImage(true)}
                </div>
                <div className="stack" style={{ gap: "var(--space-s)" }}>
                  {badges}
                  <h1 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    {announcement.title}
                  </h1>
                </div>
              </div>
            )}

            {imageUrl && layout === "compact" && (
              <div style={{ display: "flex", gap: "var(--space-m)", alignItems: "flex-start" }}>
                <div
                  style={{
                    position: "relative",
                    width: "150px",
                    height: "150px",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: imageFit === "contain" ? "transparent" : undefined,
                  }}
                >
                  {renderFeaturedImage()}
                </div>
                <div className="stack" style={{ gap: "var(--space-xs)", flex: 1 }}>
                  {badges}
                  <h1 className="text-step-3 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                    {announcement.title}
                  </h1>
                </div>
              </div>
            )}

            {(layout === "hero" || layout === "none") && (
              <div className="stack" style={{ gap: "var(--space-s)" }}>
                {badges}
                <h1 className="text-step-4 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                  {announcement.title}
                </h1>
              </div>
            )}

            <div className="cluster text-fluid-sm" style={{ color: "var(--pp-slate-500)", gap: "var(--space-s)" }}>
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(announcement.publishDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {announcement.expiryDate && (
                <span>
                  • Expires{" "}
                  {new Date(announcement.expiryDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--pp-slate-200)" }} />

            <div
              className="prose"
              style={{
                color: "var(--pp-slate-700)",
                fontSize: "var(--fluid-base)",
                lineHeight: 1.7,
              }}
            >
              <PortableText value={announcement.content} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--pp-slate-200)" }} />

            <div className="stack" style={{ gap: "var(--space-s)", alignItems: "center" }}>
              <Link href="/resident-portal" className="btn btn-outline">
                <ArrowLeft className="w-4 h-4" />
                Back to Portal Home
              </Link>
              <p className="text-fluid-sm text-pp-slate-500">
                Questions? <Link href="/resident-portal/contact-board" className="text-pp-navy hover:underline">Contact the Board</Link>
              </p>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
