import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-cf-suggest/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => { vi.mocked(callLLM).mockReset(); });

describe("POST /api/spar-cf-suggest", () => {
  it("returns suggestion on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(llmJson({ suggestion: "Ask about evidence." }));

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            resolution: "Resolved: AI should be regulated",
            userSide: "aff",
            aiSide: "neg",
            aiConstructive: "AI is dangerous.",
            mode: "attack",
            aiQuestion: "Why is AI beneficial?",
          }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("suggestion");
      },
    });
  });

  it("returns 500 when callLLM throws", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("LLM error"));
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ resolution: "test" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(500);
      },
    });
  });
});
