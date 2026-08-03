"use strict";

/**
 * Creates the first superadmin adminUser document. The admin panel just
 * moved from a single shared ADMIN_PASSWORD to real per-user accounts —
 * this bootstraps one user so you don't lose access. By default it reuses
 * ADMIN_PASSWORD as the new user's password; pass --password to set a
 * different one.
 *
 * Usage:
 *   node scripts/bootstrap-admin-user.js --username admin --name "Admin" --email you@example.com
 *   node scripts/bootstrap-admin-user.js --username admin --name "Admin" --email you@example.com --password "newpass"
 */

const path = require("path");
const { randomBytes, scryptSync } = require("crypto");
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

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const args = parseArgs();
  const username = (args.username || "admin").trim().toLowerCase();
  const name = args.name || "Admin";
  const email = args.email;
  const password = args.password || process.env.ADMIN_PASSWORD;

  if (!email) {
    console.error("Usage: node scripts/bootstrap-admin-user.js --username admin --name \"Your Name\" --email you@example.com [--password ...]");
    process.exit(1);
  }
  if (!password) {
    console.error("No --password given and ADMIN_PASSWORD isn't set — nothing to hash.");
    process.exit(1);
  }

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  const existing = await client.fetch(`*[_type == "adminUser" && username == $username][0]{_id}`, { username });
  if (existing) {
    console.log(`A user with username "${username}" already exists (${existing._id}) — not overwriting. Delete it in Studio first if you want to re-bootstrap.`);
    return;
  }

  const doc = await client.create({
    _type: "adminUser",
    name,
    username,
    email,
    role: "superadmin",
    active: true,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });

  console.log(`Created superadmin "${username}" (${doc._id}).`);
  console.log(
    args.password ? "Sign in with the --password you provided." : "Sign in with your existing ADMIN_PASSWORD value."
  );
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
