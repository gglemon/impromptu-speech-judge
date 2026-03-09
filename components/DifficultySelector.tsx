"use client";

type Difficulty = "easy" | "medium" | "hard";

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onChange: (d: Difficulty) => void;
  thinkTime: number; // in seconds
  onThinkTimeChange: (t: number) => void;
  speechLength: number; // in seconds
  onSpeechLengthChange: (t: number) => void;
}

const difficulties: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "Easy", description: "Concrete, everyday words" },
  { value: "medium", label: "Medium", description: "Abstract but accessible" },
  { value: "hard", label: "Hard", description: "Philosophical & contrasting" },
];

const thinkTimeOptions: { value: number; label: string }[] = [
  { value: 0, label: "0s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 240, label: "4 min" },
  { value: 300, label: "5 min" },
];

export default function DifficultySelector({
  difficulty,
  onChange,
  thinkTime,
  onThinkTimeChange,
  speechLength,
  onSpeechLengthChange,
}: DifficultySelectorProps) {
  const speechLengthMinutes = speechLength / 60;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Topic Difficulty
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => onChange(d.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                difficulty === d.value
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              <div className="font-semibold text-base">{d.label}</div>
              <div className="text-xs mt-1 opacity-70">{d.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Prep Time
        </h2>
        <div className="flex flex-wrap gap-2">
          {thinkTimeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onThinkTimeChange(opt.value)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                thinkTime === opt.value
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Speech Length:{" "}
          <span className="text-white">
            {speechLengthMinutes} min{speechLengthMinutes !== 1 ? "s" : ""}
          </span>
        </h2>
        <input
          type="range"
          min={1}
          max={7}
          step={1}
          value={speechLengthMinutes}
          onChange={(e) => onSpeechLengthChange(Number(e.target.value) * 60)}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>1 min</span>
          <span>2 min</span>
          <span>3 min</span>
          <span>4 min</span>
          <span>5 min</span>
          <span>6 min</span>
          <span>7 min</span>
        </div>
      </div>
    </div>
  );
}
