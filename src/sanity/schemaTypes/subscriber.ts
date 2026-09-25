import { defineField, defineType } from "sanity";

export default defineType({
  name: "subscriber",
  title: "Subscriber",
  type: "document",
  fields: [
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
    }),
    defineField({
      name: "subscribedAt",
      title: "Subscribed At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "unsubscribeToken",
      title: "Unsubscribe Token",
      type: "string",
      description: "Random token used for one-click unsubscribe links in emails — not meant to be edited by hand.",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "email", subtitle: "name" },
  },
});
