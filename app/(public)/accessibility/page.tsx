// app/accessibility/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Accessibility",
  description: `Our commitment to digital accessibility at ${siteConfig.name}.`,
  alternates: { canonical: `${siteConfig.url}/accessibility` },
}

const content = {
  heading: "Accessibility Commitment",
  body: [
    `${siteConfig.name} is committed to ensuring digital accessibility for all visitors, including people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards.`,
    "This website strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at the AA level. These guidelines explain how to make web content more accessible to people with a wide range of disabilities.",
    "Accessibility features on this site include: keyboard navigation support, skip-to-content links, semantic HTML headings, descriptive link text, sufficient color contrast, and a text-size adjustment widget.",
    "If you encounter any accessibility barriers on this site, please contact us so we can address the issue promptly.",
  ],
}

export default function AccessibilityPage() {
  return (
    <section className="section">
      <div className="wrapper stack-lg">
        <h1>{content.heading}</h1>
        <div className="flow-lg">
          {content.body.map((paragraph, i) => (
            <p key={i} className="text-fluid-lg text-pp-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
        <Link href="/contact" className="btn btn-primary">
          Report an Accessibility Issue
        </Link>
      </div>
    </section>
  )
}
