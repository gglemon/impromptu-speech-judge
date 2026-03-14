import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-cf-respond/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => { vi.mocked(callLLM).mockReset(); });

describe("POST /api/spar-cf-respond", () => {
  it("returns response on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(llmJson({ response: "Because regulations exist." }));

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({
            resolution: "Resolved: AI should be regulated",
            aiSide: "neg",
            aiConstructive: "AI is dangerous.",
            question: "What do you mean by dangerous?",
          }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("response");
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
