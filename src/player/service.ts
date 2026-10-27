import { Platform } from 'react-native';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { skip } from './controls';
import { PLAYER_OPTIONS, refreshUpcoming, reloadActiveWithFreshLink } from './setup';
import { formatDuration, sessionLog } from './sessionLog';

const HEARTBEAT_MS = 60_000;

// Runs in the native playback service, so it keeps handling lock-screen,
// headset, Bluetooth and car controls while the app is in the background.
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    sessionLog.add('remote', 'Remote: play');
    TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    sessionLog.add('remote', 'Remote: pause');
    TrackPlayer.pause();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    sessionLog.add('remote', 'Remote: next');
    skip('next', { resume: true });
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    sessionLog.add('remote', 'Remote: previous');
    skip('previous', { resume: true });
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, e => {
    TrackPlayer.seekTo(e.position);
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    sessionLog.add('remote', 'Remote: stop');
    TrackPlayer.stop();
  });

  // Set on the first State.Playing after launch (see PlaybackState below).
  let hasPlayed = false;
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, e => {
    if (!e.track) return;
    refreshUpcoming().catch(err => sessionLog.add('error', `Link refresh failed: ${String(err?.message ?? err)}`));
    // Loading the queue, or picking the first song before anything has
    // played, is not a track change. Android reports a "previous track" even
    // for a fresh queue, so lastTrack alone can't tell.
    if (!hasPlayed || e.lastTrack == null || e.lastTrack.id === e.track.id) {
      sessionLog.add('state', `Queue at ${e.track.title}`);
      return;
    }
    sessionLog.add('track', `Now playing: ${e.track.title} — ${e.track.artist ?? ''}`);
  });

  // A Base44 link can expire while paused for over an hour. Re-sign and
  // retry once per track, at most every 5 minutes, so errors can't loop.
  const retried = new Map<string, number>();
  TrackPlayer.addEventListener(Event.PlaybackError, async e => {
    sessionLog.add('error', `Playback error: ${e.code ?? ''} ${e.message}`);
    const track = await TrackPlayer.getActiveTrack();
    const id = String(track?.id ?? '');
    if (!id || Date.now() - (retried.get(id) ?? 0) < 5 * 60_000) return;
    retried.set(id, Date.now());
    try {
      if (await reloadActiveWithFreshLink()) sessionLog.add('state', `Re-signed expired link for ${track?.title}`);
    } catch (err) {
      sessionLog.add('error', `Could not re-sign link: ${String((err as Error)?.message ?? err)}`);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteDuck, e => {
    // Calls, Siri, navigation prompts. autoHandleInterruptions does the
    // pausing/resuming; we only log it for the test report.
    sessionLog.add('state', e.paused ? 'Interrupted (paused)' : 'Interruption ended');
  });

  // Log only the states that matter for the report, and only on change.
  let lastState: State | undefined;
  let commandsRefreshed = false;
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    if (state === lastState) return;
    lastState = state;
    if (state === State.Playing) hasPlayed = true;
    // iOS enables lock-screen commands when a track loads. The first track
    // loads before the audio session is active, so next/previous stay greyed
    // out until the track changes. Re-apply them once playback has started.
    if (state === State.Playing && !commandsRefreshed && Platform.OS === 'ios') {
      commandsRefreshed = true;
      TrackPlayer.updateOptions(PLAYER_OPTIONS);
    }
    if (state === State.Playing || state === State.Paused || state === State.Buffering || state === State.Stopped || state === State.Ended) {
      sessionLog.add('state', `State: ${state}`);
    }
  });

  // Count real seconds of playback from the 1-second progress events and log a
  // heartbeat for each full minute. A run of these with no gaps is the
  // evidence for the 30–60 minute locked-screen test.
  let playedMs = 0;
  let lastTick: number | null = null;
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async e => {
    const now = Date.now();
    const { state } = await TrackPlayer.getPlaybackState();
    if (state !== State.Playing) {
      lastTick = null;
      return;
    }
    // Cap each step so a stalled JS thread can't credit time that didn't play.
    if (lastTick !== null) playedMs += Math.min(now - lastTick, 2_000);
    lastTick = now;
    if (playedMs < HEARTBEAT_MS) return;
    playedMs -= HEARTBEAT_MS;
    const track = await TrackPlayer.getActiveTrack();
    sessionLog.add('heartbeat', `Playing ${formatDuration(e.position)} into ${track?.title ?? 'track'}`);
  });
}
