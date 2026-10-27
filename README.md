# Revive Soul Music — Mobile App

React Native (iOS + Android) app for Revive Soul Music, on the existing Base44 backend.
Project ref: PROJ-RSM-001 (Fusionwave).

**Current stage: Milestone 1 — Background Audio Prototype.**

## Stack

- React Native 0.88 (new architecture), TypeScript
- `react-native-track-player` 4.1.2 — native queue and background audio (AVPlayer on iOS, Media3/ExoPlayer on Android), lock-screen metadata, remote/Bluetooth/car controls
- `react-native-svg` — icons and the amber → orange gradient
- Theme taken from the live RSM web app: black/zinc surfaces, amber `#f59e0b` → orange `#f97316` (`src/theme.ts`)

## Run

```bash
npm install
cd ios && LANG=en_US.UTF-8 pod install && cd ..   # CocoaPods fails without a UTF-8 locale
npm start
npm run ios        # or: npm run android (needs ANDROID_HOME=~/Library/Android/sdk)
```

`patches/react-native-track-player+4.1.2.patch` (applied on `npm install` by patch-package) makes track player 4.1.2 work on Android with RN 0.88:
- two nullable-`Bundle` Kotlin errors that stop the build
- `@ReactMethod`s returned `Job` (`= scope.launch {}`); the TurboModule interop needs `Unit`, otherwise the app shows "Unable to parse @ReactMethod annotations" on launch
- `MusicService` emitted events through `ReactNativeHost`, which crashes in the new architecture; it now uses `HeadlessJsTaskService.reactContext`

Revisit when track player 5.x is stable.

Known harmless iOS warning ("Open debugger to view warnings" on launch): track player's iOS module does not implement the four sleep-timer methods its JS spec declares (`setSleepTimer`, `getSleepTimerProgress`, `clearSleepTimer`, `sleepWhenActiveTrackReachesEnd`). The app does not use a sleep timer.

`ios/Podfile` raises pods that still target iOS 13 (AsyncStorage's resource bundle) to the app minimum; Xcode 27 refuses to build them otherwise.

Background audio only behaves like the real thing on **physical devices**. The simulator plays in the background but does not show the lock-screen Now Playing widget reliably.

## Layout

```
src/
  config.ts              DATA_SOURCE switch ('sample' | 'base44') and Base44 app id
  theme.ts               RSM colours
  data/
    types.ts             RsmTrack: the app-side track shape
    sampleSource.ts      12 royalty-free SoundHelix tracks (~75 min) as placeholders
    base44Source.ts      Base44 REST client: email login, User/me, Track list (field mapping unconfirmed)
  player/
    setup.ts             setupPlayer, capabilities, queue load, replaceQueue, repeat-queue
    service.ts           Playback service: remote controls, interruptions, state changes, 1-minute heartbeats
    sessionLog.ts        Persisted test log (AsyncStorage) + text report for the "Session Test" card
  screens/               HomeScreen (queue + session card), PlayerScreen (full player),
                         Base44Screen (test login, load Base44 tracks)
  components/            MiniPlayer, ProgressBar, Artwork, Icon, Gradient
```

Native config:
- iOS: `UIBackgroundModes = [audio]` in `ios/ReviveSoul/Info.plist`; bundle id `com.revivesoulmusic.app`
- Android: the track player library adds the `mediaPlayback` foreground service and permissions; applicationId `com.revivesoulmusic.app`

## Milestone 1 acceptance checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Prototype on physical iPhone + Android using actual RSM content | Android phone (OnePlus, Android 12): installed. **iPhone: not yet on a device** (needs an Apple signing team). **Content: placeholder** until RSM adds tracks; the Base44 screen can then load them without a rebuild |
| 2 | Locked playback, auto-advance through ≥3 songs | iOS simulator: advanced in background. Android emulator: advanced with screen asleep. Verify on devices |
| 3 | Title, artist, artwork update per track | Android media notification shows title, artist, artwork and updates per track; check iOS lock screen on device |
| 4 | Lock-screen play/pause/next/previous | Android notification next works; check on devices |
| 5 | Bluetooth audio + headset/vehicle controls | Android: media-session next/previous/play/pause dispatch works (same path as headset buttons). Test real headphones/car |
| 6 | 30–60 min locked-screen test | Session Test card: persisted log, a heartbeat per minute of playback, "Export report" shares the full log. Test not yet run |
| 7 | Apple/Google subscription-policy report | Drafted as a shared doc; RSM to answer the open questions |
| 8 | One correction round | Process |
| 9 | Option to discontinue | Process |

### Running the 30–60 minute test

1. Tap **New session** on the Session Test card.
2. Play a track, lock the phone, and leave it for 30–60 minutes.
3. Unlock: **Min. played** should be close to the minutes elapsed, with track changes every 5–7 minutes.
4. Tap **Export report** and send the text to RSM with the demo. Gaps between heartbeats show exactly when audio stopped.

## Base44 — what we know

- App: "Revive Soul Music (Copy)", id `6ad7ea3dd5e95bc20349a440`
- REST base: `https://base44.app/api/apps/<appId>/entities/<Entity>`, Bearer token from member login
- Entities seen in the web app's requests: `Track`, `Album`, `Genre`, `Playlist`, `ListeningHistory`, `Like`, `Comment`, `UserPoints`, `Notification`, `User`
- Member sign-in: Google, Facebook, email/password
- Email login (from the public `@base44/sdk` 0.8.57): `POST /api/apps/<appId>/auth/login` with `{email, password}` returns `{access_token, user}`. If the app requires a Cloudflare Turnstile captcha, native login fails and the Base44 screen says so
- The app is private: entity reads without a member token return 403 `auth_required`
- Track fields (confirmed 2026-10-27 on 15 RSM tracks): `title`, `artist_name`, `album_title`, `album_id`, `artist_id`, `genre_id`, `cover_image_url` (public URL), `duration_seconds` (30 on full songs, so not used), `is_premium_only`, `is_sample`, `track_number`, `play_count`, `audio_uri` / `preview_uri` (private file paths; `audio_url` / `preview_url` are empty)
- Private audio plays through a signed URL: `POST /api/apps/<appId>/integration-endpoints/Core/CreateFileSignedUrl` with `{file_uri, expires_in}` (max 3600 s) returns `{signed_url}` on `media.base44.com` (audio/mpeg, supports range requests). The app signs each track at load, re-signs the next two tracks when they are over 45 minutes old, and re-signs the current track once after a playback error
- Still unknown: where premium status lives on the member, whether standard members can get signed URLs for `is_premium_only` tracks, and whether `CreateFileSignedUrl` uses RSM's Base44 integration credits

To test live data: tap **Base44** in the app header, sign in with an RSM email test account, then **Load Base44 tracks**. After that the login is saved, and every launch loads the RSM catalogue (falling back to the samples if Base44 fails). If the records have unrecognised fields, the screen lists them; fix the mapping in `toRsmTrack()`. To make Base44 the default at launch, set `DATA_SOURCE = 'base44'` in `src/config.ts`.

The prototype keeps the Base44 token in AsyncStorage; Milestone 4 moves it to the Keychain / Keystore.
