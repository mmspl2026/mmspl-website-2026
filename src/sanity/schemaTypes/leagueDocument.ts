import { defineField, defineType } from "sanity";

export default defineType({
  name: "leagueDocument",
  title: "League Document",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Rules & Regulations", value: "Rules & Regulations" },
          { title: "AGM Documents", value: "AGM Documents" },
          { title: "General", value: "General" },
        ],
      },
      initialValue: "General",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
    }),
    defineField({
      name: "file",
      title: "PDF File",
      type: "file",
      options: { accept: "application/pdf" },
    }),
    defineField({
      name: "badge",
      title: "Vote Result Badge",
      type: "string",
      description: "Optional — shown for AGM motions.",
      options: {
        list: [
          { title: "Passed", value: "PASSED" },
          { title: "Failed", value: "FAILED" },
          { title: "N/A", value: "NA" },
        ],
      },
      hidden: ({ document }) => document?.category !== "AGM Documents",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first within a category.",
      initialValue: 0,
    }),
  ],
  orderings: [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", subtitle: "category" },
  },
});
