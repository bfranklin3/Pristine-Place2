import dotenv from "dotenv"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const ABOUT_CATEGORY_BY_WP_ID = {
  25828: "understanding-community",
  25805: "understanding-community",
  25801: "understanding-community",

  25824: "community-standards",
  25826: "community-standards",
  25817: "community-standards",
  25821: "community-standards",
  25820: "community-standards",
  25823: "community-standards",
  25819: "community-standards",
  25822: "community-standards",
  26530: "community-standards",
  25804: "community-standards",
  30194: "community-standards",

  25800: "property-changes-acc",
  26765: "property-changes-acc",

  26221: "enforcement-appeals",
  35665: "enforcement-appeals",
  26294: "enforcement-appeals",

  25803: "governance-participation-services",
  26262: "governance-participation-services",
  25829: "governance-participation-services",
}

function mapFromFaqCategory(category) {
  if (category === "acc") return "property-changes-acc"
  if (category === "rules" || category === "parking" || category === "pets" || category === "rentals" || category === "clubhouse") {
    return "community-standards"
  }
  if (category === "meetings") return "governance-participation-services"
  if (category === "fees" || category === "general") return "understanding-community"
  return "governance-participation-services"
}

function resolveWpId(faq) {
  const legacy = Number(faq.legacyWpId)
  if (Number.isFinite(legacy) && legacy > 0) return legacy

  const match = String(faq._id || "").match(/^wp-portal-faq-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !dataset || !token) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN")
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    token,
  })

  const faqs = await client.fetch(`*[_type == "faq"]{_id, legacyWpId, category, question}`)
  if (!faqs.length) {
    console.log("No FAQ documents found.")
    return
  }

  let updated = 0

  for (const faq of faqs) {
    const wpId = resolveWpId(faq)
    const aboutCategory = ABOUT_CATEGORY_BY_WP_ID[wpId] || mapFromFaqCategory(faq.category)
    await client.patch(faq._id).set({ aboutCategory }).commit()
    updated += 1
    console.log(`Updated ${faq._id} -> ${aboutCategory}`)
  }

  console.log(`Done. Updated ${updated} FAQ documents.`)
}

main().catch((error) => {
  console.error("Setting FAQ about categories failed:", error)
  process.exit(1)
})
