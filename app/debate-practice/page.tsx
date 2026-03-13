"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import AudioRecorder from "@/components/AudioRecorder";
import { getTopicsByDifficulty, type SparDifficulty } from "@/lib/sparTopics";

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

interface CriterionScores {
  relevance: number;
  reasoning: number;
  clarity: number;
}

interface ArgumentFeedback {
  score: number;
  summary: string;
  criterion_scores: CriterionScores;
  strengths: string[];
  improvements: string[];
}

interface ArgumentResult extends ArgumentFeedback {
  side: "aff" | "neg";
  round: number;
  transcript: string;
}

interface RedoComparison {
  key_improvements: string[];
  regressions: string[];
  verdict: string;
}

const TURNS: Array<{ side: "aff" | "neg"; round: number }> = [
  { side: "aff", round: 1 },
  { side: "neg", round: 1 },
  { side: "aff", round: 2 },
  { side: "neg", round: 2 },
  { side: "aff", round: 3 },
  { side: "neg", round: 3 },
];

type Stage = "intro" | "recording" | "rating" | "comparison" | "complete";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-400" : score >= 6 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`text-4xl font-bold ${color}`}>
      {score}
      <span className="text-xl text-gray-500">/10</span>
    </span>
  );
}

function ScoreDiff({ original, redo }: { original: number; redo: number }) {
  const diff = parseFloat((redo - original).toFixed(1));
  const improved = diff > 0;
  const same = diff === 0;
  return (
    <span className={`text-sm font-semibold ml-2 ${improved ? "text-green-400" : same ? "text-gray-500" : "text-red-400"}`}>
      {improved ? `▲ +${diff}` : same ? "—" : `▼ ${diff}`}
    </span>
  );
}

function CriterionRow({ label, original, redo }: { label: string; original: number; redo: number }) {
  const diff = redo - original;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
  const arrowColor = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-gray-500";
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 w-20">{label}</span>
      <span className="text-gray-400 w-8 text-center">{original}</span>
      <span className={`w-8 text-center font-bold ${arrowColor}`}>{arrow}</span>
      <span className="text-white font-semibold w-8 text-center">{redo}</span>
    </div>
  );
}

function TurnIndicator({ current, turns }: { current: number; turns: Array<{ side: "aff" | "neg"; round: number }> }) {
  return (
    <div className="flex justify-center gap-2">
      {turns.map((t, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        const dotColor = isPast
          ? "bg-gray-600"
          : isCurrent
          ? t.side === "aff"
            ? "bg-purple-400"
            : "bg-orange-400"
          : "bg-gray-800";
        return <div key={i} className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />;
      })}
    </div>
  );
}

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
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? "";
  const [topic, setTopic] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<SparDifficulty>("medium");
  const [practiceMode, setPracticeMode] = useState<"solo" | "friend">("solo");
  const [userSide, setUserSide] = useState<"aff" | "neg">("aff");
  const [preferredSide, setPreferredSide] = useState<"aff" | "neg" | "random">("random");
  const [singleSideMode, setSingleSideMode] = useState(false);
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
    if (currentFeedback) {
      setResults((prev) => [
        ...prev,
        { side: currentTurn.side, round: currentTurn.round, transcript: currentTranscript, ...currentFeedback },
      ]);
    }
    advanceState(isLastTurn, setTurnIndex, setStage, resetTurnInputs);
  }

  function handleContinueFromComparison() {
    if (redoFeedback) {
      setResults((prev) => [
        ...prev,
        { side: currentTurn.side, round: currentTurn.round, transcript: redoTranscript, ...redoFeedback },
      ]);
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
    if (!topic) {
      return (
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </main>
      );
    }
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <Link href="/debate-practice/setup" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
            <h1 className="text-3xl font-bold mt-2">Debate Practice</h1>
            <p className="text-gray-400">Practice arguing both sides of a resolution</p>
          </div>

          <div className="rounded-2xl border border-purple-700 bg-purple-950 p-6 space-y-3">
            <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Resolution</p>
            <textarea
              value={topic}
              onChange={e => { setTopic(e.target.value); try { sessionStorage.setItem("debate:topic", e.target.value); } catch {}; }}
              rows={2}
              placeholder="Type your resolution..."
              className="text-2xl font-semibold text-white leading-snug text-center w-full bg-transparent border-none resize-none focus:outline-none placeholder-purple-900"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300 text-center">Your Side</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "aff", label: "Affirmative", emoji: "✅" },
                { value: "random", label: "Random", emoji: "🎲" },
                { value: "neg", label: "Negative", emoji: "❌" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPreferredSide(opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    preferredSide === opt.value
                      ? opt.value === "aff" ? "bg-purple-900 border-purple-600 text-purple-300"
                        : opt.value === "neg" ? "bg-orange-900 border-orange-600 text-orange-300"
                        : "bg-blue-900 border-blue-600 text-blue-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {preferredSide === "aff" ? "You always argue FOR the resolution"
                : preferredSide === "neg" ? "You always argue AGAINST the resolution"
                : "AFF and NEG turns alternate for both sides"}
            </p>
          </div>

          {practiceMode === "friend" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">Which side will YOU argue?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUserSide("aff")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${userSide === "aff" ? "bg-purple-900 border-purple-600 text-purple-300" : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"}`}
                >
                  Affirmative (PRO)
                </button>
                <button
                  onClick={() => setUserSide("neg")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${userSide === "neg" ? "bg-orange-900 border-orange-600 text-orange-300" : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"}`}
                >
                  Negative (CON)
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              try { sessionStorage.removeItem("debate:topic"); sessionStorage.removeItem("debate:settings"); } catch {}
              const resolved: "aff" | "neg" = preferredSide === "random" ? (Math.random() < 0.5 ? "aff" : "neg") : preferredSide;
              setUserSide(resolved);
              setSingleSideMode(preferredSide !== "random");
              setStage("recording");
            }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-lg"
          >
            Start Practice
          </button>
        </div>
      </main>
    );
  }

  // ── RECORDING ────────────────────────────────────────────────────────────
  if (stage === "recording") {
    const isAff = currentTurn.side === "aff";
    const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
    const instruction = isAff ? "Argue FOR the resolution" : "Argue AGAINST the resolution";
    const borderColor = isAff ? "border-purple-700" : "border-orange-700";
    const bgColor = isAff ? "bg-purple-950" : "bg-orange-950";
    const labelColor = isAff ? "text-purple-400" : "text-orange-400";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-1">
            <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
              Round {currentTurn.round} — {sideLabel}{isRedoing ? " — REDO" : ""}
            </p>
          </div>

          {/* Friend mode: pass device banner */}
          {practiceMode === "friend" && currentTurn.side !== userSide && !isRedoing && (
            <div className="rounded-xl border border-purple-700 bg-purple-950/50 p-4 text-center space-y-1">
              <p className="text-purple-300 font-semibold">Pass device to your friend</p>
              <p className="text-purple-400 text-xs">Friend argues the {isAff ? "Affirmative" : "Negative"} side</p>
            </div>
          )}

          <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 space-y-2`}>
            <p className="text-xs text-gray-400">{instruction}:</p>
            <p className="text-white font-medium">&ldquo;{topic}&rdquo;</p>
          </div>

          {/* Previous original shown during redo */}
          {isRedoing && originalForRedo && (
            <div className="rounded-xl border border-gray-600 bg-gray-900 p-4 space-y-1">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Your previous attempt</p>
              <p className="text-sm text-gray-400 italic">&ldquo;{originalForRedo.transcript}&rdquo;</p>
              <p className="text-xs text-gray-600 mt-1">Score: {originalForRedo.feedback.score}/10 — {originalForRedo.feedback.summary}</p>
            </div>
          )}

          {/* Past arguments history */}
          {results.length > 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Your previous arguments</p>
              <div className="space-y-2">
                {results.map((r, i) => {
                  const rIsAff = r.side === "aff";
                  const tagColor = rIsAff ? "text-purple-400" : "text-orange-400";
                  const scoreColor = r.score >= 8 ? "text-green-400" : r.score >= 6 ? "text-yellow-400" : "text-red-400";
                  return (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className={`shrink-0 font-semibold ${tagColor}`}>{rIsAff ? "AFF" : "NEG"} R{r.round}</span>
                      <span className="text-gray-300 flex-1">{r.transcript}</span>
                      <span className={`shrink-0 font-bold ${scoreColor}`}>{r.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
              <button
                onClick={() => setInputMode("voice")}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${inputMode === "voice" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-300"}`}
              >
                🎙 Voice
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${inputMode === "text" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-300"}`}
              >
                ✏️ Text
              </button>
              <button
                onClick={() => { setInputMode("ai"); if (!hint && !hintLoading) fetchHint(); }}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${inputMode === "ai" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-300"}`}
              >
                💡 AI
              </button>
            </div>

            {inputMode === "voice" ? (
              recordingStarted ? (
                <AudioRecorder onStop={(transcript) => handleRecordingDone(transcript)} />
              ) : (
                <button
                  onClick={() => setRecordingStarted(true)}
                  className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-lg"
                >
                  🎙 Start Recording
                </button>
              )
            ) : inputMode === "text" ? (
              <div className="flex flex-col gap-3 w-full">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your argument here..."
                  className="w-full h-36 p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <button
                  onClick={() => { if (textInput.trim()) handleRecordingDone(textInput.trim()); }}
                  disabled={!textInput.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                >
                  Submit Argument
                </button>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {hintLoading && (
                  <div className="flex items-center gap-3 justify-center py-4">
                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-yellow-400 text-sm">Getting hint...</p>
                  </div>
                )}
                {hintError && <p className="text-red-400 text-sm text-center">{hintError}</p>}
                {hint && !hintLoading && (
                  <div className="rounded-xl border border-yellow-800 bg-yellow-950 p-4 space-y-2">
                    <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wide">Coach hint</p>
                    <p className="text-yellow-100 text-sm leading-relaxed">{hint}</p>
                    <button onClick={fetchHint} className="text-xs text-yellow-600 hover:text-yellow-400 transition-colors pt-1">
                      Try another hint →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <TurnIndicator current={turnIndex} turns={activeTurns} />
        </div>
      </main>
    );
  }

  // ── RATING ───────────────────────────────────────────────────────────────
  if (stage === "rating") {
    const isAff = currentTurn.side === "aff";
    const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
    const labelColor = isAff ? "text-purple-400" : "text-orange-400";
    const nextTurn = !isLastTurn ? activeTurns[turnIndex + 1] : null;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
              Round {currentTurn.round} — {sideLabel}
            </p>
            <h2 className="text-2xl font-bold mt-1">Argument Rated</h2>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 mb-1">Your argument</p>
            <p className="text-sm text-gray-300 italic">&ldquo;{currentTranscript}&rdquo;</p>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Rating your argument...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-red-300 text-sm">{error}</div>
          )}

          {currentFeedback && !isLoading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                  <ScoreBadge score={currentFeedback.score} />
                </div>
                <div className="text-right space-y-1 text-sm">
                  {(["relevance", "reasoning", "clarity"] as const).map((k) => (
                    <div key={k} className="flex justify-end gap-3">
                      <span className="text-gray-500 capitalize">{k}</span>
                      <span className="text-white font-semibold w-6 text-right">{currentFeedback.criterion_scores[k]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="text-sm text-gray-300">{currentFeedback.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-800 bg-green-950 p-4 space-y-2">
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Strengths</p>
                  <ul className="space-y-1">
                    {currentFeedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-200">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-800 bg-amber-950 p-4 space-y-2">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Improve</p>
                  <ul className="space-y-1">
                    {currentFeedback.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-amber-200">• {imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* AI Example Argument */}
          {currentFeedback && !isLoading && (
            <div className="space-y-2">
              {!exampleArgument && !exampleLoading && (
                <button
                  onClick={() => fetchExampleArgument(currentFeedback, currentTranscript)}
                  className="w-full py-2.5 border border-blue-700 bg-blue-950 hover:bg-blue-900 text-blue-300 font-semibold rounded-xl transition-colors text-sm"
                >
                  ✨ See AI Example Argument
                </button>
              )}
              {exampleLoading && (
                <div className="flex items-center gap-3 justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-400 text-sm">Drafting example...</p>
                </div>
              )}
              {exampleError && <p className="text-red-400 text-xs text-center">{exampleError}</p>}
              {exampleArgument && !exampleLoading && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-blue-800 bg-blue-950 p-4 space-y-2">
                    <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">AI Example Argument</p>
                    <p className="text-blue-100 text-sm leading-relaxed">{exampleArgument}</p>
                  </div>
                  {/* Explanation of why the example is better */}
                  {exampleExplanationLoading && (
                    <div className="flex items-center gap-2 py-2 justify-center">
                      <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-yellow-400 text-xs">Explaining why this is stronger...</p>
                    </div>
                  )}
                  {exampleExplanationError && <p className="text-red-400 text-xs text-center">{exampleExplanationError}</p>}
                  {exampleExplanation && !exampleExplanationLoading && (
                    <div className="rounded-xl border border-yellow-800 bg-yellow-950/40 p-4 space-y-1">
                      <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">💡 Why this is stronger</p>
                      <p className="text-yellow-100 text-sm leading-relaxed">{exampleExplanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(currentFeedback || error) && !isLoading && (
            <div className="flex gap-3">
              <button
                onClick={handleRedo}
                className="flex-1 py-4 border border-gray-600 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold rounded-xl transition-colors"
              >
                ↩ Redo This Round
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
              >
                {isLastTurn ? "See Summary" : `Next: ${nextTurn!.side === "aff" ? "AFF" : "NEG"} R${nextTurn!.round} →`}
              </button>
            </div>
          )}

          <TurnIndicator current={turnIndex} turns={activeTurns} />
        </div>
      </main>
    );
  }

  // ── COMPARISON ───────────────────────────────────────────────────────────
  if (stage === "comparison") {
    const isAff = currentTurn.side === "aff";
    const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
    const labelColor = isAff ? "text-purple-400" : "text-orange-400";
    const orig = originalForRedo;
    const redo = redoFeedback;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center">
            <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
              Round {currentTurn.round} — {sideLabel}
            </p>
            <h2 className="text-2xl font-bold mt-1">Redo Comparison</h2>
          </div>

          {/* Redo loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Rating your redo...</p>
            </div>
          )}

          {/* Side-by-side once redo feedback is ready */}
          {orig && redo && !isLoading && (
            <>
              {/* Score comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Original</p>
                  <div>
                    <ScoreBadge score={orig.feedback.score} />
                  </div>
                  <CriterionRow label="Relevance" original={orig.feedback.criterion_scores.relevance} redo={redo.criterion_scores.relevance} />
                  <CriterionRow label="Reasoning" original={orig.feedback.criterion_scores.reasoning} redo={redo.criterion_scores.reasoning} />
                  <CriterionRow label="Clarity" original={orig.feedback.criterion_scores.clarity} redo={redo.criterion_scores.clarity} />
                </div>
                <div className="rounded-xl border border-purple-700 bg-gray-900 p-5 space-y-3">
                  <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">Redo</p>
                  <div className="flex items-baseline gap-1">
                    <ScoreBadge score={redo.score} />
                    <ScoreDiff original={orig.feedback.score} redo={redo.score} />
                  </div>
                  <CriterionRow label="Relevance" original={orig.feedback.criterion_scores.relevance} redo={redo.criterion_scores.relevance} />
                  <CriterionRow label="Reasoning" original={orig.feedback.criterion_scores.reasoning} redo={redo.criterion_scores.reasoning} />
                  <CriterionRow label="Clarity" original={orig.feedback.criterion_scores.clarity} redo={redo.criterion_scores.clarity} />
                </div>
              </div>

              {/* Summaries */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 mb-2">Original analysis</p>
                  <p className="text-sm text-gray-400">{orig.feedback.summary}</p>
                </div>
                <div className="rounded-xl border border-purple-800 bg-gray-900 p-4">
                  <p className="text-xs text-purple-400 mb-2">Redo analysis</p>
                  <p className="text-sm text-gray-300">{redo.summary}</p>
                </div>
              </div>

              {/* Transcripts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 mb-2">Original argument</p>
                  <p className="text-sm text-gray-500 italic">&ldquo;{orig.transcript}&rdquo;</p>
                </div>
                <div className="rounded-xl border border-purple-800 bg-gray-900 p-4">
                  <p className="text-xs text-purple-400 mb-2">Redo argument</p>
                  <p className="text-sm text-gray-300 italic">&ldquo;{redoTranscript}&rdquo;</p>
                </div>
              </div>

              {/* AI comparison */}
              {comparisonLoading && (
                <div className="flex items-center gap-3 justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Analyzing improvements...</p>
                </div>
              )}
              {comparisonError && (
                <p className="text-red-400 text-sm text-center">{comparisonError}</p>
              )}
              {comparison && !comparisonLoading && (
                <div className="rounded-xl border border-blue-800 bg-blue-950 p-5 space-y-4">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">What improved</p>

                  {comparison.key_improvements.length > 0 && (
                    <ul className="space-y-2">
                      {comparison.key_improvements.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-blue-100">
                          <span className="text-green-400 shrink-0">▲</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {comparison.regressions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Watch out</p>
                      <ul className="space-y-1">
                        {comparison.regressions.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-amber-200">
                            <span className="text-amber-400 shrink-0">▼</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-sm text-blue-200 border-t border-blue-800 pt-3">{comparison.verdict}</p>
                </div>
              )}

              <button
                onClick={handleContinueFromComparison}
                disabled={isLoading}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-lg"
              >
                {isLastTurn ? "See Summary" : `Continue →`}
              </button>
            </>
          )}

          <TurnIndicator current={turnIndex} turns={activeTurns} />
        </div>
      </main>
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold">Practice Complete!</h2>
          <p className="text-gray-400">
            Average score: <span className="text-white font-bold text-xl">{avgScore}/10</span>
          </p>
        </div>

        <div className="rounded-2xl border border-purple-700 bg-purple-950 p-4">
          <p className="text-xs text-purple-400 mb-1">Resolution</p>
          <p className="text-white font-medium">&ldquo;{topic}&rdquo;</p>
        </div>

        <div className="space-y-4">
          {results.map((r, i) => {
            const isAff = r.side === "aff";
            const borderColor = isAff ? "border-purple-800" : "border-orange-800";
            const labelColor = isAff ? "text-purple-400" : "text-orange-400";
            const scoreColor = r.score >= 8 ? "text-green-400" : r.score >= 6 ? "text-yellow-400" : "text-red-400";
            return (
              <div key={i} className={`rounded-xl border ${borderColor} bg-gray-900 p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
                    Round {r.round} — {isAff ? "Affirmative" : "Negative"}
                  </p>
                  <span className={`text-2xl font-bold ${scoreColor}`}>
                    {r.score}<span className="text-sm text-gray-500">/10</span>
                  </span>
                </div>
                <p className="text-gray-400 text-sm italic">&ldquo;{r.transcript}&rdquo;</p>
                <p className="text-gray-300 text-sm">{r.summary}</p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Strengths</p>
                    {r.strengths.map((s, j) => (
                      <p key={j} className="text-xs text-green-200">• {s}</p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Improve</p>
                    {r.improvements.map((s, j) => (
                      <p key={j} className="text-xs text-amber-200">• {s}</p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-800">
                  <span>Relevance: {r.criterion_scores.relevance}</span>
                  <span>Reasoning: {r.criterion_scores.reasoning}</span>
                  <span>Clarity: {r.criterion_scores.clarity}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Email summary */}
        {emailSent ? (
          <p className="text-green-400 text-sm text-center">Summary sent to {userEmail} ✓</p>
        ) : emailError ? (
          <p className="text-red-400 text-xs text-center">{emailError}</p>
        ) : (
          <p className="text-gray-500 text-xs text-center">Sending summary...</p>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            New Topic
          </button>
          <Link
            href="/"
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
