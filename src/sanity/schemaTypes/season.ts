import { defineField, defineType } from "sanity";

export default defineType({
  name: "season",
  title: "Season",
  type: "document",
  fields: [
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      validation: (Rule) => Rule.required().integer().min(1968),
    }),
    defineField({
      name: "isActive",
      title: "Active season",
      type: "boolean",
      initialValue: false,
      description: "Only one season should be active at a time — this is what Home/Standings/Schedule default to.",
    }),
    defineField({
      name: "cancelled",
      title: "Season Cancelled",
      type: "boolean",
      initialValue: false,
      description: "e.g. 2020, cancelled league-wide due to COVID-19. Shows a notice instead of a game schedule.",
    }),
    defineField({
      name: "cancelledReason",
      title: "Cancellation Reason",
      type: "string",
      description: 'Shown on the Schedule page, e.g. "Cancelled due to the COVID-19 pandemic."',
      hidden: ({ document }) => !document?.cancelled,
    }),
    defineField({
      name: "regularSeasonStart",
      title: "Regular season start",
      type: "date",
    }),
    defineField({
      name: "regularSeasonEnd",
      title: "Regular season end",
      type: "date",
    }),
    defineField({
      name: "playoffCutoff",
      title: "Playoff cutoff (number of teams)",
      type: "number",
      description: "Number of top teams in the standings that make the playoffs — draws the cutoff line.",
      initialValue: 8,
    }),
  ],
  orderings: [
    {
      title: "Year, newest first",
      name: "yearDesc",
      by: [{ field: "year", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "year", active: "isActive" },
    prepare({ title, active }) {
      return { title: `${title}${active ? " (active)" : ""}` };
    },
  },
});
