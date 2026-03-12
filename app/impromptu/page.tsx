"use client";

import Link from "next/link";
import { useState } from "react";
import DifficultySelector from "@/components/DifficultySelector";

type Difficulty = "easy" | "medium" | "hard";

export default function ImpromptuHome() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [thinkTime, setThinkTime] = useState(120);
  const [speechLength, setSpeechLength] = useState(300);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-10">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-violet-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Impromptu Speech
          </span>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Impromptu Speech
          </h1>
          <p className="text-slate-400">
            Get a random topic, think, speak, and receive AI feedback.
          </p>
        </div>

        <DifficultySelector
          difficulty={difficulty}
          onChange={setDifficulty}
          thinkTime={thinkTime}
          onThinkTimeChange={setThinkTime}
          speechLength={speechLength}
          onSpeechLengthChange={setSpeechLength}
        />

        <Link
          href={`/session?difficulty=${difficulty}&thinkTime=${thinkTime}&speechLength=${speechLength}`}
          className="block w-full py-4 bg-violet-600 hover:bg-violet-500 active:scale-[0.99] text-white font-bold text-center text-lg rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/20"
        >
          Start Session →
        </Link>
      </div>
    </main>
  );
}
