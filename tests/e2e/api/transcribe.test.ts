// Set GROQ_API_KEY before route module is imported (captured at module level)
const { GROQ_API_KEY_RESTORE } = vi.hoisted(() => {
  process.env.GROQ_API_KEY = "test-key";
  return { GROQ_API_KEY_RESTORE: process.env.GROQ_API_KEY };
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/transcribe/route";
import { stubGroqFetch, stubGroqFetchError } from "../setup/mockFetch";
import { readFileSync } from "fs";
import { join } from "path";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/transcribe", () => {
  it("returns transcript on success", async () => {
    stubGroqFetch("hello world");

    const audioBytes = readFileSync(
      join(__dirname, "../setup/fixtures/audio.m4a")
    );

    await testApiHandler({
      appHandler: handler,
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
        expect(data.transcript).toBe("hello world");
        expect(data).toHaveProperty("audioUrl");
      },
    });
  });

  it("returns 400 when audio field is missing", async () => {
    stubGroqFetch();

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/no audio/i);
      },
    });
  });

  it("returns 500 when Groq returns an error", async () => {
    stubGroqFetchError();

    const audioBytes = readFileSync(
      join(__dirname, "../setup/fixtures/audio.m4a")
    );

    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const formData = new FormData();
        formData.append(
          "audio",
          new Blob([audioBytes], { type: "audio/m4a" }),
          "test.m4a"
        );
        const res = await fetch({ method: "POST", body: formData });
        expect(res.status).toBe(500);
      },
    });
  });
});
