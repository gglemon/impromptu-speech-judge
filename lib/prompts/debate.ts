// Prompts for all debate-practice API routes.
// Edit this file to adjust AI tone, structure, or scoring rubrics for debate practice.

type Difficulty = "easy" | "medium" | "hard";

function getFeedbackLanguage(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Write feedback for a 3rd or 4th grader: short sentences, simple words, warm and encouraging tone.";
  if (difficulty === "hard") return "Write feedback for a 7th grade+ student: precise vocabulary, analytical tone, push them to think deeper.";
  return "Write feedback for a 5th or 6th grader: clear language, supportive but specific.";
}

function getExampleLanguage(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Write like a confident 3rd or 4th grader: very short sentences, simple everyday words, one concrete example from school or home. Sound enthusiastic, like a kid talking to classmates.";
  if (difficulty === "hard") return "Write like a confident 7th grader or above: varied sentences, precise vocabulary, well-developed reasoning, persuasive rhetoric.";
  return "Write like a confident 5th or 6th grader: clear sentences, logical reasoning, a specific relatable example.";
}

function getExplainLanguage(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Explain like talking to a 3rd or 4th grader: very short sentences, simple everyday words, warm and encouraging tone.";
  if (difficulty === "hard") return "Explain like talking to a 7th grader or above: precise vocabulary, analytical tone, specific about logic and rhetoric.";
  return "Explain like talking to a 5th or 6th grader: clear language, supportive but specific.";
}

function getHintLanguage(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Write like you are talking to a 3rd or 4th grader. Use simple, short words. Give everyday examples from school, home, pets, or friends. Keep it fun and easy to understand. Avoid big or complicated words.";
  return "Write like you are talking to a 5th or 6th grader. Use clear language with some reasoning. Give examples from school subjects, news, or things they might know about. You can use slightly more complex ideas but keep it easy to follow.";
}

// ── debate-argument-feedback ─────────────────────────────────────────────────

export interface DebateArgumentFeedbackParams {
  resolution: string;
  side: "aff" | "neg";
  argument: string;
  round: number;
  previousArguments: Array<{ side: string; round: number; transcript: string }>;
  difficulty: Difficulty;
}

export function debateArgumentFeedbackPrompt({ resolution, side, argument, round, previousArguments, difficulty }: DebateArgumentFeedbackParams): string {
  const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
  const position = side === "aff" ? "support" : "oppose";
  const languageGuide = getFeedbackLanguage(difficulty);

  const previousContext = previousArguments?.length > 0
    ? `\nPrevious arguments in this debate:\n${previousArguments
        .map((a) => `- ${a.side === "aff" ? "AFF" : "NEG"} Round ${a.round}: "${a.transcript}"`)
        .join("\n")}`
    : "";

  return `You are an expert debate coach rating a student's argument in a practice debate.

FEEDBACK LANGUAGE: ${languageGuide}

Resolution: "${resolution}"
Student's side: ${sideLabel} (they must ${position} the resolution)
Round: ${round} of 2${previousContext}

Student's argument:
"""
${argument}
"""

Rate this argument as a debate coach. Consider:
1. RELEVANCE (0-10): Does the argument directly support their assigned side of the resolution?
2. REASONING (0-10): Is the logic sound? Are claims backed with reasoning or examples?
3. CLARITY (0-10): Is the argument clear, organized, and easy to follow?

Weighted overall score: Relevance 40%, Reasoning 40%, Clarity 20%.

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "score": <overall weighted score, number 0-10 with one decimal>,
  "summary": "<2-3 sentence assessment of the argument>",
  "criterion_scores": {
    "relevance": <number 0-10 with one decimal>,
    "reasoning": <number 0-10 with one decimal>,
    "clarity": <number 0-10 with one decimal>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}`;
}

// ── debate-example-argument ──────────────────────────────────────────────────

export interface DebateExampleArgumentParams {
  resolution: string;
  side: "aff" | "neg";
  round: number;
  difficulty: Difficulty;
  userTranscript: string;
  improvements: string[];
}

export function debateExampleArgumentPrompt({ resolution, side, round, difficulty, userTranscript, improvements }: DebateExampleArgumentParams): string {
  const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
  const position = side === "aff" ? "support" : "oppose";
  const languageGuide = getExampleLanguage(difficulty);

  const improvementContext = improvements?.length > 0
    ? `\nThe student's argument had these areas to improve:\n${improvements.map((s) => `- ${s}`).join("\n")}\nMake sure the example argument addresses these weaknesses.`
    : "";

  return `You are a debate coach. Write a short example argument for a student to learn from.

Resolution: "${resolution}"
Side: ${sideLabel} (must ${position} the resolution)
Round: ${round} of 3

Student's attempt:
"${userTranscript}"
${improvementContext}
Build directly on the student's ideas. Keep any good points they made, but make them clearer and stronger.

LANGUAGE: ${languageGuide}

LENGTH: 3-5 sentences only.

OUTPUT RULE: Output ONLY the argument itself. No intro, no label, no explanation, no "Here is", no "Sure", no "Ok". Start directly with the argument.`;
}

// ── debate-example-explanation ───────────────────────────────────────────────

export interface DebateExampleExplanationParams {
  userArgument: string;
  exampleArgument: string;
  side: "aff" | "neg";
  resolution: string;
  difficulty: Difficulty;
}

export function debateExampleExplanationPrompt({ userArgument, exampleArgument, side, resolution, difficulty }: DebateExampleExplanationParams): string {
  const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
  const languageGuide = getExplainLanguage(difficulty);

  return `You are a debate coach explaining to a student why an example argument is stronger than their attempt.

LANGUAGE: ${languageGuide}

Resolution: "${resolution}"
Side: ${sideLabel}

Student's argument:
"${userArgument}"

AI example argument:
"${exampleArgument}"

Compare the two arguments. Explain clearly and specifically:
1. What the student did well (keep it brief, 1 sentence)
2. What makes the AI example stronger — focus on 2-3 concrete differences (better evidence, clearer logic, stronger opening, etc.)
3. One simple thing the student can try next time

Keep the whole explanation under 5 sentences. Be encouraging but honest. Do NOT start with "Sure", "Ok", "Great", or any filler.

OUTPUT RULE: Output ONLY the explanation. No labels, no intro phrase, no "Here is". Start directly.`;
}

// ── debate-hint ──────────────────────────────────────────────────────────────

export interface DebateHintParams {
  resolution: string;
  side: "aff" | "neg";
  round: number;
  difficulty: Difficulty;
  previousArguments: Array<{ side: string; round: number; transcript: string }>;
}

export function debateHintPrompt({ resolution, side, round, difficulty, previousArguments }: DebateHintParams): string {
  const sideLabel = side === "aff" ? "FOR" : "AGAINST";
  const position = side === "aff" ? "affirmative (pro)" : "negative (con)";
  const languageGuide = getHintLanguage(difficulty);

  const previousContext = previousArguments?.length > 0
    ? `\nArguments already made in this debate (do NOT repeat these ideas):\n${previousArguments
        .map((a) => `- ${a.side === "aff" ? "AFF" : "NEG"} Round ${a.round}: "${a.transcript}"`)
        .join("\n")}`
    : "";

  return `You are a friendly debate coach helping a student come up with an argument.

Resolution: "${resolution}"
The student must argue ${sideLabel} the resolution (${position} side).
This is Round ${round} of 3.${previousContext}

Give the student ONE short, helpful hint or idea for a NEW argument they could make. The hint should spark their thinking — not write the argument for them.

${languageGuide}

Keep the hint to 2-4 sentences. Do NOT use bullet points or headers. Just write naturally like a coach talking to a kid. Do not start with "Sure" or "Of course" or similar filler phrases.`;
}

// ── debate-redo-comparison ───────────────────────────────────────────────────

export interface DebateRedoComparisonParams {
  resolution: string;
  side: "aff" | "neg";
  originalTranscript: string;
  originalFeedback: { score: number };
  redoTranscript: string;
  redoFeedback: { score: number };
  difficulty: Difficulty;
}

export function debateRedoComparisonPrompt({ resolution, side, originalTranscript, originalFeedback, redoTranscript, redoFeedback, difficulty }: DebateRedoComparisonParams): string {
  const sideLabel = side === "aff" ? "Affirmative (PRO)" : "Negative (CON)";
  const languageGuide = difficulty === "easy"
    ? "Use simple words a 3rd or 4th grader would understand. Keep it friendly and encouraging."
    : "Use clear language a 5th or 6th grader would understand. Be specific and encouraging.";

  return `You are a debate coach comparing a student's original argument to their redo attempt.

Resolution: "${resolution}"
Side: ${sideLabel}

ORIGINAL ARGUMENT (score: ${originalFeedback.score}/10):
"${originalTranscript}"

REDO ARGUMENT (score: ${redoFeedback.score}/10):
"${redoTranscript}"

Compare these two arguments. Identify:
1. Key sentences or phrases from the REDO that are clearly stronger or show improvement
2. Any parts of the ORIGINAL that were actually better (if any)
3. One overall encouraging verdict about their progress

${languageGuide}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "key_improvements": ["<exact quote or paraphrase from redo that improved, with brief explanation>", ...],
  "regressions": ["<anything from original that was lost or worse in redo, if any — empty array if none>"],
  "verdict": "<1-2 encouraging sentences about their overall progress>"
}`;
}
