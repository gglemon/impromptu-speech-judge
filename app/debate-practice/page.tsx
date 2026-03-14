"use client";

import { useState, useEffect } from "react";
import { getTopicsByDifficulty, type SparDifficulty } from "@/lib/sparTopics";
import type { CriterionScores, ArgumentFeedback, ArgumentResult, RedoComparison, Stage } from "./components/types";
import { DebateIntro } from "./components/DebateIntro";
import { DebateRecording } from "./components/DebateRecording";
import { DebateRating } from "./components/DebateRating";
import { DebateComparison } from "./components/DebateComparison";
import { DebateComplete } from "./components/DebateComplete";

// Re-export shared types for any external consumers
export type { CriterionScores, ArgumentFeedback, ArgumentResult, RedoComparison, Stage };

function pickTopic(diff: SparDifficulty): string {
  const pool = getTopicsByDifficulty(diff);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Always pick a fresh topic on every visit.
function getStableTopic(diff: SparDifficulty): string {
  try {
    const saved = sessionStorage.getItem("debate:topic");
    if (saved) return saved;
  } catch {}
  const t = pickTopic(diff);
  try { sessionStorage.setItem("debate:topic", t); } catch {}
  return t;
}

const TURNS: Array<{ side: "aff" | "neg"; round: number }> = [
  { side: "aff", round: 1 },
  { side: "neg", round: 1 },
  { side: "aff", round: 2 },
  { side: "neg", round: 2 },
  { side: "aff", round: 3 },
  { side: "neg", round: 3 },
];

function advanceState(
  isLastTurn: boolean,
  setTurnIndex: React.Dispatch<React.SetStateAction<number>>,
  setStage: (s: Stage) => void,
  resetTurn: () => void
) {
  if (isLastTurn) {
    setStage("complete");
  } else {
    setTurnIndex((i) => i + 1);
    resetTurn();
    setStage("recording");
  }
}

export default function DebatePracticePage() {
  const userEmail = "";
  const [topic, setTopic] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<SparDifficulty>("medium");
  const [practiceMode, setPracticeMode] = useState<"solo" | "friend">("solo");
  const [userSide] = useState<"aff" | "neg">("aff");
  const [singleSideMode] = useState(false);
  const [numRounds, setNumRounds] = useState(3);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentFeedback, setCurrentFeedback] = useState<ArgumentFeedback | null>(null);
  const [results, setResults] = useState<ArgumentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // input controls
  const [inputMode, setInputMode] = useState<"voice" | "text" | "ai">("voice");
  const [textInput, setTextInput] = useState("");
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState("");

  // redo state
  const [isRedoing, setIsRedoing] = useState(false);
  const [originalForRedo, setOriginalForRedo] = useState<{ transcript: string; feedback: ArgumentFeedback } | null>(null);
  const [redoTranscript, setRedoTranscript] = useState("");
  const [redoFeedback, setRedoFeedback] = useState<ArgumentFeedback | null>(null);
  const [comparison, setComparison] = useState<RedoComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  // example argument
  const [exampleArgument, setExampleArgument] = useState("");
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState("");
  const [exampleExplanation, setExampleExplanation] = useState("");
  const [exampleExplanationLoading, setExampleExplanationLoading] = useState(false);
  const [exampleExplanationError, setExampleExplanationError] = useState("");

  const activeTurns = singleSideMode
    ? TURNS.filter(t => t.side === userSide).slice(0, numRounds)
    : TURNS.slice(0, numRounds * 2);
  const currentTurn = activeTurns[turnIndex] ?? TURNS[0];
  const isLastTurn = turnIndex === activeTurns.length - 1;


  function resetTurnInputs() {
    setCurrentTranscript("");
    setCurrentFeedback(null);
    setTextInput("");
    setRecordingStarted(false);
    setHint("");
    setHintError("");
    setInputMode("voice");
    setIsRedoing(false);
    setOriginalForRedo(null);
    setRedoTranscript("");
    setRedoFeedback(null);
    setComparison(null);
    setComparisonError("");
    setExampleArgument("");
    setExampleError("");
    setExampleExplanation("");
    setExampleExplanationError("");
  }

  async function fetchFeedback(transcript: string): Promise<ArgumentFeedback> {
    const res = await fetch("/api/debate-argument-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resolution: topic,
        side: currentTurn.side,
        argument: transcript,
        round: currentTurn.round,
        difficulty,
        previousArguments: results.map((r) => ({ side: r.side, round: r.round, transcript: r.transcript })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Feedback failed");
    return data;
  }

  async function handleRecordingDone(transcript: string) {
    setError("");
    setIsLoading(true);

    if (isRedoing) {
      setRedoTranscript(transcript);
      setStage("comparison");
      try {
        const feedback = await fetchFeedback(transcript);
        setRedoFeedback(feedback);
        fetchComparison(transcript, feedback);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentTranscript(transcript);
      setCurrentFeedback(null);
      setStage("rating");
      try {
        const feedback = await fetchFeedback(transcript);
        setCurrentFeedback(feedback);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function fetchComparison(rt: string, rf: ArgumentFeedback) {
    if (!originalForRedo) return;
    setComparisonLoading(true);
    setComparisonError("");
    try {
      const res = await fetch("/api/debate-redo-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: topic,
          side: currentTurn.side,
          originalTranscript: originalForRedo.transcript,
          originalFeedback: originalForRedo.feedback,
          redoTranscript: rt,
          redoFeedback: rf,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Comparison failed");
      setComparison(data);
    } catch (e) {
      setComparisonError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setComparisonLoading(false);
    }
  }

  function handleRedo() {
    setOriginalForRedo({ transcript: currentTranscript, feedback: currentFeedback! });
    setIsRedoing(true);
    setCurrentTranscript("");
    setCurrentFeedback(null);
    setRedoTranscript("");
    setRedoFeedback(null);
    setComparison(null);
    setComparisonError("");
    setTextInput("");
    setRecordingStarted(false);
    setHint("");
    setHintError("");
    setInputMode("voice");
    setStage("recording");
  }

  function handleNext() {
    const finalResults = currentFeedback
      ? [...results, { side: currentTurn.side, round: currentTurn.round, transcript: currentTranscript, ...currentFeedback }]
      : results;
    if (currentFeedback) {
      setResults(finalResults);
    }
    if (isLastTurn) {
      ;(async () => {
        try {
          const form = new FormData();
          form.append("sessionData", JSON.stringify({
            mode: "debate", topic, difficulty, numRounds,
            results: finalResults, savedAt: new Date().toISOString(),
          }));
          await fetch("/api/recording-save", { method: "POST", body: form });
        } catch {}
      })();
    }
    advanceState(isLastTurn, setTurnIndex, setStage, resetTurnInputs);
  }

  function handleContinueFromComparison() {
    const finalResults = redoFeedback
      ? [...results, { side: currentTurn.side, round: currentTurn.round, transcript: redoTranscript, ...redoFeedback }]
      : results;
    if (redoFeedback) {
      setResults(finalResults);
    }
    if (isLastTurn) {
      ;(async () => {
        try {
          const form = new FormData();
          form.append("sessionData", JSON.stringify({
            mode: "debate", topic, difficulty, numRounds,
            results: finalResults, savedAt: new Date().toISOString(),
          }));
          await fetch("/api/recording-save", { method: "POST", body: form });
        } catch {}
      })();
    }
    advanceState(isLastTurn, setTurnIndex, setStage, resetTurnInputs);
  }

  async function fetchExampleArgument(feedback: ArgumentFeedback, transcript: string) {
    setExampleArgument("");
    setExampleError("");
    setExampleExplanation("");
    setExampleExplanationError("");
    setExampleLoading(true);
    try {
      const res = await fetch("/api/debate-example-argument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: topic,
          side: currentTurn.side,
          round: currentTurn.round,
          difficulty,
          userTranscript: transcript,
          improvements: feedback.improvements,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setExampleArgument(data.argument);
      // auto-fetch explanation
      fetchExampleExplanation(transcript, data.argument);
    } catch (e) {
      setExampleError(e instanceof Error ? e.message : "Could not generate example");
    } finally {
      setExampleLoading(false);
    }
  }

  async function fetchExampleExplanation(userTranscript: string, example: string) {
    setExampleExplanation("");
    setExampleExplanationError("");
    setExampleExplanationLoading(true);
    try {
      const res = await fetch("/api/debate-example-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userArgument: userTranscript,
          exampleArgument: example,
          side: currentTurn.side,
          resolution: topic,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setExampleExplanation(data.explanation);
    } catch (e) {
      setExampleExplanationError(e instanceof Error ? e.message : "Could not generate explanation");
    } finally {
      setExampleExplanationLoading(false);
    }
  }

  async function fetchHint() {
    setHint("");
    setHintError("");
    setHintLoading(true);
    try {
      const res = await fetch("/api/debate-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: topic,
          side: currentTurn.side,
          round: currentTurn.round,
          difficulty,
          previousArguments: results.map((r) => ({ side: r.side, round: r.round, transcript: r.transcript })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hint failed");
      setHint(data.hint);
    } catch (e) {
      setHintError(e instanceof Error ? e.message : "Could not load hint");
    } finally {
      setHintLoading(false);
    }
  }

  const avgScore =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
      : null;

  // email state
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function sendSummaryEmail() {
    const body = [
      `Debate Practice Summary`,
      `Resolution: "${topic}"`,
      `Average Score: ${avgScore}/10`,
      ``,
      ...results.map((r) =>
        [
          `--- ${r.side === "aff" ? "Affirmative" : "Negative"} Round ${r.round} ---`,
          `Score: ${r.score}/10  (Relevance: ${r.criterion_scores.relevance}, Reasoning: ${r.criterion_scores.reasoning}, Clarity: ${r.criterion_scores.clarity})`,
          `Argument: ${r.transcript}`,
          `Analysis: ${r.summary}`,
          `Strengths: ${r.strengths.join("; ")}`,
          `Improvements: ${r.improvements.join("; ")}`,
        ].join("\n")
      ),
    ].join("\n");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          subject: `Debate Practice: "${topic}"`,
          text: body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Email failed");
      setEmailSent(true);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Could not send email");
    }
  }

  // Read settings from sessionStorage and load topic — runs only on client after mount
  useEffect(() => {
    let diff: SparDifficulty = "medium";
    let m: "solo" | "friend" = "solo";
    let r = 3;
    try {
      const stored = sessionStorage.getItem("debate:settings");
      if (stored) {
        const s = JSON.parse(stored);
        if (s.difficulty === "easy" || s.difficulty === "medium" || s.difficulty === "hard") diff = s.difficulty;
        if (s.mode === "solo" || s.mode === "friend") m = s.mode;
        if (s.rounds === 2 || s.rounds === 3) r = s.rounds;
      }
    } catch {}

    setDifficulty(diff);
    setPracticeMode(m);
    setNumRounds(r);
    setTopic(getStableTopic(diff));
  }, []);

  useEffect(() => {
    if (stage === "complete" && results.length > 0 && !emailSent) {
      sendSummaryEmail();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <DebateIntro
        topic={topic}
        practiceMode={practiceMode}
        onTopicChange={(newTopic) => {
          setTopic(newTopic);
          try { sessionStorage.setItem("debate:topic", newTopic); } catch {}
        }}
        onStart={() => {
          try { sessionStorage.removeItem("debate:topic"); sessionStorage.removeItem("debate:settings"); } catch {}
          setStage("recording");
        }}
      />
    );
  }

  // ── RECORDING ────────────────────────────────────────────────────────────
  if (stage === "recording") {
    return (
      <DebateRecording
        topic={topic}
        currentTurn={currentTurn}
        turnIndex={turnIndex}
        activeTurns={activeTurns}
        practiceMode={practiceMode}
        userSide={userSide}
        isRedoing={isRedoing}
        originalForRedo={originalForRedo}
        inputMode={inputMode}
        textInput={textInput}
        recordingStarted={recordingStarted}
        hint={hint}
        hintLoading={hintLoading}
        hintError={hintError}
        results={results}
        onSetInputMode={setInputMode}
        onSetTextInput={setTextInput}
        onSetRecordingStarted={setRecordingStarted}
        onRecordingDone={handleRecordingDone}
        onFetchHint={fetchHint}
      />
    );
  }

  // ── RATING ───────────────────────────────────────────────────────────────
  if (stage === "rating") {
    return (
      <DebateRating
        currentTurn={currentTurn}
        turnIndex={turnIndex}
        activeTurns={activeTurns}
        isLastTurn={isLastTurn}
        currentTranscript={currentTranscript}
        currentFeedback={currentFeedback}
        isLoading={isLoading}
        error={error}
        exampleArgument={exampleArgument}
        exampleLoading={exampleLoading}
        exampleError={exampleError}
        exampleExplanation={exampleExplanation}
        exampleExplanationLoading={exampleExplanationLoading}
        exampleExplanationError={exampleExplanationError}
        onFetchExampleArgument={fetchExampleArgument}
        onRedo={handleRedo}
        onNext={handleNext}
      />
    );
  }

  // ── COMPARISON ───────────────────────────────────────────────────────────
  if (stage === "comparison") {
    return (
      <DebateComparison
        currentTurn={currentTurn}
        turnIndex={turnIndex}
        activeTurns={activeTurns}
        isLastTurn={isLastTurn}
        isLoading={isLoading}
        originalForRedo={originalForRedo}
        redoFeedback={redoFeedback}
        redoTranscript={redoTranscript}
        comparison={comparison}
        comparisonLoading={comparisonLoading}
        comparisonError={comparisonError}
        onContinue={handleContinueFromComparison}
      />
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────────
  return (
    <DebateComplete
      topic={topic}
      results={results}
      avgScore={avgScore}
      userEmail={userEmail}
      emailSent={emailSent}
      emailError={emailError}
    />
  );
}
