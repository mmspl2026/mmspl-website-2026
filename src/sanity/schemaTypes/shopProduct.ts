import { defineField, defineType } from "sanity";

export default defineType({
  name: "shopProduct",
  title: "Shop Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price (CAD)",
      type: "number",
      description: "Leave blank to show \"$TBD\" on the Shop page while pricing isn't finalized yet.",
      validation: (Rule) => Rule.positive(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sizes",
      title: "Available Sizes",
      type: "array",
      of: [{ type: "string" }],
      options: { list: ["S", "M", "L", "XL", "XXL"] },
      initialValue: ["S", "M", "L", "XL", "XXL"],
    }),
    defineField({
      name: "fulfillmentNote",
      title: "Fulfillment Note",
      type: "string",
      initialValue: "Made to order — 4–6 weeks. Pickup arranged once your order's ready.",
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Turn off to hide this item from the Shop page without deleting it.",
    }),
  ],
  preview: {
    select: { title: "name", media: "photo", subtitle: "price" },
    prepare({ title, media, subtitle }) {
      return { title, subtitle: subtitle ? `$${subtitle} CAD` : undefined, media };
    },
  },
});
