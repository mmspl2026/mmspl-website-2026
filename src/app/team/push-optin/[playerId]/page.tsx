import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { writeClient } from "@/lib/sanity/client";
import TeamPushOptInButton from "@/components/team/TeamPushOptInButton";

export const metadata: Metadata = { title: "Beer Duty Reminders", robots: { index: false, follow: false } };
// Public page, no cookies()/headers() — force fresh data so a deleted
// roster player 404s immediately instead of staying cached as valid.
export const dynamic = "force-dynamic";

export default async function PushOptInPage({ params }: { params: { playerId: string } }) {
  const player = await writeClient.fetch<{ _id: string; name: string; team: { name: string } } | null>(
    `*[_type == "rosterPlayer" && _id == $playerId][0]{_id, name, "team": team->{name}}`,
    { playerId: params.playerId }
  );
  if (!player) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center text-black shadow-sm">
        <Image src="/mmspl-logo.png" alt="" width={90} height={53} className="mx-auto" priority />
        <h1 className="mt-4 text-xl font-bold text-black">Hi {player.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Turn on push notifications for your {player.team.name} beer-duty reminders — 7 days and 1 day before your
          turn.
        </p>
        <div className="mt-6">
          <TeamPushOptInButton playerId={player._id} />
        </div>
      </div>
    </div>
  );
}
