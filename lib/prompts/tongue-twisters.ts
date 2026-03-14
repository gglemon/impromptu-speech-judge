// Prompts for tongue twister API routes.
// Edit this file to adjust difficulty guides, scoring rubrics, or tongue twister rules.

type Difficulty = "easy" | "medium" | "hard";

// ── tongue-twister-generate ──────────────────────────────────────────────────

export interface TongueTwisterGenerateParams {
  difficulty: Difficulty;
}

export function tongueTwisterGeneratePrompt({ difficulty }: TongueTwisterGenerateParams): string {
  const difficultyGuide = difficulty === "easy"
    ? "Use 1-2 repeated sounds. Keep it short (one sentence, under 10 words). Great for young kids."
    : difficulty === "hard"
    ? "Use 3+ repeated sounds that are very similar (like s/sh/ch, p/b, t/d/th). Make it long (2 sentences) and very challenging even for adults."
    : "Use 2-3 repeated sounds. Medium length (one sentence, 10-15 words). Challenging but doable for a 5th or 6th grader.";

  return `Generate a single original tongue twister for speech practice.

Difficulty: ${difficulty}
Guide: ${difficultyGuide}

Rules:
- It must actually be a tongue twister (repeated similar sounds that are hard to say fast)
- It must make some logical sense (not just random words)
- Do NOT use famous tongue twisters like "she sells seashells" or "Peter Piper"
- Be creative and fun

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "twister": "<the tongue twister text>" }`;
}

// ── tongue-twister-feedback ──────────────────────────────────────────────────

export interface TongueTwisterFeedbackParams {
  twister: string;
  transcript: string;
}

export function tongueTwisterFeedbackPrompt({ twister, transcript }: TongueTwisterFeedbackParams): string {
  return `You are a speech coach grading a tongue twister attempt. Reply ONLY with valid JSON, no other text.

Tongue twister: "${twister}"
Student said: "${transcript}"

Score accuracy (0-10): how closely did the words match? Small pronunciation variations are OK.
Score fluency (0-10): how smooth and clear was the delivery?

{"accuracy":<0-10.0>,"fluency":<0-10.0>,"summary":"<1-2 encouraging sentences>","tricky_parts":["<word/phrase>"],"tip":"<one tip>"}`;
}
