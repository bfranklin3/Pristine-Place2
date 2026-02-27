import dotenv from "dotenv"
import { createClient } from "@sanity/client"

dotenv.config({ path: ".env.local" })

const isApply = process.argv.includes("--apply")
const limitArgIndex = process.argv.indexOf("--limit")
const limit =
  limitArgIndex >= 0 && process.argv[limitArgIndex + 1] ? Number.parseInt(process.argv[limitArgIndex + 1], 10) : null

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function inferCategoryFromLegacy(parentRaw, childRaw) {
  const parent = normalize(parentRaw)
  const child = normalize(childRaw)

  if (parent === "financial") {
    if (child.includes("income")) return "income-statements"
    if (child.includes("balance")) return "balance-sheets"
    if (child.includes("budget")) return "budgets"
    return "budgets"
  }

  if (parent === "meetings") {
    if (child.includes("agenda")) return "agendas"
    if (child.includes("minute")) return "minutes"
    return "minutes"
  }

  if (parent === "hoa") {
    if (child.includes("covenant") || child.includes("bylaws") || child.includes("articles")) return "governing-docs"
    if (child.includes("resolution") || child.includes("regulation")) return "policies"
    if (child.includes("adopted rules") || child.includes("rules")) return "rules"
    return "governing-docs"
  }

  if (parent === "acc") return "acc-forms"
  if (parent === "miscellaneous") return "community-info"
  if (parent === "old-archived") return "other"
  return "other"
}

function addTag(tags, value) {
  if (!value) return tags
  if (!tags.includes(value)) tags.push(value)
  return tags
}

function buildDefaultTags(category) {
  const tags = []
  switch (category) {
    case "minutes":
      addTag(tags, "meetings")
      addTag(tags, "meeting_minutes")
      addTag(tags, "board")
      break
    case "agendas":
      addTag(tags, "meetings")
      addTag(tags, "meeting_agenda")
      addTag(tags, "board")
      break
    case "income-statements":
      addTag(tags, "financial")
      addTag(tags, "income_statement")
      addTag(tags, "hoa_finance")
      break
    case "balance-sheets":
      addTag(tags, "financial")
      addTag(tags, "balance_sheet")
      addTag(tags, "hoa_finance")
      break
    case "budgets":
      addTag(tags, "financial")
      addTag(tags, "budget")
      addTag(tags, "hoa_finance")
      break
    case "governing-docs":
      addTag(tags, "governing")
      addTag(tags, "hoa")
      addTag(tags, "covenants")
      break
    case "rules":
      addTag(tags, "rules")
      addTag(tags, "regulations")
      addTag(tags, "hoa_policy")
      break
    case "policies":
      addTag(tags, "policy")
      addTag(tags, "procedures")
      addTag(tags, "hoa_policy")
      break
    case "newsletters":
      addTag(tags, "newsletters")
      addTag(tags, "community_updates")
      break
    case "acc-forms":
      addTag(tags, "acc")
      addTag(tags, "forms")
      addTag(tags, "architectural_control")
      break
    case "other":
      addTag(tags, "historical")
      addTag(tags, "archive")
      addTag(tags, "legacy")
      break
    default:
      break
  }
  return tags
}

function isLegacyTag(tag) {
  return /^(post-\d+|type-document|status-publish|hentry)$/i.test(tag)
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !dataset || !token) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN")
  }

  const sanity = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: false,
    token,
  })

  const docs = await sanity.fetch(
    `*[_type == "hoaDocument"] | order(_updatedAt desc) {
      _id,
      title,
      category,
      categoryParent,
      categoryChild,
      tags
    }`
  )

  const targetDocs = Array.isArray(docs) ? docs.slice(0, limit || docs.length) : []
  const patches = []

  for (const doc of targetDocs) {
    const currentCategory = normalize(doc.category)
    const inferredCategory = inferCategoryFromLegacy(doc.categoryParent, doc.categoryChild)
    const shouldSetCategory =
      !currentCategory ||
      currentCategory === "other" ||
      (currentCategory === "community-info" && inferredCategory !== "community-info")

    const currentTags = Array.isArray(doc.tags) ? doc.tags.filter((t) => typeof t === "string") : []
    const cleanedTags = currentTags.filter((tag) => !isLegacyTag(tag))
    const defaultTags = buildDefaultTags(shouldSetCategory ? inferredCategory : currentCategory)
    const mergedTags = Array.from(new Set([...cleanedTags, ...defaultTags]))

    const needsCategoryPatch = shouldSetCategory && inferredCategory && inferredCategory !== currentCategory
    const needsTagPatch = mergedTags.join("|") !== currentTags.join("|")

    if (needsCategoryPatch || needsTagPatch) {
      patches.push({
        id: doc._id,
        title: doc.title,
        fromCategory: doc.category || null,
        toCategory: needsCategoryPatch ? inferredCategory : doc.category || null,
        tagsBefore: currentTags,
        tagsAfter: mergedTags,
      })

      if (isApply) {
        const patch = sanity.patch(doc._id)
        if (needsCategoryPatch) patch.set({ category: inferredCategory })
        if (needsTagPatch) patch.set({ tags: mergedTags })
        await patch.commit()
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: isApply ? "apply" : "dry-run",
        scanned: targetDocs.length,
        candidates: patches.length,
        sample: patches.slice(0, 20),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error("Backfill failed:", error)
  process.exit(1)
})

