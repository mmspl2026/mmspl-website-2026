import { defineField, defineType } from "sanity";

export default defineType({
  name: "team",
  title: "Team",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Team Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({
      name: "division",
      title: "Division",
      type: "string",
      options: {
        list: [
          { title: "Division A", value: "A" },
          { title: "Division B", value: "B" },
        ],
      },
    }),
    defineField({
      name: "color",
      title: "Team Colour",
      type: "string",
      description: "Optional hex colour, e.g. #AA1111",
    }),
  ],
  preview: {
    select: { title: "name", media: "logo", subtitle: "division" },
  },
});
