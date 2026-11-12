import { defineField, defineType } from "sanity";

export default defineType({
  name: "teamLoginAttempt",
  title: "Team Login Attempt",
  type: "document",
  fields: [
    defineField({ name: "username", title: "Username", type: "string" }),
    defineField({ name: "ip", title: "IP Address", type: "string" }),
    defineField({ name: "success", title: "Success", type: "boolean" }),
    defineField({ name: "reason", title: "Reason", type: "string" }),
    defineField({ name: "createdAt", title: "Created At", type: "datetime", initialValue: () => new Date().toISOString() }),
  ],
  preview: {
    select: { title: "username", success: "success", createdAt: "createdAt" },
    prepare({ title, success, createdAt }) {
      return { title: title || "(unknown)", subtitle: `${success ? "Success" : "Failed"} · ${createdAt}` };
    },
  },
});
