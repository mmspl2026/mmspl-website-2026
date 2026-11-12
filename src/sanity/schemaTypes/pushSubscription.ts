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
    defineField({
      name: "rosterPlayer",
      title: "Roster Player",
      type: "reference",
      to: [{ type: "rosterPlayer" }],
      description: "Set when this subscription came from a player's personal beer-list reminder opt-in link, rather than the general league-wide notify page.",
    }),
  ],
  preview: {
    select: { title: "endpoint", subtitle: "subscribedAt" },
  },
});
