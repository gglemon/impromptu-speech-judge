# React Native / Expo iOS App — Design Spec

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

A native iOS app that mirrors the Speech & Debate web app's five practice modes. It calls the existing deployed Next.js API routes directly — no new backend required. Built with Expo Router and NativeWind for a fast development experience familiar to anyone who knows the web codebase.

---

## Decisions Summary

| Dimension | Decision |
|-----------|----------|
| Framework | Expo (managed workflow) |
| Routing | Expo Router v4 (file-based, like Next.js App Router) |
| Styling | NativeWind v4 (Tailwind classes on React Native) |
| Platform | iOS only (iPhone + iPad) |
| Auth | Google Sign-In via `expo-auth-session` |
| Audio | `expo-av` (record + playback) |
| TTS | `expo-speech` (replaces `window.speechSynthesis`) |
| Storage | `AsyncStorage` (replaces `sessionStorage`) |
| Secure storage | `expo-secure-store` (Google token) |
| Backend | Existing Next.js deployment — all `/api/*` routes reused as-is |
| Design | Liquid Glass — dark background, frosted glass cards, ambient glow blobs |
| Project home | Separate GitHub repo |

---

## Visual Design System

**Style:** Liquid Glass (iOS 26-inspired)
- Background: `#0d1117` with `linear-gradient(160deg, #0d1117, #0f1623, #0d1117)`
- Cards: `rgba(255,255,255,0.07)` background, `rgba(255,255,255,0.12)` border, `borderRadius: 18`, `backdropFilter: blur(10px)`
- Ambient blobs: `radial-gradient` circles with `filter: blur`, positioned absolutely
- Mode accent colors (matching web app):
  - SPAR: `#6366f1` (indigo)
  - Free Talk: `#059669` (emerald)
  - Impromptu: `#d97706` (amber)
  - Tongue Twisters: `#ec4899` (pink)
  - Debate Practice: `#f59e0b` (yellow)
- Typography: Inter (system font on iOS), weights 400/500/600/700
- Icon style: Lucide React Native (consistent stroke, no emojis as icons)
- Touch feedback: scale 0.96 on press via Reanimated, 150ms ease-out
- Minimum touch target: 44×44pt on all interactive elements

---

## Navigation Structure

Tab bar with 3 tabs (bottom, iOS native `TabBar` style via Expo Router):

| Tab | Icon | Content |
|-----|------|---------|
| Home | House | All 5 mode cards, streak, tip of the day |
| History | Clock | Past sessions stored in AsyncStorage |
| Profile | Person | Google account info, sign out, settings |

Each practice mode pushes a stack of screens on top of the Home tab.

---

## File Structure

```
app/
  (tabs)/
    index.tsx          # Home — 5 mode cards
    history.tsx        # Past sessions list
    profile.tsx        # User profile + sign out
  spar/
    setup.tsx          # Difficulty, opponent, AI strength
    index.tsx          # Topic picker
    session.tsx        # Live debate rounds
    feedback.tsx       # Scores + analysis
  impromptu/
    index.tsx          # Settings (difficulty, think time, speech length)
    session.tsx        # Countdown + recording
    feedback.tsx       # Scores + analysis
  casual/
    index.tsx          # Topic + speech length picker
    practice.tsx       # AI outline, AI speech, start recording
    feedback.tsx       # Scores + analysis
  tongue-twisters/
    index.tsx          # Difficulty + twister picker
    record.tsx         # Ready screen + recording
    feedback.tsx       # Accuracy + fluency scores
  debate/
    setup.tsx          # Difficulty, mode, rounds
    index.tsx          # Topic picker
    session.tsx        # Argument rounds
    feedback.tsx       # Round-by-round feedback
  _layout.tsx          # Root layout — AuthProvider, SessionProvider

components/
  AudioRecorder.tsx    # expo-av recording with waveform UI
  AudioPlayer.tsx      # expo-av playback
  GlassCard.tsx        # Reusable frosted glass card
  ModeCard.tsx         # Home screen mode list item
  FeedbackReport.tsx   # Shared feedback display
  CountdownTimer.tsx   # Think-time countdown

lib/
  api.ts               # fetch wrapper — base URL from env, attaches auth token
  auth.ts              # Google Sign-In helpers, token storage in SecureStore
  storage.ts           # AsyncStorage helpers (replaces sessionStorage)
  topics.ts            # casualTopics, sparTopics, tongueTwisters (copied from web)
```

---

## Authentication Flow

1. App launches → check `SecureStore` for existing Google ID token
2. If token exists and not expired → user is signed in
3. If not → show sign-in screen (Profile tab prompts sign-in)
4. Sign-in: `expo-auth-session` opens Google OAuth in a browser session → returns `id_token`
5. Token stored in `expo-secure-store`
6. All API calls include `Authorization: Bearer <id_token>` header
7. Next.js APIs verify the token using Google's public keys (minimal change: add a `verifyMobileToken` helper)

Auth is required for all practice modes (shown as a gate on the mode card tap if not signed in).

---

## Audio & Transcription Flow

1. `expo-av` starts recording to a temp URI on device
2. On stop → upload file as `multipart/form-data` to `/api/transcribe`
3. API returns transcript text
4. Transcript + metadata sent to mode-specific feedback API (e.g. `/api/casual-feedback`)
5. Feedback JSON rendered in feedback screen

---

## History Tab

Session results saved locally to `AsyncStorage` after each feedback screen is shown:

```ts
interface SessionRecord {
  id: string;
  mode: 'spar' | 'impromptu' | 'casual' | 'tongue-twisters' | 'debate';
  topic: string;
  score: number;
  date: string; // ISO
  duration: number; // seconds
}
```

No new backend endpoint needed. History is per-device only (no cross-device sync in v1).

---

## Out of Scope (v1)

- Android support
- Cross-device history sync
- Push notifications / reminders
- Offline mode
- In-app purchases

---

## Success Criteria

- All 5 practice modes work end-to-end on a real iPhone
- Google Sign-In flow completes successfully
- Audio recording → transcription → AI feedback round-trip works
- App feels native: smooth scroll, proper safe areas, haptic feedback on key actions
- Liquid Glass design is consistent across all screens
