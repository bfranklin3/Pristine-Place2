"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Archive,
  BarChart2,
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  Scale,
  Shield,
} from "lucide-react"

type DocType = "governing" | "policy" | "financial" | "archive"

interface DisplayDoc {
  id: string
  slug?: string
  title: string
  description: string
  href?: string
  docType: DocType
  hasContentOnly: boolean
  effectiveDate?: string
}

interface DocSection {
  id: string
  title: string
  intro: string
  note?: string
  docs: DisplayDoc[]
}

interface DocFilters {
  docType: DocType | "all"
  year: string
}

interface DocumentsBrowserProps {
  sections: DocSection[]
  filters: DocFilters
  allDocsCount: number
  filteredDocsCount: number
  allYears: string[]
  hasActiveFilters: boolean
}

const DOC_TYPE_LABEL: Record<DocType, string> = {
  governing: "Governing",
  policy: "Policy",
  financial: "Financial",
  archive: "Archive",
}

const DOC_TYPE_STYLE: Record<DocType, React.CSSProperties> = {
  governing: { background: "var(--pp-navy-dark)", color: "var(--pp-white)" },
  policy: { background: "var(--pp-slate-200)", color: "var(--pp-slate-800)" },
  financial: { background: "var(--pp-gold)", color: "var(--pp-white)" },
  archive: { background: "var(--pp-slate-100)", color: "var(--pp-slate-600)" },
}

const sectionBg = ["var(--pp-white)", "var(--pp-slate-50)"]
const YEAR_GROUP_SECTION_IDS = new Set(["meeting-records", "financials"])

function getDocYear(doc: DisplayDoc): string {
  const titleYears = Array.from(doc.title.matchAll(/\b(20\d{2})\b/g)).map((m) => m[1])
  if (titleYears.length > 0) return titleYears[titleYears.length - 1]

  if (doc.effectiveDate) {
    const parsed = new Date(doc.effectiveDate)
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear())
  }

  return "Unknown"
}

function groupDocsByYear(docs: DisplayDoc[]): Array<{ year: string; docs: DisplayDoc[] }> {
  const groups = new Map<string, DisplayDoc[]>()

  for (const doc of docs) {
    const year = getDocYear(doc)
    const current = groups.get(year) || []
    current.push(doc)
    groups.set(year, current)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "Unknown") return 1
      if (b === "Unknown") return -1
      return Number(b) - Number(a)
    })
    .map(([year, docsForYear]) => ({ year, docs: docsForYear }))
}

function yearKey(sectionId: string, year: string) {
  return `${sectionId}::${year}`
}

function parseCsvParam(value: string | null): Set<string> {
  if (!value) return new Set()
  const items = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  return new Set(items)
}

function buildDocAnchorId(doc: DisplayDoc): string {
  const source = doc.slug || doc.id || doc.title
  const normalized = String(source)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `doc-${normalized || "item"}`
}

function DocRow({ doc }: { doc: DisplayDoc }) {
  const actionStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.45rem 0.9rem",
    borderRadius: "var(--radius-md)",
    background: "var(--pp-navy-dark)",
    color: "var(--pp-white)",
    fontSize: "0.82rem",
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
  }

  return (
    <div
      id={buildDocAnchorId(doc)}
      className="card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-m)",
        padding: "var(--space-m)",
        flexWrap: "wrap",
        scrollMarginTop: "7.5rem",
      }}
    >
      <div
        style={{
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "var(--radius-md)",
          background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText style={{ width: "1.125rem", height: "1.125rem", color: "var(--pp-white)" }} />
      </div>

      <div className="stack-xs" style={{ flex: "1 1 14rem", minWidth: 0 }}>
        <p className="text-fluid-base font-semibold" style={{ color: "var(--pp-slate-900)", lineHeight: 1.35 }}>
          {doc.title}
        </p>
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
          {doc.description}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", flexShrink: 0, alignSelf: "center" }}>
        <span
          className="text-fluid-xs font-semibold"
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            whiteSpace: "nowrap",
            ...DOC_TYPE_STYLE[doc.docType],
          }}
        >
          {DOC_TYPE_LABEL[doc.docType]}
        </span>

        {doc.href ? (
          <a href={doc.href} target="_blank" rel="noopener noreferrer" style={actionStyle}>
            <ExternalLink style={{ width: "0.75rem", height: "0.75rem" }} />
            Open
          </a>
        ) : doc.hasContentOnly ? (
          <span
            className="text-fluid-xs font-semibold"
            style={{
              padding: "0.2rem 0.65rem",
              borderRadius: "999px",
              whiteSpace: "nowrap",
              background: "var(--pp-slate-100)",
              color: "var(--pp-slate-600)",
            }}
          >
            Content only
          </span>
        ) : (
          <span
            className="text-fluid-xs font-semibold"
            style={{
              padding: "0.2rem 0.65rem",
              borderRadius: "999px",
              whiteSpace: "nowrap",
              background: "var(--pp-slate-100)",
              color: "var(--pp-slate-600)",
            }}
          >
            No file
          </span>
        )}
      </div>
    </div>
  )
}

export default function DocumentsBrowser({
  sections,
  filters,
  allDocsCount,
  filteredDocsCount,
  allYears,
  hasActiveFilters,
}: DocumentsBrowserProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showBackToTop, setShowBackToTop] = useState(false)

  const visibleSections = useMemo(
    () => (hasActiveFilters ? sections.filter((section) => section.docs.length > 0) : sections),
    [hasActiveFilters, sections]
  )

  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(new Set())
  const [openYearIds, setOpenYearIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const secFromUrl = parseCsvParam(searchParams.get("sec"))
    const yrFromUrl = parseCsvParam(searchParams.get("yr"))

    if (secFromUrl.size > 0) {
      setOpenSectionIds(secFromUrl)
    } else if (hasActiveFilters) {
      setOpenSectionIds(new Set(visibleSections.map((section) => section.id)))
    } else {
      setOpenSectionIds(new Set())
    }

    if (yrFromUrl.size > 0) {
      setOpenYearIds(yrFromUrl)
    } else if (hasActiveFilters) {
      const allYearKeys = new Set<string>()
      for (const section of visibleSections) {
        if (!YEAR_GROUP_SECTION_IDS.has(section.id)) continue
        const groups = groupDocsByYear(section.docs)
        for (const group of groups) allYearKeys.add(yearKey(section.id, group.year))
      }
      setOpenYearIds(allYearKeys)
    } else {
      setOpenYearIds(new Set())
    }
  }, [searchParams, hasActiveFilters, visibleSections])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    // Documents page uses `dq` for its local filter query; drop any global-search `q` noise.
    params.delete("q")

    if (openSectionIds.size > 0) {
      params.set("sec", Array.from(openSectionIds).join(","))
    } else {
      params.delete("sec")
    }

    if (openYearIds.size > 0) {
      params.set("yr", Array.from(openYearIds).join(","))
    } else {
      params.delete("yr")
    }

    const query = params.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname
    window.history.replaceState(null, "", nextUrl)
  }, [openSectionIds, openYearIds, pathname, searchParams])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const iconMap: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
    covenants: BookOpen,
    bylaws: Scale,
    resolutions: FileText,
    "meeting-records": CalendarDays,
    financials: BarChart2,
    historical: Archive,
  }

  const sectionStateCsv = Array.from(openSectionIds).join(",")
  const yearStateCsv = Array.from(openYearIds).join(",")

  const infoChipStyle: React.CSSProperties = {
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    background: "var(--pp-slate-50)",
    border: "1px solid var(--pp-slate-200)",
    color: "var(--pp-slate-500)",
    fontWeight: 500,
    cursor: "default",
  }

  const jumpChipStyle: React.CSSProperties = {
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    background: "var(--pp-slate-100)",
    border: "1px solid var(--pp-slate-200)",
    color: "var(--pp-slate-700)",
    textDecoration: "none",
    fontSize: "0.8rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    cursor: "pointer",
  }

  const expandAll = () => {
    const allSectionIds = new Set(visibleSections.map((section) => section.id))
    const allYearKeys = new Set<string>()

    for (const section of visibleSections) {
      if (!YEAR_GROUP_SECTION_IDS.has(section.id)) continue
      const groups = groupDocsByYear(section.docs)
      for (const group of groups) allYearKeys.add(yearKey(section.id, group.year))
    }

    setOpenSectionIds(allSectionIds)
    setOpenYearIds(allYearKeys)
  }

  const collapseAll = () => {
    setOpenSectionIds(new Set())
    setOpenYearIds(new Set())
  }

  return (
    <>
      <div id="top" />
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Governing Documents</h1>
          <p className="hero-subtitle" style={{ maxWidth: "52ch" }}>
            Pristine Place is committed to transparent, accountable governance. The documents below represent the legal
            foundation and financial record of our community.
          </p>
        </div>
      </section>

      <section
        className="section-sm"
        style={{
          background: "var(--pp-white)",
          borderBottom: "1px solid var(--pp-slate-200)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          paddingTop: "0.65rem",
          paddingBottom: "0.65rem",
        }}
      >
        <div className="container stack" style={{ gap: "0.6rem" }}>
          <form
            action="/resident-portal/documents"
            method="get"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}
          >
            <input type="hidden" name="sec" value={sectionStateCsv} />
            <input type="hidden" name="yr" value={yearStateCsv} />
            <select
              name="docType"
              defaultValue={filters.docType}
              aria-label="Filter by document type"
              style={{
                padding: "0.55rem 0.6rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--pp-slate-300)",
                fontSize: "0.9rem",
              }}
            >
              <option value="all">All types</option>
              <option value="governing">Governing</option>
              <option value="policy">Policy</option>
              <option value="financial">Financial</option>
              <option value="archive">Archive</option>
            </select>
            <select
              name="year"
              defaultValue={filters.year}
              aria-label="Filter by year"
              style={{
                padding: "0.55rem 0.6rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--pp-slate-300)",
                fontSize: "0.9rem",
              }}
            >
              <option value="all">All years</option>
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="submit"
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--pp-navy-dark)",
                color: "var(--pp-white)",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
            <Link
              href="/resident-portal/documents"
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--pp-slate-300)",
                color: "var(--pp-slate-700)",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.88rem",
              }}
            >
              Clear
            </Link>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem" }}>
            <span className="text-fluid-sm" style={infoChipStyle}>
              Showing {filteredDocsCount} of {allDocsCount} documents
            </span>
            <span className="text-fluid-sm" style={infoChipStyle}>
              {sections.length} sections
            </span>
            <span className="text-fluid-sm" style={infoChipStyle}>
              Latest year: {allYears[0] || "N/A"}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem" }}>
            <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-600)", whiteSpace: "nowrap" }}>
              Jump to:
            </span>
            {visibleSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => {
                  setOpenSectionIds((prev) => {
                    const next = new Set(prev)
                    next.add(section.id)
                    return next
                  })
                }}
                style={jumpChipStyle}
              >
                {section.title} ({section.docs.length})
              </a>
            ))}
            <button
              type="button"
              onClick={expandAll}
              style={{
                marginLeft: "0.4rem",
                padding: "0.25rem 0.55rem",
                borderRadius: "999px",
                border: "1px solid var(--pp-slate-300)",
                background: "var(--pp-white)",
                color: "var(--pp-slate-700)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              style={{
                padding: "0.25rem 0.55rem",
                borderRadius: "999px",
                border: "1px solid var(--pp-slate-300)",
                background: "var(--pp-white)",
                color: "var(--pp-slate-700)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Collapse all
            </button>
          </div>
        </div>
      </section>

      {visibleSections.map((section, i) => {
        const Icon = iconMap[section.id] || FileText
        const usesYearGrouping = YEAR_GROUP_SECTION_IDS.has(section.id)
        const isSectionOpen = openSectionIds.has(section.id)

        return (
          <section key={section.id} id={section.id} className="section" style={{ background: sectionBg[i % 2] }}>
            <div className="container stack" style={{ gap: "var(--space-l)" }}>
              <details
                className="card"
                style={{ padding: "var(--space-m)" }}
                open={isSectionOpen}
                onToggle={(event) => {
                  const nextOpen = (event.currentTarget as HTMLDetailsElement).open
                  setOpenSectionIds((prev) => {
                    const next = new Set(prev)
                    if (nextOpen) next.add(section.id)
                    else next.delete(section.id)
                    return next
                  })
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-m)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-m)" }}>
                    <div
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        borderRadius: "var(--radius-md)",
                        background: "var(--pp-navy-dark)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "0.1rem",
                      }}
                    >
                      <Icon style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
                    </div>
                    <div className="stack-xs">
                      <h2 className="text-step-2 font-bold" style={{ color: "var(--pp-navy-dark)" }}>
                        {section.title}
                      </h2>
                      <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6, maxWidth: "72ch" }}>
                        {section.intro}
                      </p>
                    </div>
                  </div>
                  <span className="text-fluid-sm font-semibold" style={{ color: "var(--pp-slate-500)", whiteSpace: "nowrap" }}>
                    {section.docs.length} item{section.docs.length === 1 ? "" : "s"}
                  </span>
                </summary>

                <div style={{ marginTop: "var(--space-m)" }}>
                  {section.docs.length === 0 ? (
                    <div
                      className="card"
                      style={{
                        padding: "var(--space-m)",
                        color: "var(--pp-slate-500)",
                        fontSize: "0.95rem",
                      }}
                    >
                      No documents currently available in this section.
                    </div>
                  ) : usesYearGrouping ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
                      {groupDocsByYear(section.docs).map((group) => {
                        const groupKey = yearKey(section.id, group.year)
                        const isGroupOpen = openYearIds.has(groupKey)
                        return (
                          <details
                            key={group.year}
                            className="card"
                            open={isGroupOpen}
                            style={{ padding: "var(--space-s) var(--space-m)" }}
                            onToggle={(event) => {
                              const nextOpen = (event.currentTarget as HTMLDetailsElement).open
                              setOpenYearIds((prev) => {
                                const next = new Set(prev)
                                if (nextOpen) next.add(groupKey)
                                else next.delete(groupKey)
                                return next
                              })
                            }}
                          >
                            <summary
                              style={{
                                cursor: "pointer",
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "var(--space-m)",
                              }}
                            >
                              <span className="text-fluid-base font-semibold" style={{ color: "var(--pp-slate-900)" }}>
                                {group.year}
                              </span>
                              <span className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
                                {group.docs.length} document{group.docs.length === 1 ? "" : "s"}
                              </span>
                            </summary>
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)", marginTop: "var(--space-s)" }}>
                              {group.docs.map((doc) => (
                                <DocRow key={doc.id} doc={doc} />
                              ))}
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
                      {section.docs.map((doc) => (
                        <DocRow key={doc.id} doc={doc} />
                      ))}
                    </div>
                  )}
                </div>

                {section.note && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "flex-start",
                      padding: "var(--space-s) var(--space-m)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--pp-slate-100)",
                      borderLeft: "3px solid var(--pp-slate-300)",
                      marginTop: "var(--space-m)",
                    }}
                  >
                    <span className="text-fluid-sm font-bold" style={{ color: "var(--pp-slate-400)", flexShrink: 0, lineHeight: 1.5 }}>
                      Note:
                    </span>
                    <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)", lineHeight: 1.6 }}>
                      {section.note}
                    </p>
                  </div>
                )}
              </details>
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
                Can&apos;t find what you need?
              </h3>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "50ch" }}>
                The HOA office can provide any document or answer questions about governing policies.
              </p>
            </div>
            <Link
              href="/resident-portal/contact-board"
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
              Contact the HOA Office
            </Link>
          </div>
        </div>
      </section>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 40,
            border: "none",
            borderRadius: "999px",
            padding: "0.55rem 0.8rem",
            background: "var(--pp-navy-dark)",
            color: "var(--pp-white)",
            fontWeight: 700,
            fontSize: "0.82rem",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
          }}
          aria-label="Back to top"
        >
          Top
        </button>
      )}
    </>
  )
}
