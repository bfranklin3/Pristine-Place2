import { defineConfig } from "sanity"
import { deskTool } from "sanity/desk"
import { visionTool } from "@sanity/vision"
import { recurringDates } from "sanity-plugin-recurring-dates"
import { schemaTypes } from "./sanity/schemas"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!

export default defineConfig({
  name: "pristine-place-hoa",
  title: "Pristine Place HOA",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [deskTool(), visionTool(), recurringDates()],
  schema: {
    types: schemaTypes,
    templates: (prev) => {
      const withoutDefaultHoaDocument = prev.filter(
        (template) => !(template.schemaType === "hoaDocument" && template.id === "hoaDocument")
      )

      const docTemplate = (
        id: string,
        title: string,
        category: string,
        tags: string[],
      ) => ({
        id,
        title,
        schemaType: "hoaDocument",
        value: {
          category,
          tags,
          source: "manual",
          fileType: "pdf",
          published: false,
          visibility: "portal",
          showInSearch: true,
        },
      })

      return [
        ...withoutDefaultHoaDocument,
        {
          id: "hoaDocument",
          title: "Document (General)",
          schemaType: "hoaDocument",
          value: {
            source: "manual",
            fileType: "pdf",
            published: false,
            visibility: "portal",
            showInSearch: true,
          },
        },
        docTemplate("hoaDocument-minutes", "Document: Meeting Minutes", "minutes", [
          "meetings",
          "meeting_minutes",
          "board",
        ]),
        docTemplate("hoaDocument-agendas", "Document: Meeting Agendas", "agendas", [
          "meetings",
          "meeting_agenda",
          "board",
        ]),
        docTemplate("hoaDocument-income-statements", "Document: Income Statements", "income-statements", [
          "financial",
          "income_statement",
          "hoa_finance",
        ]),
        docTemplate("hoaDocument-balance-sheets", "Document: Balance Sheets", "balance-sheets", [
          "financial",
          "balance_sheet",
          "hoa_finance",
        ]),
        docTemplate("hoaDocument-budgets", "Document: Budgets", "budgets", [
          "financial",
          "budget",
          "hoa_finance",
        ]),
        docTemplate("hoaDocument-governing", "Document: HOA Governing Documents", "governing-docs", [
          "governing",
          "hoa",
          "covenants",
        ]),
        docTemplate("hoaDocument-rules", "Document: Rules & Regulations", "rules", [
          "rules",
          "regulations",
          "hoa_policy",
        ]),
        docTemplate("hoaDocument-newsletters", "Document: Newsletters", "newsletters", [
          "newsletters",
          "community_updates",
        ]),
        docTemplate("hoaDocument-acc-forms", "Document: ACC Forms & Applications", "acc-forms", [
          "acc",
          "forms",
          "architectural_control",
        ]),
        docTemplate("hoaDocument-policies", "Document: Policies & Procedures", "policies", [
          "policy",
          "procedures",
          "hoa_policy",
        ]),
        docTemplate("hoaDocument-archive", "Document: Historical / Archive", "other", [
          "historical",
          "archive",
          "legacy",
        ]),
      ]
    },
  },
})
