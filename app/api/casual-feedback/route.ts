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
    const { topic, transcript } = await req.json();

    const text = await callOllama(
      `You are a kind and encouraging speech coach for elementary school children (ages 6-12). Evaluate the following speech in a simple, positive, and age-appropriate way.

Topic: ${topic}
Transcript:
"""
${transcript}
"""

Be warm, encouraging, and use simple words. Focus on what the child did well and give one gentle tip.
Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "score": <number from 1 to 10>,
  "emoji": "<one emoji that matches how well they did, e.g. 🌟 for great, 😊 for good, 👍 for decent>",
  "summary": "<2-3 encouraging sentences about their speech in simple words>",
  "highlights": ["<something specific they did well>", "<another thing they did well>"],
  "tip": "<one friendly, simple suggestion for next time>"
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
