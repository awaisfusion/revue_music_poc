// App-side track shape. Every data source (sample, Base44) maps into this,
// so the player and UI never depend on raw Base44 field names.
export type RsmTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  audioUrl: string;
  artworkUrl?: string;
  durationSec?: number;
  isPremium?: boolean;
};

export interface TrackSource {
  name: string;
  getQueue(): Promise<RsmTrack[]>;
}
