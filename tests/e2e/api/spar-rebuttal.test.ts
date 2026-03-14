import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-rebuttal/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => { vi.mocked(callLLM).mockReset(); });

describe("POST /api/spar-rebuttal", () => {
  it("returns rebuttal on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(llmJson({ rebuttal: "Your point fails." }));

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            resolution: "Resolved: AI should be regulated",
            aiSide: "neg",
            aiConstructive: "AI is dangerous.",
            userConstructive: "AI is beneficial.",
            userCrossfire: "How do you define dangerous?",
          }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("rebuttal");
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
