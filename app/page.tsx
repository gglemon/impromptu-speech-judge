import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Speech &amp; Debate Assistant
          </h1>
          <p className="text-gray-400 text-lg">
            Practice and improve your speaking skills
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* SPAR Debate */}
          <Link
            href="/spar"
            className="flex flex-col items-center gap-4 rounded-2xl border border-blue-700 bg-blue-950 p-8 hover:bg-blue-900 transition-colors"
          >
            <span className="text-5xl">⚖️</span>
            <h2 className="text-xl font-semibold text-white">SPAR Debate</h2>
            <p className="text-sm text-blue-300 text-center">
              Debate a random resolution against an AI opponent
            </p>
          </Link>

          {/* Impromptu Speech */}
          <Link
            href="/impromptu"
            className="flex flex-col items-center gap-4 rounded-2xl border border-indigo-700 bg-indigo-950 p-8 hover:bg-indigo-900 transition-colors"
          >
            <span className="text-5xl">🎤</span>
            <h2 className="text-xl font-semibold text-white">Impromptu Speech</h2>
            <p className="text-sm text-indigo-300 text-center">
              Random topic, think fast, speak your best
            </p>
          </Link>

          {/* Free Talk */}
          <Link
            href="/casual"
            className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-700 bg-emerald-950 p-8 hover:bg-emerald-900 transition-colors"
          >
            <span className="text-5xl">💬</span>
            <h2 className="text-xl font-semibold text-white">Free Talk</h2>
            <p className="text-sm text-emerald-300 text-center">
              Fun topics and friendly feedback for young speakers
            </p>
          </Link>

          {/* Debate Practice */}
          <Link
            href="/debate-practice"
            className="flex flex-col items-center gap-4 rounded-2xl border border-purple-700 bg-purple-950 p-8 hover:bg-purple-900 transition-colors"
          >
            <span className="text-5xl">🥊</span>
            <h2 className="text-xl font-semibold text-white">Debate Practice</h2>
            <p className="text-sm text-purple-300 text-center">
              Argue both sides of a resolution and get AI feedback on each argument
            </p>
          </Link>

          {/* Tongue Twisters */}
          <Link
            href="/tongue-twisters"
            className="flex flex-col items-center gap-4 rounded-2xl border border-pink-700 bg-pink-950 p-8 hover:bg-pink-900 transition-colors sm:col-span-2"
          >
            <span className="text-5xl">👅</span>
            <h2 className="text-xl font-semibold text-white">Tongue Twisters</h2>
            <p className="text-sm text-pink-300 text-center">
              AI-generated tongue twisters rated for accuracy and fluency
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
