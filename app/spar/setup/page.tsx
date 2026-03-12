"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type SparDifficulty } from "@/lib/sparTopics";

type AiStrength = "easy" | "medium" | "hard";

function BackArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

export default function SparSetupPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<SparDifficulty>("medium");
  const [opponent, setOpponent] = useState<"ai" | "friend">("ai");
  const [aiStrength, setAiStrength] = useState<AiStrength>("medium");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("spar:settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.difficulty === "easy" || s.difficulty === "medium" || s.difficulty === "hard") setDifficulty(s.difficulty);
        if (s.opponent === "ai" || s.opponent === "friend") setOpponent(s.opponent);
        if (s.aiDifficulty === "easy" || s.aiDifficulty === "medium" || s.aiDifficulty === "hard") setAiStrength(s.aiDifficulty);
      }
    } catch {}
  }, []);

  function handleStart() {
    try {
      sessionStorage.setItem("spar:settings", JSON.stringify({
        difficulty,
        opponent,
        aiDifficulty: opponent === "ai" ? aiStrength : "medium",
      }));
      sessionStorage.removeItem("spar:topicOptions");
      sessionStorage.removeItem("spar:selectedTopic");
    } catch {}
    router.push("/spar");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
            <BackArrow />
            Home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            SPAR Debate
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Set Up Your Debate</h1>
          <p className="text-slate-400 text-sm">Choose your settings before the debate starts</p>
        </div>

        {/* Difficulty */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as SparDifficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-3 rounded-xl text-sm font-semibold capitalize border transition-all duration-200 cursor-pointer ${
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
          <p className="text-xs text-slate-500 text-center">
            {difficulty === "easy"
              ? "Simple, fun topics — great for 3rd & 4th graders"
              : difficulty === "medium"
              ? "Reasoning & evidence — 5th & 6th grade level"
              : "Nuanced policy & philosophy — 7th grade and above"}
          </p>
        </div>

        {/* Opponent */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Opponent</p>
          <div className="flex rounded-xl p-1 bg-white/[0.04] border border-white/[0.08]">
            <button
              onClick={() => setOpponent("ai")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                opponent === "ai"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              vs AI
            </button>
            <button
              onClick={() => setOpponent("friend")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                opponent === "friend"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              vs Friend
            </button>
          </div>
        </div>

        {/* AI Strength */}
        {opponent === "ai" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">AI Strength</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "easy" as AiStrength, label: "Weak" },
                { value: "medium" as AiStrength, label: "Normal" },
                { value: "hard" as AiStrength, label: "Strong" },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setAiStrength(value)}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                    aiStrength === value
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                      : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center">
              {aiStrength === "easy"
                ? "AI leaves logical gaps and exploitable flaws"
                : aiStrength === "medium"
                ? "AI makes solid, competent arguments"
                : "AI makes the strongest possible case with tight logic"}
            </p>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-lg rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/20"
        >
          Next: Pick a Topic →
        </button>
      </div>
    </main>
  );
}
