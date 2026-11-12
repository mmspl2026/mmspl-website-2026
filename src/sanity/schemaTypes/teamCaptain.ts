import { defineField, defineType } from "sanity";

export default defineType({
  name: "teamCaptain",
  title: "Team Captain",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Full Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({
      name: "username",
      title: "Username",
      type: "string",
      description: "Used to sign in — lowercase, no spaces.",
      validation: (Rule) =>
        Rule.required().custom((value) =>
          typeof value === "string" && /^[a-z0-9._-]+$/.test(value)
            ? true
            : "Lowercase letters, numbers, dots, dashes, underscores only."
        ),
    }),
    defineField({ name: "email", title: "Email", type: "string", validation: (Rule) => Rule.required().email() }),
    defineField({
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Deactivated captains can't sign in, even with a valid session.",
    }),
    defineField({
      name: "passwordHash",
      title: "Password Hash",
      type: "string",
      description: "Managed by the admin panel — do not edit directly.",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "mustChangePassword",
      title: "Must Change Password",
      type: "boolean",
      initialValue: false,
      hidden: true,
    }),
    defineField({
      name: "tempPasswordExpiresAt",
      title: "Temporary Password Expires At",
      type: "datetime",
      hidden: true,
    }),
    defineField({ name: "failedAttempts", title: "Failed Login Attempts", type: "number", initialValue: 0, hidden: true }),
    defineField({ name: "lockedUntil", title: "Locked Until", type: "datetime", hidden: true }),
    defineField({
      name: "currentSessionId",
      title: "Current Session ID",
      type: "string",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "shareToken",
      title: "Public Share Token",
      type: "string",
      description: "Powers the read-only /team/view/<token> link. Regenerate from the portal to invalidate old copies.",
      hidden: true,
    }),
    defineField({ name: "lastLogin", title: "Last Login", type: "datetime", readOnly: true }),
    defineField({ name: "createdAt", title: "Created At", type: "datetime", initialValue: () => new Date().toISOString(), readOnly: true }),
  ],
  preview: {
    select: { title: "name", subtitle: "username", team: "team.name", active: "active" },
    prepare({ title, subtitle, team, active }) {
      return { title: `${title}${active === false ? " (inactive)" : ""}`, subtitle: `@${subtitle} · ${team || "no team"}` };
    },
  },
});
