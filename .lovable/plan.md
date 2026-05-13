## Change

In `src/lib/ai-server.ts`, update the Gemini config to use `ThinkingLevel.MINIMAL` instead of the current `"HIGH"` cast.

### Edit

- Add import: `import { ThinkingLevel } from "@google/genai";`
- Replace:
  ```ts
  thinkingConfig: { thinkingLevel: "HIGH" as never },
  ```
  with:
  ```ts
  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  ```

No other files affected.