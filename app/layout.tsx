import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speech & Debate Assistant",
  description: "AI-powered speech and debate practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen text-white antialiased"
        style={{
          background: "#09090f",
          backgroundImage:
            "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          backgroundAttachment: "fixed",
        }}
      >
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090f]/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="font-display text-sm font-black text-white tracking-tight hover:text-slate-300 transition-colors"
            >
              Speech &amp; Debate
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
