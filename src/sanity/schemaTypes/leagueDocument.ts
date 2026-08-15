import { defineField, defineType } from "sanity";

export default defineType({
  name: "leagueDocument",
  title: "League Document",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Rules & Regulations", value: "Rules & Regulations" },
          { title: "AGM Documents", value: "AGM Documents" },
          { title: "General", value: "General" },
        ],
      },
      initialValue: "General",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
    }),
    defineField({
      name: "contentType",
      title: "Content Type",
      type: "string",
      description: "An uploaded file (PDF/DOC/etc.) or a page written directly on the site.",
      options: {
        list: [
          { title: "Uploaded File", value: "file" },
          { title: "Written Page", value: "page" },
        ],
      },
      initialValue: "file",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "file",
      title: "Document File",
      type: "file",
      description: "PDF, TXT, DOC, DOCX, PPT, or PPTX.",
      options: {
        accept:
          ".pdf,.txt,.doc,.docx,.ppt,.pptx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
      hidden: ({ document }) => document?.contentType === "page",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      description: "Used in the page's URL — only needed for a Written Page.",
      hidden: ({ document }) => document?.contentType !== "page",
      validation: (Rule) =>
        Rule.custom((value, context) =>
          (context.document as { contentType?: string })?.contentType === "page" && !value
            ? "Required for a Written Page."
            : true
        ),
    }),
    defineField({
      name: "pageBody",
      title: "Page Content",
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
                    validation: (Rule) => Rule.required().uri({ scheme: ["http", "https", "mailto"] }),
                  }),
                  defineField({ name: "blank", title: "Open in new tab", type: "boolean", initialValue: true }),
                ],
              },
            ],
          },
        },
      ],
      hidden: ({ document }) => document?.contentType !== "page",
    }),
    defineField({
      name: "badge",
      title: "Vote Result Badge",
      type: "string",
      description: "Optional — shown for AGM motions.",
      options: {
        list: [
          { title: "Passed", value: "PASSED" },
          { title: "Failed", value: "FAILED" },
          { title: "N/A", value: "NA" },
        ],
      },
      hidden: ({ document }) => document?.category !== "AGM Documents",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first within a category.",
      initialValue: 0,
    }),
  ],
  orderings: [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", subtitle: "category" },
  },
});
