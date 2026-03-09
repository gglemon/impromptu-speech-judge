"use client";

import Link from "next/link";
import { useState } from "react";
import DifficultySelector from "@/components/DifficultySelector";

type Difficulty = "easy" | "medium" | "hard";

export default function ImpromptuHome() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [thinkTime, setThinkTime] = useState(120); // seconds
  const [speechLength, setSpeechLength] = useState(300); // seconds, default 5 min

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-10">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Impromptu Speech
          </h1>
          <p className="text-gray-400 text-lg">
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
          className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center text-lg rounded-xl transition-colors"
        >
          Start Session
        </Link>
      </div>
    </main>
  );
}
