import type { Metadata } from "next"
import { siteConfig } from "@/lib/site-config"
import { AccSubmitPageClient } from "@/components/portal/acc-submit-page-client"

export const metadata: Metadata = {
  title: `Submit ACC Request | ${siteConfig.name} Resident Portal`,
  description: "Submit an ACC architectural change request with project details and supporting documents.",
}

export default function AccSubmitPage() {
  return <AccSubmitPageClient />
}
