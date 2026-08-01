import { defineField, defineType } from "sanity";

export default defineType({
  name: "standing",
  title: "Standing",
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
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "wins",
      title: "Wins",
      type: "number",
      initialValue: 0,
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "losses",
      title: "Losses",
      type: "number",
      initialValue: 0,
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "ties",
      title: "Ties",
      type: "number",
      initialValue: 0,
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "runDifferential",
      title: "Run Differential",
      type: "number",
      initialValue: 0,
      description: "Runs scored minus runs allowed (can be negative)",
    }),
    defineField({
      name: "defaults",
      title: "Defaults",
      type: "number",
      initialValue: 0,
      description: "Games decided by opponent default/forfeit — shown as \"D\" in the standings table.",
      validation: (Rule) => Rule.min(0),
    }),
  ],
  preview: {
    select: { team: "team.name", wins: "wins", losses: "losses", ties: "ties", year: "season.year" },
    prepare({ team, wins, losses, ties, year }) {
      return {
        title: team ?? "Unnamed team",
        subtitle: `${year ?? ""} · ${wins ?? 0}-${losses ?? 0}-${ties ?? 0}`,
      };
    },
  },
});
