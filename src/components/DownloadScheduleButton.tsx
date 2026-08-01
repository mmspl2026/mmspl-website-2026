"use client";

import { Download } from "lucide-react";
import type { Game } from "@/lib/types";

function toIcsDate(dateStr: string, time: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const match = time.match(/^(\d{1,2}):(\d{2})\s*([AP])M$/i);
  let hours = 19;
  let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10) % 12;
    minutes = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "P") hours += 12;
  }
  d.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function buildIcs(games: Game[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MMSPL//Schedule//EN"];
  for (const g of games) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${g._id}@mmspl.ca`,
      `DTSTART:${toIcsDate(g.date, g.time)}`,
      `SUMMARY:${g.homeTeam.name} vs ${g.awayTeam.name}`,
      `LOCATION:${g.field}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function DownloadScheduleButton({ games, year }: { games: Game[]; year: number }) {
  function handleDownload() {
    const blob = new Blob([buildIcs(games)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mmspl-${year}-schedule.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={games.length === 0}
      className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] bg-brand px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-50"
    >
      <Download size={16} aria-hidden="true" />
      Download List
    </button>
  );
}
