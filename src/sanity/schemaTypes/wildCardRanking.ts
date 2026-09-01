import { defineField, defineType } from "sanity";

export default defineType({
  name: "wildCardRanking",
  title: "Wild Card Ranking",
  type: "document",
  description: "2026+ tournament format only, where a combined Wild Card standings table ranks non-pool-winners.",
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
    defineField({ name: "rank", title: "Rank", type: "number", validation: (Rule) => Rule.required().integer() }),
    defineField({ name: "teamName", title: "Team Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "pool", title: "Pool", type: "string" }),
    defineField({ name: "points", title: "Points", type: "number" }),
    defineField({ name: "wins", title: "Wins", type: "number" }),
    defineField({ name: "losses", title: "Losses", type: "number" }),
    defineField({ name: "ties", title: "Ties", type: "number", description: "Round robin games (Thu-Sat) can end in a tie." }),
    defineField({ name: "runDifferential", title: "Run Differential", type: "number" }),
    defineField({ name: "advanced", title: "Advanced to Wild Card Round", type: "boolean", initialValue: false }),
  ],
  orderings: [
    { title: "Year, rank", name: "yearRank", by: [{ field: "year", direction: "desc" }, { field: "rank", direction: "asc" }] },
  ],
  preview: {
    select: { rank: "rank", teamName: "teamName", year: "year", advanced: "advanced" },
    prepare({ rank, teamName, year, advanced }) {
      return { title: `#${rank} ${teamName}`, subtitle: `${year} · ${advanced ? "Advances" : "Eliminated"}` };
    },
  },
});
