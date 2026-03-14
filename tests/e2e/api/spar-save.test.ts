import { describe, expect, it } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/spar-save/route";

describe("POST /api/spar-save", () => {
  it("saves session and returns { saved: true }", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append(
          "sessionData",
          JSON.stringify({ resolution: "AI should be regulated" })
        );
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.saved).toBe(true);
        expect(data).toHaveProperty("path");
      },
    });
  });

  it("returns 400 when sessionData is missing", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(400);
      },
    });
  });

  it("returns 500 when sessionData is invalid JSON", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append("sessionData", "not-valid-json{{{");
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(500);
      },
    });
  });
});
