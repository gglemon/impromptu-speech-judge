"use client";

import Link from "next/link";
import type { SparDifficulty } from "@/lib/sparTopics";

interface SparSetupProps {
  topicOptions: string[];
  selectedTopic: string;
  customTopicOpen: boolean;
  preferredSide: "aff" | "neg" | "random";
  autoPlayAudio: boolean;
  error: string;
  onSetPreferredSide: (side: "aff" | "neg" | "random") => void;
  onSelectTopic: (topic: string) => void;
  onToggleCustomTopic: () => void;
  onCustomTopicChange: (value: string) => void;
  onToggleAutoPlay: () => void;
  onStart: () => void;
}

export default function SparSetup({
  topicOptions,
  selectedTopic,
  customTopicOpen,
  preferredSide,
  autoPlayAudio,
  error,
  onSetPreferredSide,
  onSelectTopic,
  onToggleCustomTopic,
  onCustomTopicChange,
  onToggleAutoPlay,
  onStart,
}: SparSetupProps) {
  if (topicOptions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/spar/setup" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">← Back</Link>
          <h1 className="text-3xl font-bold text-white">SPAR Debate</h1>
          <p className="text-gray-400">Pick a topic and your side to begin.</p>
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
                onClick={() => onSetPreferredSide(opt.value)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  preferredSide === opt.value
                    ? opt.value === "aff" ? "bg-green-900 border-green-600 text-green-300"
                      : opt.value === "neg" ? "bg-red-900 border-red-600 text-red-300"
                      : "bg-blue-900 border-blue-600 text-blue-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            {preferredSide === "aff" ? "You argue FOR the resolution"
              : preferredSide === "neg" ? "You argue AGAINST the resolution"
              : "Side is randomly assigned at the start"}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">Pick a topic</p>
            <button
              onClick={onToggleCustomTopic}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              + Custom topic
            </button>
          </div>
          {topicOptions.map((topic, i) => (
            <button
              key={i}
              onClick={() => onSelectTopic(topic)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-base transition-colors ${
                selectedTopic === topic
                  ? "border-blue-500 bg-blue-900/30 text-white"
                  : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500"
              }`}
            >
              {topic}
            </button>
          ))}
          {customTopicOpen && (
            <input
              type="text"
              placeholder="Type your topic…"
              autoFocus
              onChange={e => onCustomTopicChange(e.target.value)}
              value={topicOptions.includes(selectedTopic) ? "" : selectedTopic}
              className="w-full px-4 py-3 rounded-xl border border-blue-600 bg-blue-950/30 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
            />
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-medium text-gray-300">Auto-play AI audio</p>
            <p className="text-xs text-gray-500">AI speeches play automatically when ready</p>
          </div>
          <button
            onClick={onToggleAutoPlay}
            className={`relative w-12 h-6 rounded-full transition-colors ${autoPlayAudio ? "bg-blue-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPlayAudio ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={onStart} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Start Debate</button>
        <p className="text-center text-xs text-gray-600">Format: Prep → Aff Constructive → Neg Constructive → Crossfire → Aff Rebuttal → Neg Rebuttal</p>
      </div>
    </main>
  );
}
