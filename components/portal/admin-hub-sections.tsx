"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink } from "lucide-react"
import type { AdminHubSection } from "@/lib/admin-hub-links"

function envStyle(environment?: "Local" | "Production" | "Shared") {
  if (environment === "Production") {
    return { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }
  }
  if (environment === "Local") {
    return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }
  }
  return { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }
}

export function AdminHubSections({ sections }: { sections: AdminHubSection[] }) {
  const [copiedHref, setCopiedHref] = useState<string | null>(null)

  async function copyHref(href: string) {
    try {
      await navigator.clipboard.writeText(href)
      setCopiedHref(href)
      setTimeout(() => setCopiedHref((current) => (current === href ? null : current)), 1500)
    } catch {
      setCopiedHref(null)
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--space-l)" }}>
      {sections.map((section) => (
        <section key={section.id} className="stack" style={{ gap: "var(--space-s)" }}>
          <div className="stack-xs">
            <h3 className="text-step-1" style={{ color: "var(--pp-navy-dark)" }}>{section.title}</h3>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0 }}>
              {section.description}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 19rem), 1fr))",
              gap: "var(--space-m)",
            }}
          >
            {section.links.map((item) => {
              const copied = copiedHref === item.href
              return (
                <article
                  key={item.label}
                  className="card"
                  style={{
                    padding: "var(--space-m)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-s)",
                    border: "1px solid var(--pp-slate-200)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <h4 className="text-step-0" style={{ color: "var(--pp-navy-dark)", margin: 0 }}>
                      {item.label}
                    </h4>
                    {item.environment && (
                      <span
                        className="text-fluid-xs"
                        style={{
                          ...envStyle(item.environment),
                          borderRadius: "999px",
                          padding: "0.15rem 0.55rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.environment}
                      </span>
                    )}
                  </div>

                  <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", margin: 0, lineHeight: 1.6 }}>
                    {item.description}
                  </p>

                  <div style={{ marginTop: "auto", display: "flex", gap: "0.45rem", alignItems: "center" }}>
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      Open
                      <ExternalLink style={{ width: "0.95rem", height: "0.95rem" }} />
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => copyHref(item.href)}
                      title="Copy URL"
                      aria-label={`Copy URL for ${item.label}`}
                      style={{ minWidth: "2.4rem", paddingInline: "0.65rem", justifyContent: "center" }}
                    >
                      {copied ? <Check style={{ width: "0.95rem", height: "0.95rem" }} /> : <Copy style={{ width: "0.95rem", height: "0.95rem" }} />}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
