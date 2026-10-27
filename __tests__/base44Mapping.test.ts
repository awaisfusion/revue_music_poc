/**
 * @format
 */

import { needsResign, toRsmTrack } from '../src/data/base44Source';

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

test('maps the RSM Track shape with a private audio file', () => {
  const t = toRsmTrack({
    id: '6adf95431d5458abd91c64bd',
    title: 'Voy a Amarte',
    artist_name: '116 LATIN',
    album_title: 'SIN VERGÜENZA',
    audio_url: '',
    audio_uri: 'mp/private/app/voy.mp3',
    cover_image_url: 'https://base44.app/api/apps/app/files/mp/public/app/cover.jpg',
    duration_seconds: 30,
    is_premium_only: true,
  });
  expect(t).toMatchObject({
    title: 'Voy a Amarte',
    artist: '116 LATIN',
    album: 'SIN VERGÜENZA',
    audioUrl: '',
    audioUri: 'mp/private/app/voy.mp3',
    artworkUrl: 'https://base44.app/api/apps/app/files/mp/public/app/cover.jpg',
    isPremium: true,
  });
});

test('flags private tracks for re-signing before the link expires', () => {
  expect(needsResign({ audioUri: 'mp/private/x.mp3' })).toBe(true);
  expect(needsResign({ audioUri: 'mp/private/x.mp3', signedAt: Date.now() })).toBe(false);
  expect(needsResign({ audioUri: 'mp/private/x.mp3', signedAt: Date.now() - 50 * 60_000 })).toBe(true);
  expect(needsResign({ url: 'https://public.example/a.mp3' })).toBe(false);
});
