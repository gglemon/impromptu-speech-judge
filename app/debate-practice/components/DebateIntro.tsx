import Link from "next/link";

export interface DebateIntroProps {
  topic: string;
  practiceMode: "solo" | "friend";
  onTopicChange: (newTopic: string) => void;
  onStart: () => void;
}

export function DebateIntro({
  topic,
  practiceMode,
  onTopicChange,
  onStart,
}: DebateIntroProps) {
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
          <Link href="/debate-practice/setup" className="text-gray-500 hover:text-gray-300 text-sm">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold mt-2">Debate Practice</h1>
          <p className="text-gray-400">Practice arguing both sides of a resolution</p>
        </div>

        <div className="rounded-2xl border border-purple-700 bg-purple-950 p-6 space-y-3">
          <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold">
            Resolution
          </p>
          <textarea
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            rows={2}
            placeholder="Type your resolution..."
            className="text-2xl font-semibold text-white leading-snug text-center w-full bg-transparent border-none resize-none focus:outline-none placeholder-purple-900"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300 text-center">
            You will argue both sides
          </p>
          <p className="text-xs text-gray-500 text-center">
            AFF and NEG turns alternate — practice the full resolution
          </p>
        </div>

        {practiceMode === "friend" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">Which side will YOU argue?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors bg-purple-900 border-purple-600 text-purple-300"
              >
                Affirmative (PRO)
              </button>
              <button className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors bg-gray-900 border-gray-700 text-gray-400">
                Negative (CON) — Friend
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onStart}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-lg"
        >
          Start Practice
        </button>
      </div>
    </main>
  );
}
