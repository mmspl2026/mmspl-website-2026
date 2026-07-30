import { defineField, defineType } from "sanity";

export default defineType({
  name: "award",
  title: "Award",
  type: "document",
  fields: [
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      validation: (Rule) => Rule.required().integer(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "e.g. MVP, Home Run Champion, Rookie of the Year",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "winner",
      title: "Winner",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
  ],
  orderings: [
    { title: "Year, newest first", name: "yearDesc", by: [{ field: "year", direction: "desc" }] },
  ],
  preview: {
    select: { title: "category", winner: "winner", year: "year", media: "photo" },
    prepare({ title, winner, year, media }) {
      return { title: `${title} — ${winner}`, subtitle: `${year}`, media };
    },
  },
});
