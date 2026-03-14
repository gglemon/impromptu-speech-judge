import { describe, it, expect } from "vitest";
import {
  tongueTwisterGeneratePrompt,
  tongueTwisterFeedbackPrompt,
} from "../prompts/tongue-twisters";

describe("tongueTwisterGeneratePrompt", () => {
  it("returns a non-empty string for each difficulty", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(tongueTwisterGeneratePrompt({ difficulty: d }).length).toBeGreaterThan(30);
    }
  });

  it("mentions the difficulty in the prompt", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(tongueTwisterGeneratePrompt({ difficulty: d })).toContain(d);
    }
  });

  it("easy guide specifies short length", () => {
    const p = tongueTwisterGeneratePrompt({ difficulty: "easy" });
    expect(p).toContain("under 10 words");
  });

  it("hard guide specifies 2 sentences", () => {
    const p = tongueTwisterGeneratePrompt({ difficulty: "hard" });
    expect(p).toContain("2 sentences");
  });

  it("medium guide targets 10-15 words", () => {
    const p = tongueTwisterGeneratePrompt({ difficulty: "medium" });
    expect(p).toContain("10-15 words");
  });

  it("prohibits famous tongue twisters", () => {
    const p = tongueTwisterGeneratePrompt({ difficulty: "easy" });
    expect(p).toContain("she sells seashells");
    expect(p).toContain("Peter Piper");
  });

  it("requests twister field in JSON output", () => {
    expect(tongueTwisterGeneratePrompt({ difficulty: "medium" })).toContain('"twister"');
  });
});

describe("tongueTwisterFeedbackPrompt", () => {
  const params = {
    twister: "She sells seashells by the seashore.",
    transcript: "She sells sea shells by the sea shore.",
  };

  it("returns a non-empty string", () => {
    expect(tongueTwisterFeedbackPrompt(params).length).toBeGreaterThan(30);
  });

  it("includes the tongue twister", () => {
    expect(tongueTwisterFeedbackPrompt(params)).toContain(params.twister);
  });

  it("includes the student's transcript", () => {
    expect(tongueTwisterFeedbackPrompt(params)).toContain(params.transcript);
  });

  it("requests accuracy and fluency scores", () => {
    const p = tongueTwisterFeedbackPrompt(params);
    expect(p).toContain("accuracy");
    expect(p).toContain("fluency");
  });

  it("requests summary, tricky_parts, tip in output", () => {
    const p = tongueTwisterFeedbackPrompt(params);
    expect(p).toContain("summary");
    expect(p).toContain("tricky_parts");
    expect(p).toContain("tip");
  });
});
