import type { Metadata } from "next"
import { SearchResultsPage } from "@/components/portal/search-results-page"
import { searchPageResults, type SearchScope } from "@/lib/sanity/search"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Search | ${siteConfig.name} Resident Portal`,
  description: "Search across documents, pages, announcements, events, FAQs, and committees in the resident portal.",
}

function parseScope(value?: string): SearchScope {
  const allowed: SearchScope[] = [
    "all",
    "announcement",
    "event",
    "page",
    "acc-guideline",
    "document",
    "faq",
    "committee",
    "board-records",
    "meeting-minutes",
    "meeting-agendas",
  ]

  return allowed.includes(value as SearchScope) ? (value as SearchScope) : "all"
}

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value || "1", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export default async function ResidentPortalSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = typeof params.q === "string" ? params.q : ""
  const scope = parseScope(typeof params.scope === "string" ? params.scope : undefined)
  const page = parsePage(typeof params.page === "string" ? params.page : undefined)
  const search = await searchPageResults(query, { page, pageSize: 20, scope })

  return <SearchResultsPage query={query} scope={scope} search={search} />
}
