// app/api/wp-users/route.ts
// Proxy to WordPress REST API — list and create users.
// Credentials are read from environment variables only; never exposed to the client.

import { NextRequest, NextResponse } from "next/server"

const WP_API  = process.env.WORDPRESS_API_URL      ?? "https://www.pristineplace.us/wp-json/wp/v2"
const WP_USER = process.env.WORDPRESS_USERNAME      ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD  ?? ""

function authHeaders() {
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

/** GET /api/wp-users — list users, supports ?search=&page=&per_page= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = searchParams.get("page")     ?? "1"
  const perPage  = searchParams.get("per_page") ?? "50"
  const search   = searchParams.get("search")   ?? ""

  const url = new URL(`${WP_API}/users`)
  url.searchParams.set("page",     page)
  url.searchParams.set("per_page", perPage)
  url.searchParams.set("context",  "edit")   // required for email + registered_date
  if (search) url.searchParams.set("search", search)

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: "Failed to fetch users", detail },
      { status: res.status },
    )
  }

  const users = await res.json()
  return NextResponse.json({
    users,
    total:      Number(res.headers.get("X-WP-Total")      ?? 0),
    totalPages: Number(res.headers.get("X-WP-TotalPages") ?? 1),
  })
}

/** POST /api/wp-users — create a new WordPress user */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${WP_API}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
