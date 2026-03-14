import { describe, expect, it } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/recording-save/route";

describe("POST /api/recording-save", () => {
  it("saves session and returns { saved: true }", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append(
          "sessionData",
          JSON.stringify({ mode: "impromptu", topic: "Climate change" })
        );
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.saved).toBe(true);
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

  it("returns 400 when mode or topic is missing from sessionData", async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append("sessionData", JSON.stringify({ mode: "impromptu" }));
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
