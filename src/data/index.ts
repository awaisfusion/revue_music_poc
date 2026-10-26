import { DATA_SOURCE } from '../config';
import { base44Source } from './base44Source';
import { sampleSource } from './sampleSource';

export const trackSource = DATA_SOURCE === 'base44' ? base44Source : sampleSource;
export type { RsmTrack } from './types';
