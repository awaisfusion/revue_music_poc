import { Pressable, StyleSheet, Text, View } from 'react-native';
import TrackPlayer, { useActiveTrack, useIsPlaying, useProgress } from 'react-native-track-player';
import { skip } from '../player/controls';
import { colors, radius } from '../theme';
import { Artwork } from './Artwork';
import { GradientFill } from './GradientFill';
import { Icon } from './Icon';

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress(1000);
  if (!track) return null;
  const ratio = duration > 0 ? position / duration : 0;

  return (
    <Pressable onPress={onOpen} style={styles.wrap}>
      <View style={styles.row}>
        <Artwork uri={track.artwork} size={44} radius={radius.sm} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        </View>
        <Pressable hitSlop={10} onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())} style={styles.btn}>
          <Icon name={playing ? 'pause' : 'play'} size={22} filled />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => skip('next')} style={styles.btn}>
          <Icon name="next" size={22} filled />
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <GradientFill ratio={ratio} height={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
  meta: { flex: 1 },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  artist: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  btn: { padding: 6 },
  progressTrack: { height: 2, backgroundColor: colors.elevated },
});
