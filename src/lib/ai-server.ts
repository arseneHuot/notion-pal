import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Server-side function that calls Gemini Flash with the user's prompt + a
 * compact workspace context. Returns the full text answer plus the page IDs
 * we provided as sources so the UI can render citation chips.
 *
 * The Gemini API key NEVER leaves the server — see `.env.local`. If the
 * `GEMINI_API_KEY` env var is missing we fall through to a clear error so
 * the client surfaces it instead of silently failing.
 */
export const askAI = createServerFn({ method: "POST" })
  .inputValidator((input: {
    prompt: string;
    pageTitle?: string;
    selection?: string;
    sources?: Array<{ pageId: string; title: string; snippet?: string }>;
  }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        answer:
          "⚠️ The server is missing `GEMINI_API_KEY`. Add it to `.env.local` and restart the dev server.",
        sources: [] as Array<{ pageId: string; title: string }>,
        error: "missing_api_key" as const,
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build a compact system-style preamble that orients Gemini to the
    // user's workspace without leaking unrelated pages. We include up to
    // 5 source pages from the client-side keyword match.
    const contextChunks: string[] = [];
    if (data.pageTitle) {
      contextChunks.push(`Current page: "${data.pageTitle}"`);
    }
    if (data.selection) {
      contextChunks.push(`User selected text: "${data.selection.slice(0, 600)}"`);
    }
    if (data.sources && data.sources.length > 0) {
      contextChunks.push("Relevant pages in this workspace:");
      for (const s of data.sources.slice(0, 5)) {
        const snippet = s.snippet ? ` — ${s.snippet.slice(0, 200)}` : "";
        contextChunks.push(`- "${s.title}"${snippet}`);
      }
    }
    const contextBlock = contextChunks.length
      ? `Context:\n${contextChunks.join("\n")}\n\n`
      : "";

    const userText = `${contextBlock}User question: ${data.prompt}\n\nAnswer briefly. Use Markdown (bold, lists, fenced code blocks). When you reference a workspace page, mention its title in bold.`;

    try {
      const response = await ai.models.generateContentStream({
        model: "gemini-flash-latest",
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }],
          },
        ],
      });

      let answer = "";
      for await (const chunk of response) {
        if (chunk.text) answer += chunk.text;
      }

      return {
        answer: answer.trim() || "(empty response)",
        sources: (data.sources ?? []).slice(0, 5).map((s) => ({
          pageId: s.pageId,
          title: s.title,
        })),
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        answer: `⚠️ Gemini request failed: ${message}`,
        sources: [] as Array<{ pageId: string; title: string }>,
        error: "request_failed" as const,
      };
    }
  });
