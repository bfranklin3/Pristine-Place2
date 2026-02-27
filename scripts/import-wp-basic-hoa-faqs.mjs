import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

const WP_BASE_URL = "https://www.pristineplace.us/wp-json/wp/v2/portal_article"
const BASIC_HOA_PLACEMENT_ID = 26

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

    if (tag === "p" && element.closest("li")) continue

    if (tag === "li") {
      const parentList = element.parentElement?.tagName.toLowerCase()
      const listItem = parentList === "ol" ? "number" : "bullet"
      addBlock(element, { listItem })
      continue
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      addBlock(element, { style: "h3" })
      continue
    }

    if (tag === "h4" || tag === "h5" || tag === "h6") {
      addBlock(element, { style: "h4" })
      continue
    }

    addBlock(element)
  }

  return blocks
}

function mapFaqCategory(title = "", bodyText = "") {
  const text = `${title} ${bodyText}`.toLowerCase()
  if (text.includes("lease") || text.includes("rent")) return "rentals"
  if (text.includes("fee") || text.includes("dues") || text.includes("assessment")) return "fees"
  if (text.includes("meeting") || text.includes("board") || text.includes("vote")) return "meetings"
  if (text.includes("pool") || text.includes("clubhouse") || text.includes("tennis") || text.includes("exercise")) {
    return "clubhouse"
  }
  if (text.includes("gate") || text.includes("security") || text.includes("crime")) return "gate"
  if (text.includes("acc") || text.includes("architectural") || text.includes("change request")) return "acc"
  if (text.includes("parking") || text.includes("vehicle")) return "parking"
  if (text.includes("pet")) return "pets"
  if (text.includes("rule") || text.includes("covenant") || text.includes("restriction")) return "rules"
  return "general"
}

function titleAsQuestion(title = "", bodyText = "") {
  const cleaned = stripTags(decodeHtml(title)).trim()
  if (cleaned.endsWith("?")) return cleaned
  if (/^how\b|^what\b|^who\b|^when\b|^where\b|^why\b|^can\b|^do\b|^is\b|^are\b/i.test(cleaned)) {
    return `${cleaned}?`
  }

  if (/clubhouse|pool|exercise room|tennis court/i.test(cleaned)) {
    return "What are the rules and hours for the clubhouse, pool, exercise room, and tennis court?"
  }

  if (/violation|appeal/i.test(cleaned) && bodyText) {
    return "What is the HOA violation and appeals process?"
  }

  return cleaned
}

async function fetchAllBasicHoaArticles() {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${WP_BASE_URL}?per_page=100&page=${page}&article-placement=${BASIC_HOA_PLACEMENT_ID}`
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

  const wpItems = await fetchAllBasicHoaArticles()
  const filteredItems = wpItems.filter((wp) => {
    const classes = Array.isArray(wp.class_list) ? wp.class_list : []
    return classes.some((c) => String(c).toLowerCase() === "article-placement-basic-hoa_questions")
  })

  if (!filteredItems.length) {
    console.log("No portal_article records found for article-placement=26.")
    return
  }

  console.log(`Fetched ${wpItems.length} records from WP query and kept ${filteredItems.length} Basic HOA records.`)

  for (const wp of filteredItems) {
    const title = decodeHtml(wp.title?.rendered || `FAQ ${wp.id}`)
    const answer = htmlToPortableText(wp.content?.rendered || "")
    const answerText = stripTags(wp.content?.rendered || "")
    const question = titleAsQuestion(title, answerText)
    const category = mapFaqCategory(title, answerText)

    const doc = {
      _id: `wp-portal-faq-${wp.id}`,
      _type: "faq",
      question,
      slug: {
        _type: "slug",
        current: wp.slug || `portal-faq-${wp.id}`,
      },
      answer: answer.length
        ? answer
        : [
            {
              _type: "block",
              _key: key(`fallback-${wp.id}`),
              style: "normal",
              markDefs: [],
              children: [
                {
                  _type: "span",
                  _key: key(`fallback-span-${wp.id}`),
                  text: answerText || "Answer unavailable.",
                  marks: [],
                },
              ],
            },
          ],
      category,
      keywords: [],
      featured: false,
      published: wp.status === "publish",
      visibility: "both",
      showInSearch: true,
    }

    await sanity.createOrReplace(doc)
    console.log(`Upserted ${doc._id} | ${question} | ${category}`)
  }

  console.log("Basic HOA FAQ import complete.")
}

main().catch((error) => {
  console.error("Basic HOA FAQ import failed:", error)
  process.exit(1)
})
