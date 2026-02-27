import dotenv from "dotenv"
import { createClient } from "@sanity/client"
import { JSDOM } from "jsdom"

dotenv.config({ path: ".env.local" })

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
  if (/\b(parking|vehicle|vehicles)\b/.test(text)) return "parking"
  if (/\b(pet|pets)\b/.test(text)) return "pets"
  if (/\b(rule|rules|covenant|covenants|restriction|restrictions)\b/.test(text)) return "rules"
  return "general"
}

function titleAsQuestion(title = "") {
  const cleaned = stripTags(decodeHtml(title)).trim()
  if (cleaned.endsWith("?")) return cleaned
  if (/^how\b|^what\b|^who\b|^when\b|^where\b|^why\b|^can\b|^do\b|^is\b|^are\b/i.test(cleaned)) return `${cleaned}?`
  if (/clubhouse|pool|exercise room|tennis court/i.test(cleaned)) {
    return "What are the rules and hours for the clubhouse, pool, exercise room, and tennis court?"
  }
  return cleaned
}

const BASIC_HOA_ITEMS = [
  {
    id: 30194,
    slug: "clubhouse-pool-exercise-room-tennis-court-rules-hours",
    status: "publish",
    title: "Clubhouse, Pool, Exercise Room & Tennis Court Rules & Hours",
    content: `<p><span style="font-size: 18pt;"><b>Below is a subset of the rules for using the Clubhouse, Pool, Exercise Room &amp; Tennis Court.&nbsp;</b></span></p>
<p><b> The entire rules may be found at <a href="https://www.pristineplace.us/document/approved-clubhouse-pool-exercise-room-rules-regulations/">“Approved Clubhouse Rules &amp; Regulations”</a></b></p>
<p><b>Clubhouse</b></p>
<p>The Clubhouse Hours of Operation shall be between the hours of 8:00 AM and 10:00 PM daily. Smoking is prohibited. No pets are allowed inside. Illegal Drugs and Controlled Substances are prohibited. Shoes and suitable attire shall be required inside the clubhouse and Fitness Center. Wet swimsuits will not be permitted inside</p>
<p><b>Pool</b></p>
<p>The Pool Hours of Operation shall be between the hours of 8:00 AM and dusk daily. An adult resident must be present if children are under 16 years of age or younger. An adult resident must be present while their guest(s) are using the pool or pool area. Access to pool area is available to Pristine Place residents and their guests only. No pets are allowed.</p>
<p><b>Exercise Room/Gym</b></p>
<p>The Exercise Room Hours of Operation shall be between the hours of 5:00 AM and 10:00 PM Daily. Proper Exercise Attire only is permitted. Bare feet, flip flops, wet bathing suits are not permitted to be used on any exercise equipment. No pets are allowed inside. No children under the age of thirteen (13) are permitted in the Exercise Room. Children between the ages of thirteen (13) and sixteen (16) are permitted in the Exercise Room with the supervision of an adult only.</p>
<p><b>Tennis Courts</b></p>
<p>The Tennis Court Hours of Operation shall be between the hours of 7:00 AM and and dusk daily. Tennis play is limited to one hour when people are waiting for the court. No food or beverages permitted in court area.</p>`,
  },
  {
    id: 26262,
    slug: "how-do-i-stay-informed-about-hoa-matters",
    status: "publish",
    title: "How do I stay informed about HOA matters?",
    content: `<p>The HOA regularly communicates with residents through various channels. This communication includes newsletters, community bulletin boards, official HOA websites, social media, email, and community-wide meetings. Staying engaged with these resources ensures you are up-to-date on community matters.</p>`,
  },
  {
    id: 25829,
    slug: "who-do-i-contact-for-more-information-or-to-address-specific-concerns",
    status: "publish",
    title: "Who do I contact for more information or to address specific concerns?",
    content: `<p>For any inquiries or specific concerns, you can reach out to the HOA through email <strong><a href="mailto:bod@pristineplace.us">bod@pristineplace.us</a></strong> or phone <strong><a href="tel:3525159420">352-515-9420</a></strong>. The association is here to assist you and ensure our community remains a wonderful place to live.</p>`,
  },
  {
    id: 25828,
    slug: "what-is-the-purpose-of-the-pristine-place-hoa",
    status: "publish",
    title: "What is the purpose of the Pristine Place HOA?",
    content: `<p>The Pristine Place HOA is a non-profit organization established to manage the community's common areas, enforce the community’s rules and regulations, and support initiatives that improve the quality of life for all residents. By doing so, it helps to maintain an orderly, harmonious neighborhood and protect the property values of our homes.</p>`,
  },
  {
    id: 25826,
    slug: "what-are-the-rules-established-by-the-hoa-and-why-are-they-important",
    status: "publish",
    title: "What are the rules established by the HOA, and why are they important?",
    content: `<p>The HOA’s rules, often referred to as Covenants, Conditions, and Restrictions (CC&amp;Rs), are implemented to maintain a clean, safe, and aesthetically consistent environment. These might include guidelines on property maintenance, noise levels, pet management, and modifications to the exterior of your home. Such rules help prevent disputes between neighbors and protect the overall look and feel of Pristine Place.</p>`,
  },
  {
    id: 25805,
    slug: "do-i-have-to-be-a-member-of-the-hoa",
    status: "publish",
    title: "Do I have to be a member of the HOA?",
    content: `<p>Yes, all homeowners within Pristine Place automatically become members of the HOA upon purchasing a home here. This collective membership helps ensure that common areas and amenities are mutually maintained to the same standard by all residents.</p>`,
  },
  {
    id: 25804,
    slug: "can-i-rent-out-my-property-in-pristine-place",
    status: "publish",
    title: "Can I lease or rent out my property in Pristine Place?",
    content: `<p>Pristine Place has rules regarding property rentals and leases that are established by the Board of Directors.</p>
<p>Property owners cannot rent out their property or allow anyone other than immediate family to live there without first getting approval from the Association’s Board of Directors. All leases must be in writing, follow the Association’s rules, and last between 3 and 12 months, with a limit of two rentals per year. Owners must notify the Board at least 15 days before signing a lease, pay a fee, and get the lease approved before the renter can move in. Owners must also provide renters with the Association’s governing documents. Finally, owners must have lived in the property as their main home for 12 months before renting it out, unless they inherited the property or transferred it to a trust for their benefit.</p>
<p>Please refer to Section 21 of the <a href="https://www.pristineplace.us/document/resolution-3-2024-amending-parking-vehicles-restrictions-leases-roadways-and-golf-carts-and-low-speed-vehicles/?hilite=lease">Amendment to the Declaration of Covenants (2024)</a> or contact the HOA directly for guidelines concerning property rentals.</p>`,
  },
  {
    id: 25803,
    slug: "can-i-participate-in-decision-making-for-the-community",
    status: "publish",
    title: "Can I participate in decision-making for the community?",
    content: `<p>Absolutely! The HOA encourages active participation from all members. Homeowners can attend meetings, vote on certain matters, serve on committees, and even serve on the Board of Directors. Active involvement ensures your voice is heard in decisions affecting the community.</p>`,
  },
  {
    id: 25801,
    slug: "are-there-any-fees-involved-and-what-do-these-fees-cover-copy-946-copy-467",
    status: "publish",
    title: "Are there any fees involved, and what do these fees cover?",
    content: `<p>Yes, homeowners are required to pay fees, commonly known as HOA fees. These fees fund the maintenance and upkeep of common areas, recreational facilities, and other shared amenities. They also contribute to a reserve fund for future repairs and improvements within the community.</p>`,
  },
]

const CATEGORY_OVERRIDE_BY_ID = {
  30194: "clubhouse",
  26262: "meetings",
  25829: "general",
  25828: "rules",
  25826: "rules",
  25805: "general",
  25804: "rentals",
  25803: "meetings",
  25801: "fees",
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

  for (const wp of BASIC_HOA_ITEMS) {
    const title = decodeHtml(wp.title || `FAQ ${wp.id}`)
    const answerText = stripTags(wp.content || "")
    const answer = htmlToPortableText(wp.content || "")

    const doc = {
      _id: `wp-portal-faq-${wp.id}`,
      _type: "faq",
      question: titleAsQuestion(title),
      slug: { _type: "slug", current: wp.slug || `portal-faq-${wp.id}` },
      answer: answer.length
        ? answer
        : [
            {
              _type: "block",
              _key: key(`fallback-${wp.id}`),
              style: "normal",
              markDefs: [],
              children: [{ _type: "span", _key: key(`fallback-span-${wp.id}`), text: answerText || "Answer unavailable.", marks: [] }],
            },
          ],
      category: CATEGORY_OVERRIDE_BY_ID[wp.id] || mapFaqCategory(title, answerText),
      keywords: [],
      featured: false,
      published: wp.status === "publish",
      visibility: "both",
      showInSearch: true,
    }

    await sanity.createOrReplace(doc)
    console.log(`Upserted ${doc._id} | ${doc.question} | ${doc.category}`)
  }

  console.log(`Imported ${BASIC_HOA_ITEMS.length} FAQ documents from pasted JSON.`)
}

main().catch((error) => {
  console.error("Import from pasted JSON failed:", error)
  process.exit(1)
})
