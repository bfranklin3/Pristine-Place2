import Image from "next/image"
import { PortableText, type PortableTextComponents } from "@portabletext/react"

interface PortableTextRendererProps {
  content: unknown[]
}

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="text-fluid-3xl font-bold text-pp-navy-dark mt-8 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-fluid-2xl font-bold text-pp-navy-dark mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-fluid-xl font-semibold text-pp-navy-dark mt-5 mb-2">{children}</h3>,
    h4: ({ children }) => <h4 className="text-fluid-lg font-semibold text-pp-navy-dark mt-4 mb-2">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-pp-gold pl-4 italic text-pp-slate-600 my-4">{children}</blockquote>
    ),
    normal: ({ children }) => (
      <p className="text-pp-slate-700 leading-relaxed my-4" style={{ whiteSpace: "pre-line" }}>
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc list-inside my-4 space-y-2">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal list-inside my-4 space-y-2">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="text-pp-slate-700">{children}</li>,
    number: ({ children }) => <li className="text-pp-slate-700">{children}</li>,
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
          className="text-pp-navy-dark underline"
        >
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({ value }) => {
      const imageUrl = value?.asset?.url || null
      if (!imageUrl) return null

      return (
        <figure className="my-6">
          <div className="relative w-full h-96 rounded-lg overflow-hidden">
            <Image src={imageUrl} alt={value?.alt || ""} fill className="object-cover" />
          </div>
          {value?.caption ? <figcaption className="text-sm text-pp-slate-500 mt-2 text-center">{value.caption}</figcaption> : null}
        </figure>
      )
    },
  },
}

export function PortableTextRenderer({ content }: PortableTextRendererProps) {
  if (!content || !Array.isArray(content)) return null

  return (
    <div className="prose prose-lg max-w-none">
      <PortableText value={content} components={components} />
    </div>
  )
}
