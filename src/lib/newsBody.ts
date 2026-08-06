/**
 * The custom admin panel edits news article bodies as plain text (not
 * Sanity Studio's rich-text editor), so links are authored with lightweight
 * markdown syntax — [label](https://example.com) — and converted to/from
 * real Sanity portable-text blocks with `link` mark annotations here.
 */
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;

function makeKey(prefix: string, index: number): string {
  return `${prefix}${index}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Span {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
}

interface LinkMarkDef {
  _type: "link";
  _key: string;
  href: string;
  blank: boolean;
}

interface Block {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: LinkMarkDef[];
  children: Span[];
}

export function plainTextToBlocks(text: string): Block[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph, blockIndex) => {
    const markDefs: LinkMarkDef[] = [];
    const children: Span[] = [];
    let lastIndex = 0;
    let linkCount = 0;

    LINK_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = LINK_PATTERN.exec(paragraph))) {
      const [full, label, href] = match;
      if (match.index > lastIndex) {
        children.push({ _type: "span", _key: makeKey("span", children.length), text: paragraph.slice(lastIndex, match.index) });
      }
      const markKey = makeKey("link", linkCount++);
      markDefs.push({ _type: "link", _key: markKey, href, blank: true });
      children.push({ _type: "span", _key: makeKey("span", children.length), text: label, marks: [markKey] });
      lastIndex = match.index + full.length;
    }
    if (lastIndex < paragraph.length) {
      children.push({ _type: "span", _key: makeKey("span", children.length), text: paragraph.slice(lastIndex) });
    }
    if (children.length === 0) {
      children.push({ _type: "span", _key: makeKey("span", 0), text: "" });
    }

    return {
      _type: "block",
      _key: makeKey("block", blockIndex),
      style: "normal",
      markDefs,
      children,
    };
  });
}

export function blocksToPlainText(body: unknown): string {
  if (!Array.isArray(body)) return "";
  return body
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      const b = block as { children?: unknown; markDefs?: unknown };
      const markDefs = Array.isArray(b.markDefs) ? (b.markDefs as { _key: string; _type: string; href?: string }[]) : [];
      const children = Array.isArray(b.children) ? (b.children as { text?: string; marks?: string[] }[]) : [];
      return children
        .map((child) => {
          const text = child.text ?? "";
          const linkMark = child.marks?.find((markKey) => markDefs.some((d) => d._key === markKey && d._type === "link"));
          if (linkMark) {
            const def = markDefs.find((d) => d._key === linkMark);
            return `[${text}](${def?.href ?? ""})`;
          }
          return text;
        })
        .join("");
    })
    .join("\n\n");
}
