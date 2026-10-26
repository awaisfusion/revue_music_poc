import TrackPlayer from 'react-native-track-player';

// On iOS a skip only swaps the player item; when it comes from the lock
// screen in the background the player stays paused on the new track. Resume
// explicitly: always for remote skips, and in the app if it was playing.
export async function skip(direction: 'next' | 'previous', { resume = false } = {}) {
  const wasPlaying = await TrackPlayer.getPlayWhenReady();
  try {
    if (direction === 'next') await TrackPlayer.skipToNext();
    else await TrackPlayer.skipToPrevious();
  } catch {
    // Start/end of the queue: nothing to skip to.
    return;
  }
  if (resume || wasPlaying) await TrackPlayer.play();
}
