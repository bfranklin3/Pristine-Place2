import { defineType, defineField } from "sanity"

export const faq = defineType({
  name: "faq",
  title: "FAQs",
  type: "document",
  fields: [
    defineField({
      name: "question",
      title: "Question",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
      description: "The question residents are asking (keep it concise)",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "question",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "answer",
      title: "Answer",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                    validation: (Rule) =>
                      Rule.uri({
                        allowRelative: true,
                        scheme: ["http", "https", "mailto", "tel"],
                      }),
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required(),
      description: "Detailed answer with formatting, links, and lists",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "General", value: "general" },
          { title: "HOA Fees & Assessments", value: "fees" },
          { title: "Maintenance & Repairs", value: "maintenance" },
          { title: "Rules & Regulations", value: "rules" },
          { title: "ACC & Home Improvements", value: "acc" },
          { title: "Gate Access & Security", value: "gate" },
          { title: "Clubhouse & Amenities", value: "clubhouse" },
          { title: "Parking & Vehicles", value: "parking" },
          { title: "Pets", value: "pets" },
          { title: "Rentals & Leasing", value: "rentals" },
          { title: "Meetings & Governance", value: "meetings" },
          { title: "Other", value: "other" },
        ],
        layout: "dropdown",
      },
      validation: (Rule) => Rule.required(),
      description: "Categorize this FAQ for easier browsing",
    }),
    defineField({
      name: "aboutCategory",
      title: "About Page Category",
      type: "string",
      options: {
        list: [
          { title: "Understanding Our Community", value: "understanding-community" },
          { title: "Community Standards & Guidelines", value: "community-standards" },
          { title: "Property Changes (ACC)", value: "property-changes-acc" },
          { title: "Enforcement & Appeals", value: "enforcement-appeals" },
          { title: "Governance, Participation & Services", value: "governance-participation-services" },
        ],
        layout: "dropdown",
      },
      description: "Controls grouping of FAQs on the resident portal About the HOA page.",
    }),
    defineField({
      name: "keywords",
      title: "Keywords",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      description: "Add search keywords (e.g., 'fence', 'pool', 'guest parking')",
    }),
    defineField({
      name: "relatedFAQs",
      title: "Related FAQs",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "faq" }],
        },
      ],
      description: "Link to related frequently asked questions",
    }),
    defineField({
      name: "relatedDocuments",
      title: "Related Documents",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "hoaDocument" }],
        },
      ],
      description: "Link to relevant documents or forms",
    }),
    defineField({
      name: "featured",
      title: "Featured FAQ",
      type: "boolean",
      description: "Show this FAQ prominently on the FAQ page",
      initialValue: false,
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published FAQs will be visible on the website",
      initialValue: false,
    }),
    defineField({
      name: "visibility",
      title: "Where to Display",
      type: "string",
      options: {
        list: [
          { title: "Portal Only (Residents)", value: "portal" },
          { title: "Public Site Only", value: "public" },
          { title: "Both Portal and Public Site", value: "both" },
        ],
        layout: "radio",
      },
      description: "Control where this FAQ appears when published",
      initialValue: "both",
      hidden: ({ parent }) => !parent?.published,
    }),
    defineField({
      name: "showInSearch",
      title: "Show in Search Results",
      type: "boolean",
      description: "Whether this FAQ should appear in portal search",
      initialValue: true,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first in lists (optional)",
      validation: (Rule) => Rule.min(0),
    }),
  ],
  preview: {
    select: {
      question: "question",
      category: "category",
      aboutCategory: "aboutCategory",
      published: "published",
      featured: "featured",
    },
    prepare({ question, category, aboutCategory, published, featured }) {
      const statusEmoji = published ? "✅" : "📝"
      const featuredEmoji = featured ? "⭐ " : ""
      const aboutLabel = aboutCategory ? ` • ${String(aboutCategory).toUpperCase()}` : ""
      return {
        title: `${statusEmoji} ${featuredEmoji}${question}`,
        subtitle: `${category ? category.toUpperCase() : "UNCATEGORIZED"}${aboutLabel}`,
      }
    },
  },
  orderings: [
    {
      title: "Question (A-Z)",
      name: "questionAsc",
      by: [{ field: "question", direction: "asc" }],
    },
    {
      title: "Category, then Question",
      name: "categoryQuestion",
      by: [
        { field: "category", direction: "asc" },
        { field: "question", direction: "asc" },
      ],
    },
    {
      title: "Featured First",
      name: "featured",
      by: [
        { field: "featured", direction: "desc" },
        { field: "question", direction: "asc" },
      ],
    },
    {
      title: "Display Order",
      name: "order",
      by: [
        { field: "order", direction: "asc" },
        { field: "question", direction: "asc" },
      ],
    },
  ],
})
