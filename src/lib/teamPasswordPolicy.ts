// Team captain accounts use a shorter minimum than admin accounts
// (src/lib/passwordPolicy.ts) — captains are non-technical volunteers who
// change this password once a season, not security staff. Keep this
// separate from the admin policy rather than lowering MIN_PASSWORD_LENGTH
// there, which stays 20 for admin/superadmin accounts.

export const MIN_TEAM_PASSWORD_LENGTH = 10;

const COMMON_PASSWORDS = ["password123", "letmein123", "qwerty12345", "changeme123", "baseball123", "softball123"];

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validateTeamPasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < MIN_TEAM_PASSWORD_LENGTH) {
    errors.push(`Must be at least ${MIN_TEAM_PASSWORD_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Must contain a number.");
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("This password is too common. Choose something less predictable.");
  }

  return { valid: errors.length === 0, errors };
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function teamPasswordStrength(password: string): { score: number; label: PasswordStrength } {
  let score = 0;
  if (password.length >= MIN_TEAM_PASSWORD_LENGTH) score++;
  if (password.length >= MIN_TEAM_PASSWORD_LENGTH + 6) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const label: PasswordStrength = score <= 1 ? "weak" : score <= 2 ? "fair" : score <= 3 ? "good" : "strong";
  return { score, label };
}
