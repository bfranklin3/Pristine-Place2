// components/portal/search-modal.tsx
// Portal search modal with keyboard shortcuts (/, Cmd+K)
// Full-screen on mobile, floating modal on desktop

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Calendar, Megaphone, Loader2, Command, FileText, Download, HelpCircle, Users } from "lucide-react"
import type { SearchResult } from "@/lib/sanity/search"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [isOpen])

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=18`
      )

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setResults(data.results || [])
      setSelectedIndex(0)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    if (newQuery.trim().length >= 2) {
      setIsLoading(true)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newQuery)
      }, 300) // 300ms debounce
    } else {
      setResults([])
      setIsLoading(false)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    }
  }

  // Handle result click/selection
  const handleResultClick = (result: SearchResult) => {
    onClose()
    router.push(result.href)
  }

  const handleViewAllResults = () => {
    if (!query.trim()) return
    router.push(`/resident-portal/search?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedIndex])

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      acc[result.type].push(result)
      return acc
    },
    { announcement: [], event: [], page: [], document: [], faq: [], committee: [], "acc-guideline": [] } as Record<string, SearchResult[]>
  )

  // Result icon component
  const ResultIcon = ({ type }: { type: SearchResult["type"] }) => {
    if (type === "announcement") return <Megaphone className="w-4 h-4 text-pp-navy" />
    if (type === "event") return <Calendar className="w-4 h-4 text-pp-navy" />
    if (type === "page") return <FileText className="w-4 h-4 text-pp-navy" />
    if (type === "acc-guideline") return <FileText className="w-4 h-4 text-pp-navy" />
    if (type === "document") return <Download className="w-4 h-4 text-pp-navy" />
    if (type === "faq") return <HelpCircle className="w-4 h-4 text-pp-navy" />
    if (type === "committee") return <Users className="w-4 h-4 text-pp-navy" />
    return null
  }

  // Result label component
  const ResultLabel = ({ type }: { type: SearchResult["type"] }) => {
    if (type === "announcement") return "Announcement"
    if (type === "event") return "Event"
    if (type === "page") return "Page"
    if (type === "acc-guideline") return "ACC Guideline"
    if (type === "document") return "Document"
    if (type === "faq") return "FAQ"
    if (type === "committee") return "Committee"
    return type
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-4 md:pt-20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
      >
        <div
          className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden md:max-h-[600px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 p-4 border-b border-pp-slate-200">
            <Search className="w-5 h-5 text-pp-slate-400 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search announcements, events, pages, ACC guidelines, documents, FAQs..."
              className="flex-1 text-base outline-none placeholder:text-pp-slate-400"
              aria-label="Search portal content"
              id="search-modal-title"
            />
            {isLoading && (
              <Loader2 className="w-5 h-5 text-pp-navy animate-spin shrink-0" aria-label="Loading" />
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-pp-slate-100 transition-colors shrink-0"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-pp-slate-500" />
            </button>
          </div>

          {/* Search Results */}
          <div
            ref={resultsRef}
            className="flex-1 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {/* Empty state - no query */}
            {query.trim().length < 2 && !isLoading && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-pp-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-pp-slate-500 text-sm">
                  Start typing to search announcements, events, pages, ACC guidelines, documents, FAQs, and committees
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-pp-slate-400">
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-pp-slate-100 rounded border border-pp-slate-300 font-mono">
                      /
                    </kbd>
                    <span>to open</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-pp-slate-100 rounded border border-pp-slate-300 font-mono flex items-center gap-1">
                      <Command className="w-3 h-3" />K
                    </kbd>
                    <span>shortcut</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-pp-slate-100 rounded border border-pp-slate-300 font-mono">
                      ESC
                    </kbd>
                    <span>to close</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state - no results */}
            {query.trim().length >= 2 && !isLoading && results.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-pp-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-pp-slate-600 font-medium">No results found</p>
                <p className="text-pp-slate-500 text-sm mt-1">
                  Try a different search term
                </p>
              </div>
            )}

            {/* Results grouped by type */}
            {results.length > 0 && !isLoading && (
              <div className="divide-y divide-pp-slate-100">
                {/* Announcements */}
                {groupedResults.announcement.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      Announcements ({groupedResults.announcement.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.announcement.map((result, index) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                                {result.date && (
                                  <div
                                    className={`text-xs mt-1 ${
                                      isSelected ? "text-white/60" : "text-pp-slate-400"
                                    }`}
                                  >
                                    {new Date(result.date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Events */}
                {groupedResults.event.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      Events ({groupedResults.event.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.event.map((result, index) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {result.date && (
                                    <div
                                      className={`text-xs ${
                                        isSelected ? "text-white/60" : "text-pp-slate-400"
                                      }`}
                                    >
                                      {new Date(result.date).toLocaleDateString()}
                                    </div>
                                  )}
                                  {result.category && (
                                    <div
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-pp-slate-100 text-pp-slate-600"
                                      }`}
                                    >
                                      {result.category}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Pages */}
                {groupedResults.page.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      Pages ({groupedResults.page.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.page.map((result) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                                {result.category && (
                                  <div
                                    className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-pp-slate-100 text-pp-slate-600"
                                    }`}
                                  >
                                    {result.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ACC Guidelines */}
                {groupedResults["acc-guideline"].length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      ACC Guidelines ({groupedResults["acc-guideline"].length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults["acc-guideline"].map((result) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                                {result.category && (
                                  <div
                                    className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-pp-slate-100 text-pp-slate-600"
                                    }`}
                                  >
                                    {result.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {groupedResults.document.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      Documents ({groupedResults.document.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.document.map((result) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                                {result.category && (
                                  <div
                                    className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-pp-slate-100 text-pp-slate-600"
                                    }`}
                                  >
                                    {result.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {groupedResults.faq.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      FAQs ({groupedResults.faq.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.faq.map((result) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Committees */}
                {groupedResults.committee.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-pp-slate-500 uppercase tracking-wide px-3 py-2">
                      Committees ({groupedResults.committee.length})
                    </h3>
                    <div className="space-y-1">
                      {groupedResults.committee.map((result) => {
                        const globalIndex = results.indexOf(result)
                        const isSelected = globalIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-pp-navy text-white"
                                : "hover:bg-pp-slate-50"
                            }`}
                            aria-selected={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <ResultIcon type={result.type} />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-white" : "text-pp-navy-dark"
                                  }`}
                                >
                                  {result.title}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 line-clamp-2 ${
                                    isSelected ? "text-white/80" : "text-pp-slate-600"
                                  }`}
                                >
                                  {result.excerpt}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          {(results.length > 0 || query.trim().length >= 2) && (
            <div className="border-t border-pp-slate-200 px-4 py-2 bg-pp-slate-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-pp-slate-500">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-pp-slate-300 font-mono text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-pp-slate-300 font-mono text-[10px]">
                      ↓
                    </kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-pp-slate-300 font-mono text-[10px]">
                      ENTER
                    </kbd>
                    <span>select</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-pp-slate-300 font-mono text-[10px]">
                      ESC
                    </kbd>
                    <span>close</span>
                  </div>
                </div>
                {query.trim().length >= 2 ? (
                  <button
                    type="button"
                    onClick={handleViewAllResults}
                    className="text-xs font-semibold text-pp-navy hover:text-pp-navy-dark"
                  >
                    View all results
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
