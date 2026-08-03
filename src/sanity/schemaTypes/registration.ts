import { defineField, defineType } from "sanity";

export default defineType({
  name: "registration",
  title: "Registration",
  type: "document",
  fields: [
    defineField({ name: "firstName", title: "First Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "lastName", title: "Last Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "email", title: "Email", type: "string", validation: (Rule) => Rule.required().email() }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "birthYear", title: "Birth Year", type: "string" }),
    defineField({ name: "experience", title: "Experience", type: "string" }),
    defineField({ name: "position", title: "Preferred Position", type: "string" }),
    defineField({ name: "emergencyContact", title: "Emergency Contact Name", type: "string" }),
    defineField({ name: "emergencyPhone", title: "Emergency Contact Phone", type: "string" }),
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Unpaid", value: "unpaid" },
          { title: "Call-Up", value: "call-up" },
          { title: "Completed", value: "completed" },
        ],
      },
      initialValue: "unpaid",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "emailStatus",
      title: "Confirmation Email",
      type: "string",
      options: {
        list: [
          { title: "Sent", value: "sent" },
          { title: "Failed", value: "failed" },
        ],
      },
      initialValue: "sent",
    }),
    defineField({
      name: "submittedAt",
      title: "Submitted At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  orderings: [{ title: "Newest first", name: "submittedDesc", by: [{ field: "submittedAt", direction: "desc" }] }],
  preview: {
    select: { first: "firstName", last: "lastName", status: "status", email: "email" },
    prepare({ first, last, status, email }) {
      return { title: `${first ?? ""} ${last ?? ""}`.trim() || email, subtitle: status };
    },
  },
});
