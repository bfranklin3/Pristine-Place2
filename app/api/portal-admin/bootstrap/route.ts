import { NextResponse } from "next/server"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"

interface BootstrapPayload {
  username?: string
  email?: string
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const expectedKey = process.env.PORTAL_BOOTSTRAP_KEY
    if (!expectedKey) {
      return NextResponse.json(
        { success: false, error: "Missing PORTAL_BOOTSTRAP_KEY configuration." },
        { status: 500 },
      )
    }

    const headerKey = req.headers.get("x-portal-bootstrap-key") || ""
    if (headerKey !== expectedKey) {
      return NextResponse.json({ success: false, error: "Invalid bootstrap key." }, { status: 403 })
    }

    const payload = (await req.json().catch(() => ({}))) as BootstrapPayload
    const requestedUsername = normalize(payload.username)
    const requestedEmail = normalize(payload.email)

    const requester = await currentUser()
    const requesterUsername = normalize(requester?.username)
    const requesterEmail =
      normalize(
        requester?.emailAddresses.find((email) => email.id === requester.primaryEmailAddressId)?.emailAddress,
      ) || ""

    const targetUsername = requestedUsername || requesterUsername
    const targetEmail = requestedEmail || requesterEmail

    if (!targetUsername && !targetEmail) {
      return NextResponse.json(
        { success: false, error: "Provide username or email, or call as a user with username/email." },
        { status: 400 },
      )
    }

    const client = await clerkClient()
    const queryParams: { limit: number; username?: string[]; emailAddress?: string[] } = { limit: 10 }
    if (targetUsername) queryParams.username = [targetUsername]
    if (targetEmail) queryParams.emailAddress = [targetEmail]

    const result = await client.users.getUserList(queryParams)
    const targetUser = result.data[0]

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "No matching user found in Clerk." }, { status: 404 })
    }

    const publicMetadata = (targetUser.publicMetadata || {}) as Record<string, unknown>

    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: {
        ...publicMetadata,
        portalAdmin: true,
        portalApproved: true,
      },
    })

    return NextResponse.json({
      success: true,
      userId: targetUser.id,
      username: targetUser.username || null,
      email:
        targetUser.emailAddresses.find((email) => email.id === targetUser.primaryEmailAddressId)?.emailAddress ||
        null,
      message: "User promoted to portalAdmin and marked portalApproved.",
    })
  } catch (error) {
    console.error("Portal admin bootstrap error:", error)
    return NextResponse.json(
      { success: false, error: "Bootstrap failed. Please try again." },
      { status: 500 },
    )
  }
}
