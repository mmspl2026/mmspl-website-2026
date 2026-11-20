"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/admin/data/ui";

export default function GameLineupPicker({
  games,
  selectedGameId,
}: {
  games: { _id: string; label: string }[];
  selectedGameId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={selectedGameId}
      onChange={(e) => router.push(`${pathname}?game=${e.target.value}`)}
      className="w-full sm:max-w-sm"
    >
      {games.map((g) => (
        <option key={g._id} value={g._id}>
          {g.label}
        </option>
      ))}
    </Select>
  );
}
