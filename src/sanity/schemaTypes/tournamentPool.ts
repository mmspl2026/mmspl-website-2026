import { defineField, defineType } from "sanity";

export default defineType({
  name: "tournamentPool",
  title: "Tournament Pool",
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
    defineField({
      name: "poolLetter",
      title: "Pool Letter",
      type: "string",
      description: 'Called "Box" in older years — displayed as "Pool" on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "teams",
      title: "Teams",
      type: "array",
      of: [{ type: "string" }],
      description: "Team names in seed order (1st listed = top seed).",
    }),
  ],
  orderings: [
    { title: "Year, newest first", name: "yearDesc", by: [{ field: "year", direction: "desc" }, { field: "poolLetter", direction: "asc" }] },
  ],
  preview: {
    select: { year: "year", type: "type", poolLetter: "poolLetter", teams: "teams" },
    prepare({ year, type, poolLetter, teams }) {
      const label = type === "mcgregor" ? "McGregor" : "Charity";
      return { title: `${year} ${label} — Pool ${poolLetter}`, subtitle: `${(teams || []).length} teams` };
    },
  },
});
