import { defineField, defineType } from "sanity";

export default defineType({
  name: "tournamentPrediction",
  title: "Tournament Prediction (Claude's Pick)",
  type: "document",
  description:
    "A one-time bracket prediction written after Phase 1 (Thu-Sat round robin) wraps up, before Sunday's playdowns — compared against real results as they come in on the public Predictions page.",
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
    defineField({
      name: "generatedAt",
      title: "Generated At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Overall Take",
      type: "text",
      rows: 6,
      description: "The big-picture armchair-QB commentary shown at the top of the page.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "wildCardAdvancers",
      title: "Wild Card Round — predicted winners (4)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "quarterFinalWinners",
      title: "Quarter Final — predicted winners (4, reach Semis)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "semiFinalWinners",
      title: "Semi Final — predicted winners (2, reach the Final)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "finalistPick",
      title: "Predicted Runner-Up",
      type: "string",
    }),
    defineField({
      name: "championPick",
      title: "Predicted Champion",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "championReasoning",
      title: "Why This Champion",
      type: "text",
      rows: 5,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "picks",
      title: "Game-by-Game Commentary",
      type: "array",
      description: "Optional colour commentary for individual games/rounds.",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string", description: 'e.g. "Wild Card #1"' }),
            defineField({ name: "team", title: "Predicted Winner", type: "string" }),
            defineField({ name: "reasoning", title: "Reasoning", type: "text", rows: 3 }),
            defineField({
              name: "resultNote",
              title: "Result Note (added after the games are played)",
              type: "text",
              rows: 3,
              description: "Post-mortem commentary once the real result is in — right or wrong, said with a straight face.",
            }),
          ],
          preview: { select: { title: "label", subtitle: "team" } },
        },
      ],
    }),
    defineField({
      name: "finalVerdict",
      title: "Final Verdict (added once the tournament is over)",
      type: "text",
      rows: 8,
      description: "The wrap-up reflection shown once the tournament has a champion — how the prediction actually held up.",
    }),
  ],
  orderings: [
    { title: "Newest first", name: "generatedDesc", by: [{ field: "generatedAt", direction: "desc" }] },
  ],
  preview: {
    select: { year: "year", type: "type", championPick: "championPick" },
    prepare({ year, type, championPick }) {
      const label = type === "mcgregor" ? "McGregor" : "Charity";
      return { title: `${year} ${label} Prediction`, subtitle: `Champion pick: ${championPick || "—"}` };
    },
  },
});
