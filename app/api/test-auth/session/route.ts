import { clerkClient } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import {
  PORTAL_TEST_SESSION_COOKIE,
  PORTAL_TEST_SESSION_SECRET_HEADER,
  PORTAL_TEST_SESSION_TOKEN_COOKIE,
  isPortalTestSessionEnabled,
} from "@/lib/auth/test-session"

function getConfiguredSecret() {
  return process.env.PORTAL_TEST_SESSION_SECRET || ""
}

function isAuthorized(req: NextRequest) {
  const expected = getConfiguredSecret()
  if (!expected) return false
  return req.headers.get(PORTAL_TEST_SESSION_SECRET_HEADER)?.trim() === expected
}

export async function POST(req: NextRequest) {
  if (!isPortalTestSessionEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string }
  const userId = (body.userId || "").trim()

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 })
  }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const response = NextResponse.json({ ok: true, userId: user.id })
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    }

    response.cookies.set(PORTAL_TEST_SESSION_COOKIE, user.id, cookieOptions)
    response.cookies.set(PORTAL_TEST_SESSION_TOKEN_COOKIE, getConfiguredSecret(), cookieOptions)
    return response
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: "Failed to create portal test session.", detail }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isPortalTestSessionEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true })
  const expiredCookie = { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/", maxAge: 0 }
  response.cookies.set(PORTAL_TEST_SESSION_COOKIE, "", expiredCookie)
  response.cookies.set(PORTAL_TEST_SESSION_TOKEN_COOKIE, "", expiredCookie)
  return response
}
