import { defineField, defineType } from "sanity";

export default defineType({
  name: "contactSubmission",
  title: "Contact Submission",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "email", title: "Email", type: "string", validation: (Rule) => Rule.required().email() }),
    defineField({ name: "subject", title: "Subject", type: "string" }),
    defineField({ name: "message", title: "Message", type: "text", validation: (Rule) => Rule.required() }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Read", value: "read" },
          { title: "Replied", value: "replied" },
          { title: "Email Failed", value: "email-failed" },
        ],
      },
      initialValue: "new",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "submittedAt",
      title: "Submitted At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "replyText",
      title: "Last Reply Sent",
      type: "text",
      description: "The most recent reply sent to this person from the admin panel's Contacts tab.",
      readOnly: true,
    }),
    defineField({
      name: "repliedAt",
      title: "Replied At",
      type: "datetime",
      readOnly: true,
    }),
  ],
  orderings: [{ title: "Newest first", name: "submittedDesc", by: [{ field: "submittedAt", direction: "desc" }] }],
  preview: {
    select: { title: "name", subtitle: "subject", status: "status" },
    prepare({ title, subtitle, status }) {
      return { title, subtitle: `${subtitle || "(no subject)"} · ${status}` };
    },
  },
});
