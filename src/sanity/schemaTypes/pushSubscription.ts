import { defineField, defineType } from "sanity";

export default defineType({
  name: "pushSubscription",
  title: "Push Subscription",
  type: "document",
  fields: [
    defineField({
      name: "endpoint",
      title: "Endpoint",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "p256dh",
      title: "p256dh key",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "auth",
      title: "Auth key",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subscribedAt",
      title: "Subscribed At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: { title: "endpoint", subtitle: "subscribedAt" },
  },
});
