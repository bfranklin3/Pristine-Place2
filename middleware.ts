import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isResidentPortalRoute = createRouteMatcher(["/resident-portal(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isResidentPortalRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|ico|webp|avif|ttf|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
}
