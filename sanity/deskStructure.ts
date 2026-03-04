import type { StructureResolver } from "sanity/desk"

const VISIBILITY_FILTER_ITEMS = [
  { title: "All", value: "all" as const },
  { title: "Portal Only (Residents)", value: "portal" as const },
  { title: "Public Site Only", value: "public" as const },
  { title: "Both Portal and Public Site", value: "both" as const },
]

function visibilityFilterFor(typeName: string, visibility: "all" | "portal" | "public" | "both") {
  if (visibility === "all") return `_type == "${typeName}"`
  return `_type == "${typeName}" && visibility == "${visibility}"`
}

function visibilityScopedDocumentTypeList(
  S: Parameters<StructureResolver>[0],
  typeName: string,
  title: string
) {
  return S.listItem()
    .title(title)
    .child(
      S.list()
        .title(title)
        .items(
          VISIBILITY_FILTER_ITEMS.map((item) =>
            S.listItem()
              .title(item.title)
              .child(
                S.documentList()
                  .title(`${title} - ${item.title}`)
                  .schemaType(typeName)
                  .filter(visibilityFilterFor(typeName, item.value))
              )
          )
        )
    )
}

function documentsWithVisibilityDriftList(S: Parameters<StructureResolver>[0]) {
  return S.listItem().title("Visibility Drift (Draft vs Published)").child(
    S.documentList()
      .title("Documents & Forms - Visibility Drift (Draft vs Published)")
      .schemaType("hoaDocument")
      .filter(
        `_type == "hoaDocument" &&
         _id in path("drafts.**") &&
         defined(*[_id == replace(^._id, "drafts.", "")][0]._id) &&
         visibility != *[_id == replace(^._id, "drafts.", "")][0].visibility`
      )
  )
}

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.documentTypeListItem("boardMember").title("Board Members"),
      visibilityScopedDocumentTypeList(S, "event", "Events"),
      visibilityScopedDocumentTypeList(S, "announcement", "Announcements"),
      visibilityScopedDocumentTypeList(S, "page", "Pages"),
      visibilityScopedDocumentTypeList(S, "hoaDocument", "Documents & Forms"),
      visibilityScopedDocumentTypeList(S, "faq", "FAQs"),
      visibilityScopedDocumentTypeList(S, "committee", "Committees"),
      S.documentTypeListItem("emailTemplate").title("Email Template"),
      S.documentTypeListItem("accGuideline").title("ACC Guidelines"),
      S.divider(),
      documentsWithVisibilityDriftList(S),
    ])
