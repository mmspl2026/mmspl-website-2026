import { defineField, defineType } from "sanity";

export default defineType({
  name: "loginAttempt",
  title: "Admin Login Attempt",
  type: "document",
  fields: [
    defineField({ name: "username", title: "Username Attempted", type: "string" }),
    defineField({ name: "ip", title: "IP Address", type: "string" }),
    defineField({ name: "success", title: "Success", type: "boolean" }),
    defineField({
      name: "reason",
      title: "Reason",
      type: "string",
      description: "e.g. success, invalid_credentials, account_locked, account_inactive, rate_limited",
    }),
    defineField({
      name: "createdAt",
      title: "Timestamp",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
  ],
  orderings: [{ title: "Newest first", name: "createdAtDesc", by: [{ field: "createdAt", direction: "desc" }] }],
  preview: {
    select: { username: "username", success: "success", ip: "ip", createdAt: "createdAt" },
    prepare({ username, success, ip, createdAt }) {
      return {
        title: `${username || "(unknown)"} — ${success ? "success" : "failed"}`,
        subtitle: `${ip || "unknown ip"} · ${createdAt ? new Date(createdAt).toLocaleString() : ""}`,
      };
    },
  },
});
