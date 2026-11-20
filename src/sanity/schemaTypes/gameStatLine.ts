import { defineField, defineType } from "sanity";
import { POSITIONS } from "@/lib/positions";

function statField(name: string, title: string) {
  return defineField({ name, title, type: "number", initialValue: 0, validation: (Rule) => Rule.min(0) });
}

export default defineType({
  name: "gameStatLine",
  title: "Game Stat Line",
  type: "document",
  fields: [
    defineField({ name: "team", title: "Team", type: "reference", to: [{ type: "team" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "game", title: "Game", type: "reference", to: [{ type: "game" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "player", title: "Player", type: "reference", to: [{ type: "rosterPlayer" }], validation: (Rule) => Rule.required() }),
    defineField({ name: "attended", title: "Attended", type: "boolean", initialValue: true }),
    defineField({
      name: "positionPlayed",
      title: "Position Played",
      type: "string",
      options: { list: POSITIONS },
    }),
    defineField({
      name: "lineupOrder",
      title: "Lineup Order",
      type: "number",
      description: "Batting order position — set by reordering rows in the Team Portal, not edited directly.",
      readOnly: true,
    }),
    statField("ab", "At Bats"),
    statField("h", "Hits"),
    statField("r", "Runs"),
    statField("rbi", "RBI"),
    statField("hr", "Home Runs"),
    statField("e", "Errors"),
  ],
  preview: {
    select: { player: "player.name", game: "game.date" },
    prepare({ player, game }) {
      return { title: player || "(unknown player)", subtitle: game };
    },
  },
});
