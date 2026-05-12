// Minimal HTML sanitizer for safely rendering user-authored block content.
// Allows a tight allowlist of tags and attributes that the inline editor
// can produce (bold, italic, links, inline code, etc.) and strips everything
// else. The output is safe to pass to dangerouslySetInnerHTML.

const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "CODE", "BR", "SPAN", "A", "MARK",
]);

const ALLOWED_ATTR: Record<string, Set<string>> = {
  A: new Set(["href", "title", "target", "rel"]),
  SPAN: new Set(["style"]),
};

const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#)/i;
// Allow only color and background-color style properties.
const SAFE_STYLE_PROP = /^(color|background-color):\s*[a-zA-Z0-9#(),.\s%]+$/i;

export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") {
    // SSR fallback: aggressive strip of all tags.
    return html.replace(/<[^>]*>/g, "");
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  walk(template.content);
  return template.innerHTML;
}

function walk(root: Node) {
  // We mutate the DOM during traversal, so collect element references first.
  const elements: Element[] = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  let n: Node | null = tw.nextNode();
  while (n) {
    elements.push(n as Element);
    n = tw.nextNode();
  }

  for (const el of elements) {
    const tag = el.tagName.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Strip the tag but keep its text content.
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }

    // Drop disallowed attributes.
    for (const attr of Array.from(el.attributes)) {
      const allowed = ALLOWED_ATTR[tag];
      if (!allowed || !allowed.has(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Per-attribute validation.
      if ((tag === "A") && attr.name === "href") {
        if (!SAFE_URL_RE.test(attr.value)) {
          el.removeAttribute(attr.name);
        } else {
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
      }
      if (tag === "SPAN" && attr.name === "style") {
        const v = (attr.value || "").trim();
        if (!SAFE_STYLE_PROP.test(v)) {
          el.removeAttribute("style");
        }
      }
    }
  }
}
