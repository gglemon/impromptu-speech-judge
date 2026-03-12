import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
