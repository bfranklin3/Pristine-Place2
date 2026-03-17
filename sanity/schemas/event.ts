import { defineType, defineField } from "sanity"

export const event = defineType({
  name: "event",
  title: "Events",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Event Title",
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
      name: "isRecurring",
      title: "Recurring Event",
      type: "boolean",
      description: "Is this a recurring event (e.g., monthly meetings)?",
      initialValue: false,
    }),
    defineField({
      name: "eventDate",
      title: "Event Date & Time",
      type: "datetime",
      description: "Start date for single events, or first occurrence for recurring events",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End Date & Time",
      type: "datetime",
      description: "Optional - for multi-day or timed events",
    }),
    defineField({
      name: "recurrence",
      title: "Recurrence Rule",
      type: "recurringDates",
      description: "Define when this event repeats (e.g., every 3rd Wednesday)",
      hidden: ({ parent }) => !parent?.isRecurring,
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      placeholder: "Clubhouse, Pool Area, etc.",
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
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
        },
      ],
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "imageLayout",
      title: "Image Layout",
      type: "string",
      description: "Choose how the featured image is displayed on the event detail page",
      options: {
        list: [
          { title: "Full-width Banner (default)", value: "hero" },
          { title: "Side-by-side (Image + Content)", value: "side" },
          { title: "Compact Thumbnail", value: "compact" },
          { title: "No Image", value: "none" },
        ],
        layout: "radio",
      },
      initialValue: "hero",
      hidden: ({ parent }) => !parent?.featuredImage,
    }),
    defineField({
      name: "imageFit",
      title: "Image Fit",
      type: "string",
      description: "Use Fill frame (cover) for photos. Use Show full image (contain) for flyers, posters, or graphics with text.",
      options: {
        list: [
          { title: "Fill frame (cover)", value: "cover" },
          { title: "Show full image (contain)", value: "contain" },
        ],
        layout: "radio",
      },
      initialValue: "cover",
      hidden: ({ parent }) => !parent?.featuredImage || parent?.imageLayout === "none",
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
      name: "rsvpRequired",
      title: "RSVP Required",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "rsvpEmail",
      title: "RSVP Email",
      type: "string",
      description: "Email address for RSVPs (if required)",
      hidden: ({ parent }) => !parent?.rsvpRequired,
      validation: (Rule) =>
        Rule.custom((email, context) => {
          const parent = context.parent as { rsvpRequired?: boolean }
          if (parent?.rsvpRequired && !email) {
            return "RSVP email is required when RSVP is enabled"
          }
          return true
        }),
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      description: "Only published events will be visible on the website",
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
      description: "Control where this event appears when published",
      initialValue: "portal",
      hidden: ({ parent }) => !parent?.published,
    }),
  ],
  preview: {
    select: {
      title: "title",
      date: "eventDate",
      media: "featuredImage",
      isRecurring: "isRecurring",
    },
    prepare({ title, date, media, isRecurring }) {
      const dateStr = date ? new Date(date).toLocaleDateString() : "No date set"
      const recurringPrefix = isRecurring ? "🔁 " : ""
      return {
        title: `${recurringPrefix}${title}`,
        subtitle: dateStr,
        media,
      }
    },
  },
  orderings: [
    {
      title: "Event Date (Newest First)",
      name: "eventDateDesc",
      by: [{ field: "eventDate", direction: "desc" }],
    },
    {
      title: "Event Date (Oldest First)",
      name: "eventDateAsc",
      by: [{ field: "eventDate", direction: "asc" }],
    },
  ],
})
