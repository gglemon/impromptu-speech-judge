import { describe, expect, it } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/generate-topic/route";

describe("POST /api/generate-topic", () => {
  it("returns a topic for medium difficulty", async () => {
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
        expect(data).toHaveProperty("topic");
        expect(typeof data.topic).toBe("string");
        expect(data.topic.length).toBeGreaterThan(0);
      },
    });
  });

  it("falls back to medium pool for unknown difficulty", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ difficulty: "unknown" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("topic");
      },
    });
  });
});
