import { defineField, defineType } from "sanity";

export default defineType({
  name: "importantDate",
  title: "Important Date",
  type: "document",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: "e.g. Rookie Evaluations, Opening Night",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End date (optional)",
      type: "date",
      description: "For multi-day events like tournaments",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Season", value: "Season" },
          { title: "Tournament", value: "Tournament" },
          { title: "Registration", value: "Registration" },
          { title: "Admin", value: "Admin" },
        ],
      },
      initialValue: "Admin",
    }),
  ],
  orderings: [{ title: "Date", name: "dateAsc", by: [{ field: "date", direction: "asc" }] }],
  preview: {
    select: { title: "label", date: "date" },
    prepare({ title, date }) {
      return { title, subtitle: date ? new Date(date).toLocaleDateString() : "" };
    },
  },
});
