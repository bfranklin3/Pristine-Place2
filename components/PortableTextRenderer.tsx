// components/PortableTextRenderer.tsx
// Simple Portable Text renderer for Sanity content
// TODO: Enhance with @portabletext/react for full support

import Image from "next/image"
import Link from "next/link"

interface PortableTextRendererProps {
  content: any[]
}

export function PortableTextRenderer({ content }: PortableTextRendererProps) {
  if (!content || !Array.isArray(content)) {
    return null
  }

  return (
    <div className="prose prose-lg max-w-none">
      {content.map((block, index) => renderBlock(block, index))}
    </div>
  )
}

function renderBlock(block: any, index: number) {
  // Handle text blocks
  if (block._type === "block") {
    const style = block.style || "normal"
    const children = block.children?.map((child: any, i: number) =>
      renderSpan(child, i)
    )

    switch (style) {
      case "h1":
        return (
          <h1 key={index} className="text-fluid-3xl font-bold text-pp-navy-dark mt-8 mb-4">
            {children}
          </h1>
        )
      case "h2":
        return (
          <h2 key={index} className="text-fluid-2xl font-bold text-pp-navy-dark mt-6 mb-3">
            {children}
          </h2>
        )
      case "h3":
        return (
          <h3 key={index} className="text-fluid-xl font-semibold text-pp-navy-dark mt-5 mb-2">
            {children}
          </h3>
        )
      case "h4":
        return (
          <h4 key={index} className="text-fluid-lg font-semibold text-pp-navy-dark mt-4 mb-2">
            {children}
          </h4>
        )
      case "blockquote":
        return (
          <blockquote
            key={index}
            className="border-l-4 border-pp-gold pl-4 italic text-pp-slate-600 my-4"
          >
            {children}
          </blockquote>
        )
      default:
        // Handle lists
        if (block.listItem) {
          return renderListItem(block, index, children)
        }
        // Normal paragraph
        return (
          <p key={index} className="text-pp-slate-700 leading-relaxed my-4">
            {children}
          </p>
        )
    }
  }

  // Handle images
  if (block._type === "image") {
    const imageUrl = block.asset?.url || `/api/sanity-image/${block.asset?._ref}`
    return (
      <figure key={index} className="my-6">
        <div className="relative w-full h-96 rounded-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt={block.alt || ""}
            fill
            className="object-cover"
          />
        </div>
        {block.caption && (
          <figcaption className="text-sm text-pp-slate-500 mt-2 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  // Fallback for unknown types
  return null
}

function renderSpan(span: any, index: number) {
  if (!span.text) return null

  let text: React.ReactNode = span.text

  // Apply marks (bold, italic, etc.)
  if (span.marks && span.marks.length > 0) {
    span.marks.forEach((mark: string) => {
      switch (mark) {
        case "strong":
          text = <strong key={`${index}-strong`}>{text}</strong>
          break
        case "em":
          text = <em key={`${index}-em`}>{text}</em>
          break
        case "underline":
          text = <u key={`${index}-u`}>{text}</u>
          break
        case "code":
          text = (
            <code
              key={`${index}-code`}
              className="bg-pp-slate-100 px-1.5 py-0.5 rounded text-sm font-mono"
            >
              {text}
            </code>
          )
          break
      }
    })
  }

  return <span key={index}>{text}</span>
}

function renderListItem(block: any, index: number, children: any[]) {
  const isOrdered = block.listItem === "number"
  const ListTag = isOrdered ? "ol" : "ul"
  const listClass = isOrdered
    ? "list-decimal list-inside my-4 space-y-2"
    : "list-disc list-inside my-4 space-y-2"

  return (
    <ListTag key={index} className={listClass}>
      <li className="text-pp-slate-700">{children}</li>
    </ListTag>
  )
}
