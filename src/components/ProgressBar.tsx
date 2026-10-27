import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { colors } from '../theme';
import { GradientFill } from './GradientFill';

export const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function ProgressBar() {
  const { position, duration } = useProgress(500);
  const [width, setWidth] = useState(0);
  const ratio = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View>
      <Pressable
        hitSlop={12}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        onPress={e => {
          if (width > 0 && duration > 0) {
            const x = Math.max(0, Math.min(e.nativeEvent.locationX / width, 1));
            TrackPlayer.seekTo(x * duration);
          }
        }}
        style={styles.track}
      >
        <GradientFill ratio={ratio} height={6} radius={3} />
      </Pressable>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <Text style={styles.time}>{duration > 0 ? formatTime(duration) : '--:--'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.elevated, justifyContent: 'center' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
