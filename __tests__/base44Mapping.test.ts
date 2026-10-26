/**
 * @format
 */

import { toRsmTrack } from '../src/data/base44Source';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

test('maps a Base44 Track record using common field names', () => {
  expect(
    toRsmTrack({
      id: 'abc',
      title: 'Grace',
      artist_name: 'RSM Artist',
      album_title: 'Revival',
      audio_url: 'https://cdn.example.com/grace.mp3',
      cover_url: 'https://cdn.example.com/grace.jpg',
      duration: 215,
      is_premium: true,
    }),
  ).toEqual({
    id: 'abc',
    title: 'Grace',
    artist: 'RSM Artist',
    album: 'Revival',
    audioUrl: 'https://cdn.example.com/grace.mp3',
    artworkUrl: 'https://cdn.example.com/grace.jpg',
    durationSec: 215,
    isPremium: true,
  });
});

test('skips records with no playable audio', () => {
  expect(toRsmTrack({ id: 'x', title: 'No audio' })).toBeNull();
});

test('falls back to defaults for missing title and artist', () => {
  const t = toRsmTrack({ id: 7, file_url: 'https://cdn.example.com/a.mp3' });
  expect(t?.title).toBe('Untitled');
  expect(t?.artist).toBe('Revive Soul Music');
  expect(t?.id).toBe('7');
});
