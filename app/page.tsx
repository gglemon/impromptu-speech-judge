"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconScales({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </svg>
  );
}

function IconMicrophone({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function IconSpeaker({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
  );
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
    </svg>
  );
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconFire({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const DAILY_TIPS = [
  "Eye contact builds trust — pick 3 points in the room and rotate between them.",
  "Pause for 2 full seconds before your key argument. Silence signals confidence.",
  "Hook your audience in the first 10 seconds with a question or bold claim.",
  "Use the rule of three — three points, three examples, three seconds of pause.",
  "Vary your pace: slow down for emphasis, speed up to build momentum.",
  "Your voice is an instrument. Practice going from a whisper to full projection.",
  "End with a call to action, not just a summary — give your audience something to do.",
];

interface LastMode {
  title: string;
  href: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

interface Feature {
  href: string | null;
  title: string;
  description: string;
  tag?: string;
  Icon: ({ className }: { className?: string }) => JSX.Element;
  iconBg: string;
  iconColor: string;
  arrowHoverColor: string;
  cardHover: string;
  wide?: boolean;
  comingSoon?: boolean;
  lastModeInfo: Omit<LastMode, "title" | "href">;
}

const features: Feature[] = [
  {
    href: "/spar/setup",
    title: "SPAR Debate",
    description: "Debate a random resolution against an AI opponent with rebuttal rounds and scoring",
    tag: "Most Popular",
    Icon: IconScales,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    arrowHoverColor: "group-hover:text-blue-400",
    cardHover: "hover:border-blue-500/25",
    lastModeInfo: { accentBg: "bg-blue-500/10", accentBorder: "border-blue-500/20", accentText: "text-blue-300" },
  },
  {
    href: "/impromptu",
    title: "Impromptu Speech",
    description: "Get a random topic, prep for 1–5 minutes, then deliver your best speech",
    Icon: IconMicrophone,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    arrowHoverColor: "group-hover:text-violet-400",
    cardHover: "hover:border-violet-500/25",
    lastModeInfo: { accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/20", accentText: "text-violet-300" },
  },
  {
    href: "/casual",
    title: "Free Talk",
    description: "Fun, everyday topics with friendly feedback — perfect for beginners",
    Icon: IconChat,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    arrowHoverColor: "group-hover:text-emerald-400",
    cardHover: "hover:border-emerald-500/25",
    lastModeInfo: { accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/20", accentText: "text-emerald-300" },
  },
  {
    href: "/debate-practice/setup",
    title: "Debate Practice",
    description: "Argue both sides of a resolution to build balanced reasoning skills",
    Icon: IconBolt,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    arrowHoverColor: "group-hover:text-amber-400",
    cardHover: "hover:border-amber-500/25",
    lastModeInfo: { accentBg: "bg-amber-500/10", accentBorder: "border-amber-500/20", accentText: "text-amber-300" },
  },
  {
    href: "/tongue-twisters",
    title: "Tongue Twisters",
    description: "AI-generated tongue twisters rated for accuracy and fluency — warm up your articulation",
    Icon: IconSpeaker,
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
    arrowHoverColor: "group-hover:text-pink-400",
    cardHover: "hover:border-pink-500/25",
    lastModeInfo: { accentBg: "bg-pink-500/10", accentBorder: "border-pink-500/20", accentText: "text-pink-300" },
  },
  {
    href: null,
    title: "Congressional Debate",
    description: "Draft and deliver legislation speeches, then receive AI scoring on argumentation and impact",
    Icon: IconDocument,
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-500",
    arrowHoverColor: "",
    cardHover: "",
    comingSoon: true,
    wide: true,
    lastModeInfo: { accentBg: "", accentBorder: "", accentText: "" },
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [lastMode, setLastMode] = useState<LastMode | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const dailyTip = DAILY_TIPS[new Date().getDay()];

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sda:lastMode");
      if (stored) setLastMode(JSON.parse(stored));

      const count = parseInt(localStorage.getItem("sda:sessions") || "0", 10);
      setSessionCount(count);

      // Streak: compare last-visit date to today
      const lastDate = localStorage.getItem("sda:lastDate");
      const today = new Date().toDateString();
      const storedStreak = parseInt(localStorage.getItem("sda:streak") || "0", 10);
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastDate === today) {
        setStreak(storedStreak);
      } else if (lastDate === yesterday) {
        const newStreak = storedStreak + 1;
        localStorage.setItem("sda:streak", String(newStreak));
        localStorage.setItem("sda:lastDate", today);
        setStreak(newStreak);
      } else if (!lastDate) {
        localStorage.setItem("sda:lastDate", today);
        localStorage.setItem("sda:streak", "1");
        setStreak(1);
      } else {
        localStorage.setItem("sda:streak", "1");
        localStorage.setItem("sda:lastDate", today);
        setStreak(1);
      }
    } catch {}
  }, []);

  function handleModeClick(feature: Feature) {
    if (!feature.href) return;
    try {
      const mode: LastMode = {
        title: feature.title,
        href: feature.href,
        ...feature.lastModeInfo,
      };
      localStorage.setItem("sda:lastMode", JSON.stringify(mode));
      const count = parseInt(localStorage.getItem("sda:sessions") || "0", 10);
      localStorage.setItem("sda:sessions", String(count + 1));
      localStorage.setItem("sda:lastDate", new Date().toDateString());
    } catch {}
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12 px-6">
      <div className="w-full max-w-3xl space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Practice
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight text-white">
            Speech &amp; Debate
          </h1>
          <p className="text-slate-400 text-lg">
            Practice and improve your speaking skills with AI
          </p>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        {(sessionCount > 0 || streak > 0) && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {sessionCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <IconCheck className="w-3.5 h-3.5" />
                <span className="font-semibold">{sessionCount}</span>
                <span className="text-emerald-500">{sessionCount === 1 ? "session" : "sessions"} practiced</span>
              </div>
            )}
            {streak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
                <IconFire className="w-3.5 h-3.5" />
                <span className="font-semibold">{streak}</span>
                <span className="text-orange-500">{streak === 1 ? "day" : "day"} streak</span>
              </div>
            )}
          </div>
        )}

        {/* ── Jump back in ───────────────────────────────────────────────── */}
        {lastMode && (
          <div className={`flex items-center justify-between gap-4 rounded-2xl border ${lastMode.accentBorder} ${lastMode.accentBg} px-5 py-4`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                Jump back in
              </p>
              <p className="font-semibold text-white truncate">{lastMode.title}</p>
            </div>
            <Link
              href={lastMode.href}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ${lastMode.accentText} text-sm font-semibold transition-all duration-200 cursor-pointer`}
            >
              Continue
              <IconArrow className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── Daily tip ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
          <div className="w-0.5 rounded-full bg-indigo-500/50 shrink-0 self-stretch" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
              Tip of the day
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{dailyTip}</p>
          </div>
        </div>

        {/* ── Mode grid ──────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">
            Choose a mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature) => {
              const { href, title, description, tag, Icon, iconBg, iconColor, arrowHoverColor, cardHover, wide, comingSoon } = feature;
              const cardClass = `flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-200${wide ? " sm:col-span-2" : ""}`;

              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={`text-sm font-semibold leading-snug ${comingSoon ? "text-slate-500" : "text-white"}`}>
                            {title}
                          </h2>
                          {tag && !comingSoon && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold uppercase tracking-wide">
                              {tag}
                            </span>
                          )}
                          {comingSoon && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/25 text-slate-500 text-[10px] font-medium uppercase tracking-wide">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{description}</p>
                      </div>
                    </div>
                    {!comingSoon && (
                      <IconArrow className={`w-4 h-4 text-slate-700 ${arrowHoverColor} group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-0.5`} />
                    )}
                  </div>
                </>
              );

              if (comingSoon) {
                return (
                  <div
                    key={title}
                    className={`${cardClass} border-white/[0.05] bg-white/[0.01] opacity-50 cursor-not-allowed`}
                  >
                    {inner}
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href!}
                  onClick={() => handleModeClick(feature)}
                  className={`group ${cardClass} border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] ${cardHover} cursor-pointer hover:-translate-y-0.5`}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
