// Shared types used across debate-practice components

export interface CriterionScores {
  relevance: number;
  reasoning: number;
  clarity: number;
}

export interface ArgumentFeedback {
  score: number;
  summary: string;
  criterion_scores: CriterionScores;
  strengths: string[];
  improvements: string[];
}

export interface ArgumentResult extends ArgumentFeedback {
  side: "aff" | "neg";
  round: number;
  transcript: string;
}

export interface RedoComparison {
  key_improvements: string[];
  regressions: string[];
  verdict: string;
}

export type Stage = "intro" | "recording" | "rating" | "comparison" | "complete";
