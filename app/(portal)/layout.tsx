// app/(portal)/layout.tsx

import type React from "react"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalFooter } from "@/components/portal/portal-footer"
import { AccessibilityWidget } from "@/components/AccessibilityWidget"
import { requireApprovedPortalAccess } from "@/lib/auth/portal-access"
import { getUserCommittees, isPortalAdmin } from "@/lib/auth/portal-admin"
import { getPortalSession } from "@/lib/auth/portal-session"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPortalAccess()
  const { user, source } = await getPortalSession()
  const admin = isPortalAdmin(user)
  const committees = getUserCommittees(user)

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <PortalHeader isAdmin={admin} committees={committees} enableClerkClient={source !== "test"} />
      <main id="main-content">{children}</main>
      <PortalFooter />
      <AccessibilityWidget />
    </>
  )
}
