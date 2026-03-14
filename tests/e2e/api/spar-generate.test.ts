import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-generate/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => {
  vi.mocked(callLLM).mockReset();
});

describe("POST /api/spar-generate", () => {
  it("returns aiConstructive and aiSide on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      llmJson({ aiConstructive: "Climate change is real." })
    );

    await testApiHandler({
      appHandler: handler,
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
        expect(data.aiConstructive).toBe("Climate change is real.");
        expect(data).toHaveProperty("aiSide");
      },
    });
  });

  it("returns 500 when callLLM throws", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("LLM unavailable"));

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ resolution: "test", userSide: "aff" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toMatch(/LLM unavailable/);
      },
    });
  });
});
