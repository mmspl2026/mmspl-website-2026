import { defineField, defineType } from "sanity";

export default defineType({
  name: "beerAssignment",
  title: "Beer Assignment",
  type: "document",
  fields: [
    defineField({ name: "team", title: "Team", type: "reference", to: [{ type: "team" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "game", title: "Game", type: "reference", to: [{ type: "game" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "player", title: "Assigned Player", type: "reference", to: [{ type: "rosterPlayer" }] }),
    defineField({
      name: "sevenDayReminderSentAt",
      title: "7-Day Reminder Sent At",
      type: "datetime",
      readOnly: true,
      description: "Set automatically by the daily reminder cron — do not edit.",
    }),
    defineField({
      name: "oneDayReminderSentAt",
      title: "1-Day Reminder Sent At",
      type: "datetime",
      readOnly: true,
      description: "Set automatically by the daily reminder cron — do not edit.",
    }),
  ],
  preview: {
    select: { player: "player.name", game: "game.date" },
    prepare({ player, game }) {
      return { title: player || "— unassigned —", subtitle: game };
    },
  },
});
