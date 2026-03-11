import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callLLM } from "@/lib/llm";
import { parseLLMJson } from "@/lib/parseLLMJson";

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached (5/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }
  try {
    const { topic, transcript, speechLength = 60, actualDuration } = await req.json();
    const wordTarget = Math.round((speechLength / 60) * 150);
    const durationNote = actualDuration != null
      ? `The child's target was ${speechLength} seconds. They actually spoke for about ${Math.round(actualDuration)} seconds.`
      : "";

    const text = await callLLM(
      `You are a kind and encouraging speech coach for elementary school children (ages 6-12). Evaluate the following speech in a simple, positive, and age-appropriate way.

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
}`
    , req.signal);

    const feedback = parseLLMJson(text);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
