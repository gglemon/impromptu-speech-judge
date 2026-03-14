import { describe, it, expect } from "vitest";
import {
  sparConstructivePrompt,
  sparRebuttalPrompt,
  sparCrossfirePrompt,
  sparCfSuggestPrompt,
  sparCfRespondPrompt,
  sparPrepHintsPrompt,
  sparUserRebuttalHintPrompt,
  sparFeedbackPrompt,
} from "../prompts/spar";

const BASE = {
  resolution: "Technology does more good than harm",
  userSide: "aff" as const,
  difficulty: "medium" as const,
  aiDifficulty: "medium" as const,
};

describe("sparConstructivePrompt", () => {
  it("returns a non-empty string", () => {
    expect(typeof sparConstructivePrompt(BASE)).toBe("string");
    expect(sparConstructivePrompt(BASE).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(sparConstructivePrompt(BASE)).toContain(BASE.resolution);
  });

  it("targets the correct AI side (neg when user is aff)", () => {
    const p = sparConstructivePrompt(BASE);
    expect(p).toContain("Negative");
  });

  it("targets Affirmative when user is neg", () => {
    const p = sparConstructivePrompt({ ...BASE, userSide: "neg" });
    expect(p).toContain("Affirmative");
  });

  it("uses easy mode for aiDifficulty=easy", () => {
    const p = sparConstructivePrompt({ ...BASE, aiDifficulty: "easy" });
    expect(p).toContain("60–80 words");
    expect(p).toContain("3rd-grade");
  });

  it("requests 300 words for medium difficulty", () => {
    const p = sparConstructivePrompt({ ...BASE, aiDifficulty: "medium" });
    expect(p).toContain("300 words");
  });

  it("adds strength guide for hard aiDifficulty", () => {
    const p = sparConstructivePrompt({ ...BASE, aiDifficulty: "hard" });
    expect(p).toContain("strongest possible argument");
  });

  it("returns valid JSON schema instruction", () => {
    expect(sparConstructivePrompt(BASE)).toContain("ai_constructive");
  });
});

describe("sparRebuttalPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    aiSide: "neg" as const,
    aiConstructive: "AI speech here",
    userConstructive: "User speech here",
    userCrossfire: "CF transcript",
    difficulty: "medium" as const,
    aiDifficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparRebuttalPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(sparRebuttalPrompt(params)).toContain(BASE.resolution);
  });

  it("includes AI and user speeches in context", () => {
    const p = sparRebuttalPrompt(params);
    expect(p).toContain("AI speech here");
    expect(p).toContain("User speech here");
  });

  it("uses easy mode when aiDifficulty=easy", () => {
    const p = sparRebuttalPrompt({ ...params, aiDifficulty: "easy" });
    expect(p).toContain("60–80 words");
  });

  it("requests 300 words for hard mode", () => {
    const p = sparRebuttalPrompt({ ...params, aiDifficulty: "hard" });
    expect(p).toContain("300 words");
  });

  it("fallback text when no crossfire provided", () => {
    const p = sparRebuttalPrompt({ ...params, userCrossfire: "" });
    expect(p).toContain("No crossfire took place");
  });
});

describe("sparCrossfirePrompt", () => {
  const params = {
    resolution: BASE.resolution,
    aiSide: "neg" as const,
    aiConstructive: "AI speech",
    userConstructive: "User speech",
    difficulty: "medium" as const,
    aiDifficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparCrossfirePrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(sparCrossfirePrompt(params)).toContain(BASE.resolution);
  });

  it("requests only 2 questions in easy mode", () => {
    const p = sparCrossfirePrompt({ ...params, aiDifficulty: "easy" });
    expect(p).toContain("2 crossfire questions");
  });

  it("requests 3 questions in medium/hard mode", () => {
    const p = sparCrossfirePrompt({ ...params, aiDifficulty: "medium" });
    expect(p).toContain("question 3");
  });

  it("asks for sharp questions in hard mode", () => {
    const p = sparCrossfirePrompt({ ...params, aiDifficulty: "hard" });
    expect(p).toContain("sharp, incisive");
  });
});

describe("sparCfSuggestPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    userSide: "aff" as const,
    aiSide: "neg" as const,
    aiConstructive: "AI speech",
    mode: "question" as const,
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparCfSuggestPrompt(params).length).toBeGreaterThan(50);
  });

  it("question mode: asks for crossfire questions", () => {
    const p = sparCfSuggestPrompt(params);
    expect(p).toContain("crossfire questions");
  });

  it("response mode: asks for responses", () => {
    const p = sparCfSuggestPrompt({ ...params, mode: "response", aiQuestion: "Why?" });
    expect(p).toContain("responses");
    expect(p).toContain("Why?");
  });

  it("returns 3 suggestions in both modes", () => {
    const pQ = sparCfSuggestPrompt(params);
    expect(pQ).toContain("question 3");
    const pR = sparCfSuggestPrompt({ ...params, mode: "response", aiQuestion: "Q?" });
    expect(pR).toContain("response 3");
  });
});

describe("sparCfRespondPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    aiSide: "neg" as const,
    aiConstructive: "AI speech",
    question: "What is your evidence?",
    difficulty: "medium" as const,
    aiDifficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparCfRespondPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the question", () => {
    expect(sparCfRespondPrompt(params)).toContain("What is your evidence?");
  });

  it("easy mode produces a weak/confused response prompt", () => {
    const p = sparCfRespondPrompt({ ...params, aiDifficulty: "easy" });
    expect(p).toContain("confused or unsure");
  });

  it("hard mode asks for sharpest response", () => {
    const p = sparCfRespondPrompt({ ...params, aiDifficulty: "hard" });
    expect(p).toContain("sharpest");
  });
});

describe("sparPrepHintsPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    userSide: "aff" as const,
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparPrepHintsPrompt(params).length).toBeGreaterThan(50);
  });

  it("includes the resolution", () => {
    expect(sparPrepHintsPrompt(params)).toContain(BASE.resolution);
  });

  it("includes Affirmative side for aff", () => {
    expect(sparPrepHintsPrompt(params)).toContain("Affirmative");
  });

  it("includes Negative side for neg", () => {
    const p = sparPrepHintsPrompt({ ...params, userSide: "neg" });
    expect(p).toContain("Negative");
  });

  it("requests value, criterion, arguments, counters in JSON schema", () => {
    const p = sparPrepHintsPrompt(params);
    expect(p).toContain("value");
    expect(p).toContain("criterion");
    expect(p).toContain("arguments");
    expect(p).toContain("counters");
  });
});

describe("sparUserRebuttalHintPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    userSide: "aff" as const,
    aiConstructive: "AI speech",
    userConstructive: "User speech",
    userCrossfire: "CF",
    difficulty: "medium" as const,
  };

  it("returns a non-empty string", () => {
    expect(sparUserRebuttalHintPrompt(params).length).toBeGreaterThan(50);
  });

  it("requests exactly 200 words", () => {
    expect(sparUserRebuttalHintPrompt(params)).toContain("200 words");
  });

  it("includes resolution", () => {
    expect(sparUserRebuttalHintPrompt(params)).toContain(BASE.resolution);
  });

  it("fallback text when no constructive speech", () => {
    const p = sparUserRebuttalHintPrompt({ ...params, userConstructive: "" });
    expect(p).toContain("No constructive speech was delivered");
  });
});

describe("sparFeedbackPrompt", () => {
  const params = {
    resolution: BASE.resolution,
    userSide: "aff" as const,
    userName: "Alice",
    aiConstructive: "AI constructive",
    aiRebuttal: "AI rebuttal",
    userConstructive: "User constructive",
    userCrossfire: "CF transcript",
    userRebuttal: "User rebuttal",
  };

  it("returns a non-empty string", () => {
    expect(sparFeedbackPrompt(params).length).toBeGreaterThan(100);
  });

  it("includes the user's name", () => {
    expect(sparFeedbackPrompt(params)).toContain("Alice");
  });

  it("includes the resolution", () => {
    expect(sparFeedbackPrompt(params)).toContain(BASE.resolution);
  });

  it("includes all three speech sections", () => {
    const p = sparFeedbackPrompt(params);
    expect(p).toContain("Constructive Speech");
    expect(p).toContain("Crossfire");
    expect(p).toContain("Rebuttal Speech");
  });

  it("requests overall_score, constructive, crossfire, rebuttal in JSON", () => {
    const p = sparFeedbackPrompt(params);
    expect(p).toContain("overall_score");
    expect(p).toContain("constructive");
    expect(p).toContain("crossfire");
    expect(p).toContain("rebuttal");
  });

  it("shows forfeit instruction when speeches are missing", () => {
    expect(sparFeedbackPrompt(params)).toContain("forfeit");
  });
});
