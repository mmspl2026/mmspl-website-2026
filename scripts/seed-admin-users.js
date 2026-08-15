"use strict";

/**
 * Creates the initial superadmin account (username "MMSPLAdmin") for the
 * per-user admin login system. Never pass the password as a flag or env
 * var — this script prompts for it interactively (input hidden) so it never
 * ends up in shell history or process listings.
 *
 * Usage:
 *   node scripts/seed-admin-users.js
 */

const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const { createClient } = require("@sanity/client");

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
} catch {
  // no .env.local on disk — assume env vars are already set in the shell
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN.");
  process.exit(1);
}

const USERNAME = "MMSPLAdmin";
const MIN_PASSWORD_LENGTH = 20;

// Control character codes used while reading a masked (hidden) prompt.
const KEY_ENTER = 13; // carriage return
const KEY_NEWLINE = 10;
const KEY_CTRL_C = 3;
const KEY_CTRL_D = 4;
const KEY_BACKSPACE = 127;

function validatePassword(password) {
  const errors = [];
  if (password.length < MIN_PASSWORD_LENGTH) errors.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Must contain a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Must contain a special character.");
  return errors;
}

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (answer) => { rl.close(); resolve(answer.trim()); }));
}

/** Prompts for a value without echoing it to the terminal. */
function askHidden(query) {
  return new Promise((resolve) => {
    let value = "";
    process.stdout.write(query);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (char) => {
      const c = char.toString("utf8");
      const code = c.charCodeAt(0);

      if (code === KEY_ENTER || code === KEY_NEWLINE || code === KEY_CTRL_D) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (code === KEY_CTRL_C) {
        process.exit(1);
      } else if (code === KEY_BACKSPACE) {
        value = value.slice(0, -1);
      } else {
        value += c;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  const existing = await client.fetch(`*[_type == "adminUser" && username == $username][0]{_id}`, {
    username: USERNAME.toLowerCase(),
  });
  if (existing) {
    console.log(`A user with username "${USERNAME}" already exists (${existing._id}) — not overwriting.`);
    console.log("Use the Users tab in /admin/data to manage it instead.");
    process.exit(0);
  }

  const name = (await ask("Full name [MMSPL Admin]: ")) || "MMSPL Admin";
  const email = await ask("Email: ");
  if (!email) {
    console.error("Email is required.");
    process.exit(1);
  }

  let password;
  for (;;) {
    password = await askHidden(`Password (min ${MIN_PASSWORD_LENGTH} chars, upper/lower/number/special): `);
    const errors = validatePassword(password);
    if (errors.length > 0) {
      console.log("Password does not meet requirements:");
      errors.forEach((e) => console.log(`  - ${e}`));
      continue;
    }
    const confirm = await askHidden("Confirm password: ");
    if (confirm !== password) {
      console.log("Passwords did not match — try again.\n");
      continue;
    }
    break;
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const doc = await client.create({
    _type: "adminUser",
    name,
    username: USERNAME.toLowerCase(),
    email,
    role: "superadmin",
    active: true,
    passwordHash,
    failedAttempts: 0,
    createdAt: new Date().toISOString(),
  });

  console.log(`\nCreated superadmin "${USERNAME}" (${doc._id}).`);
  console.log(`Sign in at /admin/login with username "${USERNAME}" (case-insensitive) and the password you just set.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
