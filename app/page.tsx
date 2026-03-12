import Link from "next/link";

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

const features: {
  href: string | null;
  title: string;
  description: string;
  Icon: ({ className }: { className?: string }) => JSX.Element;
  iconBg: string;
  iconColor: string;
  arrowHoverColor: string;
  cardHover: string;
  wide?: boolean;
  comingSoon?: boolean;
}[] = [
  {
    href: "/spar/setup",
    title: "SPAR Debate",
    description: "Debate a random resolution against an AI opponent",
    Icon: IconScales,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    arrowHoverColor: "group-hover:text-blue-400",
    cardHover: "hover:border-blue-500/25",
  },
  {
    href: "/impromptu",
    title: "Impromptu Speech",
    description: "Random topic, think fast, speak your best",
    Icon: IconMicrophone,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    arrowHoverColor: "group-hover:text-violet-400",
    cardHover: "hover:border-violet-500/25",
  },
  {
    href: "/casual",
    title: "Free Talk",
    description: "Fun topics and friendly feedback for young speakers",
    Icon: IconChat,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    arrowHoverColor: "group-hover:text-emerald-400",
    cardHover: "hover:border-emerald-500/25",
  },
  {
    href: "/debate-practice/setup",
    title: "Debate Practice",
    description: "Argue both sides of a resolution and get AI feedback on each argument",
    Icon: IconBolt,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    arrowHoverColor: "group-hover:text-amber-400",
    cardHover: "hover:border-amber-500/25",
  },
  {
    href: "/tongue-twisters",
    title: "Tongue Twisters",
    description: "AI-generated tongue twisters rated for accuracy and fluency",
    Icon: IconSpeaker,
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
    arrowHoverColor: "group-hover:text-pink-400",
    cardHover: "hover:border-pink-500/25",
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
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
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

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ href, title, description, Icon, iconBg, iconColor, arrowHoverColor, cardHover, wide, comingSoon }) => {
            const cardClass = `flex flex-col gap-5 rounded-2xl border p-6 transition-all duration-200${wide ? " sm:col-span-2" : ""}`;
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  {comingSoon ? (
                    <span className="px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/25 text-slate-500 text-xs font-medium">
                      Coming Soon
                    </span>
                  ) : (
                    <IconArrow className={`w-4 h-4 text-slate-600 ${arrowHoverColor} group-hover:translate-x-0.5 transition-all duration-200`} />
                  )}
                </div>
                <div>
                  <h2 className={`text-base font-semibold mb-1 ${comingSoon ? "text-slate-500" : "text-white"}`}>{title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                </div>
              </>
            );

            if (comingSoon) {
              return (
                <div
                  key={title}
                  className={`${cardClass} border-white/[0.05] bg-white/[0.01] opacity-60 cursor-not-allowed`}
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href!}
                className={`group ${cardClass} border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] ${cardHover} cursor-pointer hover:-translate-y-0.5`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
