export function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

export function wordCount(text: string) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
