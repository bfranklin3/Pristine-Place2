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
            { title: "ACC Workflow Submitted (Resident)", value: "acc_workflow_submitted_resident" },
            { title: "ACC Workflow Submitted (Chair)", value: "acc_workflow_submitted_chair" },
            { title: "ACC Workflow More Info (Resident)", value: "acc_workflow_more_info_resident" },
            { title: "ACC Workflow Resubmitted (Chair)", value: "acc_workflow_resubmitted_chair" },
            { title: "ACC Workflow Sent To Vote (Committee)", value: "acc_workflow_sent_to_vote_committee" },
            { title: "ACC Workflow Approved (Resident)", value: "acc_workflow_approved_resident" },
            { title: "ACC Workflow Rejected (Resident)", value: "acc_workflow_rejected_resident" },
            { title: "Clubhouse Rental Submitted (Resident)", value: "clubhouse_rental_submitted_resident" },
            { title: "Clubhouse Rental Submitted (Admin)", value: "clubhouse_rental_submitted_admin" },
            { title: "Clubhouse Rental More Info (Resident)", value: "clubhouse_rental_more_info_resident" },
            { title: "Clubhouse Rental Resubmitted (Admin)", value: "clubhouse_rental_resubmitted_admin" },
            { title: "Clubhouse Rental Approved (Resident)", value: "clubhouse_rental_approved_resident" },
            { title: "Clubhouse Rental Rejected (Resident)", value: "clubhouse_rental_rejected_resident" },
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
        "Available placeholders (by template): {{firstName}}, {{portalUrl}}, {{contactEmail}}, {{approvalSupportEmail}}, {{lastName}}, {{homeAddress}}, {{username}}, {{emailAddress}}, {{submittedAt}}, {{reviewUrl}}, {{resetUrl}}, {{signInUrl}}, {{requestId}}, {{requestNumber}}, {{requestTitle}}, {{residentName}}, {{residentEmail}}, {{residentAddress}}, {{residentActionNote}}, {{decisionNote}}, {{voteDeadlineAt}}, {{detailUrl}}, {{managementUrl}}, {{reservationDate}}, {{reservationTime}}",
    }),
    defineField({
      name: "textBody",
      title: "Text Body",
      type: "text",
      rows: 14,
      validation: (rule) => rule.required(),
      description:
        "Available placeholders (by template): {{firstName}}, {{portalUrl}}, {{contactEmail}}, {{approvalSupportEmail}}, {{lastName}}, {{homeAddress}}, {{username}}, {{emailAddress}}, {{submittedAt}}, {{reviewUrl}}, {{resetUrl}}, {{signInUrl}}, {{requestId}}, {{requestNumber}}, {{requestTitle}}, {{residentName}}, {{residentEmail}}, {{residentAddress}}, {{residentActionNote}}, {{decisionNote}}, {{voteDeadlineAt}}, {{detailUrl}}, {{managementUrl}}, {{reservationDate}}, {{reservationTime}}",
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
