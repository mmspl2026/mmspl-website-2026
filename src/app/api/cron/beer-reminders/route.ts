import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { dueBeerRemindersQuery } from "@/lib/sanity/queries";
import { sendBeerReminderEmail } from "@/lib/resend";
import { sendPushToPlayer } from "@/lib/push";
import { getDateDaysAheadEastern } from "@/utils/timezone";

interface DueReminder {
  _id: string;
  team: string;
  game: { _id: string; date: string; time: string; field?: string; homeTeam: string; awayTeam: string };
  player: { _id: string; name: string; email?: string } | null;
  sevenDayReminderSentAt?: string;
  oneDayReminderSentAt?: string;
}

/**
 * Runs once a day (Vercel Hobby plan allows at most one invocation per day
 * per cron, which is all this needs — see vercel.json). Finds every
 * beerAssignment whose game is exactly 7 or 1 days out and hasn't had that
 * reminder sent yet, emails + pushes the assigned player, then stamps the
 * assignment so it isn't sent twice.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysOut = getDateDaysAheadEastern(7);
  const oneDayOut = getDateDaysAheadEastern(1);

  const due = await writeClient.fetch<DueReminder[]>(dueBeerRemindersQuery, { sevenDaysOut, oneDayOut });

  let emailsSent = 0;
  let pushesSent = 0;
  const errors: string[] = [];

  for (const reminder of due) {
    if (!reminder.player) continue;
    const daysOut: 7 | 1 = reminder.game.date === sevenDaysOut ? 7 : 1;
    const opponentName = reminder.game.homeTeam === reminder.team ? reminder.game.awayTeam : reminder.game.homeTeam;
    const nowIso = new Date().toISOString();

    try {
      if (reminder.player.email) {
        const result = await sendBeerReminderEmail(reminder.player.email, reminder.player.name, {
          teamName: reminder.team,
          opponentName,
          gameDate: reminder.game.date,
          gameTime: reminder.game.time,
          field: reminder.game.field,
          daysOut,
        });
        if (!("skipped" in result)) emailsSent++;
      }

      const pushResult = await sendPushToPlayer(reminder.player._id, {
        title: "Beer Duty Reminder",
        body: `You're on beer duty ${daysOut === 7 ? "in 7 days" : "tomorrow"}: ${reminder.team} vs ${opponentName}.`,
        url: "/team/beer-list",
      });
      if (!("skipped" in pushResult)) pushesSent++;

      await writeClient
        .patch(reminder._id)
        .set(daysOut === 7 ? { sevenDayReminderSentAt: nowIso } : { oneDayReminderSentAt: nowIso })
        .commit();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`beer-reminders cron: failed for assignment ${reminder._id}:`, err);
      errors.push(`${reminder._id}: ${message}`);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, emailsSent, pushesSent, errors });
}
