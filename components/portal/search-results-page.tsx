import Link from "next/link"
import { Search, FileText, Calendar, Megaphone, HelpCircle, Users, Download } from "lucide-react"
import type { SearchPage, SearchResult, SearchScope } from "@/lib/sanity/search"

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "All results" },
  { value: "document", label: "Documents" },
  { value: "board-records", label: "Board Meeting Records" },
  { value: "meeting-minutes", label: "Meeting Minutes" },
  { value: "meeting-agendas", label: "Meeting Agendas" },
  { value: "page", label: "Pages" },
  { value: "acc-guideline", label: "ACC Guidelines" },
  { value: "event", label: "Events" },
  { value: "announcement", label: "Announcements" },
  { value: "faq", label: "FAQs" },
  { value: "committee", label: "Committees" },
]

function scopeLabel(scope: SearchScope) {
  return scopeOptions.find((option) => option.value === scope)?.label || "All results"
}

function buildSearchHref(query: string, scope: SearchScope, page = 1) {
  const params = new URLSearchParams()
  if (query.trim()) params.set("q", query.trim())
  if (scope !== "all") params.set("scope", scope)
  if (page > 1) params.set("page", String(page))
  const suffix = params.toString()
  return suffix ? `/resident-portal/search?${suffix}` : "/resident-portal/search"
}

function formatResultType(result: SearchResult) {
  if (result.type === "document" && result.parentCategory === "meetings" && result.category === "minutes") {
    return "Meeting Minutes"
  }
  if (result.type === "document" && result.parentCategory === "meetings" && result.category === "agendas") {
    return "Meeting Agenda"
  }
  if (result.type === "announcement") return "Announcement"
  if (result.type === "event") return "Event"
  if (result.type === "page") return "Page"
  if (result.type === "acc-guideline") return "ACC Guideline"
  if (result.type === "document") return "Document"
  if (result.type === "faq") return "FAQ"
  if (result.type === "committee") return "Committee"
  return result.type
}

function ResultIcon({ type }: { type: SearchResult["type"] }) {
  if (type === "announcement") return <Megaphone style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  if (type === "event") return <Calendar style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  if (type === "page") return <FileText style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  if (type === "acc-guideline") return <FileText style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  if (type === "document") return <Download style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  if (type === "faq") return <HelpCircle style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
  return <Users style={{ width: "1rem", height: "1rem", color: "var(--pp-navy)" }} />
}

function formatDate(date?: string) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SearchResultsPage({
  query,
  scope,
  search,
}: {
  query: string
  scope: SearchScope
  search: SearchPage
}) {
  const currentPage = search.page
  const hasQuery = query.trim().length >= 2

  return (
    <>
      <section className="hero-section" style={{ background: "var(--pp-navy-dark)" }}>
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #203835 0%, #2f5f59 60%, #1d4341 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Search style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Search Results</h1>
          <p className="hero-subtitle" style={{ maxWidth: "60ch" }}>
            Search across announcements, events, pages, documents, FAQs, and committees with more room for deeper results.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>
            <form method="get" action="/resident-portal/search" className="card" style={{ padding: "var(--space-m)" }}>
              <div
                style={{
                  display: "grid",
                  gap: "0.9rem",
                  gridTemplateColumns: "minmax(0, 1fr)",
                }}
              >
                <label className="stack" style={{ gap: "0.4rem" }}>
                  <span className="font-semibold" style={{ color: "var(--pp-navy-dark)" }}>Search</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search Board Meeting Records, pages, FAQs, and more"
                    className="input"
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gap: "0.9rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    alignItems: "end",
                  }}
                >
                  <label className="stack" style={{ gap: "0.4rem" }}>
                    <span className="font-semibold" style={{ color: "var(--pp-navy-dark)" }}>Filter</span>
                    <select name="scope" defaultValue={scope} className="input">
                      {scopeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button type="submit" className="btn btn-primary">Search</button>
                    <Link href="/resident-portal/search" className="btn btn-secondary">
                      Clear
                    </Link>
                  </div>
                </div>
              </div>
            </form>

            <div className="card" style={{ padding: "var(--space-m)" }}>
              {!hasQuery ? (
                <div className="stack" style={{ gap: "0.5rem" }}>
                  <h2 style={{ color: "var(--pp-navy-dark)" }}>Start a search</h2>
                  <p style={{ color: "var(--pp-slate-600)", margin: 0 }}>
                    Enter a phrase above and press Enter. For Board Meeting Records, the most useful filters are
                    {" "}
                    <strong>Board Meeting Records</strong>, <strong>Meeting Minutes</strong>, and <strong>Meeting Agendas</strong>.
                  </p>
                </div>
              ) : (
                <div className="stack" style={{ gap: "var(--space-m)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                    }}
                  >
                    <div className="stack" style={{ gap: "0.25rem" }}>
                      <h2 style={{ color: "var(--pp-navy-dark)", margin: 0 }}>
                        {search.total === 0 ? "No results found" : `${search.total} result${search.total === 1 ? "" : "s"}`}
                      </h2>
                      <p style={{ color: "var(--pp-slate-600)", margin: 0 }}>
                        Query: <strong>{query}</strong>
                        {" · "}
                        Scope: <strong>{scopeLabel(scope)}</strong>
                      </p>
                    </div>
                    {search.totalPages > 1 ? (
                      <div style={{ color: "var(--pp-slate-500)" }}>
                        Page {currentPage} of {search.totalPages}
                      </div>
                    ) : null}
                  </div>

                  {search.total === 0 ? (
                    <p style={{ color: "var(--pp-slate-600)", margin: 0 }}>
                      Try another phrase or broaden the filter to <strong>All results</strong> or <strong>Documents</strong>.
                    </p>
                  ) : (
                    <div className="stack" style={{ gap: "0.9rem" }}>
                      {search.results.map((result) => (
                        <article
                          key={`${result.type}-${result.id}`}
                          className="card"
                          style={{
                            padding: "var(--space-m)",
                            borderColor: "var(--pp-slate-200)",
                          }}
                        >
                          <div className="stack" style={{ gap: "0.6rem" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "1rem",
                                flexWrap: "wrap",
                                alignItems: "flex-start",
                              }}
                            >
                              <div className="stack" style={{ gap: "0.4rem", minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <ResultIcon type={result.type} />
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "0.2rem 0.55rem",
                                      borderRadius: "999px",
                                      fontSize: "0.82rem",
                                      background: "var(--pp-slate-100)",
                                      color: "var(--pp-slate-700)",
                                    }}
                                  >
                                    {formatResultType(result)}
                                  </span>
                                  {result.date ? (
                                    <span style={{ color: "var(--pp-slate-500)", fontSize: "0.9rem" }}>
                                      {formatDate(result.date)}
                                    </span>
                                  ) : null}
                                </div>
                                <h3 style={{ margin: 0 }}>
                                  <Link href={result.href} style={{ color: "var(--pp-navy-dark)", textDecoration: "none" }}>
                                    {result.title}
                                  </Link>
                                </h3>
                              </div>

                              <Link href={result.href} className="btn btn-secondary" style={{ whiteSpace: "nowrap" }}>
                                Open
                              </Link>
                            </div>

                            <p style={{ margin: 0, color: "var(--pp-slate-700)", lineHeight: 1.6 }}>
                              {result.excerpt}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {search.totalPages > 1 ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ color: "var(--pp-slate-500)" }}>
                        Showing {(currentPage - 1) * search.pageSize + 1}
                        {"–"}
                        {Math.min(currentPage * search.pageSize, search.total)}
                        {" "}of {search.total}
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        {currentPage > 1 ? (
                          <Link href={buildSearchHref(query, scope, currentPage - 1)} className="btn btn-secondary">
                            Previous
                          </Link>
                        ) : (
                          <span className="btn btn-secondary" aria-disabled="true" style={{ opacity: 0.55, pointerEvents: "none" }}>
                            Previous
                          </span>
                        )}
                        {currentPage < search.totalPages ? (
                          <Link href={buildSearchHref(query, scope, currentPage + 1)} className="btn btn-primary">
                            Next
                          </Link>
                        ) : (
                          <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.55, pointerEvents: "none" }}>
                            Next
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
