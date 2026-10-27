import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  RepeatMode,
  type Track,
  type UpdateOptions,
} from 'react-native-track-player';
import { DATA_SOURCE } from '../config';
import type { RsmTrack } from '../data';
import { base44Source, loadSavedBase44Token, needsResign, signTrack } from '../data/base44Source';
import { sampleSource } from '../data/sampleSource';
import { sessionLog } from './sessionLog';

export const PLAYER_OPTIONS: UpdateOptions = {
  capabilities: [
    Capability.Play,
    Capability.Pause,
    Capability.SkipToNext,
    Capability.SkipToPrevious,
    Capability.SeekTo,
    Capability.Stop,
  ],
  // Android lock screen and collapsed notification show only these
  // (play/pause share one slot): previous · play/pause · next.
  compactCapabilities: [Capability.SkipToPrevious, Capability.Play, Capability.Pause, Capability.SkipToNext],
  progressUpdateEventInterval: 1,
  android: {
    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
  },
};

let ready: Promise<void> | null = null;

let queueSourceName = sampleSource.name;
export const getQueueSourceName = () => queueSourceName;

// Duration is left to the native player: Base44's duration_seconds is not
// reliable yet (30 on full-length songs), and a wrong value shows on the lock screen.
export const toPlayerTrack = (t: RsmTrack) => ({
  id: t.id,
  url: t.audioUrl,
  title: t.title,
  artist: t.artist,
  album: t.album,
  artwork: t.artworkUrl,
  audioUri: t.audioUri,
  signedAt: t.signedAt,
});

const fromPlayerTrack = (t: Track): RsmTrack => ({
  id: String(t.id),
  title: t.title ?? '',
  artist: t.artist ?? '',
  album: t.album,
  audioUrl: String(t.url),
  audioUri: t.audioUri as string | undefined,
  signedAt: t.signedAt as number | undefined,
  artworkUrl: t.artwork as string | undefined,
});

// Real RSM songs when a Base44 login is saved on the phone, else the samples.
async function initialQueue(): Promise<RsmTrack[]> {
  if (DATA_SOURCE === 'base44' || (await loadSavedBase44Token())) {
    try {
      const tracks = await base44Source.getQueue();
      if (tracks.length > 0) {
        queueSourceName = base44Source.name;
        return tracks;
      }
    } catch (e) {
      sessionLog.add('error', `Base44 load failed, using samples: ${String((e as Error)?.message ?? e)}`);
    }
  }
  queueSourceName = sampleSource.name;
  return sampleSource.getQueue();
}

async function init() {
  await sessionLog.hydrate();
  try {
    await TrackPlayer.setupPlayer({
      // Playback routes to Bluetooth A2DP and AirPlay on its own; the
      // AllowBluetoothA2DP/AllowAirPlay options only apply to PlayAndRecord.
      iosCategory: IOSCategory.Playback,
      autoHandleInterruptions: true,
      autoUpdateMetadata: true,
    });
  } catch (e) {
    // Fast Refresh re-runs this; the native player is already set up.
    if (!String(e).includes('already been initialized')) throw e;
  }

  await TrackPlayer.updateOptions(PLAYER_OPTIONS);

  // Keep the current queue when the JS side restarts while audio is still
  // playing (Android can recreate the activity around a live service).
  if ((await TrackPlayer.getQueue()).length > 0) return;
  const queue = await initialQueue();
  await TrackPlayer.reset();
  await TrackPlayer.add(queue.map(toPlayerTrack));
  // Loop the queue so a 60-minute locked test never runs out of tracks.
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
}

// Swap the queue at runtime, e.g. sample tracks → Base44 tracks after login.
export async function replaceQueue(tracks: RsmTrack[], sourceName: string) {
  await setupPlayer();
  queueSourceName = sourceName;
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks.map(toPlayerTrack));
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
}

// Signed Base44 links last 1 hour. As playback moves on, re-sign the next
// tracks before they expire so a 60-minute locked session keeps going.
export async function refreshUpcoming(count = 2) {
  const queue = await TrackPlayer.getQueue();
  const active = await TrackPlayer.getActiveTrackIndex();
  if (active === undefined || queue.length < 2) return;
  for (let k = 1; k <= count && k < queue.length; k++) {
    const i = (active + k) % queue.length;
    if (!needsResign(queue[i])) continue;
    const fresh = await signTrack(fromPlayerTrack(queue[i]));
    await TrackPlayer.remove([i]);
    await TrackPlayer.add(toPlayerTrack(fresh), i);
  }
}

// Re-sign and reload the current track, e.g. after its link expired while paused.
export async function reloadActiveWithFreshLink() {
  const t = await TrackPlayer.getActiveTrack();
  if (!t || typeof t.audioUri !== 'string') return false;
  const fresh = await signTrack(fromPlayerTrack(t));
  await TrackPlayer.load(toPlayerTrack(fresh));
  await TrackPlayer.play();
  return true;
}

export function setupPlayer() {
  if (!ready) {
    ready = init().catch(e => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
