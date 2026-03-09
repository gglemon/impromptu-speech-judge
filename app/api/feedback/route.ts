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
    const { topic, transcript, duration_seconds, difficulty, speech_length_seconds } = await req.json();
    const targetSeconds = speech_length_seconds ?? 300;
    const targetMinutes = Math.round(targetSeconds / 60);
    const lowerBound = Math.round(targetSeconds * 0.8); // 80% of target

    const text = await callOllama(
      `You are an expert impromptu speech judge. Evaluate the following speech using the three standard ballot pillars: Content, Organization, and Delivery.

Topic: ${topic}
Difficulty: ${difficulty}
Duration: ${duration_seconds} seconds (target: ${targetSeconds} seconds / ${targetMinutes} minutes)
Transcript:
"""
${transcript}
"""

JUDGING CRITERIA:

1. CONTENT & ANALYSIS
- Interpretation: Did they address the prompt with a specific thesis/angle ("theta"), not just restate it?
- Examples: Do they draw from history, literature, current events, or personal anecdotes? Green flag: diverse range. Red flag: only hypothetical "what if" scenarios.
- Originality: Fresh perspective vs. clichés?

2. ORGANIZATION
- Introduction: Does it include a hook, the prompt, their interpretation, and a road map of points?
- Transitions: Clear signposting between points (e.g., "Moving from X, let's look at Y")?
- Conclusion: Does it circle back to the prompt and provide closure?

3. DELIVERY
- Fluency: Filler words ("um", "ah") — occasional is fine, distracting is not. Conversational but polished?
- Body Language / Vocal Variety: Changes in volume, pitch, pace to emphasize points (inferred from transcript rhythm and word choice)?
- Eye Contact / Engagement: Does the transcript suggest they were connecting with the audience or drifting?
- Time Management: The target speech length is ${targetMinutes} minutes (${targetSeconds} seconds). Penalize significantly if the speaker finished under ${lowerBound} seconds. A full, well-paced speech at or near the target scores highest.

Provide detailed, actionable feedback. When citing issues, quote EXACT phrases from the transcript.
Score each pillar out of 10, then give an overall score (weighted average: Content 40%, Organization 35%, Delivery 25%).

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "score": <overall weighted score, number 0-10 with one decimal>,
  "summary": "<2-3 sentence overall assessment>",
  "pillar_scores": {
    "content": <number 0-10 with one decimal>,
    "organization": <number 0-10 with one decimal>,
    "delivery": <number 0-10 with one decimal>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    {
      "aspect": "<Content | Organization | Delivery>",
      "quote": "<exact quote from transcript, or empty string if not applicable>",
      "issue": "<what's wrong>",
      "suggestion": "<specific actionable fix>"
    }
  ],
  "structure": {
    "intro": "<assessment: hook, prompt address, thesis, road map>",
    "body": "<assessment: transitions, signposting, example variety>",
    "conclusion": "<assessment: callback to prompt, sense of closure>"
  },
  "vocabulary": "<assessment of word choice, originality, avoidance of clichés>",
  "delivery": "<assessment of fluency, vocal variety, filler words, engagement>"
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
