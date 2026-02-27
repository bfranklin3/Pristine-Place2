import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

const wpGuidelines = [
  {
    id: 29479,
    slug: "bedding-material",
    status: "publish",
    title: { rendered: "BEDDING MATERIAL" },
    content: {
      rendered:
        '<p style="font-weight: 400;"><strong>ACC APPROVAL REQUIRED</strong></p>\n<p>&nbsp;</p>\n<p style="font-weight: 400;">The list below of various materials that may be used in the bedding or planting areas around your home. These materials can be a strategic and aesthetic choice to enhance the overall appeal of the landscape while also considering environmental factors.</p>\n<ul>\n<li><strong>Stone:</strong> Stone mulch is a low-maintenance option that can provide good drainage and helps control weeds. It is available in various sizes and colors, allowing homeowners to choose options that complement the color scheme of their home.</li>\n<li><strong>Mulch and Bark</strong>: Mulch (Black, Brown, Red, and Natural) are a natural and attractive option generally made from pine or cedar. Cedar has natural properties that deter pests, making it a functional choice as well. Mulch or bark can blend well with the warm, tropical aesthetic often found in Florida landscaping.</li>\n<li><strong>Shells:</strong> Crushed shells or shell mulch can provide a unique coastal feel to your landscaping. They are often used in Florida to create a beach-like atmosphere and can be especially fitting for homes near the coast.</li>\n<li><strong>Rubber Mulch:</strong> Rubber mulch, typically made from recycled rubber tires, is an eco-friendly choice that can provide cushioning for play areas and pathways. It comes in various colors, including earth tones that can complement the natural surroundings.</li>\n<li><strong>Submission Requirements:</strong> Site plans and a description of material selected, and proposed material locations must be clearly designated on all site plans. Site Plans that do not include proposed locations or details of materials will not be approved.</li>\n</ul>\n<p style="font-weight: 400;">\u00a0<strong><em>NOTE: </em></strong><strong><em>Refreshing existing mulch, stone, and shells in the same color that complements your home does not require approval by the ACC.</em></strong></p>\n<p style="font-weight: 400;">\n',
    },
    modified_gmt: "2024-01-16T12:15:04",
    class_list: ["acc-guideline-category-landscaping"],
  },
  {
    id: 29128,
    slug: "air-conditioners-2",
    status: "publish",
    title: { rendered: "AIR CONDITIONERS" },
    content: {
      rendered:
        "<p><strong>ACC APPROVAL REQUIRED</strong></p>\n<ol>\n<li><strong>Air Conditioning and Heating Units</strong>: Air conditioning or heating units may not be mounted through windows or walls. Units should be placed on a manufacturer approved foundation or slab.</li>\n<li><strong>Exterior Electrical Chase/Ducts and Conduits: </strong>The exterior electrical chase/ducts and conduits must be painted the same color as your home.</li>\n<li><strong>Replacing A/C Unit:</strong> Homeowners can replace their A/C unit without a permit as long as it&#8217;s done in the same location. Relocating the air conditioner requires an ACC approval.</li>\n</ol>\n",
    },
    modified_gmt: "2024-01-15T19:45:36",
    class_list: ["acc-guideline-category-house"],
  },
]

function key(seed) {
  return seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || Math.random().toString(36).slice(2, 10)
}

function htmlToPortableText(html) {
  const dom = new JSDOM(`<body>${html}</body>`)
  const { document, Node } = dom.window
  const blocks = []
  let index = 0

  function spansFromNode(node, marks = [], markDefs = [], linkKeyByHref = new Map()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ""
      const normalized = text.replace(/\u00a0/g, " ")
      if (!normalized.trim()) return []
      return [
        {
          _type: "span",
          _key: key(`span-${index++}`),
          text: normalized,
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
          markDefs.push({
            _key: linkKey,
            _type: "link",
            href,
          })
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

  function addBlock(element, listItem) {
    const markDefs = []
    const spans = spansFromNode(element, [], markDefs)
    const text = spans.map((s) => s.text).join("")
    if (!text.trim()) return

    const block = {
      _type: "block",
      _key: key(`block-${index++}`),
      style: "normal",
      markDefs,
      children: spans,
    }

    if (listItem) {
      block.listItem = listItem
      block.level = 1
    }

    blocks.push(block)
  }

  for (const node of document.body.childNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const tag = node.tagName.toLowerCase()

    if (tag === "p") {
      addBlock(node)
      continue
    }

    if (tag === "ul" || tag === "ol") {
      const listItem = tag === "ul" ? "bullet" : "number"
      for (const li of node.children) {
        if (li.tagName.toLowerCase() === "li") addBlock(li, listItem)
      }
      continue
    }
  }

  return blocks
}

function mapCategory(classList) {
  if (classList.some((v) => v.includes("landscaping"))) return "landscaping"
  if (classList.some((v) => v.includes("construction"))) return "construction"
  if (classList.some((v) => v.includes("florida-friendly"))) return "florida-friendly"
  if (classList.some((v) => v.includes("house"))) return "house"
  return "general"
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

  for (const wp of wpGuidelines) {
    const doc = {
      _id: `wp-acc-guideline-${wp.id}`,
      _type: "accGuideline",
      title: wp.title.rendered,
      slug: {
        _type: "slug",
        current: wp.slug,
      },
      category: mapCategory(wp.class_list),
      content: htmlToPortableText(wp.content.rendered),
      published: wp.status === "publish",
      legacyWpId: wp.id,
      legacyWpModified: new Date(wp.modified_gmt).toISOString(),
    }

    const result = await client.createOrReplace(doc)
    console.log(`Imported ${result._id}: ${doc.title} (${doc.category})`)
  }
}

main().catch((error) => {
  console.error("Import failed:", error)
  process.exit(1)
})
