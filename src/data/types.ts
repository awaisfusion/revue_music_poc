// App-side track shape. Every data source (sample, Base44) maps into this,
// so the player and UI never depend on raw Base44 field names.
export type RsmTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  // Playable URL. For Base44 private files this is a signed URL that expires.
  audioUrl: string;
  // Base44 private file path; set when audioUrl is a signed URL that needs refreshing.
  audioUri?: string;
  // When audioUrl was signed (ms since epoch).
  signedAt?: number;
  artworkUrl?: string;
  durationSec?: number;
  isPremium?: boolean;
};

export interface TrackSource {
  name: string;
  getQueue(): Promise<RsmTrack[]>;
}
