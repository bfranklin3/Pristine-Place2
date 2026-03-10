import type { NextRequest } from "next/server"

export const PORTAL_TEST_SESSION_COOKIE = "pp_portal_test_user"
export const PORTAL_TEST_SESSION_TOKEN_COOKIE = "pp_portal_test_token"
export const PORTAL_TEST_SESSION_SECRET_HEADER = "x-portal-test-secret"

export function isPortalTestSessionEnabled() {
  return process.env.NODE_ENV !== "production" && Boolean(process.env.PORTAL_TEST_SESSION_SECRET)
}

export function hasPortalTestSessionCookie(req: Pick<NextRequest, "cookies">) {
  if (!isPortalTestSessionEnabled()) return false
  const userId = req.cookies.get(PORTAL_TEST_SESSION_COOKIE)?.value?.trim()
  const token = req.cookies.get(PORTAL_TEST_SESSION_TOKEN_COOKIE)?.value?.trim()
  return Boolean(userId) && token === process.env.PORTAL_TEST_SESSION_SECRET
}
