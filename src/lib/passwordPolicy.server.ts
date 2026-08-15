import { randomInt } from "node:crypto";
import { MIN_PASSWORD_LENGTH } from "./passwordPolicy";

const TEMP_PASSWORD_CHARS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnopqrstuvwxyz",
  number: "23456789",
  special: "!@#$%^&*-_=+",
};

/** Generates a random password that always satisfies validatePasswordPolicy(). Server-only (uses node:crypto). */
export function generateStrongTempPassword(): string {
  const all = Object.values(TEMP_PASSWORD_CHARS).join("");
  const pick = (chars: string) => chars[randomInt(chars.length)];

  const required = [
    pick(TEMP_PASSWORD_CHARS.upper),
    pick(TEMP_PASSWORD_CHARS.lower),
    pick(TEMP_PASSWORD_CHARS.number),
    pick(TEMP_PASSWORD_CHARS.special),
  ];
  const rest = Array.from({ length: MIN_PASSWORD_LENGTH + 4 - required.length }, () => pick(all));

  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
