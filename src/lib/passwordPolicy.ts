// Isomorphic (client + server) — used by the live strength meter in the
// Users tab as well as server-side validation. Keep this free of node:crypto
// or other server-only imports; see passwordPolicy.server.ts for the
// temp-password generator, which needs real randomness.

export const MIN_PASSWORD_LENGTH = 20;

// A short blocklist of passwords that are long/complex enough to pass the
// other rules but are still widely known — worth blocking even at 20+ chars.
const COMMON_PASSWORDS = [
  "password123456789012",
  "passwordpassword1234",
  "correcthorsebatterystaple",
  "qwertyuiopasdfghjklz1",
  "letmeinletmeinletmein",
  "changeme123456789012",
  "administrator12345678",
];

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Must contain a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Must contain a special character.");
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("This password is too common. Choose something less predictable.");
  }

  return { valid: errors.length === 0, errors };
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function passwordStrength(password: string): { score: number; label: PasswordStrength } {
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= MIN_PASSWORD_LENGTH + 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const label: PasswordStrength = score <= 1 ? "weak" : score <= 2 ? "fair" : score <= 3 ? "good" : "strong";
  return { score, label };
}
