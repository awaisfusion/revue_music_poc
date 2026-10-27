import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, { useActiveTrack, useIsPlaying, type Track } from 'react-native-track-player';
import { Artwork } from '../components/Artwork';
import { Gradient } from '../components/Gradient';
import { Icon } from '../components/Icon';
import { MiniPlayer } from '../components/MiniPlayer';
import { getQueueSourceName, setupPlayer } from '../player/setup';
import { formatDuration, sessionLog } from '../player/sessionLog';
import { colors, radius } from '../theme';
import { Base44Screen } from './Base44Screen';
import { PlayerScreen } from './PlayerScreen';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [base44Open, setBase44Open] = useState(false);
  const [sourceName, setSourceName] = useState(getQueueSourceName());
  const active = useActiveTrack();

  const refreshQueue = async (name: string) => {
    setSourceName(name);
    setQueue(await TrackPlayer.getQueue());
  };

  useEffect(() => {
    setupPlayer()
      .then(() => TrackPlayer.getQueue())
      .then(q => {
        setQueue(q);
        setSourceName(getQueueSourceName());
      })
      .catch(e => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' || s === 'background') sessionLog.add('app', s === 'active' ? 'App opened' : 'App in background');
    });
    return () => sub.remove();
  }, []);

  const playAt = async (index: number) => {
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={queue ?? []}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <>
            <Header onBase44={() => setBase44Open(true)} />
            <SessionCard />
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Test Queue</Text>
              <Text style={styles.sectionMeta}>{sourceName}</Text>
            </View>
            {!queue && !error && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
            {error && <Text style={styles.error}>Could not load tracks: {error}</Text>}
          </>
        }
        renderItem={({ item, index }) => {
          const isActive = active?.id === item.id;
          return (
            <Pressable onPress={() => playAt(index)} style={[styles.row, isActive && styles.rowActive]}>
              <Artwork uri={item.artwork as string | undefined} size={48} radius={radius.sm} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, isActive && { color: colors.primaryLight }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowArtist} numberOfLines={1}>{item.artist}</Text>
              </View>
              {isActive && <Icon name="music" size={18} color={colors.primary} />}
            </Pressable>
          );
        }}
      />
      <View style={[styles.miniWrap, { bottom: insets.bottom + 8 }]}>
        <MiniPlayer onOpen={() => setPlayerOpen(true)} />
      </View>
      <PlayerScreen visible={playerOpen} onClose={() => setPlayerOpen(false)} />
      <Base44Screen visible={base44Open} onClose={() => setBase44Open(false)} onQueueChanged={refreshQueue} />
    </View>
  );
}

function Header({ onBase44 }: { onBase44: () => void }) {
  return (
    <View style={styles.header}>
      <Gradient style={styles.logo} radius={12}>
        <Icon name="music" size={22} color={colors.text} />
      </Gradient>
      <View style={styles.brandWrap}>
        <Text style={styles.brand}>Revive Soul</Text>
        <Text style={styles.pillText}>Prototype · M1</Text>
      </View>
      <Pressable onPress={onBase44} style={styles.pill} hitSlop={8}>
        <Text style={styles.pillText}>Base44</Text>
      </Pressable>
    </View>
  );
}

function useSessionLog() {
  return useSyncExternalStore(sessionLog.subscribe, () => sessionLog.entries().length);
}

function exportReport() {
  Share.share({ title: 'RSM background-audio test report', message: sessionLog.report() });
}

function confirmReset() {
  Alert.alert('Start a new test session?', 'This clears the current log on this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear log', style: 'destructive', onPress: () => sessionLog.reset() },
  ]);
}

function SessionCard() {
  useSessionLog();
  const { playing } = useIsPlaying();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = sessionLog.sessionStart();
  const elapsed = start ? (now - start) / 1000 : 0;
  const recent = sessionLog.entries().filter(e => e.kind !== 'heartbeat').slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name="clock" size={18} color={colors.primary} />
        <Text style={styles.cardTitle}>Session Test</Text>
        <View style={[styles.dot, { backgroundColor: playing ? colors.success : colors.textFaint }]} />
      </View>
      <View style={styles.stats}>
        <Stat label="Session" value={formatDuration(elapsed)} />
        <Stat label="Min. played" value={String(sessionLog.minutesPlayed())} />
        <Stat label="Track changes" value={String(sessionLog.trackChanges())} />
      </View>
      {recent.length === 0 ? (
        <Text style={styles.logEmpty}>Press play, lock the phone, and check back here.</Text>
      ) : (
        recent.map(e => (
          <Text key={`${e.at}-${e.text}`} style={[styles.logLine, e.kind === 'error' && { color: colors.danger }]} numberOfLines={1}>
            {new Date(e.at).toLocaleTimeString()}  {e.text}
          </Text>
        ))
      )}
      <View style={styles.cardActions}>
        <Pressable onPress={exportReport} disabled={!start}>
          <Gradient style={[styles.actionBtn, !start && styles.disabled]} radius={radius.sm}>
            <Text style={styles.actionPrimaryText}>Export report</Text>
          </Gradient>
        </Pressable>
        <Pressable onPress={confirmReset} style={styles.actionSecondary}>
          <Text style={styles.actionSecondaryText}>New session</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16 },
  logo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brandWrap: { flex: 1 },
  brand: { color: colors.text, fontSize: 22, fontWeight: '700' },
  pill: { backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: colors.primaryLight, fontSize: 12, fontWeight: '600' },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stats: { flexDirection: 'row', marginTop: 14, marginBottom: 10 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logEmpty: { color: colors.textFaint, fontSize: 13 },
  logLine: { color: colors.textMuted, fontSize: 12, marginTop: 3, fontVariant: ['tabular-nums'] },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 9 },
  actionPrimaryText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
  actionSecondary: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder },
  actionSecondaryText: { color: colors.textSecondary, fontWeight: '500', fontSize: 14 },
  disabled: { opacity: 0.4 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  sectionMeta: { color: colors.textFaint, fontSize: 12 },
  error: { color: colors.danger, paddingHorizontal: 16, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  rowActive: { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowArtist: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  miniWrap: { position: 'absolute', left: 0, right: 0 },
});
