import { defineField, defineType } from "sanity";

export default defineType({
  name: "leagueExecutive",
  title: "League Executive",
  type: "document",
  fields: [
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      description: "e.g. President, 1st Vice President, Treasurer",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first.",
      validation: (Rule) => Rule.required(),
    }),
  ],
  orderings: [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", subtitle: "role" },
  },
});
