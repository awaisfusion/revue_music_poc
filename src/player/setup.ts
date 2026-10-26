import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  RepeatMode,
} from 'react-native-track-player';
import { trackSource, type RsmTrack } from '../data';
import { sessionLog } from './sessionLog';

let ready: Promise<void> | null = null;

export const toPlayerTrack = (t: RsmTrack) => ({
  id: t.id,
  url: t.audioUrl,
  title: t.title,
  artist: t.artist,
  album: t.album,
  artwork: t.artworkUrl,
  duration: t.durationSec,
});

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

  await TrackPlayer.updateOptions({
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
  });

  // Keep the current queue when the JS side restarts while audio is still
  // playing (Android can recreate the activity around a live service).
  if ((await TrackPlayer.getQueue()).length > 0) return;
  const queue = await trackSource.getQueue();
  await TrackPlayer.reset();
  await TrackPlayer.add(queue.map(toPlayerTrack));
  // Loop the queue so a 60-minute locked test never runs out of tracks.
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
}

// Swap the queue at runtime, e.g. sample tracks → Base44 tracks after login.
export async function replaceQueue(tracks: RsmTrack[]) {
  await setupPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks.map(toPlayerTrack));
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
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
