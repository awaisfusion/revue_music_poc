import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Log of track changes, remote commands, state changes and heartbeats, shown on
// the "Session Test" card and exportable as a text report. Persisted so the
// evidence for criteria 2 and 6 survives the app being killed mid-test.

export type LogKind = 'track' | 'remote' | 'error' | 'state' | 'heartbeat' | 'app';
export type LogEntry = { at: number; kind: LogKind; text: string };

const STORAGE_KEY = 'rsm.sessionLog.v1';
const MAX_ENTRIES = 2000;

let entries: LogEntry[] = [];
let sessionStart: number | null = null;
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionStart, entries })).catch(() => {});
  }, 2000);
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
export const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

function deviceLine() {
  const c = Platform.constants as Record<string, unknown>;
  if (Platform.OS === 'android') {
    return `Android ${c.Release ?? Platform.Version} · ${c.Manufacturer ?? ''} ${c.Model ?? ''}`.trim();
  }
  return `iOS ${Platform.Version}${c.isMacCatalystApp ? ' (Mac)' : ''}`;
}

export const sessionLog = {
  async hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { sessionStart: number | null; entries: LogEntry[] };
        // Keep anything logged before hydration finished (newest first).
        entries = [...entries, ...saved.entries].slice(0, MAX_ENTRIES);
        sessionStart = saved.sessionStart ?? sessionStart;
        notify();
      }
    } catch {
      // Corrupt or missing storage: start fresh.
    }
  },
  add(kind: LogKind, text: string) {
    if (sessionStart === null) sessionStart = Date.now();
    entries.unshift({ at: Date.now(), kind, text });
    if (entries.length > MAX_ENTRIES) entries.pop();
    scheduleSave();
    notify();
  },
  reset() {
    entries = [];
    sessionStart = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionStart, entries })).catch(() => {});
    notify();
  },
  entries: () => entries,
  sessionStart: () => sessionStart,
  trackChanges: () => entries.filter(e => e.kind === 'track').length,
  // Heartbeats are logged once a minute while audio is playing.
  minutesPlayed: () => entries.filter(e => e.kind === 'heartbeat').length,
  report() {
    const start = sessionStart;
    const last = entries[0]?.at ?? start;
    const lines = [
      'Revive Soul Music — Milestone 1 background-audio test report',
      `Device: ${deviceLine()}`,
      start ? `Session: ${new Date(start).toLocaleString()} → ${last ? new Date(last).toLocaleString() : ''}` : 'Session: not started',
      start && last ? `Duration: ${formatDuration((last - start) / 1000)}` : null,
      `Minutes of playback confirmed (heartbeats): ${this.minutesPlayed()}`,
      `Track changes: ${this.trackChanges()}`,
      `Remote commands: ${entries.filter(e => e.kind === 'remote').length}`,
      `Errors: ${entries.filter(e => e.kind === 'error').length}`,
      '',
      'Event log (oldest first):',
      ...[...entries].reverse().map(e => `${clock(e.at)}  [${e.kind}] ${e.text}`),
    ];
    return lines.filter(l => l !== null).join('\n');
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
