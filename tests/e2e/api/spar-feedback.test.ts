import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-feedback/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => { vi.mocked(callLLM).mockReset(); });

describe("POST /api/spar-feedback", () => {
  it("returns feedback on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(llmJson({ score: 8, summary: "Great job." }));

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            resolution: "Resolved: AI should be regulated",
            userSide: "aff",
            aiConstructive: "AI is dangerous.",
            aiRebuttal: "Your evidence is weak.",
            userConstructive: "AI is beneficial.",
            userCrossfire: "Define dangerous.",
            userRebuttal: "My evidence is strong.",
          }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("score");
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
