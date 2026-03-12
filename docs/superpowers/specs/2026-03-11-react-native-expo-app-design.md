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
| Styling | NativeWind v4 + `expo-linear-gradient` + `expo-blur` |
| Platform | iOS only (iPhone + iPad) |
| Auth | Google Sign-In via `expo-auth-session` (frontend only — APIs are unprotected) |
| Audio | `expo-av` (record M4A + playback) |
| TTS | `expo-speech` with `rate` param (replaces `window.speechSynthesis`) |
| Storage | `AsyncStorage` (replaces `sessionStorage`) |
| Secure storage | `expo-secure-store` (Google token, user info) |
| Backend | Existing Next.js deployment — all `/api/*` routes reused. One small change: update `/api/transcribe` to accept M4A in addition to WebM. |
| Design | Liquid Glass — dark background, frosted glass cards, ambient glow blobs |
| Project home | Separate GitHub repo |

---

## Visual Design System

**Style:** Liquid Glass (iOS 26-inspired)

- **Background:** `expo-linear-gradient` from `#0d1117` → `#0f1623` → `#0d1117`
- **Glass cards:** `expo-blur` (`BlurView`, `intensity={20}`, `tint="dark"`) with `backgroundColor: rgba(255,255,255,0.07)` overlay and `borderColor: rgba(255,255,255,0.12)`, `borderRadius: 18`
- **Ambient blobs:** Absolute-positioned circular `View`s with `expo-linear-gradient` (linear, center→transparent approximates a radial glow), large `borderRadius`, opacity 0.3–0.5. Note: `expo-linear-gradient` does not support true radial gradients; the visual approximation is sufficient for background blobs.
- **Mode accent colors** (matching web app exactly):
  - SPAR: `#3b82f6` (blue)
  - Free Talk: `#059669` (emerald)
  - Impromptu: `#7c3aed` (violet)
  - Tongue Twisters: `#ec4899` (pink)
  - Debate Practice: `#d97706` (amber)
- **Typography:** SF Pro (iOS system font via `fontFamily: undefined`), weights 400/500/600/700
- **Icons:** `lucide-react-native` — consistent 2px stroke, no emoji as structural icons
- **Touch feedback:** `react-native-reanimated` scale 0.96 on press, 150ms `Easing.out(Easing.ease)`
- **Haptics:** `expo-haptics` `ImpactFeedbackStyle.Light` on every primary button tap
- **Minimum touch target:** 44×44pt on all interactive elements (use `hitSlop` if needed)
- **Safe areas:** `react-native-safe-area-context` — all screens respect top/bottom safe areas

---

## Navigation Structure

Tab bar with 3 tabs (Expo Router `(tabs)` layout — renders as native iOS `UITabBar`):

| Tab | Icon | Content |
|-----|------|---------|
| Home | `House` | All 5 mode cards, streak, tip of the day |
| History | `Clock` | Past sessions stored in AsyncStorage |
| Profile | `User` | Google account info, sign out |

Each practice mode is a stack pushed on top of the Home tab (using Expo Router's nested stack inside the tab).

---

## File Structure

```
app/
  (tabs)/
    _layout.tsx          # Tab bar definition (3 tabs)
    index.tsx            # Home — 5 mode cards, streak, tip
    history.tsx          # Past sessions list
    profile.tsx          # Google account, sign out
  spar/
    _layout.tsx          # Stack header config (title, back button)
    setup.tsx            # Pick difficulty (Novice/JV/Varsity), opponent type, AI strength → navigates to index
    index.tsx            # Topic picker + live debate (single stage-machine screen)
    feedback.tsx         # Scores + analysis
  impromptu/
    _layout.tsx
    index.tsx            # Settings + topic generation + countdown + recording (stage machine)
    feedback.tsx         # Scores + analysis
  casual/
    _layout.tsx
    index.tsx            # Topic picker + speech length
    practice.tsx         # AI outline, AI speech (expo-speech), start recording (stage machine)
    feedback.tsx         # Scores + analysis
  tongue-twisters/
    _layout.tsx
    index.tsx            # Difficulty + twister picker + recording (stage machine)
    feedback.tsx         # Accuracy + fluency scores
  debate/
    _layout.tsx
    setup.tsx            # Pick difficulty (Novice/JV/Varsity), mode (structured/crossfire), number of arguments → navigates to index
    index.tsx            # Topic picker + argument rounds (stage machine)
    feedback.tsx         # Round-by-round feedback
  _layout.tsx            # Root layout — AuthProvider, SafeAreaProvider, gesture handler

components/
  AudioRecorder.tsx      # expo-av recording UI (waveform bars, timer, stop button)
  AudioPlayer.tsx        # expo-av playback (play/pause, progress bar)
  GlassCard.tsx          # Reusable BlurView glass card wrapper
  ModeCard.tsx           # Home screen mode list item (accent color, icon, label)
  FeedbackReport.tsx     # Shared feedback display (score, summary, tip, highlights)
  CountdownTimer.tsx     # Think-time countdown (Reanimated animated ring)

lib/
  api.ts                 # fetch wrapper — EXPO_PUBLIC_API_BASE_URL from env
  auth.ts                # Google Sign-In helpers, token read/write from SecureStore
  storage.ts             # AsyncStorage helpers (replaces sessionStorage pattern)
  casualTopics.ts        # Copied from web lib/casualTopics.ts
  sparTopics.ts          # Copied from web lib/sparTopics.ts
  tongueTwisters.ts      # Copied from web lib/tongueTwisters.ts
  topicBank.ts           # Copied from web lib/topicBank.ts (used by Impromptu)
```

**Note on stage machines:** Each mode's main screen uses a local `stage` state (e.g. `"setup" | "recording" | "processing" | "feedback"`) — the same pattern as the web app — rather than splitting into multiple route files. This avoids passing large state objects through navigation params.

---

## Authentication Flow

The existing Next.js API routes do **not** enforce authentication — they only rate-limit. Auth on mobile is therefore frontend-only: used for personalisation (user name/avatar in Profile tab, session history attribution).

1. App launches → check `SecureStore` for `user` JSON (name, email, avatar, Google ID token)
2. If found → user is considered signed in; show avatar in Home header
3. If not → Home still works; Profile tab shows "Sign in with Google"
4. Sign-in: `expo-auth-session` + `expo-crypto` opens Google OAuth via `useAuthRequest`. Returns `id_token` and `userInfo`
5. Store `id_token` + parsed user info in `expo-secure-store`
6. Sign-out: clear `SecureStore`, clear `AsyncStorage` history, navigate to Home

**Google OAuth setup required:**
- In Google Cloud Console: add `https://auth.expo.io/@<username>/<slug>` as an authorized redirect URI for development (Expo proxy), and the custom scheme `<slug>://` for production builds
- In `app.json`: set `scheme` field (e.g. `"speech-debate"`) — required for production OAuth redirect
- In `app.json`: add `bundleIdentifier` (e.g. `com.yourname.speechdebate`) — required for App Store build

**Auth gate:** Unlike the web app, all 5 practice modes are accessible without sign-in on mobile (no recording gate). Sign-in is encouraged via Profile tab only. This avoids friction on mobile where OAuth redirects are more disruptive.

---

## Audio & Transcription Flow

`expo-av` records audio natively on iOS in **M4A (AAC)** format to a temp URI.

**Required backend change:** Update `/api/transcribe` to accept M4A. The route currently saves the upload to a hardcoded path `${id}-raw.webm` and cleans it up in the `finally` block by that same variable. Change: rename `rawWebmPath` → `rawAudioPath`, use the uploaded file's extension (from `Content-Type` or filename) for the temp file. FFmpeg auto-detects audio format from file content regardless of extension, so no FFmpeg flag changes are needed. The MP3 output path and `RECORDINGS_DIR` static serving are unchanged — the API already returns `{ transcript, audioUrl: "/recordings/${id}.mp3" }` and the file is served from `public/recordings/` by Next.js. Mobile constructs the full playback URL as `${API_BASE}${audioUrl}`.

**Flow:**
1. `expo-av` `Audio.Recording` starts with `Audio.RecordingOptionsPresets.HIGH_QUALITY` (M4A, 44.1kHz)
2. On stop → `recording.getURI()` returns local file path
3. Upload as `multipart/form-data` to `${API_BASE}/api/transcribe` with filename `audio.m4a`
4. API converts M4A → MP3 via FFmpeg, transcribes, returns `{ transcript, audioUrl }`
5. `audioUrl` is returned as relative path — mobile uses `${API_BASE}${audioUrl}` to construct full URL for `expo-av` playback
6. Transcript + metadata POSTed to mode-specific feedback endpoint

**No WebSocket / Deepgram streaming on mobile** — React Native lacks a browser-compatible `MediaRecorder` API, making the web app's streaming architecture (`server.mjs` Deepgram proxy) non-portable. Batch upload (record → upload → transcribe) is simpler, sufficient for the use cases, and avoids a complex native streaming implementation. The live transcript experience from the web is not replicated in v1.

---

## History Tab

Session results written to `AsyncStorage` key `"sda:history"` (JSON array) at the moment the feedback screen mounts successfully:

```ts
interface SessionRecord {
  id: string;           // uuid
  mode: 'spar' | 'impromptu' | 'casual' | 'tongue-twisters' | 'debate';
  topic: string;
  score: number;        // primary score (0–10); extracted per-mode (see below)
  date: string;         // ISO 8601
  duration: number;     // seconds (from recording)
}
```

**Score extraction per mode:**
- SPAR: `feedback.overall` (from `/api/spar-feedback`)
- Impromptu: `feedback.score` (from `/api/feedback`)
- Free Talk: `feedback.score` (from `/api/casual-feedback`)
- Tongue Twisters: `(feedback.accuracy + feedback.fluency) / 2` (from `/api/tongue-twister-feedback`)
- Debate: `feedback.overall` (from `/api/debate-argument-feedback`)

**Streak tracking:** Separate `AsyncStorage` keys mirroring the web app:
- `sda:sessions` — total count
- `sda:streak` — current streak
- `sda:lastDate` — last practice date (YYYY-MM-DD)

History is per-device only (no cross-device sync in v1).

---

## Required Backend Changes (web app repo)

Only one change needed:

**`/api/transcribe`:** Accept any audio format, not just WebM. Change the temp file name from hardcoded `raw.webm` to use the uploaded file's extension (or detect via `Content-Type`). FFmpeg handles M4A natively.

---

## Third-Party Libraries

Beyond Expo SDK:
- `expo-linear-gradient` — background gradients
- `expo-blur` — glass card effect
- `expo-haptics` — touch feedback
- `expo-secure-store` — token storage
- `expo-auth-session` + `expo-crypto` — Google OAuth
- `expo-speech` — TTS for reading text aloud: reads tongue twisters aloud at `rate: 0.85` so the user can hear correct pronunciation before recording; reads AI-generated example speech in Casual mode at `rate: 0.92`. This is text-to-speech synthesis only — user recording playback uses `expo-av`.
- `react-native-reanimated` — press animations, countdown ring
- `react-native-gesture-handler` — swipe-back, gesture support
- `react-native-safe-area-context` — safe area insets
- `lucide-react-native` — icons
- `@react-native-async-storage/async-storage` — local storage

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
- Google Sign-In flow completes successfully (optional, not blocking)
- Audio recording (M4A) → transcription → AI feedback round-trip works
- History tab persists sessions across app restarts
- App feels native: smooth 60fps scroll, safe areas respected, haptic feedback on key actions
- Liquid Glass design consistent across all screens with correct mode accent colors
