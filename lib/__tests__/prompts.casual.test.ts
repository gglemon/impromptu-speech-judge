import { describe, it, expect } from "vitest";
import {
  casualFeedbackPrompt,
  casualOutlinePrompt,
  casualExamplePrompt,
  casualExampleExplanationPrompt,
} from "../prompts/casual";

describe("casualFeedbackPrompt", () => {
  const params = {
    topic: "My favorite animal",
    transcript: "I love dogs. They are very loyal.",
    speechLength: 60,
    actualDuration: 55,
  };

  it("returns a non-empty string", () => {
    expect(casualFeedbackPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the topic", () => {
    expect(casualFeedbackPrompt(params)).toContain("My favorite animal");
  });

  it("includes the transcript", () => {
    expect(casualFeedbackPrompt(params)).toContain("I love dogs.");
  });

  it("includes duration info when actualDuration is provided", () => {
    const p = casualFeedbackPrompt(params);
    expect(p).toContain("Target: 60s");
    expect(p).toContain("55s");
  });

  it("omits duration note when actualDuration is absent", () => {
    const p = casualFeedbackPrompt({ ...params, actualDuration: undefined });
    expect(p).not.toContain("Target:");
  });

  it("requests score, emoji, summary, highlights, tip, ai_example in JSON", () => {
    const p = casualFeedbackPrompt(params);
    expect(p).toContain("score");
    expect(p).toContain("emoji");
    expect(p).toContain("summary");
    expect(p).toContain("highlights");
    expect(p).toContain("tip");
    expect(p).toContain("ai_example");
  });

  it("calculates word target proportional to speech length", () => {
    const short = casualFeedbackPrompt({ ...params, speechLength: 30 });
    const long = casualFeedbackPrompt({ ...params, speechLength: 120 });
    // 30s → ~75 words, 120s → ~300 words — both should appear in the prompts
    expect(short).toContain("75");
    expect(long).toContain("300");
  });
});

describe("casualOutlinePrompt", () => {
  it("returns a non-empty string", () => {
    expect(casualOutlinePrompt({ topic: "My pet", speechLength: 60 }).length).toBeGreaterThan(50);
  });

  it("includes the topic", () => {
    expect(casualOutlinePrompt({ topic: "My pet", speechLength: 60 })).toContain("My pet");
  });

  it("requests 2 points for 30s speech", () => {
    const p = casualOutlinePrompt({ topic: "X", speechLength: 30 });
    expect(p).toContain("Number of main points: 2");
  });

  it("requests 3 points for 60s speech", () => {
    const p = casualOutlinePrompt({ topic: "X", speechLength: 60 });
    expect(p).toContain("Number of main points: 3");
  });

  it("requests 4 points for 90s speech", () => {
    const p = casualOutlinePrompt({ topic: "X", speechLength: 90 });
    expect(p).toContain("Number of main points: 4");
  });

  it("requests 5 points for 120s speech", () => {
    const p = casualOutlinePrompt({ topic: "X", speechLength: 120 });
    expect(p).toContain("Number of main points: 5");
  });

  it("requests opening, points, closing in JSON", () => {
    const p = casualOutlinePrompt({ topic: "X", speechLength: 60 });
    expect(p).toContain("opening");
    expect(p).toContain("points");
    expect(p).toContain("closing");
  });
});

describe("casualExamplePrompt", () => {
  const params = { topic: "My favorite season", speechLength: 60 };

  it("returns a non-empty string", () => {
    expect(casualExamplePrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the topic", () => {
    expect(casualExamplePrompt(params)).toContain("My favorite season");
  });

  it("mentions expected word count", () => {
    // 60s → 150 words
    expect(casualExamplePrompt(params)).toContain("150");
  });

  it("instructs to structure with opening, middle, closing", () => {
    const p = casualExamplePrompt(params);
    expect(p).toContain("opening paragraph");
    expect(p).toContain("closing paragraph");
  });

  it("requests ai_example in JSON output", () => {
    expect(casualExamplePrompt(params)).toContain("ai_example");
  });
});

describe("casualExampleExplanationPrompt", () => {
  const params = {
    topic: "My hobby",
    userTranscript: "I like to draw.",
    aiExample: "Drawing helps me express creativity and relax after a long day.",
  };

  it("returns a non-empty string", () => {
    expect(casualExampleExplanationPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes both speeches", () => {
    const p = casualExampleExplanationPrompt(params);
    expect(p).toContain("I like to draw.");
    expect(p).toContain("Drawing helps me express creativity");
  });

  it("limits to 3-5 bullet points", () => {
    expect(casualExampleExplanationPrompt(params)).toContain("3–5 bullet points");
  });

  it("requires bullet points starting with '- '", () => {
    expect(casualExampleExplanationPrompt(params)).toContain('Start each bullet with "- "');
  });

  it("prohibits filler phrases", () => {
    const p = casualExampleExplanationPrompt(params);
    expect(p).toContain("Sure");
    expect(p).toContain("Here is");
  });
});
