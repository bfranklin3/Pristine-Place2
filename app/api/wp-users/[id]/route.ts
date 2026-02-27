// app/api/wp-users/[id]/route.ts
// Proxy to WordPress REST API — update and delete a single user.

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

/** PUT /api/wp-users/[id] — update an existing user */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body   = await req.json()

  const res = await fetch(`${WP_API}/users/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/**
 * DELETE /api/wp-users/[id]?reassign=1
 * WordPress requires force=true and a reassign user ID to delete any user.
 * Posts authored by the deleted user are reassigned to the specified ID (defaults to 1).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id }     = await params
  const { searchParams } = new URL(req.url)
  const reassign   = searchParams.get("reassign") ?? "1"

  const wpUrl = new URL(`${WP_API}/users/${id}`)
  wpUrl.searchParams.set("force",    "true")
  wpUrl.searchParams.set("reassign", reassign)

  const res = await fetch(wpUrl.toString(), {
    method: "DELETE",
    headers: authHeaders(),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
