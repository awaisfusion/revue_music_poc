import type { RsmTrack, TrackSource } from './types';

// Placeholder content until RSM's Base44 catalogue is reachable.
// SoundHelix tracks are royalty-free and 5–7 minutes long, so 12 of them
// cover the 30–60 minute locked-screen test (criterion 6).
const SAMPLE_COUNT = 12;

const tracks: RsmTrack[] = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
  const n = i + 1;
  return {
    id: `sample-${n}`,
    title: `Sample Track ${n}`,
    artist: 'SoundHelix (placeholder)',
    album: 'Prototype Test Queue',
    audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`,
    artworkUrl: `https://picsum.photos/seed/rsm-${n}/600/600`,
  };
});

export const sampleSource: TrackSource = {
  name: 'Sample (placeholder)',
  async getQueue() {
    return tracks;
  },
};
