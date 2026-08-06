import { defineField, defineType } from "sanity";

export default defineType({
  name: "awardTrophyPhoto",
  title: "Award Category",
  type: "document",
  fields: [
    defineField({
      name: "category",
      title: "Award Category",
      type: "string",
      description:
        'Must exactly match the "Category" text used on Award documents for this trophy (e.g. "Jim McGregor Trophy").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "photo",
      title: "Trophy Photo",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      description: "What this award is presented for. Shown on the /awards page.",
      rows: 3,
    }),
    defineField({
      name: "namedAfter",
      title: "Named After",
      type: "string",
      description: 'e.g. "Named in honour of Jim McGregor". Leave blank if not named after a person.',
    }),
  ],
  preview: {
    select: { title: "category", media: "photo" },
  },
});
