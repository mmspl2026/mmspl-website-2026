// Shared between the upload API route and the Documents tab's file input so
// both sides always agree on what's accepted.

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
] as const;

export const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx", ".ppt", ".pptx"] as const;

export const ACCEPTED_DOCUMENT_ACCEPT_ATTR = [
  ...ACCEPTED_DOCUMENT_MIME_TYPES,
  ...ACCEPTED_DOCUMENT_EXTENSIONS,
].join(",");

/**
 * Some browsers/OSes report an empty or generic `type` for .doc/.txt files,
 * so fall back to the file extension rather than trusting MIME alone.
 */
export function isAcceptedDocumentFile(file: { type?: string; name: string }): boolean {
  if (file.type && (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}
