import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import {
  PORTAL_TEST_SESSION_COOKIE,
  PORTAL_TEST_SESSION_TOKEN_COOKIE,
  isPortalTestSessionEnabled,
} from "@/lib/auth/test-session"

export type PortalSession = {
  userId: string | null
  user: Awaited<ReturnType<typeof currentUser>>
  source: "clerk" | "test"
}

export async function getPortalSession(): Promise<PortalSession> {
  if (isPortalTestSessionEnabled()) {
    const cookieStore = await cookies()
    const testUserId = cookieStore.get(PORTAL_TEST_SESSION_COOKIE)?.value?.trim()
    const testToken = cookieStore.get(PORTAL_TEST_SESSION_TOKEN_COOKIE)?.value?.trim()

    if (testUserId && testToken === process.env.PORTAL_TEST_SESSION_SECRET) {
      try {
        const client = await clerkClient()
        const user = await client.users.getUser(testUserId)
        return { userId: testUserId, user, source: "test" }
      } catch (error) {
        console.warn("Ignoring invalid portal test session cookie:", error)
      }
    }
  }

  const { userId } = await auth()
  const user = userId ? await currentUser() : null
  return { userId, user, source: "clerk" }
}
