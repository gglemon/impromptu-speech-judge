"use client";

export default function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  if (!audioUrl) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3">
      <span className="text-sm text-gray-400 shrink-0">🔊 Replay</span>
      <audio controls src={audioUrl} className="w-full h-8" style={{ accentColor: "#6366f1" }} />
    </div>
  );
}
