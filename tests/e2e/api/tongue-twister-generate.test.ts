import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/tongue-twister-generate/route";
import { llmJson } from "../setup/mockLLM";

vi.mock("@/lib/llm", () => ({ callLLM: vi.fn() }));
import { callLLM } from "@/lib/llm";

beforeEach(() => { vi.mocked(callLLM).mockReset(); });

describe("POST /api/tongue-twister-generate", () => {
  it("returns a tongue twister on success", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      llmJson({ twister: "Red lorry, yellow lorry." })
    );

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ difficulty: "medium" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("twister");
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
          body: JSON.stringify({ difficulty: "medium" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(500);
      },
    });
  });
});
