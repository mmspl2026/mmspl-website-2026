import { defineField, defineType } from "sanity";

export default defineType({
  name: "notificationLog",
  title: "Notification Log",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "message", title: "Message", type: "text", validation: (Rule) => Rule.required() }),
    defineField({ name: "emailCount", title: "Emails Sent", type: "number", initialValue: 0 }),
    defineField({ name: "pushCount", title: "Push Notifications Sent", type: "number", initialValue: 0 }),
    defineField({
      name: "sentAt",
      title: "Sent At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  orderings: [{ title: "Newest first", name: "sentDesc", by: [{ field: "sentAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", emailCount: "emailCount", pushCount: "pushCount" },
    prepare({ title, emailCount, pushCount }) {
      return { title, subtitle: `${emailCount ?? 0} email · ${pushCount ?? 0} push` };
    },
  },
});
