// app/(portal)/api/search/route.ts
// API endpoint for portal search functionality
// Handles search queries and returns results from Sanity CMS

import { NextRequest, NextResponse } from "next/server"
import { searchAll } from "@/lib/sanity/search"

export const runtime = "edge" // Use edge runtime for faster response times

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limitParam = searchParams.get("limit")

    // Validate query parameter
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters long" },
        { status: 400 }
      )
    }

    // Parse limit parameter (default: 10, max: 50)
    const limit = Math.min(parseInt(limitParam || "10", 10), 50)

    // Perform search
    const results = await searchAll(query.trim(), limit)

    // Return results with cache headers
    return NextResponse.json(
      { results, query: query.trim(), count: results.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
