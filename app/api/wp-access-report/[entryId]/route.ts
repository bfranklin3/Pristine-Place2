import { NextRequest, NextResponse } from "next/server"

const WP_API = process.env.WORDPRESS_API_URL ?? "https://www.pristineplace.us/wp-json/wp/v2"
const WP_USER = process.env.WORDPRESS_USERNAME ?? ""
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD ?? ""
const ACCESS_REPORT_URL =
  process.env.WORDPRESS_ACCESS_REPORT_URL?.trim() ||
  `${WP_API.replace(/\/wp\/v2\/?$/, "")}/pp/v1/resident-access-report`

function authHeaders() {
  if (!WP_USER || !WP_PASS) return { "Content-Type": "application/json" }
  const token = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  }
}

function resolveEntryUrl(entryId: string): URL | null {
  const base = new URL(ACCESS_REPORT_URL)
  const path = base.pathname

  // Gravity Forms list endpoint: /wp-json/gf/v2/forms/{formId}/entries
  if (/\/wp-json\/gf\/v2\/forms\/\d+\/entries\/?$/.test(path)) {
    base.pathname = path.replace(/\/forms\/\d+\/entries\/?$/, `/entries/${entryId}`)
    base.search = ""
    return base
  }

  // Gravity Forms entries endpoint root: /wp-json/gf/v2/entries
  if (/\/wp-json\/gf\/v2\/entries\/?$/.test(path)) {
    base.pathname = `${path.replace(/\/+$/, "")}/${entryId}`
    base.search = ""
    return base
  }

  return null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const { entryId } = await params
    const body = await req.json()
    const upstream = resolveEntryUrl(entryId)

    if (!upstream) {
      return NextResponse.json(
        {
          error: "Configured WordPress access URL does not support entry updates.",
          detail:
            "Set WORDPRESS_ACCESS_REPORT_URL to a Gravity Forms entries endpoint, e.g. /wp-json/gf/v2/forms/66/entries",
          configured: ACCESS_REPORT_URL,
        },
        { status: 400 },
      )
    }

    const res = await fetch(upstream.toString(), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = { raw: text }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Failed to update WordPress access entry",
          status: res.status,
          detail: parsed,
          upstream: upstream.toString(),
        },
        { status: res.status },
      )
    }

    return NextResponse.json({ ok: true, entry: parsed })
  } catch (error) {
    return NextResponse.json(
      {
        error: "WordPress access entry update proxy failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

