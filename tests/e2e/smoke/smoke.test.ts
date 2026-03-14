import { describe, expect, it } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as sparHandler from "@/app/api/spar-generate/route";
import * as transcribeHandler from "@/app/api/transcribe/route";
import { readFileSync } from "fs";
import { join } from "path";

// Runs only when SMOKE=true is set in the environment.
// Requires: GROQ_API_KEY + LLM running (Ollama or OPENROUTER_API_KEY)
const smokeEnabled = !!process.env.SMOKE;

describe.skipIf(!smokeEnabled)("smoke: real API calls", () => {
  it(
    "spar-generate returns a real AI response",
    async () => {
      await testApiHandler({
        appHandler: sparHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "POST",
            body: JSON.stringify({
              resolution: "Resolved: AI should be regulated",
              userSide: "aff",
              difficulty: "medium",
              aiDifficulty: "medium",
            }),
            headers: { "content-type": "application/json" },
          });
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(typeof data.aiConstructive).toBe("string");
          expect(data.aiConstructive.length).toBeGreaterThan(20);
        },
      });
    },
    60_000
  );

  it(
    "transcribe returns a real transcript",
    async () => {
      const audioBytes = readFileSync(
        join(__dirname, "../setup/fixtures/audio.m4a")
      );

      await testApiHandler({
        appHandler: transcribeHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append(
            "audio",
            new Blob([audioBytes], { type: "audio/m4a" }),
            "test.m4a"
          );
          const res = await fetch({ method: "POST", body: formData });
          expect(res.status).toBe(200);
          const data = await res.json();
          // Silence produces an empty or near-empty transcript — just check shape
          expect(data).toHaveProperty("transcript");
        },
      });
    },
    30_000
  );
});
