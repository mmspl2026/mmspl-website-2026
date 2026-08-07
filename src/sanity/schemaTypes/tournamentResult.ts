import { defineField, defineType } from "sanity";

export default defineType({
  name: "tournamentResult",
  title: "Tournament Result",
  type: "document",
  fields: [
    defineField({ name: "year", title: "Year", type: "number", validation: (Rule) => Rule.required().integer() }),
    defineField({
      name: "type",
      title: "Tournament",
      type: "string",
      options: {
        list: [
          { title: "Kevan MacDonald Charity Tournament", value: "charity" },
          { title: "Jim McGregor Year-End Tournament", value: "mcgregor" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: "champion", title: "Champion", type: "string" }),
    defineField({ name: "finalist", title: "Finalist", type: "string" }),
    defineField({ name: "mvp", title: "MVP", type: "string" }),
    defineField({
      name: "mvpTrophy",
      title: "MVP Trophy Name",
      type: "string",
      description: 'e.g. "Peter McClarty Memorial Trophy"',
    }),
    defineField({
      name: "championPhoto",
      title: "Champion Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "finalistPhoto",
      title: "Finalist Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "mvpPhoto",
      title: "MVP Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "hasDetailedResults",
      title: "Has Detailed Results",
      type: "boolean",
      description: "False for years where only the champion/finalist is known (no game-by-game data).",
      initialValue: false,
    }),
    defineField({
      name: "cancelled",
      title: "Season Cancelled",
      type: "boolean",
      description: "e.g. 2020, cancelled league-wide due to COVID-19. Shows a notice in place of results.",
      initialValue: false,
    }),
    defineField({ name: "notes", title: "Notes", type: "string" }),
  ],
  orderings: [{ title: "Newest first", name: "yearDesc", by: [{ field: "year", direction: "desc" }] }],
  preview: {
    select: { year: "year", type: "type", champion: "champion" },
    prepare({ year, type, champion }) {
      const label = type === "mcgregor" ? "McGregor" : "Charity";
      return { title: `${year} ${label}`, subtitle: champion || "No champion recorded" };
    },
  },
});
