// Small utility components shared across multiple stage components

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "text-green-400" : score >= 6 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`text-4xl font-bold ${color}`}>
      {score}
      <span className="text-xl text-gray-500">/10</span>
    </span>
  );
}

export function ScoreDiff({ original, redo }: { original: number; redo: number }) {
  const diff = parseFloat((redo - original).toFixed(1));
  const improved = diff > 0;
  const same = diff === 0;
  return (
    <span
      className={`text-sm font-semibold ml-2 ${
        improved ? "text-green-400" : same ? "text-gray-500" : "text-red-400"
      }`}
    >
      {improved ? `▲ +${diff}` : same ? "—" : `▼ ${diff}`}
    </span>
  );
}

export function CriterionRow({
  label,
  original,
  redo,
}: {
  label: string;
  original: number;
  redo: number;
}) {
  const diff = redo - original;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
  const arrowColor =
    diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-gray-500";
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 w-20">{label}</span>
      <span className="text-gray-400 w-8 text-center">{original}</span>
      <span className={`w-8 text-center font-bold ${arrowColor}`}>{arrow}</span>
      <span className="text-white font-semibold w-8 text-center">{redo}</span>
    </div>
  );
}

export function TurnIndicator({
  current,
  turns,
}: {
  current: number;
  turns: Array<{ side: "aff" | "neg"; round: number }>;
}) {
  return (
    <div className="flex justify-center gap-2">
      {turns.map((t, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        const dotColor = isPast
          ? "bg-gray-600"
          : isCurrent
          ? t.side === "aff"
            ? "bg-purple-400"
            : "bg-orange-400"
          : "bg-gray-800";
        return <div key={i} className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />;
      })}
    </div>
  );
}
