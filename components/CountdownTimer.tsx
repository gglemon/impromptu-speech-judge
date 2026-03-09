"use client";

import { useEffect, useRef } from "react";

interface CountdownTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  hideSkip?: boolean;
}

export default function CountdownTimer({
  totalSeconds,
  remainingSeconds,
  onComplete,
  onSkip,
  hideSkip = false,
}: CountdownTimerProps) {
  const prevRemainingRef = useRef(remainingSeconds);

  useEffect(() => {
    if (prevRemainingRef.current > 0 && remainingSeconds <= 0) {
      onComplete();
    }
    prevRemainingRef.current = remainingSeconds;
  }, [remainingSeconds, onComplete]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = remainingSeconds / totalSeconds;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const color =
    progress > 0.5 ? "#6366f1" : progress > 0.25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-mono font-bold text-white">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {!hideSkip && (
        <button
          onClick={onSkip}
          className="px-6 py-2 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
        >
          Start Speaking Early →
        </button>
      )}
    </div>
  );
}
