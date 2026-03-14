// Prompts for all SPAR debate API routes.
// Edit this file to adjust AI tone, structure, or scoring rubrics for SPAR.

type Difficulty = "easy" | "medium" | "hard";

function getWriteStyle(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Write as a 3rd or 4th grade student would speak: use short sentences, simple everyday words, and concrete real-life examples. Avoid complex vocabulary or abstract reasoning.";
  if (difficulty === "medium") return "Write as a 5th or 6th grade student would speak: use clear sentences, grade-appropriate vocabulary, and logical reasoning with relatable examples.";
  return "Write as a middle school or high school student would speak: use varied sentence structure, sophisticated vocabulary, well-developed arguments, and persuasive rhetoric.";
}

function getUseStyle(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Use language a 3rd or 4th grade student would understand: simple words, short sentences, concrete everyday examples.";
  if (difficulty === "medium") return "Use language a 5th or 6th grade student would understand: clear vocabulary, logical reasoning, relatable examples.";
  return "Use language a middle school or high school student would understand: precise vocabulary, nuanced reasoning, academic examples.";
}

function getSayStyle(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Use language a 3rd or 4th grade student would say: simple words, short sentences, everyday examples.";
  if (difficulty === "medium") return "Use language a 5th or 6th grade student would say: clear vocabulary, logical reasoning, relatable examples.";
  return "Use language a middle school or high school student would say: varied vocabulary, persuasive tone, nuanced reasoning.";
}

function getRespondStyle(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Respond as a 3rd or 4th grade student would speak: simple words, short sentences, concrete everyday examples.";
  if (difficulty === "medium") return "Respond as a 5th or 6th grade student would speak: clear vocabulary, logical reasoning, relatable examples.";
  return "Respond as a middle school or high school student would speak: precise vocabulary, persuasive tone, nuanced reasoning.";
}

// ── spar-generate ────────────────────────────────────────────────────────────

export interface SparConstructiveParams {
  resolution: string;
  userSide: "aff" | "neg";
  difficulty: Difficulty;
  aiDifficulty: Difficulty;
}

export function sparConstructivePrompt({ resolution, userSide, difficulty, aiDifficulty }: SparConstructiveParams): string {
  const aiSide = userSide === "aff" ? "Negative" : "Affirmative";
  const voteDirection = aiSide === "Affirmative" ? "for" : "against";
  const languageStyle = getWriteStyle(difficulty);

  if (aiDifficulty === "easy") {
    return `You are roleplaying a 3rd-grade student who is brand new to speech and debate. You barely understand what a "resolution" is.

Resolution: ${resolution}

Write a short, weak constructive speech of about 60–80 words arguing the ${aiSide} side. You must:
- Sound like a nervous, inexperienced 3rd grader who doesn't know debate rules
- Give only 1 vague point with no real evidence — just a personal feeling or simple example
- Ramble or repeat yourself a little
- NOT use debate structure (no "criterion", no numbered arguments, no "in conclusion")
- Use very simple words and short sentences
- Start with "Um, hi. My name is Alex and I think..." or similar awkward opener

Return ONLY valid JSON (no markdown, no code blocks):
{ "ai_constructive": "<60-80 word weak speech>" }`;
  }

  const aiStrengthGuide = aiDifficulty === "hard"
    ? "IMPORTANT: Make the strongest possible argument. Use airtight logic, anticipate counterarguments, and leave no obvious weaknesses."
    : "";

  return `You are a competitive debater arguing the ${aiSide} side of this resolution.

LANGUAGE STYLE: ${languageStyle}
${aiStrengthGuide ? `\n${aiStrengthGuide}\n` : ""}
Resolution: ${resolution}

Generate ONE speech, exactly 300 words.

CONSTRUCTIVE SPEECH (300 words): Begin "Hello, my name is AI Debate Agent, and I stand in ${aiSide === "Affirmative" ? "affirmation" : "negation"} of this resolution." State a clear criterion (2-3 sentences). Present three arguments — for each: state the claim, give 3-4 sentences of evidence and reasoning, explain the significance. End with a conclusion urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_constructive": "<exactly 300 word constructive speech>"
}`;
}

// ── spar-rebuttal ────────────────────────────────────────────────────────────

export interface SparRebuttalParams {
  resolution: string;
  aiSide: "aff" | "neg";
  aiConstructive: string;
  userConstructive: string;
  userCrossfire: string;
  difficulty: Difficulty;
  aiDifficulty: Difficulty;
}

export function sparRebuttalPrompt({ resolution, aiSide, aiConstructive, userConstructive, userCrossfire, difficulty, aiDifficulty }: SparRebuttalParams): string {
  const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
  const userSideLabel = aiSide === "aff" ? "Negative" : "Affirmative";
  const voteDirection = aiSide === "aff" ? "for" : "against";
  const languageStyle = getWriteStyle(difficulty);

  const easyMode = `You are roleplaying a nervous 3rd-grade student who is brand new to debate and doesn't really know what a rebuttal is supposed to do. Write a weak rebuttal of about 60–80 words. You must:
- Sound like a young kid who is just repeating their earlier point without really addressing what the opponent said
- Miss most of what the opponent argued
- Maybe accidentally agree with the opponent on something small
- Use very simple words and short sentences
- Possibly trail off or say something off-topic at the end
- Do NOT start with "In my rebuttal" — start with something like "Um, so I still think..." or "Yeah but..."
- Do NOT use debate structure or list numbered points`;

  const hardMode = `Write a strong REBUTTAL SPEECH (exactly 300 words) that directly responds to ALL of your opponent's key arguments. Leave no major point unaddressed.`;
  const mediumMode = `Write a REBUTTAL SPEECH (exactly 300 words) that directly responds to your opponent's actual arguments above.`;

  const rebuttalInstruction = aiDifficulty === "easy" ? easyMode : aiDifficulty === "hard" ? hardMode : mediumMode;
  const closingInstruction = aiDifficulty !== "easy"
    ? `Begin "In my rebuttal...". Address 3 specific points your opponent raised (or note if they failed to make arguments). Defend your own constructive arguments. End urging a vote ${voteDirection} the resolution.`
    : "";

  return `You are a competitive debater arguing the ${aiSideLabel} side of this resolution.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

YOUR CONSTRUCTIVE SPEECH (already delivered):
"""
${aiConstructive}
"""

YOUR OPPONENT'S (${userSideLabel}) CONSTRUCTIVE SPEECH:
"""
${userConstructive || "(No constructive speech was delivered)"}
"""

CROSSFIRE EXCHANGES:
"""
${userCrossfire || "(No crossfire took place)"}
"""

${rebuttalInstruction}
${closingInstruction}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "ai_rebuttal": "${aiDifficulty === "easy" ? "<60-80 word weak rebuttal>" : "<exactly 300 word rebuttal speech>"}"
}`;
}

// ── spar-crossfire ───────────────────────────────────────────────────────────

export interface SparCrossfireParams {
  resolution: string;
  aiSide: "aff" | "neg";
  aiConstructive: string;
  userConstructive: string;
  difficulty: Difficulty;
  aiDifficulty: Difficulty;
}

export function sparCrossfirePrompt({ resolution, aiSide, aiConstructive, userConstructive, difficulty, aiDifficulty }: SparCrossfireParams): string {
  const languageStyle = getUseStyle(difficulty);

  const easyQuestions = `You are roleplaying a nervous 3rd-grade student who barely understands debate. Generate 2 crossfire questions that:
- Are very simple and slightly confused, like a child who doesn't quite get what their opponent said
- May be vague, off-point, or accidentally easy to answer
- Sound natural for a young kid (e.g. "But like... why do you think that?" or "What if someone just doesn't agree though?")
- Do NOT use debate jargon or sophisticated phrasing
Return only 2 questions in the array.`;

  const hardQuestions = "Generate 3 sharp, incisive crossfire questions that directly target the weakest points in their argument. Make them difficult to dodge.";
  const mediumQuestions = "Generate 3 targeted crossfire questions that directly challenge the specific arguments, evidence, or claims your opponent made.";

  const questionInstruction = aiDifficulty === "easy" ? easyQuestions : aiDifficulty === "hard" ? hardQuestions : mediumQuestions;

  const questionCriteria = aiDifficulty !== "easy" ? ` Each question should:
- Reference something the opponent actually said (or note if they gave no speech)
- Expose a weakness, contradiction, or missing evidence in their argument
- Optionally connect back to one of your own constructive arguments
- Be answerable in 1-2 sentences (not open-ended essays)` : "";

  return `You are a skilled debater preparing crossfire questions for a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}
Your side: ${aiSide === "aff" ? "Affirmative" : "Negative"}

Your own constructive speech (what you argued):
"""
${aiConstructive || "(Not provided)"}
"""

Your opponent just delivered this constructive speech:
"""
${userConstructive || "(No speech recorded)"}
"""

${questionInstruction}${questionCriteria}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{
  "crossfire_questions": [
    "<question 1>",
    "<question 2>"${aiDifficulty !== "easy" ? `,
    "<question 3>"` : ""}
  ]
}`;
}

// ── spar-cf-suggest ──────────────────────────────────────────────────────────

export interface SparCfSuggestParams {
  resolution: string;
  userSide: "aff" | "neg";
  aiSide: "aff" | "neg";
  aiConstructive: string;
  mode: "question" | "response";
  aiQuestion?: string;
  difficulty: Difficulty;
}

export function sparCfSuggestPrompt({ resolution, userSide, aiSide, aiConstructive, mode, aiQuestion, difficulty }: SparCfSuggestParams): string {
  const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
  const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
  const languageStyle = getSayStyle(difficulty);

  if (mode === "question") {
    return `You are coaching a competitive debater who is arguing the ${userSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

The opposing ${aiSideLabel} debater gave this constructive speech:
"""
${aiConstructive}
"""

Generate 3 sharp crossfire questions the ${userSideLabel} debater could ask to challenge the opponent's arguments. Each question should:
- Target a specific claim or assumption from the opponent's speech
- Be concise (1-2 sentences)
- Be genuinely challenging (expose a weakness or force a concession)

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "suggestions": ["<question 1>", "<question 2>", "<question 3>"] }`;
  }

  return `You are coaching a competitive debater who is arguing the ${userSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

The opposing ${aiSideLabel} debater gave this constructive speech:
"""
${aiConstructive}
"""

The ${aiSideLabel} debater just asked this crossfire question:
"""
${aiQuestion}
"""

Generate 3 possible responses the ${userSideLabel} debater could give. Each response should:
- Directly address the question without conceding the core point
- Be 2-4 sentences
- Defend the ${userSideLabel} position effectively

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "suggestions": ["<response 1>", "<response 2>", "<response 3>"] }`;
}

// ── spar-cf-respond ──────────────────────────────────────────────────────────

export interface SparCfRespondParams {
  resolution: string;
  aiSide: "aff" | "neg";
  aiConstructive: string;
  question: string;
  difficulty: Difficulty;
  aiDifficulty: Difficulty;
}

export function sparCfRespondPrompt({ resolution, aiSide, aiConstructive, question, difficulty, aiDifficulty }: SparCfRespondParams): string {
  const aiSideLabel = aiSide === "aff" ? "Affirmative" : "Negative";
  const languageStyle = getRespondStyle(difficulty);

  const easyResponse = `You are roleplaying a nervous 3rd-grade student who is new to debate. Give a weak, uncertain response in 2-3 short sentences. You must:
- Sound confused or unsure, like a kid who doesn't fully understand what they're being asked
- Partially dodge the question or miss the point
- Use very simple words, possibly repeat yourself a little
- Maybe say something like "I mean... I think so?" or "Um, because it's just better that way"
- Do NOT give a clear logical defense`;

  const hardResponse = "Give the sharpest, most direct response possible (3-5 sentences). Fully defend your position, address every part of the question, and if possible turn it back on your opponent.";
  const mediumResponse = "Give a concise, direct response (3-5 sentences) that defends your position and directly addresses their question.";

  const responseInstruction = aiDifficulty === "easy" ? easyResponse : aiDifficulty === "hard" ? hardResponse : mediumResponse;

  return `You are a competitive debater arguing the ${aiSideLabel} side in a SPAR debate.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

Your constructive speech was:
"""
${aiConstructive}
"""

Your opponent just asked you this crossfire question:
"""
${question}
"""

${responseInstruction}

Return ONLY valid JSON (no markdown, no code blocks, no thinking tags):
{ "response": "<your spoken response>" }`;
}

// ── spar-prep-hints ──────────────────────────────────────────────────────────

export interface SparPrepHintsParams {
  resolution: string;
  userSide: "aff" | "neg";
  difficulty: Difficulty;
}

export function sparPrepHintsPrompt({ resolution, userSide, difficulty }: SparPrepHintsParams): string {
  const sideLabel = userSide === "aff" ? "Affirmative" : "Negative";
  const voteDir = userSide === "aff" ? "for" : "against";
  const languageStyle = getUseStyle(difficulty);

  return `You are a debate coach. The student argues the ${sideLabel} side (vote ${voteDir}) of:

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

Return a prep sheet as ONLY valid JSON (no markdown, no code blocks):
{
  "value": "<1-2 word value>",
  "criterion": "<criterion — 1 sentence why>",
  "arguments": [
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" },
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" },
    { "claim": "<1 sentence>", "talkingPoints": ["<1 sentence>", "<1 sentence>"], "significance": "<1 sentence>" }
  ],
  "counters": [
    { "theyArgue": "<1 sentence>", "yourRebuttal": "<1 sentence>" },
    { "theyArgue": "<1 sentence>", "yourRebuttal": "<1 sentence>" }
  ]
}`;
}

// ── spar-user-rebuttal-hint ──────────────────────────────────────────────────

export interface SparUserRebuttalHintParams {
  resolution: string;
  userSide: "aff" | "neg";
  aiConstructive: string;
  userConstructive: string;
  userCrossfire: string;
  difficulty: Difficulty;
}

export function sparUserRebuttalHintPrompt({ resolution, userSide, aiConstructive, userConstructive, userCrossfire, difficulty }: SparUserRebuttalHintParams): string {
  const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
  const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";
  const voteDirection = userSide === "aff" ? "for" : "against";
  const languageStyle = getWriteStyle(difficulty);

  return `You are a debate coach helping a student write their rebuttal speech. The student argues the ${userSideLabel} side of this resolution.

LANGUAGE STYLE: ${languageStyle}

Resolution: ${resolution}

THE OPPONENT'S (${aiSideLabel}) CONSTRUCTIVE SPEECH:
"""
${aiConstructive || "(No AI constructive speech available)"}
"""

THE STUDENT'S (${userSideLabel}) CONSTRUCTIVE SPEECH:
"""
${userConstructive || "(No constructive speech was delivered)"}
"""

CROSSFIRE EXCHANGES:
"""
${userCrossfire || "(No crossfire took place)"}
"""

Write a REBUTTAL SPEECH (exactly 200 words) for the student to deliver as the ${userSideLabel} side.
Begin "In my rebuttal...". Directly counter 3 specific arguments the opponent raised. Defend the student's own position. End urging a vote ${voteDirection} the resolution.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "user_rebuttal_hint": "<exactly 200 word rebuttal speech>"
}`;
}

// ── spar-feedback ────────────────────────────────────────────────────────────

export interface SparFeedbackParams {
  resolution: string;
  userSide: "aff" | "neg";
  userName: string;
  aiConstructive: string;
  aiRebuttal: string;
  userConstructive: string;
  userCrossfire: string;
  userRebuttal: string;
}

export function sparFeedbackPrompt({ resolution, userSide, userName, aiConstructive, aiRebuttal, userConstructive, userCrossfire, userRebuttal }: SparFeedbackParams): string {
  const userSideLabel = userSide === "aff" ? "Affirmative" : "Negative";
  const aiSideLabel = userSide === "aff" ? "Negative" : "Affirmative";

  return `You are an expert SPAR debate judge evaluating ${userName}'s performance. They argued the ${userSideLabel} side of the following resolution:

Resolution: ${resolution}

THE AI OPPONENT (${aiSideLabel} side) MADE THESE ARGUMENTS:

AI Constructive Speech:
"""
${aiConstructive}
"""

AI Rebuttal Speech:
"""
${aiRebuttal}
"""

${userName}'S SPEECHES TO EVALUATE:

${userName}'s Constructive Speech:
"""
${userConstructive || "(No constructive speech recorded)"}
"""

${userName}'s Crossfire Participation:
"""
${userCrossfire || "(No crossfire recorded)"}
"""

${userName}'s Rebuttal Speech:
"""
${userRebuttal || "(No rebuttal recorded)"}
"""

JUDGING CRITERIA — score each applicable criterion 0–10 for each phase:
- Content: Does the speaker make logical arguments, supported by evidence, that directly address the topic?
- Structure: Is the presentation organized and easy to follow?
- Delivery: Is the speaker clear, persuasive, and engaging?
- Cross-Examination: Does the speaker ask insightful questions and respond effectively? (crossfire only)
- Refutation: Is the speaker effective in defending their case and refuting the opponent? (rebuttal only)

IMPORTANT: If a speech shows "(No constructive speech recorded)", "(No crossfire recorded)", or "(No rebuttal recorded)", treat it as a forfeit — score ALL criteria for that phase as 1.0 and note in the feedback that no speech was delivered.

For the rebuttal, assess whether ${userName} directly engaged with the AI's specific arguments or gave generic responses.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no thinking tags):
{
  "overall_score": <average of all three phase scores, number 0-10 one decimal>,
  "overall_summary": "<2-3 sentence overall assessment of ${userName}'s debate performance>",
  "constructive": {
    "score": <average of content + structure + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on constructive speech>",
    "ratings": {
      "content": <number 0-10 one decimal>,
      "structure": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "crossfire": {
    "score": <average of cross_examination + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on crossfire>",
    "ratings": {
      "cross_examination": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "rebuttal": {
    "score": <average of content + refutation + delivery, number 0-10 one decimal>,
    "feedback": "<specific feedback on rebuttal: clash with AI's actual arguments>",
    "ratings": {
      "content": <number 0-10 one decimal>,
      "refutation": <number 0-10 one decimal>,
      "delivery": <number 0-10 one decimal>
    }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    {
      "aspect": "<Content | Structure | Delivery | Cross-Examination | Refutation>",
      "issue": "<what was lacking>",
      "suggestion": "<specific actionable improvement>"
    }
  ]
}`;
}
