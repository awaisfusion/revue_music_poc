/**
 * @format
 */

import { formatDuration, sessionLog } from '../src/player/sessionLog';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// sessionLog debounces its storage writes with a timer.
jest.useFakeTimers();

beforeEach(() => sessionLog.reset());

test('counts track changes and heartbeat minutes', () => {
  sessionLog.add('state', 'Queue loaded at Track 1');
  sessionLog.add('track', 'Now playing: Track 2');
  sessionLog.add('heartbeat', 'Playing 1:00 into Track 2');
  sessionLog.add('heartbeat', 'Playing 2:00 into Track 2');
  sessionLog.add('track', 'Now playing: Track 3');
  expect(sessionLog.trackChanges()).toBe(2);
  expect(sessionLog.minutesPlayed()).toBe(2);
});

test('report lists events oldest first with totals', () => {
  sessionLog.add('track', 'Now playing: A');
  sessionLog.add('remote', 'Remote: pause');
  const report = sessionLog.report();
  expect(report).toContain('Track changes: 1');
  expect(report).toContain('Remote commands: 1');
  expect(report.indexOf('Now playing: A')).toBeLessThan(report.indexOf('Remote: pause'));
});

test('formats durations', () => {
  expect(formatDuration(59)).toBe('0:59');
  expect(formatDuration(3725)).toBe('1:02:05');
});
