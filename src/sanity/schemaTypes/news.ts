import { defineField, defineType } from "sanity";

export default defineType({
  name: "news",
  title: "News",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (Rule) =>
                      Rule.required().uri({ scheme: ["http", "https", "mailto"] }),
                  }),
                  defineField({
                    name: "blank",
                    title: "Open in new tab",
                    type: "boolean",
                    initialValue: true,
                  }),
                ],
              },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Describe the image for screen readers",
        }),
      ],
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "tag",
      title: "Tag",
      type: "string",
      options: {
        list: [
          { title: "League News", value: "league" },
          { title: "Game Results", value: "results" },
          { title: "Charity", value: "charity" },
          { title: "Announcement", value: "announcement" },
          { title: "Registration", value: "registration" },
        ],
      },
    }),
    defineField({
      name: "notifySubscribers",
      title: "Email subscribers when published",
      type: "boolean",
      initialValue: false,
      description: "When checked and this post is published, subscribers receive an email announcement.",
    }),
  ],
  preview: {
    select: { title: "title", media: "photo", date: "date" },
    prepare({ title, media, date }) {
      return {
        title,
        subtitle: date ? new Date(date).toLocaleDateString() : "",
        media,
      };
    },
  },
});
