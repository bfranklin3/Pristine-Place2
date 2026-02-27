import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

const WP_DOC_BASE = "https://www.pristineplace.us/wp-json/wp/v2/document"
const WP_TAXONOMY_BASE = "https://www.pristineplace.us/wp-json/wp/v2/document-type"
const WP_PER_PAGE = 50

const isDryRun = process.argv.includes("--dry-run")

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
}

function decodeHtml(html) {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
}

function stripTags(input) {
  return decodeHtml(input.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
}

function htmlToPortableText(html) {
  if (!html || !html.trim()) return []

  const dom = new JSDOM(`<body>${html}</body>`)
  const { document, Node } = dom.window
  const blocks = []
  let index = 0

  function spansFromNode(node, marks = [], markDefs = [], linkKeyByHref = new Map()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\u00a0/g, " ")
      if (!text.trim()) return []
      return [{ _type: "span", _key: key(`span-${index++}`), text, marks: [...marks] }]
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return []

    const tag = node.tagName.toLowerCase()
    const nextMarks = [...marks]

    if (tag === "strong" || tag === "b") {
      if (!nextMarks.includes("strong")) nextMarks.push("strong")
    } else if (tag === "em" || tag === "i") {
      if (!nextMarks.includes("em")) nextMarks.push("em")
    } else if (tag === "a") {
      const href = node.getAttribute("href") || ""
      if (href) {
        let linkKey = linkKeyByHref.get(href)
        if (!linkKey) {
          linkKey = key(`link-${index++}`)
          linkKeyByHref.set(href, linkKey)
          markDefs.push({ _key: linkKey, _type: "link", href })
        }
        if (!nextMarks.includes(linkKey)) nextMarks.push(linkKey)
      }
    } else if (tag === "br") {
      return [{ _type: "span", _key: key(`span-${index++}`), text: "\n", marks: [...marks] }]
    }

    const spans = []
    for (const child of node.childNodes) spans.push(...spansFromNode(child, nextMarks, markDefs, linkKeyByHref))
    return spans
  }

  function addBlock(element, { style = "normal", listItem } = {}) {
    const markDefs = []
    const children = spansFromNode(element, [], markDefs)
    const text = children.map((c) => c.text).join("")
    if (!text.trim()) return

    const block = { _type: "block", _key: key(`block-${index++}`), style, markDefs, children }
    if (listItem) {
      block.listItem = listItem
      block.level = 1
    }
    blocks.push(block)
  }

  const blockElements = Array.from(document.body.querySelectorAll("p,li,blockquote,h1,h2,h3,h4,h5,h6"))
  for (const element of blockElements) {
    const tag = element.tagName.toLowerCase()
    if (tag === "p" && element.closest("li")) continue
    if (tag === "li") {
      const parentList = element.parentElement?.tagName.toLowerCase()
      addBlock(element, { listItem: parentList === "ol" ? "number" : "bullet" })
      continue
    }
    addBlock(element, { style: tag.startsWith("h") ? "h3" : "normal" })
  }

  return blocks
}

function inferFileType(url = "") {
  const lower = url.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "xlsx"
  if (lower.endsWith(".txt")) return "txt"
  return "other"
}

function extractFileUrlFromAcf(acf) {
  if (!acf || typeof acf !== "object") return null

  const candidates = []
  for (const [k, v] of Object.entries(acf)) {
    const keyLower = String(k).toLowerCase()
    if (!/(file|pdf|document|url|attachment|download)/.test(keyLower)) continue

    if (typeof v === "string" && /^https?:\/\//.test(v)) candidates.push(v)
    if (v && typeof v === "object") {
      if (typeof v.url === "string" && /^https?:\/\//.test(v.url)) candidates.push(v.url)
      if (typeof v.link === "string" && /^https?:\/\//.test(v.link)) candidates.push(v.link)
      if (typeof v.source_url === "string" && /^https?:\/\//.test(v.source_url)) candidates.push(v.source_url)
    }
  }

  return candidates.find((u) => /\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(u)) || candidates[0] || null
}

function mapCategoryFromClassList(classList = [], taxonomyNames = []) {
  const combined = `${classList.join(" ")} ${taxonomyNames.join(" ")}`.toLowerCase()

  if (combined.includes("income-statement")) return "income-statements"
  if (combined.includes("balance-sheet")) return "balance-sheets"
  if (combined.includes("budget")) return "budgets"
  if (combined.includes("meeting-agenda") || combined.includes("agenda")) return "agendas"
  if (combined.includes("meeting_minutes") || combined.includes("meeting-minutes") || combined.includes("minutes")) return "minutes"
  if (combined.includes("bylaws") || combined.includes("articles") || combined.includes("covenant")) return "governing-docs"
  if (combined.includes("resolution")) return "policies"
  if (combined.includes("adopted-rules") || combined.includes("regulation") || combined.includes("rules")) return "rules"
  if (combined.includes("acc") || combined.includes("reference-guide")) return "acc-forms"
  if (combined.includes("old-archived") || combined.includes("archived")) return "other"
  if (combined.includes("miscellaneous")) return "community-info"
  return "other"
}

function extractLegacyCategoryPath(classList = [], taxonomyNames = []) {
  const combined = `${classList.join(" ")} ${taxonomyNames.join(" ")}`.toLowerCase()

  if (combined.includes("financial-income-statement") || combined.includes("income-statement")) {
    return { parent: "Financial", child: "Income Statement" }
  }
  if (combined.includes("financial-balance-sheet") || combined.includes("balance-sheet")) {
    return { parent: "Financial", child: "Balance Sheet" }
  }
  if (combined.includes("financial-budget") || combined.includes("budgets") || combined.includes("budget")) {
    return { parent: "Financial", child: "Budgets" }
  }
  if (combined.includes("meeting-agenda") || combined.includes("agenda")) {
    return { parent: "Meetings", child: "Agenda" }
  }
  if (combined.includes("meeting_minutes") || combined.includes("meeting-minutes") || combined.includes("minutes")) {
    return { parent: "Meetings", child: "Minutes" }
  }
  if (combined.includes("bylaws") || combined.includes("articles")) {
    return { parent: "HOA", child: "Bylaws & Articles" }
  }
  if (combined.includes("covenant")) {
    return { parent: "HOA", child: "Covenants" }
  }
  if (combined.includes("resolution")) {
    return { parent: "HOA", child: "Resolutions" }
  }
  if (combined.includes("regulation")) {
    return { parent: "HOA", child: "Regulations" }
  }
  if (combined.includes("adopted-rules") || combined.includes("rules")) {
    return { parent: "HOA", child: "Adopted Rules" }
  }
  if (combined.includes("acc-reference-guide") || combined.includes("reference-guide")) {
    return { parent: "ACC", child: "Reference Guides" }
  }
  if (combined.includes("acc")) {
    return { parent: "ACC", child: undefined }
  }
  if (combined.includes("old-archived") || combined.includes("archived")) {
    return { parent: "Old-Archived", child: undefined }
  }
  if (combined.includes("miscellaneous")) {
    return { parent: "Miscellaneous", child: undefined }
  }

  return { parent: undefined, child: undefined }
}

function buildDescription(title, plainText, taxonomyNames = []) {
  if (plainText) return plainText.slice(0, 300)

  const tax = taxonomyNames.length ? taxonomyNames.join(" / ") : "HOA document"
  return `${title} (${tax}).`
}

async function fetchAllWpDocs() {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${WP_DOC_BASE}?per_page=${WP_PER_PAGE}&page=${page}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`WP document fetch failed on page ${page}: ${response.status} ${response.statusText}`)

    const items = await response.json()
    all.push(...items)

    const totalPagesHeader = response.headers.get("x-wp-totalpages")
    totalPages = totalPagesHeader ? Number.parseInt(totalPagesHeader, 10) : 1
    page += 1
  }

  return all
}

async function fetchTaxonomyMap() {
  const map = new Map()
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${WP_TAXONOMY_BASE}?per_page=${WP_PER_PAGE}&page=${page}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`WP document-type fetch failed on page ${page}: ${response.status} ${response.statusText}`)
    const items = await response.json()
    for (const item of items) map.set(item.id, item)

    const totalPagesHeader = response.headers.get("x-wp-totalpages")
    totalPages = totalPagesHeader ? Number.parseInt(totalPagesHeader, 10) : 1
    page += 1
  }

  return map
}

async function fetchAttachmentFileUrl(wpItem) {
  const mediaHref = wpItem?._links?.["wp:attachment"]?.[0]?.href
  if (!mediaHref) return null

  try {
    const response = await fetch(mediaHref)
    if (!response.ok) return null
    const mediaItems = await response.json()
    if (!Array.isArray(mediaItems) || !mediaItems.length) return null

    const urls = mediaItems
      .map((m) => m?.source_url)
      .filter((u) => typeof u === "string" && /^https?:\/\//.test(u))

    return (
      urls.find((u) => /\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(u)) ||
      urls[0] ||
      null
    )
  } catch {
    return null
  }
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

  const [wpDocs, taxonomyMap] = await Promise.all([fetchAllWpDocs(), fetchTaxonomyMap()])
  if (!wpDocs.length) {
    console.log("No WP documents returned.")
    return
  }

  const stats = {
    total: wpDocs.length,
    upserted: 0,
    skippedMissingAssetAndContent: 0,
    categoryFallbackOther: 0,
  }

  const skipped = []

  for (const wp of wpDocs) {
    const termIds = Array.isArray(wp["document-type"]) ? wp["document-type"] : []
    const taxonomyNames = termIds
      .map((id) => taxonomyMap.get(id))
      .filter(Boolean)
      .map((t) => t.slug || t.name || String(t.id))

    const classList = Array.isArray(wp.class_list) ? wp.class_list : []
    const category = mapCategoryFromClassList(classList, taxonomyNames)
    const legacyPath = extractLegacyCategoryPath(classList, taxonomyNames)
    if (category === "other") stats.categoryFallbackOther += 1

    const title = decodeHtml(wp.title?.rendered || `WP Document ${wp.id}`)
    const html = wp.content?.rendered || ""
    const plainText = stripTags(html)
    const content = htmlToPortableText(html)

    const externalFileUrl =
      (typeof wp.document_file_url === "string" && wp.document_file_url.trim() ? wp.document_file_url.trim() : null) ||
      extractFileUrlFromAcf(wp.acf) ||
      (await fetchAttachmentFileUrl(wp))

    const lede = typeof wp.document_lede === "string" ? wp.document_lede.trim() : ""

    if (!externalFileUrl && content.length === 0) {
      stats.skippedMissingAssetAndContent += 1
      skipped.push({ id: wp.id, slug: wp.slug, title, reason: "no file url and no content" })
      continue
    }

    const doc = {
      _id: `wp-document-${wp.id}`,
      _type: "hoaDocument",
      title,
      slug: {
        _type: "slug",
        current: wp.slug || `document-${wp.id}`,
      },
      description: (lede || buildDescription(title, plainText, taxonomyNames)).slice(0, 300),
      content,
      externalFileUrl,
      fileType: externalFileUrl ? inferFileType(externalFileUrl) : "other",
      category,
      categoryParent: legacyPath.parent,
      categoryChild: legacyPath.child,
      tags: Array.from(new Set([...taxonomyNames, ...classList])).slice(0, 40),
      published: wp.status === "publish",
      visibility: "portal",
      showInSearch: true,
      featured: false,
      requiresLogin: true,
      source: "wordpress",
      legacyWpId: wp.id,
      legacyWpSlug: wp.slug || undefined,
      legacyWpUrl: wp.link || undefined,
      legacyWpModified: wp.modified_gmt ? new Date(wp.modified_gmt).toISOString() : undefined,
      effectiveDate: wp.modified_gmt ? new Date(wp.modified_gmt).toISOString().slice(0, 10) : undefined,
    }

    if (!isDryRun) {
      await sanity.createOrReplace(doc)
      console.log(`Upserted ${doc._id} | ${doc.title} | ${doc.category}`)
    } else {
      console.log(`Dry-run ${doc._id} | ${doc.title} | ${doc.category}`)
    }

    stats.upserted += 1
  }

  console.log("Import summary:", stats)
  if (skipped.length) {
    console.log("Skipped docs (first 25):")
    skipped.slice(0, 25).forEach((d) => {
      console.log(`- ${d.id} | ${d.slug} | ${d.title} | ${d.reason}`)
    })
  }
}

main().catch((error) => {
  console.error("WP document import failed:", error)
  process.exit(1)
})
