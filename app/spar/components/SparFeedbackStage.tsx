"use client";

import SparFeedbackReport from "@/components/SparFeedbackReport";
import type { SparFeedback, AiData, Recording, PrepHints } from "./shared";

interface SparFeedbackStageProps {
  feedback: SparFeedback;
  resolution: string;
  userSide: "aff" | "neg";
  userName: string;
  recordings: { constructive?: Recording; crossfire?: Recording; rebuttal?: Recording };
  aiData: AiData;
  crossfireQuestions: string[] | undefined;
  prepHints: PrepHints | null;
  onReset: () => void;
}

export default function SparFeedbackStage({
  feedback,
  resolution,
  userSide,
  userName,
  recordings,
  aiData,
  crossfireQuestions,
  prepHints,
  onReset,
}: SparFeedbackStageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center"><h1 className="text-2xl font-bold text-white mb-1">Debate Results</h1></div>
        <SparFeedbackReport
          feedback={feedback}
          resolution={resolution}
          userSide={userSide}
          userName={userName}
          recordings={recordings}
          aiConstructive={aiData.ai_constructive}
          aiRebuttal={aiData.ai_rebuttal ?? ""}
          crossfireQuestions={crossfireQuestions}
          hints={prepHints}
          onReset={onReset}
        />
      </div>
    </main>
  );
}
