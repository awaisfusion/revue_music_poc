import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE44 } from '../config';
import type { RsmTrack, TrackSource } from './types';

// Entity names confirmed from the RSM web app's own requests:
// Track, Album, Genre, Playlist, ListeningHistory, Like, User.
// Track field names are NOT confirmed yet (the copy app has no Track records),
// so toRsmTrack() accepts the likely candidates. Fix it once we see a real record.
//
// Endpoints match the public @base44/sdk (0.8.57): POST /apps/{id}/auth/login,
// GET /apps/{id}/entities/User/me, GET /apps/{id}/entities/{Entity}.

type Base44Record = Record<string, unknown>;

export type Base44User = {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  _app_role?: string;
  [key: string]: unknown;
};

// Prototype only: the token sits in AsyncStorage. Production (Milestone 4)
// moves it to the Keychain / Android Keystore.
const TOKEN_KEY = 'rsm.base44Token.v1';
let authToken: string | null = null;

const api = (path: string) => `${BASE44.apiBase}/${BASE44.appId}${path}`;

const headers = (json = false): Record<string, string> => ({
  'X-App-Id': BASE44.appId,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

async function errorText(res: Response) {
  try {
    const body = await res.json();
    return String(body?.message ?? body?.detail ?? body?.error ?? res.status);
  } catch {
    return String(res.status);
  }
}

export async function restoreBase44Session(): Promise<Base44User | null> {
  authToken = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!authToken) return null;
  try {
    return await fetchMe();
  } catch {
    await signOutBase44();
    return null;
  }
}

export async function signInBase44(email: string, password: string): Promise<Base44User> {
  const res = await fetch(api('/auth/login'), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await errorText(res);
    if (/turnstile|captcha/i.test(msg)) {
      throw new Error('Base44 asks for a captcha on this login. Ask RSM to allow app logins, or test with a token.');
    }
    throw new Error(res.status === 401 ? 'Wrong email or password.' : `Login failed: ${msg}`);
  }
  const { access_token, user } = (await res.json()) as { access_token?: string; user?: Base44User };
  if (!access_token) throw new Error('Login response had no access token.');
  authToken = access_token;
  await AsyncStorage.setItem(TOKEN_KEY, access_token);
  return user ?? (await fetchMe());
}

export async function signOutBase44() {
  authToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

export async function fetchMe(): Promise<Base44User> {
  const res = await fetch(api('/entities/User/me'), { headers: headers() });
  if (!res.ok) throw new Error(`Could not load the member profile: ${await errorText(res)}`);
  return (await res.json()) as Base44User;
}

const pick = (r: Base44Record, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
};

// RSM Track records (confirmed 2026-10-27): title, artist_name, album_title,
// cover_image_url (public), duration_seconds, is_premium_only, track_number,
// and audio as a private file in audio_uri (audio_url is empty). Private
// files play through a signed URL; see signTrack().
export function toRsmTrack(r: Base44Record): RsmTrack | null {
  const audioUrl = pick(r, ['audio_url', 'file_url', 'stream_url']) ?? '';
  const audioUri = pick(r, ['audio_uri']);
  if (!audioUrl && !audioUri) return null;
  const duration = r.duration_seconds ?? r.duration;
  return {
    id: String(r.id),
    title: pick(r, ['title', 'name']) ?? 'Untitled',
    artist: pick(r, ['artist_name', 'artist']) ?? 'Revive Soul Music',
    album: pick(r, ['album_title', 'album_name']),
    audioUrl,
    audioUri: audioUrl ? undefined : audioUri,
    artworkUrl: pick(r, ['cover_image_url', 'cover_url', 'artwork_url', 'image_url']),
    durationSec: typeof duration === 'number' ? duration : undefined,
    isPremium: r.is_premium_only === true || r.is_premium === true,
  };
}

// Base44 caps signed URLs at 1 hour; re-sign anything older than 45 minutes.
export const SIGNED_URL_TTL_SEC = 3600;
export const RESIGN_AFTER_MS = 45 * 60_000;

async function signFileUri(fileUri: string): Promise<string> {
  const res = await fetch(api('/integration-endpoints/Core/CreateFileSignedUrl'), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ file_uri: fileUri, expires_in: SIGNED_URL_TTL_SEC }),
  });
  if (!res.ok) throw new Error(`Could not get a playable link: ${await errorText(res)}`);
  const { signed_url } = (await res.json()) as { signed_url?: string };
  if (!signed_url) throw new Error('Base44 returned no signed link.');
  return signed_url;
}

// Returns the track with a fresh signed URL if it uses a private file.
export async function signTrack(track: RsmTrack): Promise<RsmTrack> {
  if (!track.audioUri) return track;
  return { ...track, audioUrl: await signFileUri(track.audioUri), signedAt: Date.now() };
}

export const needsResign = (t: object) => {
  const { audioUri, signedAt } = t as { audioUri?: unknown; signedAt?: unknown };
  return typeof audioUri === 'string' && (typeof signedAt !== 'number' || Date.now() - signedAt > RESIGN_AFTER_MS);
};

export const hasBase44Session = () => authToken !== null;

async function listEntity(entity: string, query: string) {
  const res = await fetch(api(`/entities/${entity}?${query}`), { headers: headers() });
  if (!res.ok) throw new Error(`Base44 ${entity} request failed: ${await errorText(res)}`);
  return (await res.json()) as Base44Record[];
}

export type Base44Fetch = { tracks: RsmTrack[]; records: number; firstRecordKeys: string[] };

// Same query the web app's Browse page uses. Returns the raw record count and
// the first record's field names so unmapped fields are visible in the app.
export async function fetchBase44Tracks(): Promise<Base44Fetch> {
  const records = await listEntity('Track', 'sort=-play_count&limit=50');
  const mapped = records.map(toRsmTrack).filter((t): t is RsmTrack => t !== null);
  return {
    tracks: await Promise.all(mapped.map(signTrack)),
    records: records.length,
    firstRecordKeys: records[0] ? Object.keys(records[0]) : [],
  };
}

export async function loadSavedBase44Token() {
  if (!authToken) authToken = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  return authToken !== null;
}

export const base44Source: TrackSource = {
  name: 'RSM catalogue (Base44)',
  async getQueue() {
    await loadSavedBase44Token();
    return (await fetchBase44Tracks()).tracks;
  },
};
