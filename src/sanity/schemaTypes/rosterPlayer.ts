import { defineField, defineType } from "sanity";
import { POSITIONS } from "@/lib/positions";

export default defineType({
  name: "rosterPlayer",
  title: "Roster Player",
  type: "document",
  fields: [
    defineField({ name: "team", title: "Team", type: "reference", to: [{ type: "team" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "jerseyNumber", title: "Jersey #", type: "string" }),
    defineField({
      name: "position",
      title: "Position",
      type: "string",
      options: { list: POSITIONS },
    }),
    defineField({
      name: "isPitcher",
      title: "Eligible Pitcher",
      type: "boolean",
      initialValue: false,
      description: "Separate from Position — flags anyone eligible to pitch regardless of their primary position.",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: [{ title: "Active", value: "active" }, { title: "Injured", value: "injured" }] },
      initialValue: "active",
    }),
    defineField({ name: "email", title: "Email", type: "string", description: "Optional — used for beer-list reminders and team-wide share emails." }),
  ],
  orderings: [{ title: "Name", name: "nameAsc", by: [{ field: "name", direction: "asc" }] }],
  preview: {
    select: { title: "name", position: "position", team: "team.name" },
    prepare({ title, position, team }) {
      return { title, subtitle: `${position || "—"} · ${team || "no team"}` };
    },
  },
});
