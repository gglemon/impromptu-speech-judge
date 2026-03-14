import { vi } from "vitest";

// Stubs global.fetch to return a successful Groq transcription response.
// The transcribe route calls: const data = await res.json() → data.text
export function stubGroqFetch(transcript = "fixture transcript"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: transcript }),
    } as Response)
  );
}

// Stubs global.fetch to simulate a Groq API error.
export function stubGroqFetchError(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Groq upstream error" } }),
    } as unknown as Response)
  );
}
