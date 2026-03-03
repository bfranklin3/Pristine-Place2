import { defineField, defineType } from "sanity"

export const emailTemplate = defineType({
  name: "emailTemplate",
  title: "Email Template",
  type: "document",
  fields: [
    defineField({
      name: "key",
      title: "Template Key",
      type: "string",
      validation: (rule) => rule.required(),
        options: {
          list: [
            { title: "Portal Registration Approved", value: "portal_registration_approved" },
            { title: "Portal Registration Rejected", value: "portal_registration_rejected" },
            { title: "Portal Registration Submitted (Resident)", value: "portal_registration_submitted_resident" },
            { title: "Portal Registration Submitted (Admin)", value: "portal_registration_submitted_admin" },
            { title: "Portal Password Reset (Admin Sent)", value: "portal_password_reset_admin_sent" },
          ],
        },
    }),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "htmlBody",
      title: "HTML Body",
      type: "text",
      rows: 18,
      validation: (rule) => rule.required(),
      description:
        "Available placeholders (by template): {{firstName}}, {{portalUrl}}, {{contactEmail}}, {{approvalSupportEmail}}, {{lastName}}, {{homeAddress}}, {{username}}, {{emailAddress}}, {{submittedAt}}, {{reviewUrl}}, {{resetUrl}}, {{signInUrl}}",
    }),
    defineField({
      name: "textBody",
      title: "Text Body",
      type: "text",
      rows: 14,
      validation: (rule) => rule.required(),
      description:
        "Available placeholders (by template): {{firstName}}, {{portalUrl}}, {{contactEmail}}, {{approvalSupportEmail}}, {{lastName}}, {{homeAddress}}, {{username}}, {{emailAddress}}, {{submittedAt}}, {{reviewUrl}}, {{resetUrl}}, {{signInUrl}}",
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "subject",
      subtitle: "key",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Untitled email template",
        subtitle: subtitle || "email template",
      }
    },
  },
})
