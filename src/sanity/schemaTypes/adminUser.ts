import { defineField, defineType } from "sanity";

export default defineType({
  name: "adminUser",
  title: "Admin User",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Full Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
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
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      options: {
        list: [
          { title: "Super Admin", value: "superadmin" },
          { title: "Exec", value: "exec" },
        ],
      },
      initialValue: "exec",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Deactivated users can't sign in, even with a valid session.",
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
      description: "Set when a temporary password is issued — forces a change on next sign-in.",
      initialValue: false,
      hidden: true,
    }),
    defineField({
      name: "tempPasswordExpiresAt",
      title: "Temporary Password Expires At",
      type: "datetime",
      description: "Temporary passwords (from a reset) stop working after this time.",
      hidden: true,
    }),
    defineField({
      name: "failedAttempts",
      title: "Failed Login Attempts",
      type: "number",
      description: "Managed by the login flow — resets on successful sign-in.",
      initialValue: 0,
      hidden: true,
    }),
    defineField({
      name: "lockedUntil",
      title: "Locked Until",
      type: "datetime",
      description: "Account is locked out of signing in until this time.",
      hidden: true,
    }),
    defineField({
      name: "currentSessionId",
      title: "Current Session ID",
      type: "string",
      description: "Identifies the one active session for this user — signing in elsewhere invalidates the old one.",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "lastLogin",
      title: "Last Login",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "username", role: "role", active: "active" },
    prepare({ title, subtitle, role, active }) {
      return {
        title: `${title}${active === false ? " (inactive)" : ""}`,
        subtitle: `@${subtitle} · ${role}`,
      };
    },
  },
});
