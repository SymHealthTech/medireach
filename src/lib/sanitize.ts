/**
 * Allow-list sanitiser for the doctor's rich-text bio: bold, italic, lists and
 * paragraphs only. Every other tag is dropped, every attribute is removed and
 * all text is escaped, so the output is safe for dangerouslySetInnerHTML.
 */

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li"]);
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
// Tags whose *content* must be discarded too, not just the tag itself.
const DROP_CONTENT_RE = /<(script|style|iframe|object|embed|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const ENTITY_RE = /&(?:[a-zA-Z]{2,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});/y;

function escapeText(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "&") {
      ENTITY_RE.lastIndex = i;
      out += ENTITY_RE.test(text) ? "&" : "&amp;";
    } else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else out += ch;
  }
  return out;
}

export function sanitizeBioHtml(html: string | null | undefined): string {
  if (!html) return "";
  const input = html.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_CONTENT_RE, "");
  let out = "";
  let last = 0;
  for (const m of input.matchAll(TAG_RE)) {
    out += escapeText(input.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    if (!ALLOWED.has(tag)) continue;
    if (tag === "br") out += "<br>";
    else out += closing ? `</${tag}>` : `<${tag}>`;
  }
  out += escapeText(input.slice(last));
  return out.trim();
}

/** Plain-text version (meta descriptions, compliance scanning). */
export function bioText(html: string | null | undefined): string {
  return sanitizeBioHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
