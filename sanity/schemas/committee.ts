import { defineType, defineField } from "sanity"

export const committee = defineType({
  name: "committee",
  title: "Committees",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Committee Name",
      type: "string",
      validation: (Rule) => Rule.required(),
      description: "Full committee name (e.g., 'Architectural Control Committee')",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "abbreviation",
      title: "Abbreviation",
      type: "string",
      description: "Short name or acronym (e.g., 'ACC', 'Crime Watch')",
      validation: (Rule) => Rule.max(20),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H3", value: "h3" },
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
          },
        },
      ],
      validation: (Rule) => Rule.required(),
      description: "What this committee does and their responsibilities",
    }),
    defineField({
      name: "type",
      title: "Committee Type",
      type: "string",
      options: {
        list: [
          { title: "Standing Committee", value: "standing" },
          { title: "Ad-Hoc Committee", value: "ad-hoc" },
          { title: "Subcommittee", value: "subcommittee" },
        ],
        layout: "radio",
      },
      initialValue: "standing",
      description: "Standing committees are permanent; Ad-hoc are temporary",
    }),
    defineField({
      name: "members",
      title: "Committee Members",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "boardMember",
              title: "Board Member",
              type: "reference",
              to: [{ type: "boardMember" }],
              description: "Select from existing board members",
            },
            {
              name: "role",
              title: "Committee Role",
              type: "string",
              options: {
                list: [
                  { title: "Chair", value: "chair" },
                  { title: "Vice Chair", value: "vice-chair" },
                  { title: "Secretary", value: "secretary" },
                  { title: "Member", value: "member" },
                ],
              },
              initialValue: "member",
            },
          ],
          preview: {
            select: {
              name: "boardMember.name",
              role: "role",
            },
            prepare({ name, role }) {
              return {
                title: name || "Unknown Member",
                subtitle: role ? role.replace("-", " ").toUpperCase() : "MEMBER",
              }
            },
          },
        },
      ],
      description: "Add committee members and their roles",
    }),
    defineField({
      name: "meetingSchedule",
      title: "Meeting Schedule",
      type: "string",
      description: "When the committee meets (e.g., 'Third Tuesday of each month at 6:00 PM')",
      placeholder: "Monthly on the first Wednesday at 7:00 PM",
    }),
    defineField({
      name: "meetingLocation",
      title: "Meeting Location",
      type: "string",
      description: "Where meetings are held (e.g., 'Clubhouse', 'Virtual via Zoom')",
    }),
    defineField({
      name: "contactEmail",
      title: "Contact Email",
      type: "string",
      validation: (Rule) =>
        Rule.regex(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          "Must be a valid email address"
        ),
      description: "General email for committee inquiries",
      placeholder: "committee@pristineplace.org",
    }),
    defineField({
      name: "responsibilities",
      title: "Key Responsibilities",
      type: "array",
      of: [{ type: "string" }],
      description: "List the main duties of this committee",
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
      description: "Link to forms, guidelines, or governing documents",
    }),
    defineField({
      name: "active",
      title: "Currently Active",
      type: "boolean",
      description: "Is this committee currently operating?",
      initialValue: true,
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published committees will be visible on the website",
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
      description: "Control where this committee info appears when published",
      initialValue: "both",
      hidden: ({ parent }) => !parent?.published,
    }),
    defineField({
      name: "showInSearch",
      title: "Show in Search Results",
      type: "boolean",
      description: "Whether this committee should appear in portal search",
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
      name: "name",
      abbreviation: "abbreviation",
      type: "type",
      active: "active",
      published: "published",
    },
    prepare({ name, abbreviation, type, active, published }) {
      const statusEmoji = published ? "✅" : "📝"
      const activeEmoji = active ? "🟢" : "🔴"
      const displayName = abbreviation ? `${name} (${abbreviation})` : name
      return {
        title: `${statusEmoji} ${activeEmoji} ${displayName}`,
        subtitle: type ? type.replace("-", " ").toUpperCase() : "Committee",
      }
    },
  },
  orderings: [
    {
      title: "Name (A-Z)",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Type, then Name",
      name: "typeName",
      by: [
        { field: "type", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
    {
      title: "Active First",
      name: "active",
      by: [
        { field: "active", direction: "desc" },
        { field: "name", direction: "asc" },
      ],
    },
    {
      title: "Display Order",
      name: "order",
      by: [
        { field: "order", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
  ],
})
