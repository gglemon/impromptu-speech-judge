import { describe, it, expect } from "vitest";
import { impromptuFeedbackPrompt } from "../prompts/impromptu";

describe("impromptuFeedbackPrompt", () => {
  const params = {
    topic: "The role of technology in education",
    transcript: "Technology has transformed classrooms around the world.",
    duration_seconds: 240,
    difficulty: "medium",
    speech_length_seconds: 300,
  };

  it("returns a non-empty string", () => {
    expect(impromptuFeedbackPrompt(params).length).toBeGreaterThan(100);
  });

  it("includes the topic", () => {
    expect(impromptuFeedbackPrompt(params)).toContain(params.topic);
  });

  it("includes the transcript", () => {
    expect(impromptuFeedbackPrompt(params)).toContain(params.transcript);
  });

  it("includes duration info", () => {
    const p = impromptuFeedbackPrompt(params);
    expect(p).toContain("240 seconds");
    expect(p).toContain("300 seconds");
  });

  it("calculates target in minutes correctly", () => {
    // 300s → 5 minutes
    expect(impromptuFeedbackPrompt(params)).toContain("5 minutes");
  });

  it("calculates lower bound (80% of target) for time penalty", () => {
    // 80% of 300 = 240
    expect(impromptuFeedbackPrompt(params)).toContain("240 seconds");
  });

  it("requests all three ballot pillars in JSON", () => {
    const p = impromptuFeedbackPrompt(params);
    expect(p).toContain("content");
    expect(p).toContain("organization");
    expect(p).toContain("delivery");
  });

  it("requests score, summary, pillar_scores, strengths, improvements", () => {
    const p = impromptuFeedbackPrompt(params);
    expect(p).toContain("score");
    expect(p).toContain("summary");
    expect(p).toContain("pillar_scores");
    expect(p).toContain("strengths");
    expect(p).toContain("improvements");
  });

  it("includes weighted scoring description", () => {
    expect(impromptuFeedbackPrompt(params)).toContain("40%");
    expect(impromptuFeedbackPrompt(params)).toContain("35%");
    expect(impromptuFeedbackPrompt(params)).toContain("25%");
  });

  it("assesses structure with intro, body, conclusion", () => {
    const p = impromptuFeedbackPrompt(params);
    expect(p).toContain("intro");
    expect(p).toContain("body");
    expect(p).toContain("conclusion");
  });
});
