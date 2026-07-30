import type { StructureResolver } from "sanity/structure";

// Custom desk structure: AdminSettings is a singleton (no "create new" / list),
// everything else lists normally. This keeps the Studio simple for a
// non-technical admin.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("MMSPL Content")
    .items([
      S.listItem()
        .title("Site Settings")
        .child(S.document().schemaType("adminSettings").documentId("adminSettings")),
      S.divider(),
      S.documentTypeListItem("season").title("Seasons"),
      S.documentTypeListItem("team").title("Teams"),
      S.documentTypeListItem("game").title("Games"),
      S.documentTypeListItem("standing").title("Standings"),
      S.divider(),
      S.documentTypeListItem("news").title("News"),
      S.documentTypeListItem("award").title("Awards"),
      S.documentTypeListItem("importantDate").title("Important Dates"),
      S.documentTypeListItem("galleryPhoto").title("Gallery Photos"),
      S.divider(),
      S.documentTypeListItem("subscriber").title("Subscribers"),
      S.documentTypeListItem("pushSubscription").title("Push Subscriptions"),
    ]);
