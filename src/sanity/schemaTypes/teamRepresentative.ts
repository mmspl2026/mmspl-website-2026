import { defineField, defineType } from "sanity";

export default defineType({
  name: "teamRepresentative",
  title: "Team Representative",
  type: "document",
  fields: [
    defineField({
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "repName",
      title: "Representative Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: "repName", subtitle: "team.name" },
  },
});
