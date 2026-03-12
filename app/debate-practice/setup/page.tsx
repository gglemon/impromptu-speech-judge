"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { type SparDifficulty } from "@/lib/sparTopics";

export default function DebatePracticeSetupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [difficulty, setDifficulty] = useState<SparDifficulty>("medium");
  const [mode, setMode] = useState<"solo" | "friend">("solo");
  const [rounds, setRounds] = useState(3);

  function handleStart() {
    if (!session?.user) { signIn("google"); return; }
    try {
      sessionStorage.setItem("debate:settings", JSON.stringify({ difficulty, mode, rounds }));
    } catch {}
    router.push("/debate-practice");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Debate Practice
          </span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Set Up Practice</h1>
          <p className="text-slate-400 text-sm">Choose your settings before practicing</p>
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
              ? "3rd–4th grade · simple topics and language"
              : difficulty === "medium"
              ? "5th–6th grade · reasoning and evidence"
              : "7th grade+ · nuanced policy and philosophy"}
          </p>
        </div>

        {/* Practice Mode */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Practice Mode</p>
          <div className="flex rounded-xl p-1 bg-white/[0.04] border border-white/[0.08]">
            <button
              onClick={() => setMode("solo")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                mode === "solo" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => setMode("friend")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                mode === "friend" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              With a Friend
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            {mode === "solo"
              ? "Practice arguing both sides yourself"
              : "Take turns with a friend arguing each side"}
          </p>
        </div>

        {/* Rounds per Side */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Rounds per Side</p>
          <div className="flex rounded-xl p-1 bg-white/[0.04] border border-white/[0.08]">
            {[2, 3].map(n => (
              <button
                key={n}
                onClick={() => setRounds(n)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  rounds === n ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {n === 2 ? "Two arguments" : "Three arguments"}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center">
            {rounds === 2
              ? "4 total turns · faster session"
              : "6 total turns · more thorough practice"}
          </p>
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white font-bold text-lg rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          Next: Pick a Topic →
        </button>
      </div>
    </main>
  );
}
