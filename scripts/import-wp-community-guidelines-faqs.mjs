import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

const WP_BASE_URL = "https://www.pristineplace.us/wp-json/wp/v2/portal_article"
const COMMUNITY_GUIDELINES_PLACEMENT_ID = 31

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
  if (/\b(lease|leases|rent|rental|rentals)\b/.test(text)) return "rentals"
  if (/\b(fee|fees|dues|assessment|assessments)\b/.test(text)) return "fees"
  if (/\b(meeting|meetings|board|vote|voting|committee|committees)\b/.test(text)) return "meetings"
  if (/\b(pool|clubhouse|tennis|exercise|amenit(y|ies))\b/.test(text)) return "clubhouse"
  if (/\b(gate|security)\b/.test(text)) return "gate"
  if (/\b(acc|architectural)\b/.test(text)) return "acc"
  if (/\b(parking|vehicle|vehicles|boat|boats|trailer|trailers|rv|recreational)\b/.test(text)) return "parking"
  if (/\b(pet|pets|animal|animals)\b/.test(text)) return "pets"
  if (/\b(rule|rules|covenant|covenants|restriction|restrictions)\b/.test(text)) return "rules"
  return "general"
}

const QUESTION_TITLE_OVERRIDE_BY_ID = {
  25824: "Where can I find Pristine Place HOA rules and regulations?",
  25823: "What are the rules for vehicle repairs and maintenance in Pristine Place?",
  25822: "What are the HOA rules for pets and animals in Pristine Place?",
  25821: "Are commercial vehicles allowed to park in Pristine Place?",
  25820: "Can I keep or park boats, trailers, or RVs in Pristine Place?",
  25819: "Are sheds, trailers, tents, or other temporary buildings allowed?",
  25800: "What does the Architectural Control Committee (ACC) do?",
  25817: "What are the parking rules in Pristine Place?",
}

const CATEGORY_OVERRIDE_BY_ID = {
  25824: "rules",
  25823: "parking",
  25822: "pets",
  25821: "parking",
  25820: "parking",
  25819: "rules",
  25800: "acc",
  25817: "parking",
}

async function fetchAllCommunityGuidelinesArticles() {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${WP_BASE_URL}?per_page=100&page=${page}&article-placement=${COMMUNITY_GUIDELINES_PLACEMENT_ID}`
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

  const wpItems = await fetchAllCommunityGuidelinesArticles()
  const filteredItems = wpItems.filter((wp) => {
    const classes = Array.isArray(wp.class_list) ? wp.class_list : []
    return classes.some((c) => String(c).toLowerCase() === "article-placement-community-guidelines")
  })

  if (!filteredItems.length) {
    console.log("No portal_article records found for article-placement=31 (Community Guidelines).")
    return
  }

  console.log(`Fetched ${wpItems.length} records from WP query and kept ${filteredItems.length} Community Guidelines records.`)

  for (const wp of filteredItems) {
    const title = decodeHtml(wp.title?.rendered || `FAQ ${wp.id}`)
    const answer = htmlToPortableText(wp.content?.rendered || "")
    const answerText = stripTags(wp.content?.rendered || "")
    const question = QUESTION_TITLE_OVERRIDE_BY_ID[wp.id] || title
    const category = CATEGORY_OVERRIDE_BY_ID[wp.id] || mapFaqCategory(title, answerText)

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

  console.log("Community Guidelines FAQ import complete.")
}

main().catch((error) => {
  console.error("Community Guidelines FAQ import failed:", error)
  process.exit(1)
})
