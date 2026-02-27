import { defineType, defineField } from "sanity"

export const announcement = defineType({
  name: "announcement",
  title: "Announcements",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Announcement Title",
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
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
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
            ],
          },
        },
        {
          type: "image",
          options: {
            hotspot: true,
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Brief summary for announcement cards",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "General", value: "general" },
          { title: "Maintenance", value: "maintenance" },
          { title: "Community Update", value: "community" },
          { title: "Important Notice", value: "important" },
          { title: "Emergency", value: "emergency" },
          { title: "Social Activity", value: "social-activity" },
          { title: "Annual Meeting", value: "annual-meeting" },
          { title: "BOD Meeting", value: "bod-meeting" },
          { title: "Committee Meeting", value: "committee-meeting" },
          { title: "Crime Watch", value: "crime-watch" },
          { title: "Fitness & Health", value: "fitness-health" },
          { title: "Special Event", value: "special-event" },
          { title: "Special Meeting", value: "special-meeting" },
        ],
      },
      initialValue: "general",
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "string",
      options: {
        list: [
          { title: "Normal", value: "normal" },
          { title: "High", value: "high" },
          { title: "Urgent", value: "urgent" },
        ],
        layout: "radio",
      },
      initialValue: "normal",
    }),
    defineField({
      name: "publishDate",
      title: "Publish Date",
      type: "datetime",
      description: "When to publish this announcement",
      validation: (Rule) => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "expiryDate",
      title: "Expiry Date",
      type: "datetime",
      description: "Optional - when this announcement should no longer be shown",
    }),
    defineField({
      name: "pinned",
      title: "Pin to Top",
      type: "boolean",
      description: "Keep this announcement at the top of the list",
      initialValue: false,
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published announcements will be visible on the website",
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
      description: "Control where this announcement appears when published",
      initialValue: "portal",
      hidden: ({ parent }) => !parent?.published,
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      priority: "priority",
      date: "publishDate",
    },
    prepare({ title, category, priority, date }) {
      const priorityEmoji = priority === "urgent" ? "🚨" : priority === "high" ? "⚠️" : ""
      return {
        title: `${priorityEmoji} ${title}`,
        subtitle: `${category ? category.toUpperCase() : ""} ${date ? "• " + new Date(date).toLocaleDateString() : ""}`,
      }
    },
  },
  orderings: [
    {
      title: "Publish Date (Newest First)",
      name: "dateDesc",
      by: [
        { field: "pinned", direction: "desc" },
        { field: "publishDate", direction: "desc" },
      ],
    },
    {
      title: "Priority",
      name: "priority",
      by: [
        { field: "priority", direction: "desc" },
        { field: "publishDate", direction: "desc" },
      ],
    },
  ],
})
