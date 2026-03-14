import { describe, it, expect } from "vitest";
import {
  debateArgumentFeedbackPrompt,
  debateExampleArgumentPrompt,
  debateExampleExplanationPrompt,
  debateHintPrompt,
  debateRedoComparisonPrompt,
} from "../prompts/debate";

describe("debateArgumentFeedbackPrompt", () => {
  const params = {
    resolution: "Schools should have longer lunch breaks",
    side: "aff" as const,
    argument: "Students need time to eat properly.",
    round: 1,
    previousArguments: [] as Array<{ side: string; round: number; transcript: string }>,
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(debateArgumentFeedbackPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(debateArgumentFeedbackPrompt(params)).toContain(params.resolution);
  });

  it("includes the student's argument", () => {
    expect(debateArgumentFeedbackPrompt(params)).toContain("Students need time to eat properly.");
  });

  it("shows PRO for aff side", () => {
    expect(debateArgumentFeedbackPrompt(params)).toContain("PRO");
  });

  it("shows CON for neg side", () => {
    const p = debateArgumentFeedbackPrompt({ ...params, side: "neg" });
    expect(p).toContain("CON");
  });

  it("includes previous arguments context when provided", () => {
    const withHistory = {
      ...params,
      previousArguments: [{ side: "aff", round: 1, transcript: "Earlier point" }],
    };
    expect(debateArgumentFeedbackPrompt(withHistory)).toContain("Earlier point");
  });

  it("requests score, summary, criterion_scores in JSON", () => {
    const p = debateArgumentFeedbackPrompt(params);
    expect(p).toContain("score");
    expect(p).toContain("criterion_scores");
    expect(p).toContain("strengths");
    expect(p).toContain("improvements");
  });

  it("uses encouraging tone for easy difficulty", () => {
    const p = debateArgumentFeedbackPrompt({ ...params, difficulty: "easy" });
    expect(p).toContain("encouraging");
  });
});

describe("debateExampleArgumentPrompt", () => {
  const params = {
    resolution: "Homework should be optional",
    side: "neg" as const,
    round: 2,
    difficulty: "medium" as const,
    userTranscript: "Homework teaches discipline.",
    improvements: [] as string[],
  };

  it("returns a non-empty string", () => {
    expect(debateExampleArgumentPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the user's transcript", () => {
    expect(debateExampleArgumentPrompt(params)).toContain("Homework teaches discipline.");
  });

  it("limits to 3-5 sentences", () => {
    expect(debateExampleArgumentPrompt(params)).toContain("3-5 sentences");
  });

  it("includes improvement context when provided", () => {
    const p = debateExampleArgumentPrompt({ ...params, improvements: ["Add evidence"] });
    expect(p).toContain("Add evidence");
  });

  it("includes the correct round number", () => {
    expect(debateExampleArgumentPrompt(params)).toContain("Round: 2");
  });
});

describe("debateExampleExplanationPrompt", () => {
  const params = {
    userArgument: "Homework is bad.",
    exampleArgument: "Homework reduces family time and increases stress.",
    side: "neg" as const,
    resolution: "Homework should be banned",
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(debateExampleExplanationPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes both arguments", () => {
    const p = debateExampleExplanationPrompt(params);
    expect(p).toContain("Homework is bad.");
    expect(p).toContain("Homework reduces family time");
  });

  it("instructs to keep under 5 sentences", () => {
    expect(debateExampleExplanationPrompt(params)).toContain("5 sentences");
  });

  it("prohibits filler words", () => {
    const p = debateExampleExplanationPrompt(params);
    expect(p).toContain("Sure");
    expect(p).toContain("Ok");
  });
});

describe("debateHintPrompt", () => {
  const params = {
    resolution: "Zoos should be abolished",
    side: "aff" as const,
    round: 1,
    difficulty: "easy" as const,
    previousArguments: [] as Array<{ side: string; round: number; transcript: string }>,
  };

  it("returns a non-empty string", () => {
    expect(debateHintPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(debateHintPrompt(params)).toContain(params.resolution);
  });

  it("specifies FOR side for aff", () => {
    expect(debateHintPrompt(params)).toContain("FOR");
  });

  it("specifies AGAINST side for neg", () => {
    const p = debateHintPrompt({ ...params, side: "neg" });
    expect(p).toContain("AGAINST");
  });

  it("includes previous arguments when provided", () => {
    const withHistory = {
      ...params,
      previousArguments: [{ side: "aff", round: 1, transcript: "Animals deserve freedom." }],
    };
    const p = debateHintPrompt(withHistory);
    expect(p).toContain("Animals deserve freedom.");
    expect(p).toContain("do NOT repeat");
  });

  it("keeps hint to 2-4 sentences instruction", () => {
    expect(debateHintPrompt(params)).toContain("2-4 sentences");
  });
});

describe("debateRedoComparisonPrompt", () => {
  const params = {
    resolution: "Pets should be allowed in schools",
    side: "aff" as const,
    originalTranscript: "Pets are nice.",
    originalFeedback: { score: 5 },
    redoTranscript: "Pets reduce student stress and improve focus.",
    redoFeedback: { score: 8 },
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(debateRedoComparisonPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes both transcripts and scores", () => {
    const p = debateRedoComparisonPrompt(params);
    expect(p).toContain("Pets are nice.");
    expect(p).toContain("Pets reduce student stress");
    expect(p).toContain("5/10");
    expect(p).toContain("8/10");
  });

  it("requests key_improvements, regressions, verdict in JSON", () => {
    const p = debateRedoComparisonPrompt(params);
    expect(p).toContain("key_improvements");
    expect(p).toContain("regressions");
    expect(p).toContain("verdict");
  });

  it("uses simple language for easy difficulty", () => {
    const p = debateRedoComparisonPrompt({ ...params, difficulty: "easy" });
    expect(p).toContain("3rd or 4th grader");
  });
});
