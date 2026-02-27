import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

const WP_BASE_URL = "https://www.pristineplace.us/wp-json/wp/v2/acc-guideline"

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
  const dom = new JSDOM(`<body>${html}</body>`)
  const { document, Node } = dom.window
  const blocks = []
  let index = 0

  function spansFromNode(node, marks = [], markDefs = [], linkKeyByHref = new Map()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\u00a0/g, " ")
      if (!text.trim()) return []
      return [
        {
          _type: "span",
          _key: key(`span-${index++}`),
          text,
          marks: [...marks],
        },
      ]
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return []

    const tag = node.tagName.toLowerCase()
    const nextMarks = [...marks]

    if (tag === "strong" || tag === "b") {
      if (!nextMarks.includes("strong")) nextMarks.push("strong")
    } else if (tag === "em" || tag === "i") {
      if (!nextMarks.includes("em")) nextMarks.push("em")
    } else if (tag === "u") {
      if (!nextMarks.includes("underline")) nextMarks.push("underline")
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
      return [
        {
          _type: "span",
          _key: key(`span-${index++}`),
          text: "\n",
          marks: [...marks],
        },
      ]
    }

    const spans = []
    for (const child of node.childNodes) {
      spans.push(...spansFromNode(child, nextMarks, markDefs, linkKeyByHref))
    }
    return spans
  }

  function addBlock(element, { style = "normal", listItem } = {}) {
    const markDefs = []
    const spans = spansFromNode(element, [], markDefs)
    const text = spans.map((s) => s.text).join("")
    if (!text.trim()) return

    const block = {
      _type: "block",
      _key: key(`block-${index++}`),
      style,
      markDefs,
      children: spans,
    }

    if (listItem) {
      block.listItem = listItem
      block.level = 1
    }

    blocks.push(block)
  }

  const blockElements = Array.from(
    document.body.querySelectorAll("p,li,blockquote,h1,h2,h3,h4,h5,h6"),
  )

  for (const element of blockElements) {
    const tag = element.tagName.toLowerCase()

    // Avoid duplicating paragraph text already captured in list items.
    if (tag === "p" && element.closest("li")) continue

    if (tag === "li") {
      const parentList = element.parentElement?.tagName.toLowerCase()
      const listItem = parentList === "ol" ? "number" : "bullet"
      addBlock(element, { listItem })
      continue
    }

    if (tag === "blockquote") {
      addBlock(element, { style: "blockquote" })
      continue
    }

    if (tag === "h1" || tag === "h2") {
      addBlock(element, { style: "h2" })
      continue
    }

    if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      addBlock(element, { style: "h3" })
      continue
    }

    addBlock(element)
  }

  return blocks
}

function mapCategory(item) {
  const classList = Array.isArray(item.class_list) ? item.class_list : []
  const joined = classList.join(" ").toLowerCase()
  if (joined.includes("acc-guideline-category-landscaping")) return "landscaping"
  if (joined.includes("acc-guideline-category-construction")) return "construction"
  if (joined.includes("acc-guideline-category-florida-friendly")) return "florida-friendly"
  if (joined.includes("acc-guideline-category-house")) return "house"
  if (joined.includes("acc-guideline-category-general")) return "general"
  return "general"
}

async function fetchAllWpGuidelines() {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${WP_BASE_URL}?per_page=100&page=${page}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`WordPress fetch failed on page ${page}: ${response.status} ${response.statusText}`)
    }

    const pageItems = await response.json()
    all.push(...pageItems)

    const totalPagesHeader = response.headers.get("x-wp-totalpages")
    totalPages = totalPagesHeader ? Number.parseInt(totalPagesHeader, 10) : 1
    page += 1
  }

  return all
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

  const wpItems = await fetchAllWpGuidelines()
  if (!wpItems.length) {
    console.log("No ACC guideline records returned from WordPress.")
    return
  }

  console.log(`Fetched ${wpItems.length} WP ACC guideline records.`)

  const counts = {
    landscaping: 0,
    construction: 0,
    "florida-friendly": 0,
    general: 0,
    house: 0,
  }

  for (const wp of wpItems) {
    const category = mapCategory(wp)
    counts[category] += 1

    const doc = {
      _id: `wp-acc-guideline-${wp.id}`,
      _type: "accGuideline",
      title: wp.title?.rendered || `ACC Guideline ${wp.id}`,
      slug: {
        _type: "slug",
        current: wp.slug || `acc-guideline-${wp.id}`,
      },
      category,
      content: htmlToPortableText(wp.content?.rendered || ""),
      published: wp.status === "publish",
      legacyWpId: wp.id,
      legacyWpModified: wp.modified_gmt ? new Date(wp.modified_gmt).toISOString() : undefined,
    }

    // Ensure content has at least one block to satisfy required validation.
    if (!doc.content.length) {
      doc.content = [
        {
          _type: "block",
          _key: key(`fallback-${wp.id}`),
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: key(`fallback-span-${wp.id}`),
              text: stripTags(wp.content?.rendered || "") || "Content unavailable.",
              marks: [],
            },
          ],
        },
      ]
    }

    await sanity.createOrReplace(doc)
    console.log(`Upserted wp-acc-guideline-${wp.id} | ${doc.title} | ${category}`)
  }

  console.log("Import complete.")
  console.log(`Category totals: ${JSON.stringify(counts)}`)
}

main().catch((error) => {
  console.error("Bulk ACC guideline import failed:", error)
  process.exit(1)
})
