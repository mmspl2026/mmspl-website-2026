import { defineField, defineType } from "sanity";

export default defineType({
  name: "tournamentGame",
  title: "Tournament Game",
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
    defineField({ name: "date", title: "Date", type: "date", validation: (Rule) => Rule.required() }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description:
        "Position within the day, in the exact order mmspl.ca listed the game (source time strings aren't reliably sortable as text — some years omit AM/PM). Used instead of the time field for display order.",
    }),
    defineField({ name: "time", title: "Time", type: "string" }),
    defineField({ name: "field", title: "Field", type: "string" }),
    defineField({ name: "homeTeam", title: "Home Team", type: "string" }),
    defineField({ name: "awayTeam", title: "Away Team", type: "string" }),
    defineField({ name: "homeScore", title: "Home Score", type: "number" }),
    defineField({ name: "awayScore", title: "Away Score", type: "number" }),
    defineField({
      name: "round",
      title: "Round",
      type: "string",
      options: {
        list: [
          { title: "Round Robin", value: "roundRobin" },
          { title: "Wild Card", value: "wildCard" },
          { title: "Quarter Final", value: "quarterFinal" },
          { title: "Semi Final", value: "semiFinal" },
          { title: "Final", value: "final" },
        ],
      },
      initialValue: "roundRobin",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pool",
      title: "Pool",
      type: "string",
      description: 'Round-robin pool letter ("A", "B", "C", "D"). Not set for playoff games.',
    }),
    defineField({
      name: "homeResult",
      title: "Home Result",
      type: "string",
      description: 'For playoff games without a numeric score: "W" (win) or "-" (loss/pending).',
      options: { list: ["W", "-"] },
    }),
    defineField({
      name: "awayResult",
      title: "Away Result",
      type: "string",
      options: { list: ["W", "-"] },
    }),
    defineField({ name: "setupNote", title: "Setup Note", type: "string" }),
    defineField({ name: "teardownNote", title: "Teardown Note", type: "string" }),
  ],
  orderings: [
    { title: "Date, order", name: "dateOrder", by: [{ field: "date", direction: "asc" }, { field: "sortOrder", direction: "asc" }] },
  ],
  preview: {
    select: { home: "homeTeam", away: "awayTeam", date: "date", round: "round" },
    prepare({ home, away, date, round }) {
      return { title: `${home ?? "?"} vs ${away ?? "?"}`, subtitle: `${date ?? ""} · ${round ?? ""}` };
    },
  },
});
