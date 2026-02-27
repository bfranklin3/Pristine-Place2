import { defineType, defineField } from "sanity"

export const hoaDocument = defineType({
  name: "hoaDocument",
  title: "Documents & Forms",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Document Title",
      type: "string",
      validation: (Rule) => Rule.required(),
      description: "Descriptive title for the document (e.g., 'ACC Application Form')",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().max(300),
      description: "Brief description of what this document is for",
    }),
    defineField({
      name: "content",
      title: "Searchable Content",
      type: "array",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
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
                fields: [{ name: "href", type: "url", title: "URL" }],
              },
            ],
          },
        },
      ],
      description: "Optional text body used for detail display and search indexing.",
    }),
    defineField({
      name: "file",
      title: "File Upload",
      type: "file",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { externalFileUrl?: string; content?: unknown[] } | undefined
          const hasContent = Array.isArray(parent?.content) && parent.content.length > 0
          if (value || parent?.externalFileUrl || hasContent) return true
          return "Provide one of: file upload, External File URL, or Searchable Content."
        }),
      options: {
        accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt",
      },
      description: "Upload the document file (PDF, Word, Excel, or text)",
    }),
    defineField({
      name: "externalFileUrl",
      title: "External File URL",
      type: "url",
      validation: (Rule) =>
        Rule.uri({ allowRelative: false, scheme: ["http", "https"] }).custom((value, context) => {
          const parent = context.parent as { file?: unknown; content?: unknown[] } | undefined
          const hasContent = Array.isArray(parent?.content) && parent.content.length > 0
          if (value || parent?.file || hasContent) return true
          return "Provide one of: External File URL, file upload, or Searchable Content."
        }),
      description: "Optional external file link (e.g., WordPress media URL) when not uploading directly to Sanity.",
    }),
    defineField({
      name: "fileType",
      title: "File Type",
      type: "string",
      options: {
        list: [
          { title: "PDF", value: "pdf" },
          { title: "Word Document", value: "docx" },
          { title: "Excel Spreadsheet", value: "xlsx" },
          { title: "Text File", value: "txt" },
          { title: "Other", value: "other" },
        ],
        layout: "dropdown",
      },
      initialValue: "pdf",
    }),
    defineField({
      name: "category",
      title: "Document Category",
      type: "string",
      options: {
        list: [
          { title: "ACC Forms & Applications", value: "acc-forms" },
          { title: "Gate Access & Security", value: "gate-access" },
          { title: "HOA Governing Documents", value: "governing-docs" },
          { title: "Rules & Regulations", value: "rules" },
          { title: "Budgets", value: "budgets" },
          { title: "Income Statements", value: "income-statements" },
          { title: "Balance Sheets", value: "balance-sheets" },
          { title: "Meeting Minutes", value: "minutes" },
          { title: "Meeting Agendas", value: "agendas" },
          { title: "Newsletters", value: "newsletters" },
          { title: "Templates & Forms", value: "templates" },
          { title: "Policies & Procedures", value: "policies" },
          { title: "Maintenance & Repairs", value: "maintenance" },
          { title: "Community Information", value: "community-info" },
          { title: "Other", value: "other" },
        ],
        layout: "dropdown",
      },
      validation: (Rule) => Rule.required(),
      description: "Categorize this document for easier browsing",
    }),
    defineField({
      name: "categoryParent",
      title: "Category Parent (Legacy)",
      type: "string",
      description: "Optional legacy parent category from WordPress (e.g., Financial, HOA, Meetings).",
      hidden: () => true,
    }),
    defineField({
      name: "categoryChild",
      title: "Category Child (Legacy)",
      type: "string",
      description: "Optional legacy child category from WordPress (e.g., Income Statement, Agenda, Minutes).",
      hidden: () => true,
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      description:
        "Add clean search tags only (e.g., 'meetings', 'minutes', 'financial'). Do not use WordPress class tags.",
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!Array.isArray(value)) return true
          const legacyPattern = /^(post-\d+|type-document|status-publish|hentry)$/i
          const invalid = value.find((tag) => typeof tag === "string" && legacyPattern.test(tag.trim()))
          if (invalid && typeof invalid === "string") {
            return `Remove legacy tag '${invalid}'. Use clean semantic tags only.`
          }
          return true
        }),
    }),
    defineField({
      name: "version",
      title: "Version",
      type: "string",
      description: "Document version number (e.g., 'v2.1', 'Rev 3', '2024 Edition')",
      placeholder: "v1.0",
    }),
    defineField({
      name: "effectiveDate",
      title: "Effective Date",
      type: "date",
      description: "When this document takes effect or was last updated",
    }),
    defineField({
      name: "expiryDate",
      title: "Expiry Date",
      type: "date",
      description: "Optional - when this document expires or should be reviewed",
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
      description: "Link to related documents (e.g., 'ACC Rules' relates to 'ACC Application')",
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published documents will be visible on the website",
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
      description: "Control where this document appears when published",
      initialValue: "portal",
      hidden: ({ parent }) => !parent?.published,
    }),
    defineField({
      name: "showInSearch",
      title: "Show in Search Results",
      type: "boolean",
      description: "Whether this document should appear in portal search",
      initialValue: true,
    }),
    defineField({
      name: "featured",
      title: "Featured Document",
      type: "boolean",
      description: "Highlight this document in the documents page",
      initialValue: false,
    }),
    defineField({
      name: "requiresLogin",
      title: "Requires Login to Download",
      type: "boolean",
      description: "Force users to be logged in to download (future feature)",
      initialValue: true,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first in lists (optional)",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "source",
      title: "Source System",
      type: "string",
      description: "Source of this record (e.g., wordpress, manual).",
      initialValue: "manual",
    }),
    defineField({
      name: "legacyWpId",
      title: "Legacy WordPress ID",
      type: "number",
      description: "Original WordPress post ID for migration traceability.",
    }),
    defineField({
      name: "legacyWpSlug",
      title: "Legacy WordPress Slug",
      type: "string",
      description: "Original WordPress slug before migration.",
    }),
    defineField({
      name: "legacyWpUrl",
      title: "Legacy WordPress URL",
      type: "url",
      description: "Original WordPress permalink.",
    }),
    defineField({
      name: "legacyWpModified",
      title: "Legacy WordPress Modified At",
      type: "datetime",
      description: "Last modified timestamp from WordPress at import time.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      version: "version",
      published: "published",
      featured: "featured",
    },
    prepare({ title, category, version, published, featured }) {
      const statusEmoji = published ? "✅" : "📝"
      const featuredEmoji = featured ? "⭐ " : ""
      const versionText = version ? ` (${version})` : ""
      return {
        title: `${statusEmoji} ${featuredEmoji}${title}${versionText}`,
        subtitle: category ? category.replace(/-/g, " ").toUpperCase() : "Uncategorized",
      }
    },
  },
  orderings: [
    {
      title: "Title (A-Z)",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
    {
      title: "Category, then Title",
      name: "categoryTitle",
      by: [
        { field: "category", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
    {
      title: "Effective Date (Newest First)",
      name: "dateDesc",
      by: [{ field: "effectiveDate", direction: "desc" }],
    },
    {
      title: "Featured First",
      name: "featured",
      by: [
        { field: "featured", direction: "desc" },
        { field: "title", direction: "asc" },
      ],
    },
    {
      title: "Display Order",
      name: "order",
      by: [
        { field: "order", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
  ],
})
