import { defineField, defineType } from "sanity";

function heroImageField(name: string, title: string) {
  return defineField({
    name,
    title,
    type: "image",
    options: { hotspot: true },
    fieldset: name === "heroImage" ? undefined : "pageHeroes",
    fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
  });
}

export default defineType({
  name: "adminSettings",
  title: "Site Settings",
  type: "document",
  fieldsets: [
    {
      name: "pageHeroes",
      title: "Page Hero Images",
      description:
        "Optional per-page hero photos. Any page left blank here falls back to the Home Hero Image above.",
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    heroImageField("heroImage", "Home Hero Image"),
    heroImageField("standingsHeroImage", "Standings Hero Image"),
    heroImageField("scheduleHeroImage", "Schedule Hero Image"),
    heroImageField("awardsHeroImage", "Awards Hero Image"),
    heroImageField("registerHeroImage", "Register Hero Image"),
    heroImageField("aboutHeroImage", "About Hero Image"),
    heroImageField("contactHeroImage", "Contact Hero Image"),
    heroImageField("notificationsHeroImage", "Notifications Hero Image"),
    defineField({
      name: "sponsorText",
      title: "Sponsor CTA Text",
      type: "text",
      description: "Shown in the sponsorship call-to-action section on the homepage.",
    }),
    defineField({
      name: "registrationOpen",
      title: "Registration Open",
      type: "boolean",
      initialValue: false,
      description: "Turns the Register page's form on or off league-wide.",
    }),
    defineField({
      name: "registrationFee",
      title: "Registration Fee (CAD)",
      type: "number",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Settings" };
    },
  },
});
