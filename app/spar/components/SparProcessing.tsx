"use client";

import { TopicBanner } from "./shared";

interface SparProcessingProps {
  resolution: string;
  userSide: "aff" | "neg";
  error: string;
}

export default function SparProcessing({ resolution, userSide, error }: SparProcessingProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <TopicBanner resolution={resolution} userSide={userSide} />
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white text-lg font-medium">Analyzing your debate performance...</p>
          <p className="text-gray-400 text-sm">AI is evaluating your speeches</p>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>
      </div>
    </main>
  );
}
