// app/(public)/layout.tsx

import type React from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AccessibilityWidget } from "@/components/AccessibilityWidget"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <AccessibilityWidget />
    </>
  )
}
