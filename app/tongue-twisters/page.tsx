"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import { getRandomTwister } from "@/lib/tongueTwisters";

type Difficulty = "easy" | "medium" | "hard";
type Stage = "setup" | "ready" | "processing" | "feedback";

// Twisters stored in sessionStorage so they survive OAuth redirects.
function getStableTwister(diff: Difficulty): string {
  try {
    const saved = sessionStorage.getItem(`tt:twister:${diff}`);
    if (saved) return saved;
  } catch {}
  const t = getRandomTwister(diff).text;
  try { sessionStorage.setItem(`tt:twister:${diff}`, t); } catch {}
  return t;
}

function pickFreshTwister(diff: Difficulty): string {
  const t = getRandomTwister(diff).text;
  try { sessionStorage.setItem(`tt:twister:${diff}`, t); } catch {}
  return t;
}

interface TwisterFeedback {
  accuracy: number;
  fluency: number;
  summary: string;
  tricky_parts: string[];
  tip: string;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold ${color}`}>
        {value.toFixed(1)}
        <span className="text-xl text-gray-500">/10</span>
      </span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

export default function TongueTwistersPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [twister, setTwister] = useState<string>("");
  const [repetitions, setRepetitions] = useState(3);
  const [stage, setStage] = useState<Stage>("setup");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<TwisterFeedback | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load difficulty + twister from sessionStorage on mount (restores after OAuth redirect)
  useEffect(() => {
    try {
      const savedDiff = sessionStorage.getItem("tt:difficulty") as Difficulty | null;
      const diff: Difficulty = (savedDiff === "easy" || savedDiff === "medium" || savedDiff === "hard") ? savedDiff : "easy";
      setDifficulty(diff);
      prevDifficultyRef.current = diff;
      setTwister(getStableTwister(diff));
    } catch {
      setTwister(getStableTwister("easy"));
    }
  }, []);

  function pickNewTwister(diff: Difficulty) {
    setTwister(pickFreshTwister(diff));
  }

  const prevDifficultyRef = useRef<Difficulty>("easy");
  useEffect(() => {
    if (difficulty === prevDifficultyRef.current) return;
    prevDifficultyRef.current = difficulty;
    try { sessionStorage.setItem("tt:difficulty", difficulty); } catch {}
    setTwister(getStableTwister(difficulty));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  function speakTwister() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(twister);
    utt.rate = 0.85;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  async function handleStop(t: string, _duration: number, _recordingUrl: string) {
    setTranscript(t);
    setStage("processing");

    try {
      const res = await fetch("/api/tongue-twister-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ twister, transcript: t, repetitions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feedback failed");
      setFeedback(data);
      setStage("feedback");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleRedo() {
    stopSpeaking();
    setFeedback(null);
    setTranscript("");
    setError("");
    setStage("ready");
  }

  function handleNewTwister() {
    stopSpeaking();
    setFeedback(null);
    setTranscript("");
    setError("");
    pickNewTwister(difficulty);
    setStage("setup");
  }

  const overallScore = feedback ? (feedback.accuracy + feedback.fluency) / 2 : 0;
  const overallColor = overallScore >= 8 ? "text-green-400" : overallScore >= 6 ? "text-yellow-400" : "text-red-400";

  if (stage === "setup" && !twister) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-pink-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            Tongue Twisters
          </span>
        </div>

        {/* Setup */}
        {stage === "setup" && (
          <div className="space-y-8">
            {/* Difficulty */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-300 text-center">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all duration-200 cursor-pointer ${
                      difficulty === d
                        ? d === "easy"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : d === "medium"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : "bg-red-500/15 border-red-500/40 text-red-400"
                        : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center">
                {difficulty === "easy" ? "Short and simple — great for warming up"
                  : difficulty === "medium" ? "Medium length with tricky sound combos"
                  : "Long and twisty — a real challenge!"}
              </p>
            </div>

            {/* Twister card */}
            <div className="rounded-2xl bg-pink-500/10 border border-pink-500/25 p-6 text-center min-h-[9rem] flex flex-col items-center justify-center gap-4">
              <p className="text-pink-300 text-sm font-medium uppercase tracking-wide">Your Tongue Twister</p>
              <p className="text-2xl font-bold text-white leading-snug">{twister}</p>
              <button
                onClick={() => pickNewTwister(difficulty)}
                className="text-xs text-pink-400 hover:text-pink-200 transition-colors"
              >
                🔀 Pick another
              </button>
            </div>

            {/* Repetitions */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-300 text-center">Say it how many times?</p>
              <div className="flex gap-2 justify-center">
                  {[1, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRepetitions(n)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                      repetitions === n
                        ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
                        : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setStage("ready"); }}
              className="w-full py-4 bg-pink-600 hover:bg-pink-500 active:scale-[0.99] text-white font-bold text-lg rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-pink-500/20"
            >
              Ready for Practice
            </button>
          </div>
        )}

        {/* Ready */}
        {stage === "ready" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-pink-500/10 border border-pink-500/25 p-6 text-center min-h-[9rem] flex flex-col items-center justify-center gap-3">
              <p className="text-pink-300 text-sm font-medium uppercase tracking-wide">
                Say this {repetitions}× in a row
              </p>
              <p className="text-2xl font-bold text-white leading-snug">{twister}</p>
              <div className="flex justify-center pt-1">
                {isSpeaking ? (
                  <button onClick={stopSpeaking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-700 text-red-300 text-xs font-semibold">
                    ■ Stop
                  </button>
                ) : (
                  <button onClick={speakTwister} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-semibold">
                    ▶ Hear it
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-400 text-center text-sm">
              Listen, then record yourself saying it {repetitions} time{repetitions > 1 ? "s" : ""}!
            </p>
            <AudioRecorder onStop={handleStop} />
          </div>
        )}

        {/* Processing */}
        {stage === "processing" && (
          <div className="flex flex-col items-center gap-4 py-16">
            {error ? (
              <div className="rounded-xl bg-red-950 border border-red-700 p-5 text-center space-y-3 w-full">
                <p className="text-red-300 font-medium">Something went wrong</p>
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => { setError(""); setStage("ready"); }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-300 font-medium">Rating your pronunciation...</p>
              </>
            )}
          </div>
        )}

        {/* Feedback */}
        {stage === "feedback" && feedback && (
          <div className="space-y-6">
            {/* Twister reminder */}
            <div className="rounded-2xl bg-pink-950 border border-pink-700 p-5 text-center space-y-1">
              <p className="text-pink-300 text-xs font-medium uppercase tracking-wide">Said {repetitions}×</p>
              <p className="text-lg font-semibold text-white leading-snug">{twister}</p>
            </div>

            {/* Scores */}
            <div className="rounded-xl bg-gray-900 border border-gray-700 p-5">
              <div className="flex justify-around">
                <ScoreRing
                  value={feedback.accuracy}
                  label="Accuracy"
                  color={feedback.accuracy >= 8 ? "text-green-400" : feedback.accuracy >= 6 ? "text-yellow-400" : "text-red-400"}
                />
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-5xl font-bold ${overallColor}`}>
                    {overallScore.toFixed(1)}
                    <span className="text-2xl text-gray-500">/10</span>
                  </span>
                  <span className="text-xs text-gray-400">Overall</span>
                </div>
                <ScoreRing
                  value={feedback.fluency}
                  label="Fluency"
                  color={feedback.fluency >= 8 ? "text-green-400" : feedback.fluency >= 6 ? "text-yellow-400" : "text-red-400"}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-gray-800 border border-gray-700 p-4">
              <p className="text-gray-200 text-sm leading-relaxed">{feedback.summary}</p>
            </div>

            {/* Tricky parts */}
            {feedback.tricky_parts?.length > 0 && (
              <div className="rounded-xl bg-orange-950 border border-orange-800 p-4 space-y-2">
                <p className="text-orange-300 text-xs font-semibold uppercase tracking-wide">Tricky Parts</p>
                <div className="flex flex-wrap gap-2">
                  {feedback.tricky_parts.map((part, i) => (
                    <span key={i} className="px-2 py-1 bg-orange-900/60 border border-orange-700 text-orange-200 text-xs rounded-lg">
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="rounded-xl bg-blue-950 border border-blue-800 p-4 space-y-1">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">💡 Tip</p>
              <p className="text-blue-100 text-sm leading-relaxed">{feedback.tip}</p>
            </div>

            {/* What we heard */}
            {transcript && (
              <div className="rounded-xl bg-gray-900 border border-gray-700 p-4">
                <p className="text-xs text-gray-500 mb-1">What we heard</p>
                <p className="text-gray-300 text-sm leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRedo}
                className="flex-1 py-3 bg-pink-700 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors"
              >
                ↩ Try Again
              </button>
              <button
                onClick={handleNewTwister}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
              >
                🔀 New Twister
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
