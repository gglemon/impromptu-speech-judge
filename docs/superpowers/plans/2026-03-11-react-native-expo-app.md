# React Native Expo iOS App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native iOS app that mirrors the Speech & Debate web app's 5 practice modes, calling the existing Next.js APIs.

**Architecture:** Expo Router v4 (file-based routing), NativeWind v4 (Tailwind classes), Liquid Glass design (expo-blur + expo-linear-gradient). New GitHub repo, separate from web app. All APIs called over HTTPS to existing deployment.

**Tech Stack:** Expo SDK 54, Expo Router v4, NativeWind v4, expo-audio (replaces expo-av), expo-blur, expo-linear-gradient, expo-auth-session, expo-haptics, expo-speech, react-native-reanimated, lucide-react-native, AsyncStorage, SecureStore.

> **⚠️ Expo Go cannot test Google OAuth** — the auth flow requires a development build. Run `npx expo run:ios` (not `npx expo start`) for any testing that involves sign-in.

**Web app repo** (for copying topic files and backend change): `https://github.com/gglemon/speech-and-debate-agent`

---

## Chunk 1: Bootstrap + Backend Fix

### Task 1: Fix /api/transcribe to accept M4A (web app repo)

**Files:**
- Modify: `app/api/transcribe/route.ts` (web app repo)

- [ ] In the web app repo, open `app/api/transcribe/route.ts`

- [ ] Replace the hardcoded `rawWebmPath` variable with a dynamic name based on uploaded file extension:

```typescript
// Find this block (~line 98):
const rawWebmPath = join(tmpDir, `${id}-raw.webm`);

// Replace with:
const uploadedFile = audioBlob; // already have the blob
const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a'
  : audioBlob.type.includes('webm') ? 'webm'
  : 'audio';
const rawAudioPath = join(tmpDir, `${id}-raw.${ext}`);
```

- [ ] Update **all four** references from `rawWebmPath` → `rawAudioPath` in the same file:
  1. The variable declaration (`const rawWebmPath = ...`)
  2. The `writeFile(rawWebmPath, ...)` call
  3. The FFmpeg `-i rawWebmPath` argument
  4. The `finally` cleanup array: `for (const f of [rawWebmPath, wavPath])` → `[rawAudioPath, wavPath]`

- [ ] Test locally: record on web (WebM), confirm still works. Then test with a `.m4a` upload via curl:
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@test.m4a;type=audio/mp4"
```
Expected: returns `{ transcript: "...", audioUrl: "/recordings/....mp3" }`

- [ ] Commit in web app repo:
```bash
git add app/api/transcribe/route.ts
git commit -m "fix: accept M4A audio format in transcribe API (for mobile app)"
git push origin master
```

---

### Task 2: Create Expo project + GitHub repo

**Files:**
- Create: new directory `speech-debate-mobile/`

- [ ] Create the Expo project (use `--template default` to get Expo Router pre-configured):
```bash
npx create-expo-app@latest speech-debate-mobile --template default
cd speech-debate-mobile
```

- [ ] Create a new GitHub repo named `speech-debate-mobile` and push:
```bash
git init
git remote add origin https://github.com/<your-username>/speech-debate-mobile.git
git add .
git commit -m "chore: init Expo project"
git push -u origin main
```

- [ ] Create `.env.local` (gitignored):
```
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-web-app.vercel.app
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

- [ ] Create `.gitignore` additions:
```
.env.local
.env*.local
```

---

### Task 3: Install all dependencies + configure NativeWind

**Files:**
- Modify: `package.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `app.json`

- [ ] Install Expo Router and upgrade:
```bash
npx expo install expo-router expo-constants expo-linking expo-status-bar
```

- [ ] Install NativeWind v4 — **must pin Tailwind to v3** (NativeWind v4 does not support Tailwind v4):
```bash
npm install nativewind
npm install --save-dev tailwindcss@^3.4.17
npx tailwindcss init
```

- [ ] Install all other dependencies:
```bash
npx expo install expo-blur expo-linear-gradient expo-haptics expo-secure-store \
  expo-auth-session expo-crypto expo-audio expo-speech \
  react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context @react-native-async-storage/async-storage
npm install lucide-react-native
```

- [ ] Install dev/test dependencies:
```bash
npm install --save-dev jest jest-expo @testing-library/react-native \
  @testing-library/jest-native
```

- [ ] Replace `babel.config.js` — **order matters**: `nativewind/babel` must come before `react-native-reanimated/plugin`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',  // ← must be before reanimated plugin
    ],
    plugins: [
      'react-native-reanimated/plugin',  // ← must be last
    ],
  };
};
```

- [ ] Replace `metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        spar: '#3b82f6',
        casual: '#059669',
        impromptu: '#7c3aed',
        twisters: '#ec4899',
        debate: '#d97706',
      },
    },
  },
  plugins: [],
};
```

- [ ] Create `global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] Update `app.json` — add scheme and iOS bundle identifier:
```json
{
  "expo": {
    "name": "Speech & Debate",
    "slug": "speech-debate",
    "scheme": "speech-debate",
    "version": "1.0.0",
    "platforms": ["ios"],
    "ios": {
      "bundleIdentifier": "com.yourname.speechdebate",
      "supportsTablet": true
    },
    "plugins": [
      "expo-router",
      "expo-av",
      [
        "expo-build-properties",
        { "ios": { "newArchEnabled": true } }
      ]
    ]
  }
}
```

- [ ] Set up Jest in `package.json`:
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)"
    ]
  }
}
```

- [ ] Create `__mocks__/expo-blur.js`:
```javascript
const { View } = require('react-native');
module.exports = { BlurView: View };
```

- [ ] Create `__mocks__/expo-haptics.js`:
```javascript
module.exports = {
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
};
```

- [ ] Run to verify setup (use `run:ios` to create a dev build — **not** `expo start`, which opens Expo Go which cannot test OAuth or expo-audio):
```bash
npx expo run:ios
```
Expected: blank app opens in iOS Simulator with tab bar

- [ ] Commit:
```bash
git add .
git commit -m "chore: install all dependencies, configure NativeWind and Jest"
```

---

### Task 4: Core lib files

**Files:**
- Create: `lib/api.ts`
- Create: `lib/auth.ts`
- Create: `lib/storage.ts`
- Create: `lib/__tests__/api.test.ts`
- Create: `lib/__tests__/storage.test.ts`

- [ ] Write failing tests for `lib/api.ts`:

```typescript
// lib/__tests__/api.test.ts
import { apiFetch } from '../api';

global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('apiFetch prepends API_BASE_URL', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.com';
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result: 'ok' }),
  });
  await apiFetch('/api/test', { method: 'GET' });
  expect(fetch).toHaveBeenCalledWith('https://example.com/api/test', expect.any(Object));
});

test('apiFetch throws on non-ok response', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.com';
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Server error' }),
  });
  await expect(apiFetch('/api/test')).rejects.toThrow('Server error');
});
```

- [ ] Run to confirm fail:
```bash
npx jest lib/__tests__/api.test.ts
```
Expected: FAIL — `Cannot find module '../api'`

- [ ] Create `lib/api.ts`:
```typescript
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res;
}

export async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  return res.json();
}

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
```

- [ ] Run to confirm pass:
```bash
npx jest lib/__tests__/api.test.ts
```
Expected: PASS

- [ ] Write failing tests for `lib/storage.ts`:
```typescript
// lib/__tests__/storage.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSession, getHistory, updateStreak } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

test('saveSession appends to history', async () => {
  await saveSession({ id: '1', mode: 'spar', topic: 'AI', score: 8, date: '2026-03-11', duration: 60 });
  const history = await getHistory();
  expect(history).toHaveLength(1);
  expect(history[0].mode).toBe('spar');
});

test('updateStreak increments on new day', async () => {
  await AsyncStorage.clear();
  const today = new Date().toISOString().slice(0, 10);
  await updateStreak(today);
  const streak = await AsyncStorage.getItem('sda:streak');
  expect(streak).toBe('1');
});
```

- [ ] Run to confirm fail:
```bash
npx jest lib/__tests__/storage.test.ts
```
Expected: FAIL

- [ ] Create `lib/storage.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionRecord {
  id: string;
  mode: 'spar' | 'impromptu' | 'casual' | 'tongue-twisters' | 'debate';
  topic: string;
  score: number;
  date: string;
  duration: number;
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const raw = await AsyncStorage.getItem('sda:history');
  const history: SessionRecord[] = raw ? JSON.parse(raw) : [];
  history.unshift(record);
  await AsyncStorage.setItem('sda:history', JSON.stringify(history.slice(0, 100)));
  await AsyncStorage.setItem('sda:sessions', String((parseInt(await AsyncStorage.getItem('sda:sessions') ?? '0') + 1)));
}

export async function getHistory(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem('sda:history');
  return raw ? JSON.parse(raw) : [];
}

export async function updateStreak(today: string): Promise<{ streak: number; sessions: number }> {
  const lastDate = await AsyncStorage.getItem('sda:lastDate');
  const raw = await AsyncStorage.getItem('sda:streak');
  let streak = parseInt(raw ?? '0');
  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = lastDate === yesterday ? streak + 1 : 1;
    await AsyncStorage.setItem('sda:streak', String(streak));
    await AsyncStorage.setItem('sda:lastDate', today);
  }
  const sessions = parseInt(await AsyncStorage.getItem('sda:sessions') ?? '0');
  return { streak, sessions };
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.multiRemove(['sda:history', 'sda:sessions', 'sda:streak', 'sda:lastDate']);
}
```

- [ ] Run to confirm pass:
```bash
npx jest lib/__tests__/storage.test.ts
```
Expected: PASS

- [ ] Create `lib/auth.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  picture: string;
}

const USER_KEY = 'sda:user';

export async function getStoredUser(): Promise<UserInfo | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storeUser(user: UserInfo): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}
```

- [ ] Copy topic files from web app repo:
```bash
# From web app directory:
cp lib/casualTopics.ts ../speech-debate-mobile/lib/casualTopics.ts
cp lib/sparTopics.ts ../speech-debate-mobile/lib/sparTopics.ts
cp lib/tongueTwisters.ts ../speech-debate-mobile/lib/tongueTwisters.ts
cp lib/topicBank.ts ../speech-debate-mobile/lib/topicBank.ts
```

- [ ] Commit:
```bash
git add lib/
git commit -m "feat: add api, storage, auth lib + topic files"
```

---

## Chunk 2: Shared Components + Navigation Shell

### Task 5: Root layout + tab bar

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (placeholder)
- Create: `app/(tabs)/history.tsx` (placeholder)
- Create: `app/(tabs)/profile.tsx` (placeholder)
- Create: `constants/colors.ts`

- [ ] Create `constants/colors.ts`:
```typescript
export const Colors = {
  bg: '#0d1117',
  bgGradient: ['#0d1117', '#0f1623', '#0d1117'] as const,
  card: 'rgba(255,255,255,0.07)',
  cardBorder: 'rgba(255,255,255,0.12)',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textSecondary: '#94a3b8',
  modes: {
    spar: '#3b82f6',
    casual: '#059669',
    impromptu: '#7c3aed',
    twisters: '#ec4899',
    debate: '#d97706',
  },
} as const;
```

- [ ] Create `app/_layout.tsx`:
```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] Create `app/(tabs)/_layout.tsx`:
```typescript
import { Tabs } from 'expo-router';
import { House, Clock, User } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1117',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#475569',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color, size }) => <Clock color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
```

- [ ] Create placeholder `app/(tabs)/index.tsx`:
```typescript
import { View, Text } from 'react-native';
export default function HomeScreen() {
  return <View className="flex-1 bg-[#0d1117] items-center justify-center"><Text className="text-white">Home</Text></View>;
}
```

- [ ] Create placeholder `app/(tabs)/history.tsx` and `app/(tabs)/profile.tsx` (same pattern)

- [ ] Run in simulator to confirm tab bar appears:
```bash
npx expo start --ios
```
Expected: 3-tab bar visible with icons, dark background

- [ ] Commit:
```bash
git add app/
git commit -m "feat: root layout, tab bar shell with 3 tabs"
```

---

### Task 6: GlassCard + ModeCard components

**Files:**
- Create: `components/GlassCard.tsx`
- Create: `components/ModeCard.tsx`
- Create: `components/__tests__/ModeCard.test.tsx`

- [ ] Write failing test:
```typescript
// components/__tests__/ModeCard.test.tsx
import { render } from '@testing-library/react-native';
import ModeCard from '../ModeCard';

jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

test('renders mode name and subtitle', () => {
  const { getByText } = render(
    <ModeCard
      title="SPAR Debate"
      subtitle="Argue both sides"
      accentColor="#3b82f6"
      icon="Zap"
      onPress={() => {}}
    />
  );
  expect(getByText('SPAR Debate')).toBeTruthy();
  expect(getByText('Argue both sides')).toBeTruthy();
});
```

- [ ] Run to confirm fail: `npx jest components/__tests__/ModeCard.test.tsx`

- [ ] Create `components/GlassCard.tsx`:
```typescript
import { View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export default function GlassCard({ children, style, className }: Props) {
  return (
    <BlurView
      intensity={20}
      tint="dark"
      style={[
        {
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        },
        style,
      ]}
    >
      <View
        style={{ backgroundColor: 'rgba(255,255,255,0.07)', flex: 1 }}
        className={className}
      >
        {children}
      </View>
    </BlurView>
  );
}
```

- [ ] Create `components/ModeCard.tsx`:
```typescript
import { Pressable, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Zap, Mic, MessageSquare, Smile, Trophy } from 'lucide-react-native';
import GlassCard from './GlassCard';

const ICONS: Record<string, React.FC<{ color: string; size: number }>> = {
  Zap, Mic, MessageSquare, Smile, Trophy,
};

interface Props {
  title: string;
  subtitle: string;
  accentColor: string;
  icon: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ModeCard({ title, subtitle, accentColor, icon, onPress }: Props) {
  const scale = useSharedValue(1);
  const Icon = ICONS[icon] ?? Zap;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withTiming(0.96, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handlePressOut() {
    scale.value = withTiming(1, { duration: 150 });
  }

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <GlassCard style={{ marginBottom: 8 }}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View
            style={{ backgroundColor: accentColor, borderRadius: 12, width: 38, height: 38,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: accentColor, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
          >
            <Icon color="#fff" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm">{title}</Text>
            <Text style={{ color: accentColor }} className="text-xs mt-0.5">{subtitle}</Text>
          </View>
          <Text className="text-slate-600 text-base">›</Text>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
}
```

- [ ] Run test: `npx jest components/__tests__/ModeCard.test.tsx` — Expected: PASS

- [ ] Commit:
```bash
git add components/
git commit -m "feat: GlassCard and ModeCard components"
```

---

### Task 7: AudioRecorder + AudioPlayer

**Files:**
- Create: `components/AudioRecorder.tsx`
- Create: `components/AudioPlayer.tsx`

- [ ] Create `components/AudioRecorder.tsx` — uses `expo-audio` (not `expo-av`, which is deprecated in SDK 54+):
```typescript
import { useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Square, Mic } from 'lucide-react-native';
import GlassCard from './GlassCard';

interface Props {
  onRecordingComplete: (uri: string, duration: number) => void;
}

export default function AudioRecorder({ onRecordingComplete }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  async function startRecording() {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function stopRecording() {
    clearInterval(timerRef.current!);
    setIsRecording(false);
    await recorder.stop();
    const uri = recorder.uri!;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsed(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRecordingComplete(uri, duration);
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  return (
    <GlassCard style={{ padding: 20, alignItems: 'center' }}>
      <Text className="text-white text-2xl font-semibold mb-4">{mins}:{secs}</Text>
      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: isRecording ? '#ef4444' : '#6366f1',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isRecording ? <Square color="#fff" size={28} /> : <Mic color="#fff" size={28} />}
      </Pressable>
      <Text className="text-slate-400 text-xs mt-3">
        {isRecording ? 'Tap to stop' : 'Tap to start recording'}
      </Text>
    </GlassCard>
  );
}
```

- [ ] Create `components/AudioPlayer.tsx` — uses `expo-audio` (not `expo-av`):
```typescript
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';

interface Props {
  uri: string;
}

export default function AudioPlayer({ uri }: Props) {
  const player = useAudioPlayer({ uri });
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  }

  return (
    <Pressable
      onPress={toggle}
      className="flex-row items-center gap-2 px-4 py-2 rounded-xl"
      style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {playing ? <Pause color="#94a3b8" size={16} /> : <Play color="#94a3b8" size={16} />}
      <Text className="text-slate-400 text-sm">{playing ? 'Pause' : 'Play recording'}</Text>
    </Pressable>
  );
}
```

- [ ] Commit:
```bash
git add components/AudioRecorder.tsx components/AudioPlayer.tsx
git commit -m "feat: AudioRecorder and AudioPlayer components"
```

---

### Task 8: FeedbackReport + CountdownTimer

**Files:**
- Create: `components/FeedbackReport.tsx`
- Create: `components/CountdownTimer.tsx`

- [ ] Create `components/FeedbackReport.tsx`:
```typescript
import { View, Text, ScrollView } from 'react-native';
import GlassCard from './GlassCard';

interface Props {
  score: number;
  summary: string;
  tip?: string;
  accentColor: string;
  children?: React.ReactNode;
}

export default function FeedbackReport({ score, summary, tip, accentColor, children }: Props) {
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 12 }}>
      <GlassCard style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: accentColor }} className="text-xs font-bold uppercase tracking-widest mb-2">
          Your Score
        </Text>
        <Text className="text-white text-5xl font-bold">{score.toFixed(1)}</Text>
        <Text className="text-slate-500 text-xs mt-1">out of 10</Text>
      </GlassCard>

      <GlassCard style={{ padding: 16 }}>
        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">Summary</Text>
        <Text className="text-slate-300 text-sm leading-relaxed">{summary}</Text>
      </GlassCard>

      {tip && (
        <GlassCard style={{ padding: 16, borderColor: `${accentColor}33` }}>
          <Text style={{ color: accentColor }} className="text-xs font-bold uppercase tracking-wide mb-1">
            💡 Tip
          </Text>
          <Text className="text-slate-300 text-sm leading-relaxed">{tip}</Text>
        </GlassCard>
      )}

      {children}
    </ScrollView>
  );
}
```

- [ ] Create `components/CountdownTimer.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedProps, useSharedValue, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 54;
const CIRC = 2 * Math.PI * R;

interface Props {
  seconds: number;
  onComplete: () => void;
  accentColor: string;
}

export default function CountdownTimer({ seconds, onComplete, accentColor }: Props) {
  const progress = useSharedValue(1);
  const remaining = useSharedValue(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    progress.value = withTiming(0, { duration: seconds * 1000, easing: Easing.linear });
    intervalRef.current = setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) {
        clearInterval(intervalRef.current!);
        onComplete();
      }
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  return (
    <View className="items-center justify-center">
      <Svg width={120} height={120} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={60} cy={60} r={R} stroke="rgba(255,255,255,0.1)" strokeWidth={6} fill="none" />
        <AnimatedCircle
          cx={60} cy={60} r={R}
          stroke={accentColor}
          strokeWidth={6}
          fill="none"
          strokeDasharray={CIRC}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-white text-3xl font-bold">{Math.ceil(remaining.value)}</Text>
        <Text className="text-slate-400 text-xs">seconds</Text>
      </View>
    </View>
  );
}
```

- [ ] Commit:
```bash
git add components/FeedbackReport.tsx components/CountdownTimer.tsx
git commit -m "feat: FeedbackReport and CountdownTimer components"
```

---

## Chunk 3: Home, Profile + History

### Task 9: Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `hooks/useStreak.ts`

- [ ] Create `hooks/useStreak.ts`:
```typescript
import { useState, useEffect } from 'react';
import { updateStreak } from '../lib/storage';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    updateStreak(today).then(({ streak, sessions }) => {
      setStreak(streak);
      setSessions(sessions);
    });
  }, []);

  return { streak, sessions };
}
```

- [ ] Replace `app/(tabs)/index.tsx` with full Home screen:
```typescript
import { ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ModeCard from '../../components/ModeCard';
import GlassCard from '../../components/GlassCard';
import { useStreak } from '../../hooks/useStreak';
import { Colors } from '../../constants/colors';

const MODES = [
  { title: 'SPAR Debate', subtitle: 'Argue both sides with AI', color: Colors.modes.spar, icon: 'Zap', route: '/spar/setup' },
  { title: 'Free Talk', subtitle: 'Speak on any topic', color: Colors.modes.casual, icon: 'Mic', route: '/casual' },
  { title: 'Impromptu Speech', subtitle: 'Think fast, speak well', color: Colors.modes.impromptu, icon: 'MessageSquare', route: '/impromptu' },
  { title: 'Tongue Twisters', subtitle: 'Sharpen pronunciation', color: Colors.modes.twisters, icon: 'Smile', route: '/tongue-twisters' },
  { title: 'Debate Practice', subtitle: 'Full rounds vs AI', color: Colors.modes.debate, icon: 'Trophy', route: '/debate/setup' },
];

const TIPS = [
  'Pause 1–2 seconds before your key point to build anticipation.',
  'Make eye contact with one person for a full thought, then move on.',
  'Vary your pace — slow down for important points, speed up for lists.',
  'Start with your strongest argument, not your weakest.',
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { streak, sessions } = useStreak();
  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-5">
          <Text className="text-white text-2xl font-bold tracking-tight">Speech & Debate</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Practice makes perfect</Text>
        </View>

        {/* Streak */}
        {streak > 0 && (
          <GlassCard style={{ marginBottom: 16, padding: 14 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl">🔥</Text>
                <View>
                  <Text className="text-white font-semibold text-sm">{streak}-day streak</Text>
                  <Text className="text-slate-500 text-xs">{sessions} sessions total</Text>
                </View>
              </View>
              <Text className="text-amber-400 text-2xl font-bold">{streak}</Text>
            </View>
          </GlassCard>
        )}

        {/* Tip */}
        <GlassCard style={{ marginBottom: 20, padding: 14 }}>
          <Text className="text-indigo-400 text-xs font-bold uppercase tracking-wide mb-1">💡 Tip of the Day</Text>
          <Text className="text-slate-300 text-sm leading-relaxed">{tip}</Text>
        </GlassCard>

        {/* Mode list */}
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Practice Modes</Text>
        {MODES.map((m) => (
          <ModeCard
            key={m.title}
            title={m.title}
            subtitle={m.subtitle}
            accentColor={m.color}
            icon={m.icon}
            onPress={() => router.push(m.route as any)}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Run in simulator — verify all 5 mode cards appear, streak card shows, tip shows.

- [ ] Commit:
```bash
git add app/(tabs)/index.tsx hooks/
git commit -m "feat: Home screen with mode cards, streak, and tip"
```

---

### Task 10: Profile tab + Auth

**Files:**
- Modify: `app/(tabs)/profile.tsx`
- Create: `hooks/useAuth.ts`

- [ ] Create `hooks/useAuth.ts`:
```typescript
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getStoredUser, storeUser, clearUser, UserInfo } from '../lib/auth';
import { clearHistory } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    getStoredUser().then((u) => { setUser(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication?.accessToken}` },
      })
        .then((r) => r.json())
        .then(async (info) => {
          const u: UserInfo = { id: info.id, name: info.name, email: info.email, picture: info.picture };
          await storeUser(u);
          setUser(u);
        });
    }
  }, [response]);

  async function signIn() {
    await promptAsync();
  }

  async function signOut() {
    await clearUser();
    await clearHistory();
    setUser(null);
  }

  return { user, loading, signIn, signOut };
}
```

- [ ] Replace `app/(tabs)/profile.tsx`:
```typescript
import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import GlassCard from '../../components/GlassCard';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signIn, signOut } = useAuth();

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Text className="text-white text-2xl font-bold mb-6">Profile</Text>
        {user ? (
          <GlassCard style={{ padding: 20 }}>
            <View className="items-center gap-3">
              <Image source={{ uri: user.picture }} className="w-16 h-16 rounded-full" />
              <Text className="text-white text-lg font-semibold">{user.name}</Text>
              <Text className="text-slate-400 text-sm">{user.email}</Text>
              <Pressable
                onPress={signOut}
                className="mt-4 px-6 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <Text className="text-red-400 font-semibold">Sign Out</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: 24 }}>
            <View className="items-center gap-4">
              <Text className="text-slate-400 text-sm text-center">
                Sign in to track your progress and streak across sessions.
              </Text>
              <Pressable
                onPress={signIn}
                className="px-6 py-3 rounded-xl"
                style={{ backgroundColor: '#4285F4' }}
              >
                <Text className="text-white font-semibold">Sign in with Google</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}
      </View>
    </LinearGradient>
  );
}
```

- [ ] Commit:
```bash
git add app/(tabs)/profile.tsx hooks/useAuth.ts
git commit -m "feat: Profile tab with Google Sign-In"
```

---

### Task 11: History tab

**Files:**
- Modify: `app/(tabs)/history.tsx`

- [ ] Replace `app/(tabs)/history.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getHistory, SessionRecord } from '../../lib/storage';
import GlassCard from '../../components/GlassCard';
import { Colors } from '../../constants/colors';

const MODE_LABELS: Record<string, string> = {
  spar: 'SPAR Debate', impromptu: 'Impromptu', casual: 'Free Talk',
  'tongue-twisters': 'Tongue Twisters', debate: 'Debate Practice',
};
const MODE_COLORS: Record<string, string> = {
  spar: Colors.modes.spar, impromptu: Colors.modes.impromptu,
  casual: Colors.modes.casual, 'tongue-twisters': Colors.modes.twisters,
  debate: Colors.modes.debate,
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useFocusEffect(useCallback(() => {
    getHistory().then(setHistory);
  }, []));

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-white text-2xl font-bold mb-5">History</Text>
        {history.length === 0 ? (
          <GlassCard style={{ padding: 24 }}>
            <Text className="text-slate-400 text-sm text-center">No sessions yet. Start practicing!</Text>
          </GlassCard>
        ) : history.map((s) => (
          <GlassCard key={s.id} style={{ padding: 14, marginBottom: 8 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text style={{ color: MODE_COLORS[s.mode] }} className="text-xs font-bold uppercase tracking-wide">
                  {MODE_LABELS[s.mode]}
                </Text>
                <Text className="text-white text-sm font-medium mt-0.5" numberOfLines={1}>{s.topic}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">{new Date(s.date).toLocaleDateString()}</Text>
              </View>
              <View className="items-end">
                <Text className="text-white text-xl font-bold">{s.score.toFixed(1)}</Text>
                <Text className="text-slate-500 text-xs">{s.duration}s</Text>
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Commit:
```bash
git add app/(tabs)/history.tsx
git commit -m "feat: History tab with session records"
```

---

## Chunk 4: Practice Modes

### Task 12: SPAR Debate mode

**Files:**
- Create: `app/spar/_layout.tsx`
- Create: `app/spar/setup.tsx`
- Create: `app/spar/index.tsx`
- Create: `app/spar/feedback.tsx`

- [ ] Create `app/spar/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';
export default function SparLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] Create `app/spar/setup.tsx`:
```typescript
import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import { Colors } from '../../constants/colors';

const DIFFICULTIES = ['Novice', 'JV', 'Varsity'];
const OPPONENTS = ['Balanced', 'Aggressive', 'Analytical'];
const AI_STRENGTHS = ['Easy', 'Medium', 'Hard'];

export default function SparSetup() {
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState('JV');
  const [opponent, setOpponent] = useState('Balanced');
  const [aiStrength, setAiStrength] = useState('Medium');

  function OptionRow({ label, options, value, onChange }: any) {
    return (
      <View className="mb-4">
        <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">{label}</Text>
        <View className="flex-row gap-2">
          {options.map((o: string) => (
            <Pressable
              key={o}
              onPress={() => onChange(o)}
              className="flex-1 py-2 rounded-xl items-center"
              style={{
                backgroundColor: value === o ? Colors.modes.spar + '33' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: value === o ? Colors.modes.spar : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: value === o ? Colors.modes.spar : '#94a3b8' }} className="text-sm font-medium">{o}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-slate-400">← Back</Text>
        </Pressable>
        <Text className="text-white text-2xl font-bold mb-1">SPAR Debate</Text>
        <Text className="text-slate-500 text-sm mb-6">Configure your debate session</Text>

        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <OptionRow label="Difficulty" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
          <OptionRow label="Opponent Style" options={OPPONENTS} value={opponent} onChange={setOpponent} />
          <OptionRow label="AI Strength" options={AI_STRENGTHS} value={aiStrength} onChange={setAiStrength} />
        </GlassCard>

        <Pressable
          onPress={() => router.push({ pathname: '/spar', params: { difficulty, opponent, aiStrength } })}
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: Colors.modes.spar }}
        >
          <Text className="text-white font-bold text-base">Pick a Topic →</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Create `app/spar/index.tsx` (stage machine: topic → debate → processing → done):
```typescript
import { useState, useRef } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import AudioRecorder from '../../components/AudioRecorder';
import { apiFetchJson, apiUrl } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { getStableTopics } from '../../lib/sparTopics';

type Stage = 'topic' | 'pro' | 'con' | 'crossfire' | 'processing' | 'done';

export default function SparSession() {
  const insets = useSafeAreaInsets();
  const { difficulty = 'JV', opponent = 'Balanced', aiStrength = 'Medium' } = useLocalSearchParams<any>();
  const [stage, setStage] = useState<Stage>('topic');
  const [topics] = useState(() => getStableTopics(difficulty));
  const [selectedTopic, setSelectedTopic] = useState('');
  const [side, setSide] = useState<'pro' | 'con'>('pro');
  const [proUri, setProUri] = useState('');
  const [conUri, setConUri] = useState('');
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);

  async function submitDebate(uri: string, thisSide: 'pro' | 'con', dur: number) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/mp4', name: 'audio.m4a' } as any);
      const transcribeRes = await fetch(apiUrl('/api/transcribe'), { method: 'POST', body: formData });
      const { transcript, audioUrl } = await transcribeRes.json();

      if (thisSide === 'pro') {
        setProUri(audioUrl);
        setStage('con');
      } else {
        setConUri(audioUrl);
        setStage('processing');
        const feedback = await apiFetchJson('/api/spar-feedback', {
          method: 'POST',
          body: JSON.stringify({ topic: selectedTopic, proTranscript: transcript, conTranscript: transcript, difficulty }),
        });
        setFeedbackData({ ...feedback, topic: selectedTopic, duration: dur });
        setStage('done');
      }
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'done' && feedbackData) {
    router.replace({ pathname: '/spar/feedback', params: { data: JSON.stringify(feedbackData) } });
    return null;
  }

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-slate-400">← Back</Text>
        </Pressable>

        {stage === 'topic' && (
          <>
            <Text className="text-white text-xl font-bold mb-4">Pick a Topic</Text>
            {topics.map((t: string) => (
              <Pressable key={t} onPress={() => setSelectedTopic(t)}>
                <GlassCard style={{ padding: 14, marginBottom: 8, borderColor: selectedTopic === t ? Colors.modes.spar : 'rgba(255,255,255,0.12)' }}>
                  <Text className="text-white text-sm">{t}</Text>
                </GlassCard>
              </Pressable>
            ))}
            <Pressable
              disabled={!selectedTopic}
              onPress={() => setStage('pro')}
              className="py-4 rounded-2xl items-center mt-4"
              style={{ backgroundColor: selectedTopic ? Colors.modes.spar : '#374151' }}
            >
              <Text className="text-white font-bold">Start Debate →</Text>
            </Pressable>
          </>
        )}

        {(stage === 'pro' || stage === 'con') && (
          <>
            <GlassCard style={{ padding: 14, marginBottom: 16 }}>
              <Text className="text-slate-400 text-xs uppercase tracking-wide mb-1">Topic</Text>
              <Text className="text-white text-sm">{selectedTopic}</Text>
            </GlassCard>
            <Text className="text-white text-lg font-bold mb-2">
              {stage === 'pro' ? '✅ Argue FOR' : '❌ Argue AGAINST'}
            </Text>
            <Text className="text-slate-400 text-sm mb-4">Record your argument</Text>
            <AudioRecorder onRecordingComplete={(uri, dur) => submitDebate(uri, stage, dur)} />
          </>
        )}

        {stage === 'processing' && (
          <View className="items-center py-20 gap-4">
            <ActivityIndicator color={Colors.modes.spar} size="large" />
            <Text className="text-slate-400">Analyzing your debate...</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Create `app/spar/feedback.tsx`:
```typescript
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import FeedbackReport from '../../components/FeedbackReport';
import { saveSession } from '../../lib/storage';
import { Colors } from '../../constants/colors';
import { randomUUID } from 'expo-crypto';

export default function SparFeedback() {
  const insets = useSafeAreaInsets();
  const { data } = useLocalSearchParams<{ data: string }>();
  const feedback = JSON.parse(data ?? '{}');

  useEffect(() => {
    saveSession({
      id: randomUUID(),
      mode: 'spar',
      topic: feedback.topic ?? '',
      score: feedback.overall ?? 0,
      date: new Date().toISOString(),
      duration: feedback.duration ?? 0,
    });
  }, []);

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 16, flex: 1 }}>
        <Pressable onPress={() => router.push('/(tabs)')} className="px-5 mb-2">
          <Text className="text-slate-400">← Home</Text>
        </Pressable>
        <Text className="text-white text-xl font-bold px-5 mb-4">SPAR Feedback</Text>
        <FeedbackReport
          score={feedback.overall ?? 0}
          summary={feedback.summary ?? ''}
          tip={feedback.tip}
          accentColor={Colors.modes.spar}
        >
          <Pressable onPress={() => router.replace('/spar/setup')} className="py-3 rounded-2xl items-center" style={{ backgroundColor: Colors.modes.spar + '22', borderWidth: 1, borderColor: Colors.modes.spar + '44' }}>
            <Text style={{ color: Colors.modes.spar }} className="font-bold">Try Again</Text>
          </Pressable>
        </FeedbackReport>
      </View>
    </LinearGradient>
  );
}
```

- [ ] Commit:
```bash
git add app/spar/
git commit -m "feat: SPAR Debate mode (setup, debate, feedback)"
```

---

### Task 13: Impromptu Speech mode

**Files:**
- Create: `app/impromptu/_layout.tsx`
- Create: `app/impromptu/index.tsx`
- Create: `app/impromptu/feedback.tsx`

- [ ] Create `app/impromptu/_layout.tsx` (same pattern as spar)

- [ ] Create `app/impromptu/index.tsx` (stages: setup → countdown → recording → processing → done):
```typescript
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import AudioRecorder from '../../components/AudioRecorder';
import CountdownTimer from '../../components/CountdownTimer';
import { apiFetchJson, apiUrl } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { randomUUID } from 'expo-crypto';

type Stage = 'setup' | 'countdown' | 'recording' | 'processing';

const DIFFICULTIES = ['Novice', 'JV', 'Varsity'];
const THINK_TIMES = [30, 60, 120];
const SPEECH_LENGTHS = [60, 120, 180];

export default function ImpromptuSession() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>('setup');
  const [difficulty, setDifficulty] = useState('JV');
  const [thinkTime, setThinkTime] = useState(60);
  const [speechLength, setSpeechLength] = useState(120);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  async function startSession() {
    setLoading(true);
    try {
      const { topic: t } = await apiFetchJson<{ topic: string }>('/api/generate-topic', {
        method: 'POST',
        body: JSON.stringify({ difficulty }),
      });
      setTopic(t);
      setStage('countdown');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordingComplete(uri: string, duration: number) {
    setStage('processing');
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/mp4', name: 'audio.m4a' } as any);
    const transcribeRes = await fetch(apiUrl('/api/transcribe'), { method: 'POST', body: formData });
    const { transcript, audioUrl } = await transcribeRes.json();
    const feedback = await apiFetchJson<any>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ topic, transcript, speechLength, difficulty }),
    });
    router.replace({ pathname: '/impromptu/feedback', params: { data: JSON.stringify({ ...feedback, topic, duration, audioUrl }) } });
  }

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} className="mb-4"><Text className="text-slate-400">← Back</Text></Pressable>
        <Text className="text-white text-2xl font-bold mb-1">Impromptu Speech</Text>

        {stage === 'setup' && (
          <>
            <Text className="text-slate-500 text-sm mb-6">Configure your session</Text>
            <GlassCard style={{ padding: 20, marginBottom: 20 }}>
              {[
                { label: 'Difficulty', opts: DIFFICULTIES, val: difficulty, set: setDifficulty },
                { label: 'Think Time (s)', opts: THINK_TIMES.map(String), val: String(thinkTime), set: (v: string) => setThinkTime(Number(v)) },
                { label: 'Speech Length (s)', opts: SPEECH_LENGTHS.map(String), val: String(speechLength), set: (v: string) => setSpeechLength(Number(v)) },
              ].map(({ label, opts, val, set }) => (
                <View key={label} className="mb-4">
                  <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">{label}</Text>
                  <View className="flex-row gap-2">
                    {opts.map((o) => (
                      <Pressable key={o} onPress={() => set(o)} className="flex-1 py-2 rounded-xl items-center"
                        style={{ backgroundColor: val === o ? Colors.modes.impromptu + '33' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: val === o ? Colors.modes.impromptu : 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: val === o ? Colors.modes.impromptu : '#94a3b8' }} className="text-sm font-medium">{o}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </GlassCard>
            <Pressable onPress={startSession} disabled={loading} className="py-4 rounded-2xl items-center" style={{ backgroundColor: Colors.modes.impromptu }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Get Topic →</Text>}
            </Pressable>
          </>
        )}

        {stage === 'countdown' && (
          <View className="items-center py-10 gap-6">
            <GlassCard style={{ padding: 16, width: '100%' }}>
              <Text className="text-slate-400 text-xs uppercase tracking-wide mb-1">Your Topic</Text>
              <Text className="text-white text-base font-semibold">{topic}</Text>
            </GlassCard>
            <Text className="text-slate-300 text-sm">Prepare your speech</Text>
            <CountdownTimer seconds={thinkTime} onComplete={() => setStage('recording')} accentColor={Colors.modes.impromptu} />
          </View>
        )}

        {stage === 'recording' && (
          <>
            <GlassCard style={{ padding: 14, marginBottom: 16 }}>
              <Text className="text-white text-sm">{topic}</Text>
            </GlassCard>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          </>
        )}

        {stage === 'processing' && (
          <View className="items-center py-20 gap-4">
            <ActivityIndicator color={Colors.modes.impromptu} size="large" />
            <Text className="text-slate-400">Analyzing your speech...</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Create `app/impromptu/feedback.tsx` (same pattern as spar/feedback.tsx, using `feedback.score` and `Colors.modes.impromptu`)

- [ ] Commit:
```bash
git add app/impromptu/
git commit -m "feat: Impromptu Speech mode"
```

---

### Task 14: Free Talk (Casual) mode

**Files:**
- Create: `app/casual/_layout.tsx`
- Create: `app/casual/index.tsx`
- Create: `app/casual/practice.tsx`
- Create: `app/casual/feedback.tsx`

- [ ] Create `app/casual/index.tsx` (topic + speech length picker):
```typescript
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import { Colors } from '../../constants/colors';
import { getRandomTopic } from '../../lib/casualTopics';

const LENGTHS = [60, 120, 180, 300];

export default function CasualSetup() {
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState('');
  const [speechLength, setSpeechLength] = useState(120);

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} className="mb-4"><Text className="text-slate-400">← Back</Text></Pressable>
        <Text className="text-white text-2xl font-bold mb-1">Free Talk</Text>
        <Text className="text-slate-500 text-sm mb-6">Speak on any topic, get AI feedback</Text>

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Topic</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="What will you speak about?"
            placeholderTextColor="#475569"
            className="text-white text-sm mb-3"
          />
          <Pressable onPress={() => setTopic(getRandomTopic())}
            className="py-2 rounded-xl items-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Text className="text-slate-400 text-sm">🎲 Random topic</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">Target Length</Text>
          <View className="flex-row gap-2">
            {LENGTHS.map((l) => (
              <Pressable key={l} onPress={() => setSpeechLength(l)} className="flex-1 py-2 rounded-xl items-center"
                style={{ backgroundColor: speechLength === l ? Colors.modes.casual + '33' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: speechLength === l ? Colors.modes.casual : 'rgba(255,255,255,0.1)' }}>
                <Text style={{ color: speechLength === l ? Colors.modes.casual : '#94a3b8' }} className="text-xs font-medium">{l}s</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <Pressable disabled={!topic.trim()} onPress={() => router.push({ pathname: '/casual/practice', params: { topic, speechLength: String(speechLength) } })}
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: topic.trim() ? Colors.modes.casual : '#374151' }}>
          <Text className="text-white font-bold">Start Practice →</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Create `app/casual/practice.tsx` (AI outline + AI speech + recording stage machine)
- [ ] Create `app/casual/feedback.tsx`

- [ ] Commit:
```bash
git add app/casual/
git commit -m "feat: Free Talk (Casual) mode"
```

---

### Task 15: Tongue Twisters mode

**Files:**
- Create: `app/tongue-twisters/_layout.tsx`
- Create: `app/tongue-twisters/index.tsx`
- Create: `app/tongue-twisters/feedback.tsx`

- [ ] Create `app/tongue-twisters/index.tsx` (stages: setup → practice → recording → processing):
```typescript
import { useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import GlassCard from '../../components/GlassCard';
import AudioRecorder from '../../components/AudioRecorder';
import { apiFetchJson, apiUrl } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { getRandomTwister } from '../../lib/tongueTwisters';

type Stage = 'setup' | 'practice' | 'recording' | 'processing';
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function TongueTwistersSession() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>('setup');
  const [difficulty, setDifficulty] = useState('Medium');
  const [twister, setTwister] = useState('');
  const [speaking, setSpeaking] = useState(false);

  function pickTwister(diff: string) {
    setTwister(getRandomTwister(diff));
    setStage('practice');
  }

  async function speakTwister() {
    setSpeaking(true);
    Speech.speak(twister, {
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function handleRecordingComplete(uri: string, duration: number) {
    setStage('processing');
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/mp4', name: 'audio.m4a' } as any);
    const { transcript } = await (await fetch(apiUrl('/api/transcribe'), { method: 'POST', body: formData })).json();
    const feedback = await apiFetchJson<any>('/api/tongue-twister-feedback', {
      method: 'POST',
      body: JSON.stringify({ twister, transcript, difficulty }),
    });
    router.replace({ pathname: '/tongue-twisters/feedback', params: { data: JSON.stringify({ ...feedback, twister, duration }) } });
  }

  return (
    <LinearGradient colors={Colors.bgGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} className="mb-4"><Text className="text-slate-400">← Back</Text></Pressable>
        <Text className="text-white text-2xl font-bold mb-1">Tongue Twisters</Text>

        {stage === 'setup' && (
          <>
            <Text className="text-slate-500 text-sm mb-6">Pick a difficulty</Text>
            <View className="flex-row gap-3 mb-6">
              {DIFFICULTIES.map((d) => (
                <Pressable key={d} onPress={() => setDifficulty(d)} className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: difficulty === d ? Colors.modes.twisters + '33' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: difficulty === d ? Colors.modes.twisters : 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: difficulty === d ? Colors.modes.twisters : '#94a3b8' }} className="font-medium">{d}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => pickTwister(difficulty)} className="py-4 rounded-2xl items-center" style={{ backgroundColor: Colors.modes.twisters }}>
              <Text className="text-white font-bold">Get Twister →</Text>
            </Pressable>
          </>
        )}

        {stage === 'practice' && (
          <>
            <GlassCard style={{ padding: 20, marginBottom: 16, minHeight: 144, justifyContent: 'center' }}>
              <Text className="text-white text-base text-center leading-relaxed">{twister}</Text>
            </GlassCard>
            <View className="flex-row gap-3 mb-4">
              <Pressable onPress={speakTwister} disabled={speaking} className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text className="text-slate-300 font-medium">{speaking ? '🔊 Speaking...' : '🔊 Hear it'}</Text>
              </Pressable>
              <Pressable onPress={() => pickTwister(difficulty)} className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text className="text-slate-300 font-medium">🔀 New one</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setStage('recording')} className="py-4 rounded-2xl items-center" style={{ backgroundColor: Colors.modes.twisters }}>
              <Text className="text-white font-bold">Ready to Practice →</Text>
            </Pressable>
          </>
        )}

        {stage === 'recording' && (
          <>
            <GlassCard style={{ padding: 14, marginBottom: 16, minHeight: 144, justifyContent: 'center' }}>
              <Text className="text-white text-base text-center leading-relaxed">{twister}</Text>
            </GlassCard>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          </>
        )}

        {stage === 'processing' && (
          <View className="items-center py-20 gap-4">
            <ActivityIndicator color={Colors.modes.twisters} size="large" />
            <Text className="text-slate-400">Analyzing pronunciation...</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
```

- [ ] Create `app/tongue-twisters/feedback.tsx` (shows `feedback.accuracy`, `feedback.fluency`, `feedback.score = (accuracy+fluency)/2`)

- [ ] Commit:
```bash
git add app/tongue-twisters/
git commit -m "feat: Tongue Twisters mode"
```

---

### Task 16: Debate Practice mode

**Files:**
- Create: `app/debate/_layout.tsx`
- Create: `app/debate/setup.tsx`
- Create: `app/debate/index.tsx`
- Create: `app/debate/feedback.tsx`

- [ ] Create `app/debate/setup.tsx` (difficulty, mode: structured/crossfire, number of arguments: 2/3):
```typescript
// Same pattern as spar/setup.tsx
// Options: difficulty [Novice, JV, Varsity], mode [Structured, Crossfire], arguments [2, 3]
// On submit: router.push({ pathname: '/debate', params: { difficulty, mode, numArgs } })
```

- [ ] Create `app/debate/index.tsx` (stages: topic → argument rounds → processing → done):
```typescript
// Pattern mirrors spar/index.tsx
// Fetches topic from /api/generate-topic or uses topicBank
// Each round: user records argument → AI responds via /api/debate-example-argument
// Final: POST all arguments to /api/debate-argument-feedback
```

- [ ] Create `app/debate/feedback.tsx` (shows round-by-round feedback + overall score)

- [ ] Commit:
```bash
git add app/debate/
git commit -m "feat: Debate Practice mode"
```

---

## Chunk 5: Polish + Ship Prep

### Task 17: Add ambient background blobs to all screens

- [ ] Create `components/AmbientBackground.tsx`:
```typescript
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  accentColor?: string;
}

export default function AmbientBackground({ accentColor = '#6366f1' }: Props) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      <LinearGradient
        colors={[accentColor + '22', 'transparent']}
        style={{ position: 'absolute', top: -60, left: -40, width: 220, height: 220, borderRadius: 110, opacity: 0.5 }}
      />
      <LinearGradient
        colors={['#22d3ee22', 'transparent']}
        style={{ position: 'absolute', bottom: -30, right: -20, width: 180, height: 180, borderRadius: 90, opacity: 0.4 }}
      />
    </View>
  );
}
```

- [ ] Add `<AmbientBackground accentColor={Colors.modes.X} />` as first child of `LinearGradient` in all mode screens

- [ ] Commit:
```bash
git add components/AmbientBackground.tsx app/
git commit -m "feat: ambient background blobs on all screens"
```

---

### Task 18: Stack headers for mode screens

- [ ] Update each mode's `_layout.tsx` to show a styled header:
```typescript
import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function SparLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0d1117' },
        headerTintColor: '#f1f5f9',
        headerBackTitle: '',
        headerShadowVisible: false,
      }}
    />
  );
}
```

- [ ] Commit:
```bash
git add app/spar/_layout.tsx app/impromptu/_layout.tsx app/casual/_layout.tsx app/tongue-twisters/_layout.tsx app/debate/_layout.tsx
git commit -m "feat: styled stack headers for all mode screens"
```

---

### Task 19: End-to-end test on device

- [ ] Build development client:
```bash
npx expo run:ios
```

- [ ] Test each mode end-to-end on real iPhone:
  - [ ] Home screen loads, all 5 mode cards visible
  - [ ] SPAR: setup → topic → record pro → record con → feedback shows
  - [ ] Impromptu: setup → topic generates → countdown → record → feedback shows
  - [ ] Free Talk: topic → practice → AI outline → record → feedback shows
  - [ ] Tongue Twisters: difficulty → twister → hear it → record → feedback shows
  - [ ] Debate: setup → topic → rounds → feedback shows
  - [ ] History tab: sessions appear after each feedback
  - [ ] Profile: Google Sign-In completes, name/avatar shown

- [ ] Fix any device-specific issues found

- [ ] Final commit:
```bash
git add .
git commit -m "feat: complete React Native iOS app v1"
git push origin main
```
