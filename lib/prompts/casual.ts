// Prompts for all casual speech API routes.
// Edit this file to adjust AI tone, structure, or scoring rubrics for casual practice.

// ── casual-feedback ──────────────────────────────────────────────────────────

export interface CasualFeedbackParams {
  topic: string;
  transcript: string;
  speechLength: number;
  actualDuration?: number;
}

export function casualFeedbackPrompt({ topic, transcript, speechLength, actualDuration }: CasualFeedbackParams): string {
  const wordTarget = Math.round((speechLength / 60) * 150);
  const pct = actualDuration != null ? Math.round((actualDuration / speechLength) * 100) : null;
  const durationNote = actualDuration != null
    ? `Target: ${speechLength}s. Actual: ~${Math.round(actualDuration)}s (${pct}% of target). Score penalty: <50% → -2pts, 50-80% → -1pt, 80-120% → no penalty, >150% → no penalty.`
    : "";

  return `You are a kind and encouraging speech coach for elementary school children (ages 6-12). Evaluate the following speech in a simple, positive, and age-appropriate way.

Topic: ${topic}
Transcript:
"""
${transcript}
"""
${durationNote ? `\n${durationNote}\n` : ""}
Be warm, encouraging, and use simple words. Focus on what the child did well and give one gentle tip.

Also rewrite the student's speech as a polished example. STRICT RULES for the example:
- Every idea, point, and example in the example MUST come directly from the student's transcript — do NOT invent new ideas, new examples, or new topics that the student did not mention
- Mirror the student's exact speech structure sentence by sentence: if they said something first, say it first; if they gave a personal story, polish that same story; if they made 3 points, polish those same 3 points in the same order
- Only improve HOW things are said: word choices, sentence flow, transitions, vivid details — never WHAT is said
- If the student's speech is short or thin, make the example equally short — do not pad with new content
- Write like a confident 3rd or 4th grader: short sentences, simple everyday words
- About ${wordTarget} words (matching a ${speechLength}-second speech)

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "score": <number from 1 to 10>,
  "emoji": "<one emoji that matches how well they did, e.g. 🌟 for great, 😊 for good, 👍 for decent>",
  "summary": "<2-3 encouraging sentences about their speech in simple words>",
  "highlights": ["<something specific they did well>", "<another thing they did well>"],
  "tip": "<one friendly, simple suggestion for next time>",
  "length_note": "<one short sentence about whether they spoke close to their ${speechLength}-second target — praise if close, gently encourage if too short or too long>",
  "ai_example": "<example speech of about ${wordTarget} words — same topic, same structure as the student's speech, but with clearer language, stronger details, and better transitions>"
}`;
}

// ── casual-outline ───────────────────────────────────────────────────────────

export interface CasualOutlineParams {
  topic: string;
  speechLength: number;
}

export function casualOutlinePrompt({ topic, speechLength }: CasualOutlineParams): string {
  const numPoints = speechLength <= 30 ? 2 : speechLength <= 60 ? 3 : speechLength <= 90 ? 4 : 5;

  return `You are a speech coach helping an elementary school student plan a short speech.

Topic: "${topic}"
Speech length: ${speechLength} seconds

Create a skeleton outline — structure and placeholders ONLY. Do NOT include any actual content, examples, or opinions. Each slot should be a short label describing what kind of thing goes there (e.g. "Hook question", "Personal example", "Reason 1", "Call to action"), NOT the actual content itself. The student will fill in their own ideas.

Number of main points: ${numPoints}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "opening": "<label for the opening move, e.g. 'Hook question' or 'Surprising fact'>",
  "points": ["<label for point 1, e.g. 'Reason 1 + personal example'>", "<label for point 2>"${numPoints >= 3 ? ', "<label for point 3>"' : ""}${numPoints >= 4 ? ', "<label for point 4>"' : ""}${numPoints >= 5 ? ', "<label for point 5>"' : ""}],
  "closing": "<label for the closing move, e.g. 'Restate main idea + call to action'>"
}`;
}

// ── casual-example ───────────────────────────────────────────────────────────

export interface CasualExampleParams {
  topic: string;
  speechLength: number;
}

export function casualExamplePrompt({ topic, speechLength }: CasualExampleParams): string {
  const wordTarget = Math.round((speechLength / 60) * 150);

  return `Write a short example speech for an elementary school student.

Topic: "${topic}"

Write it like a confident 3rd or 4th grader: short sentences, simple everyday words, concrete examples from school or home. Be enthusiastic and friendly. The speech should be about ${wordTarget} words long (for a ${speechLength}-second speech).

Structure the speech clearly with:
- An opening paragraph (hook or greeting)
- A middle section with 2–3 key points, each starting with "- " on its own line
- A closing paragraph

Separate each section with a blank line. Do NOT use headers or titles — just the speech text.

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "ai_example": "<the structured speech>" }`;
}

// ── casual-example-explanation ───────────────────────────────────────────────

export interface CasualExampleExplanationParams {
  topic: string;
  userTranscript: string;
  aiExample: string;
}

export function casualExampleExplanationPrompt({ topic, userTranscript, aiExample }: CasualExampleExplanationParams): string {
  return `You are a kind speech coach helping an elementary school student understand how to improve their speech.

Topic: "${topic}"

Student's speech:
"""
${userTranscript}
"""

Improved AI example:
"""
${aiExample}
"""

The AI example is a polished rewrite of the student's own speech — same ideas, same points, same examples, just expressed better. Compare the two line by line and explain exactly what improved in the writing and delivery. Every bullet point must refer to something the student actually said and how the example said it better.

Rules:
- ONLY compare what is actually in both speeches — do NOT comment on ideas or examples that weren't in the student's speech
- Be specific: quote or closely reference the student's words and show what changed
- Use simple language (3rd–4th grade level)
- 3–5 bullet points max
- Start each bullet with "- "
- Do NOT start with "Sure", "Ok", "Here is", or any filler

OUTPUT: Output ONLY the bullet points. Nothing else.`;
}
