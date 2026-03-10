"use client";

import { useState } from "react";
import Link from "next/link";
import AudioRecorder from "@/components/AudioRecorder";
import { sparTopics } from "@/lib/sparTopics";

const practiceTopics = [...sparTopics.easy, ...sparTopics.medium];

function getRandomTopic(): string {
  return practiceTopics[Math.floor(Math.random() * practiceTopics.length)];
}

function getTopicDifficulty(topic: string): "easy" | "medium" {
  return sparTopics.easy.includes(topic) ? "easy" : "medium";
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

const TURNS: Array<{ side: "aff" | "neg"; round: number }> = [
  { side: "aff", round: 1 },
  { side: "neg", round: 1 },
  { side: "aff", round: 2 },
  { side: "neg", round: 2 },
  { side: "aff", round: 3 },
  { side: "neg", round: 3 },
];

type Stage = "intro" | "recording" | "rating" | "complete";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "text-green-400"
      : score >= 6
      ? "text-yellow-400"
      : "text-red-400";
  return (
    <span className={`text-4xl font-bold ${color}`}>
      {score}
      <span className="text-xl text-gray-500">/10</span>
    </span>
  );
}

function TurnIndicator({ current }: { current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {TURNS.map((t, i) => {
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

export default function DebatePracticePage() {
  const [topic] = useState<string>(getRandomTopic);
  const [stage, setStage] = useState<Stage>("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentFeedback, setCurrentFeedback] = useState<ArgumentFeedback | null>(null);
  const [results, setResults] = useState<ArgumentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState("");

  const difficulty = getTopicDifficulty(topic);

  const currentTurn = TURNS[turnIndex];
  const isLastTurn = turnIndex === TURNS.length - 1;

  async function handleRecordingDone(transcript: string) {
    setCurrentTranscript(transcript);
    setCurrentFeedback(null);
    setError("");
    setIsLoading(true);
    setStage("rating");

    try {
      const res = await fetch("/api/debate-argument-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: topic,
          side: currentTurn.side,
          argument: transcript,
          round: currentTurn.round,
          previousArguments: results.map((r) => ({
            side: r.side,
            round: r.round,
            transcript: r.transcript,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feedback failed");
      setCurrentFeedback(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    if (currentFeedback) {
      setResults((prev) => [
        ...prev,
        { side: currentTurn.side, round: currentTurn.round, transcript: currentTranscript, ...currentFeedback },
      ]);
    }
    if (isLastTurn) {
      setStage("complete");
    } else {
      setTurnIndex((i) => i + 1);
      setCurrentTranscript("");
      setCurrentFeedback(null);
      setTextInput("");
      setRecordingStarted(false);
      setHint("");
      setHintError("");
      setStage("recording");
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
          previousArguments: results.map((r) => ({
            side: r.side,
            round: r.round,
            transcript: r.transcript,
          })),
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

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold mt-2">Debate Practice</h1>
            <p className="text-gray-400">Practice arguing both sides of a resolution</p>
          </div>

          <div className="rounded-2xl border border-purple-700 bg-purple-950 p-6 space-y-2">
            <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Resolution</p>
            <p className="text-2xl font-semibold text-white leading-snug">&ldquo;{topic}&rdquo;</p>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 space-y-3">
            <p className="text-sm font-semibold text-gray-300">How it works</p>
            <div className="space-y-2 text-sm">
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex gap-3">
                  <span className="w-24 text-purple-400 font-semibold shrink-0">AFF Round {r}</span>
                  <span className="text-gray-400">{r === 1 ? "Argue FOR the resolution" : "Make a stronger affirmative argument"}</span>
                </div>
              ))}
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex gap-3">
                  <span className="w-24 text-orange-400 font-semibold shrink-0">NEG Round {r}</span>
                  <span className="text-gray-400">{r === 1 ? "Argue AGAINST the resolution" : "Make a stronger negative argument"}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 pt-1">
              AI rates each argument on relevance, reasoning, and clarity. Use voice or text input.
            </p>
          </div>

          <button
            onClick={() => setStage("recording")}
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
    const instruction = isAff
      ? `Argue FOR the resolution`
      : `Argue AGAINST the resolution`;
    const borderColor = isAff ? "border-purple-700" : "border-orange-700";
    const bgColor = isAff ? "bg-purple-950" : "bg-orange-950";
    const labelColor = isAff ? "text-purple-400" : "text-orange-400";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-1">
            <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
              Round {currentTurn.round} — {sideLabel}
            </p>
            <h2 className="text-2xl font-bold">Your Turn</h2>
          </div>

          <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 space-y-2`}>
            <p className="text-xs text-gray-400">{instruction}:</p>
            <p className="text-white font-medium">&ldquo;{topic}&rdquo;</p>
          </div>

          {/* Past arguments */}
          {results.length > 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Your previous arguments</p>
              <div className="space-y-2">
                {results.map((r, i) => {
                  const rIsAff = r.side === "aff";
                  const tagColor = rIsAff ? "text-purple-400" : "text-orange-400";
                  const scoreColor =
                    r.score >= 8 ? "text-green-400" : r.score >= 6 ? "text-yellow-400" : "text-red-400";
                  return (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className={`shrink-0 font-semibold ${tagColor}`}>
                        {rIsAff ? "AFF" : "NEG"} R{r.round}
                      </span>
                      <span className="text-gray-300 flex-1">{r.transcript}</span>
                      <span className={`shrink-0 font-bold ${scoreColor}`}>{r.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hint button + display */}
          <div className="space-y-2">
            <button
              onClick={fetchHint}
              disabled={hintLoading}
              className="w-full py-2.5 border border-yellow-700 bg-yellow-950 hover:bg-yellow-900 disabled:opacity-50 text-yellow-300 font-semibold rounded-xl transition-colors text-sm"
            >
              {hintLoading ? "Getting hint..." : "💡 Get AI Hint"}
            </button>
            {hintError && <p className="text-red-400 text-xs text-center">{hintError}</p>}
            {hint && (
              <div className="rounded-xl border border-yellow-800 bg-yellow-950 p-4">
                <p className="text-xs text-yellow-500 mb-1 font-semibold">Coach hint</p>
                <p className="text-yellow-100 text-sm leading-relaxed">{hint}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* Input mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
              <button
                onClick={() => setInputMode("voice")}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${
                  inputMode === "voice" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-300"
                }`}
              >
                🎙 Voice
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${
                  inputMode === "text" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-500 hover:text-gray-300"
                }`}
              >
                ✏️ Text
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
            ) : (
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
            )}
          </div>

          <TurnIndicator current={turnIndex} />
        </div>
      </main>
    );
  }

  // ── RATING ───────────────────────────────────────────────────────────────
  if (stage === "rating") {
    const isAff = currentTurn.side === "aff";
    const sideLabel = isAff ? "AFFIRMATIVE" : "NEGATIVE";
    const labelColor = isAff ? "text-purple-400" : "text-orange-400";
    const nextTurn = !isLastTurn ? TURNS[turnIndex + 1] : null;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <p className={`text-xs uppercase tracking-widest font-semibold ${labelColor}`}>
              Round {currentTurn.round} — {sideLabel}
            </p>
            <h2 className="text-2xl font-bold mt-1">Argument Rated</h2>
          </div>

          {/* Transcript */}
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 mb-1">Your argument</p>
            <p className="text-sm text-gray-300 italic">&ldquo;{currentTranscript}&rdquo;</p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Rating your argument...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Feedback */}
          {currentFeedback && !isLoading && (
            <div className="space-y-4">
              {/* Score row */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                  <ScoreBadge score={currentFeedback.score} />
                </div>
                <div className="text-right space-y-1 text-sm">
                  <div className="flex justify-end gap-3">
                    <span className="text-gray-500">Relevance</span>
                    <span className="text-white font-semibold w-6 text-right">
                      {currentFeedback.criterion_scores.relevance}
                    </span>
                  </div>
                  <div className="flex justify-end gap-3">
                    <span className="text-gray-500">Reasoning</span>
                    <span className="text-white font-semibold w-6 text-right">
                      {currentFeedback.criterion_scores.reasoning}
                    </span>
                  </div>
                  <div className="flex justify-end gap-3">
                    <span className="text-gray-500">Clarity</span>
                    <span className="text-white font-semibold w-6 text-right">
                      {currentFeedback.criterion_scores.clarity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="text-sm text-gray-300">{currentFeedback.summary}</p>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-800 bg-green-950 p-4 space-y-2">
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Strengths</p>
                  <ul className="space-y-1">
                    {currentFeedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-200">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-800 bg-amber-950 p-4 space-y-2">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Improve</p>
                  <ul className="space-y-1">
                    {currentFeedback.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-amber-200">
                        • {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Next button */}
          {(currentFeedback || error) && !isLoading && (
            <button
              onClick={handleNext}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-lg"
            >
              {isLastTurn
                ? "See Summary"
                : `Next: ${nextTurn!.side === "aff" ? "AFF" : "NEG"} Round ${nextTurn!.round} →`}
            </button>
          )}

          <TurnIndicator current={turnIndex} />
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
            Average score:{" "}
            <span className="text-white font-bold text-xl">{avgScore}/10</span>
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
            const scoreColor =
              r.score >= 8
                ? "text-green-400"
                : r.score >= 6
                ? "text-yellow-400"
                : "text-red-400";

            return (
              <div key={i} className={`rounded-xl border ${borderColor} bg-gray-900 p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
                    Round {r.round} — {isAff ? "Affirmative" : "Negative"}
                  </p>
                  <span className={`text-2xl font-bold ${scoreColor}`}>
                    {r.score}
                    <span className="text-sm text-gray-500">/10</span>
                  </span>
                </div>
                <p className="text-gray-400 text-sm italic">&ldquo;{r.transcript}&rdquo;</p>
                <p className="text-gray-300 text-sm">{r.summary}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Relevance: {r.criterion_scores.relevance}</span>
                  <span>Reasoning: {r.criterion_scores.reasoning}</span>
                  <span>Clarity: {r.criterion_scores.clarity}</span>
                </div>
              </div>
            );
          })}
        </div>

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
