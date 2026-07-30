import { defineField, defineType } from "sanity";

export default defineType({
  name: "game",
  title: "Game",
  type: "document",
  fields: [
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "time",
      title: "Time",
      type: "string",
      description: "e.g. 7:00 PM",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "field",
      title: "Field / Ballpark",
      type: "string",
      options: {
        list: [
          { title: "Centennial Park", value: "Centennial Park" },
          { title: "Mintleaf Park", value: "Mintleaf Park" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "homeTeam",
      title: "Home Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "awayTeam",
      title: "Away Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "homeScore",
      title: "Home Score",
      type: "number",
    }),
    defineField({
      name: "awayScore",
      title: "Away Score",
      type: "number",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Scheduled", value: "scheduled" },
          { title: "Live", value: "live" },
          { title: "Final", value: "final" },
          { title: "Forfeit", value: "forfeit" },
          { title: "Cancelled", value: "cancelled" },
          { title: "Postponed", value: "postponed" },
        ],
      },
      initialValue: "scheduled",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notifyOnCancellation",
      title: "Email subscribers on cancellation",
      type: "boolean",
      initialValue: false,
      description: "When status is set to Cancelled or Postponed and this is checked, subscribers get an email alert.",
    }),
  ],
  orderings: [
    {
      title: "Date, then time",
      name: "dateAsc",
      by: [
        { field: "date", direction: "asc" },
        { field: "time", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: {
      date: "date",
      time: "time",
      field: "field",
      status: "status",
      home: "homeTeam.name",
      away: "awayTeam.name",
    },
    prepare({ date, time, field, status, home, away }) {
      return {
        title: `${home ?? "TBD"} vs ${away ?? "TBD"}`,
        subtitle: `${date ?? ""} ${time ?? ""} · ${field ?? ""} · ${status ?? ""}`,
      };
    },
  },
});
