import { FacebookIcon, InstagramIcon, YoutubeIcon } from "./icons/SocialIcons";
import { SOCIAL_LINKS } from "@/lib/seed-content";
import clsx from "clsx";

const ICONS = [
  { href: SOCIAL_LINKS.facebook, label: "MMSPL on Facebook", Icon: FacebookIcon },
  { href: SOCIAL_LINKS.instagram, label: "MMSPL on Instagram", Icon: InstagramIcon },
  { href: SOCIAL_LINKS.youtube, label: "MMSPL on YouTube", Icon: YoutubeIcon },
];

export default function SocialLinks({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <ul className={clsx("flex items-center gap-3", className)}>
      {ICONS.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand",
              iconClassName
            )}
          >
            <Icon size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}
