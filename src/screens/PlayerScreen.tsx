import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, { useActiveTrack, useIsPlaying } from 'react-native-track-player';
import { Artwork } from '../components/Artwork';
import { Gradient } from '../components/Gradient';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { skip } from '../player/controls';
import { colors, radius } from '../theme';

const ART_SIZE = Math.min(Dimensions.get('window').width - 64, 360);

export function PlayerScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const track = useActiveTrack();
  const { playing, bufferingDuringPlay } = useIsPlaying();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={onClose}>
            <Icon name="chevronDown" size={28} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerText}>Now Playing</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.artWrap}>
          <Artwork uri={track?.artwork} size={ART_SIZE} radius={radius.xl} />
        </View>

        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>{track?.title ?? 'Nothing playing'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track?.artist ?? ''}</Text>
          {track?.album ? <Text style={styles.album} numberOfLines={1}>{track.album}</Text> : null}
        </View>

        <ProgressBar />

        <View style={styles.controls}>
          <Pressable hitSlop={12} onPress={() => skip('previous')}>
            <Icon name="prev" size={32} filled />
          </Pressable>
          <Pressable onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}>
            <Gradient style={styles.playBtn} radius={40}>
              <Icon name={playing ? 'pause' : 'play'} size={32} color={colors.onPrimary} filled />
            </Gradient>
          </Pressable>
          <Pressable hitSlop={12} onPress={() => skip('next')}>
            <Icon name="next" size={32} filled />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Icon name="repeat" size={16} color={colors.primary} />
          <Text style={styles.footerText}>{bufferingDuringPlay ? 'Buffering…' : 'Queue repeats for long-session testing'}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  artWrap: {
    alignItems: 'center',
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
  },
  meta: { marginTop: 32, marginBottom: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  artist: { color: colors.primaryLight, fontSize: 16, fontWeight: '500', marginTop: 6 },
  album: { color: colors.textFaint, fontSize: 14, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 24 },
  playBtn: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto' },
  footerText: { color: colors.textFaint, fontSize: 12 },
});
