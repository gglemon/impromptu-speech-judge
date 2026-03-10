import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { callOllama } from "@/lib/ollama";

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

    const text = await callOllama(
      `You are a kind and encouraging speech coach for elementary school children (ages 6-12). Evaluate the following speech in a simple, positive, and age-appropriate way.

Topic: ${topic}
Transcript:
"""
${transcript}
"""
${durationNote ? `\n${durationNote}\n` : ""}
Be warm, encouraging, and use simple words. Focus on what the child did well and give one gentle tip.

Also write a short example speech on the same topic. Write it like a confident 3rd or 4th grader: short sentences, simple everyday words, concrete examples from school or home. The example should be about ${wordTarget} words (matching a ${speechLength}-second speech).

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "score": <number from 1 to 10>,
  "emoji": "<one emoji that matches how well they did, e.g. 🌟 for great, 😊 for good, 👍 for decent>",
  "summary": "<2-3 encouraging sentences about their speech in simple words>",
  "highlights": ["<something specific they did well>", "<another thing they did well>"],
  "tip": "<one friendly, simple suggestion for next time>",
  "length_note": "<one short sentence about whether they spoke close to their ${speechLength}-second target — praise if close, gently encourage if too short or too long>",
  "ai_example": "<example speech of about ${wordTarget} words on the same topic, written as a 3rd or 4th grader would say it>"
}`
    , req.signal);

    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const sanitized = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, inner) => `"${inner.replace(/[\x00-\x1F\x7F]/g, (c: string) => {
        const escapes: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
        return escapes[c] ?? "";
      })}"`
    );

    const feedback = JSON.parse(sanitized);
    return NextResponse.json(feedback);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
