import { defineField, defineType } from "sanity";

export default defineType({
  name: "registration",
  title: "Registration",
  type: "document",
  fields: [
    defineField({ name: "firstName", title: "First Name", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "lastName", title: "Last Name", type: "string", validation: (Rule) => Rule.required() }),

    // Address
    defineField({ name: "streetAddress", title: "Street Address", type: "string" }),
    defineField({ name: "unit", title: "Unit", type: "string" }),
    defineField({ name: "city", title: "City", type: "string" }),
    defineField({ name: "postalCode", title: "Postal Code", type: "string" }),

    // Contact
    defineField({ name: "homeNumber", title: "Home Number", type: "string" }),
    defineField({ name: "mobileNumber", title: "Mobile Number", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string", validation: (Rule) => Rule.required().email() }),
    defineField({ name: "alternateEmail", title: "Alternate Email", type: "string" }),
    defineField({ name: "dateOfBirth", title: "Date of Birth", type: "date" }),
    defineField({
      name: "heardAbout",
      title: "Heard About League Via",
      type: "string",
      options: {
        list: [
          { title: "Internet search", value: "internet" },
          { title: "Family League Member", value: "family" },
          { title: "Friend", value: "friend" },
          { title: "Facebook", value: "facebook" },
          { title: "Ads Within Community", value: "community" },
          { title: "Online Ad", value: "online" },
        ],
      },
    }),

    // Playing experience
    defineField({ name: "highestLevel", title: "Highest Level Played", type: "string" }),
    defineField({
      name: "category",
      title: "SPN/SPO/NSA Category",
      type: "string",
      options: {
        list: [
          { title: "Not Sure", value: "not-sure" },
          { title: "A", value: "a" },
          { title: "B", value: "b" },
          { title: "C", value: "c" },
          { title: "D", value: "d" },
          { title: "E / Rec", value: "e" },
        ],
      },
    }),
    defineField({
      name: "preferredPosition",
      title: "Preferred Position",
      type: "string",
      options: {
        list: [
          { title: "No Preference", value: "no-preference" },
          { title: "Infield", value: "infield" },
          { title: "Outfield", value: "outfield" },
        ],
      },
    }),
    defineField({
      name: "yearsExperience",
      title: "Years of Experience",
      type: "string",
      options: {
        list: [
          { title: "0-3", value: "0-3" },
          { title: "4-6", value: "4-6" },
          { title: "7-9", value: "7-9" },
          { title: "10+", value: "10+" },
        ],
      },
    }),
    defineField({ name: "experienceComments", title: "Comments on Experience", type: "text", rows: 3 }),

    // Pitching
    defineField({
      name: "canPitch",
      title: "Able to Pitch",
      type: "string",
      options: {
        list: [
          { title: "No", value: "no" },
          { title: "On an occasional basis", value: "occasional" },
          { title: "As my primary position", value: "primary" },
        ],
      },
    }),
    defineField({
      name: "yearsPitched",
      title: "Years Pitched",
      type: "string",
      options: {
        list: [
          { title: "0-3", value: "0-3" },
          { title: "4-6", value: "4-6" },
          { title: "7-9", value: "7-9" },
          { title: "10+", value: "10+" },
        ],
      },
    }),
    defineField({ name: "pitchingComments", title: "Comments on Pitching Experience", type: "text", rows: 3 }),

    // Admin-managed
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Unpaid", value: "unpaid" },
          { title: "Call-Up", value: "call-up" },
          { title: "Completed", value: "completed" },
          { title: "Spam", value: "spam" },
        ],
      },
      initialValue: "unpaid",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "emailStatus",
      title: "Confirmation Email",
      type: "string",
      options: {
        list: [
          { title: "Sent", value: "sent" },
          { title: "Failed", value: "failed" },
        ],
      },
      initialValue: "sent",
    }),
    defineField({
      name: "submittedAt",
      title: "Submitted At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  orderings: [{ title: "Newest first", name: "submittedDesc", by: [{ field: "submittedAt", direction: "desc" }] }],
  preview: {
    select: { first: "firstName", last: "lastName", status: "status", email: "email" },
    prepare({ first, last, status, email }) {
      return { title: `${first ?? ""} ${last ?? ""}`.trim() || email, subtitle: status };
    },
  },
});
