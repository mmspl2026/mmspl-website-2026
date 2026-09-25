import { defineField, defineType } from "sanity";

export default defineType({
  name: "adminAuditLog",
  title: "Admin Audit Log",
  type: "document",
  description: "Record of sensitive admin actions (currently: locked-standings edits). General-purpose so future admin actions can log here too.",
  fields: [
    defineField({
      name: "action",
      title: "Action",
      type: "string",
      description: 'e.g. "standings.save", "standings.recalculate", "standings.unlock"',
    }),
    defineField({ name: "performedByUid", title: "Performed By (User ID)", type: "string" }),
    defineField({ name: "performedByName", title: "Performed By (Name)", type: "string" }),
    defineField({
      name: "success",
      title: "Success",
      type: "boolean",
      description: "Only meaningful for actions that can fail, e.g. standings.unlock.",
    }),
    defineField({ name: "seasonYear", title: "Season Year", type: "number" }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "Human-readable description of what changed, e.g. \"Century21: W 20→21, L 6→5\".",
    }),
    defineField({ name: "ip", title: "IP Address", type: "string" }),
    defineField({
      name: "createdAt",
      title: "Timestamp",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
  ],
  orderings: [{ title: "Newest first", name: "createdAtDesc", by: [{ field: "createdAt", direction: "desc" }] }],
  preview: {
    select: { action: "action", name: "performedByName", createdAt: "createdAt" },
    prepare({ action, name, createdAt }) {
      return {
        title: `${action || "(unknown action)"} — ${name || "unknown user"}`,
        subtitle: createdAt ? new Date(createdAt).toLocaleString() : "",
      };
    },
  },
});
