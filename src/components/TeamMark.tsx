import Image from "next/image";
import type { Team } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import clsx from "clsx";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamMark({ team, size = 32 }: { team: Team; size?: number }) {
  const logoUrl = team.logo ? urlFor(team.logo).width(size * 2).height(size * 2).url() : null;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={team.logo?.alt || `${team.name} logo`}
        width={size}
        height={size}
        className="rounded-full object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
      )}
      style={{ width: size, height: size }}
    >
      {initials(team.name)}
    </span>
  );
}
