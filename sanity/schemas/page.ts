import { defineType, defineField } from "sanity"

export const page = defineType({
  name: "page",
  title: "Pages",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Page Title",
      type: "string",
      validation: (Rule) => Rule.required(),
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
      description: "URL-friendly version of the title (e.g., 'faq' for /resident-portal/faq)",
    }),
    defineField({
      name: "content",
      title: "Page Content",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H1", value: "h1" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Underline", value: "underline" },
              { title: "Code", value: "code" },
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
                  {
                    name: "blank",
                    type: "boolean",
                    title: "Open in new tab",
                    initialValue: false,
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alternative text",
              description: "Important for SEO and accessibility",
            },
            {
              name: "caption",
              type: "string",
              title: "Caption",
            },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Page Excerpt / Meta Description",
      type: "text",
      rows: 3,
      description: "Brief summary for search results and SEO (150-160 characters recommended)",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "category",
      title: "Page Category",
      type: "string",
      options: {
        list: [
          { title: "Community Info", value: "community" },
          { title: "Resources", value: "resources" },
          { title: "Services", value: "services" },
          { title: "Documents & Forms", value: "documents" },
          { title: "Rules & Policies", value: "rules" },
          { title: "Help & Support", value: "help" },
          { title: "About", value: "about" },
        ],
        layout: "dropdown",
      },
      description: "Helps organize pages in navigation and search",
      initialValue: "resources",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
          description: "Important for SEO and accessibility",
        },
      ],
      description: "Optional - displayed at the top of the page",
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published pages will be visible on the website",
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
      description: "Control where this page appears when published",
      initialValue: "portal",
      hidden: ({ parent }) => !parent?.published,
    }),
    defineField({
      name: "showInSearch",
      title: "Show in Search Results",
      type: "boolean",
      description: "Whether this page should appear in portal search",
      initialValue: true,
    }),
    defineField({
      name: "publishDate",
      title: "Publish Date",
      type: "datetime",
      description: "When this page was first published",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "lastUpdated",
      title: "Last Updated",
      type: "datetime",
      description: "When this page was last modified (auto-updated)",
      readOnly: true,
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
      title: "title",
      category: "category",
      published: "published",
      media: "featuredImage",
    },
    prepare({ title, category, published, media }) {
      const statusEmoji = published ? "✅" : "📝"
      return {
        title: `${statusEmoji} ${title}`,
        subtitle: category ? category.toUpperCase() : "Uncategorized",
        media,
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
      title: "Last Updated (Newest First)",
      name: "dateDesc",
      by: [{ field: "lastUpdated", direction: "desc" }],
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
