import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient } from '../components/Gradient';
import { Icon } from '../components/Icon';
import { BASE44 } from '../config';
import {
  base44Source,
  fetchBase44Tracks,
  restoreBase44Session,
  signInBase44,
  signOutBase44,
  type Base44User,
} from '../data/base44Source';
import { sampleSource } from '../data/sampleSource';
import { replaceQueue } from '../player/setup';
import { sessionLog } from '../player/sessionLog';
import { colors, radius } from '../theme';

type Props = { visible: boolean; onClose: () => void; onQueueChanged: (sourceName: string) => void };

// Prototype-only test screen: sign in with an RSM/Base44 email account and pull
// real Track records into the player. Google/Facebook sign-in is Milestone 4.
export function Base44Screen({ visible, onClose, onQueueChanged }: Props) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<Base44User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreBase44Session()
      .then(setUser)
      .finally(() => setChecking(false));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const u = await signInBase44(email.trim(), password);
      setPassword('');
      setUser(u);
      sessionLog.add('app', `Signed in to Base44 (${u._app_role ?? u.role ?? 'member'})`);
    });

  const loadTracks = () =>
    run(async () => {
      const result = await fetchBase44Tracks();
      if (result.records === 0) {
        setMessage('Base44 returned 0 Track records. RSM needs to add songs to this app.');
        return;
      }
      if (result.tracks.length === 0) {
        setMessage(`Found ${result.records} records, but none had a recognised audio field. Fields: ${result.firstRecordKeys.join(', ')}`);
        return;
      }
      await replaceQueue(result.tracks, base44Source.name);
      sessionLog.add('app', `Loaded ${result.tracks.length} Base44 tracks`);
      onQueueChanged(base44Source.name);
      setMessage(`Loaded ${result.tracks.length} of ${result.records} tracks into the player.`);
    });

  const useSamples = () =>
    run(async () => {
      await replaceQueue(await sampleSource.getQueue(), sampleSource.name);
      onQueueChanged(sampleSource.name);
      setMessage('Switched back to the sample tracks.');
    });

  const signOut = () =>
    run(async () => {
      await signOutBase44();
      setUser(null);
    });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Base44 connection</Text>
          <Pressable hitSlop={12} onPress={onClose}>
            <Icon name="chevronDown" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.sub}>App {BASE44.appId} · test login for the prototype</Text>

        {checking ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : user ? (
          <View style={styles.card}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.value}>{user.email ?? user.full_name ?? user.id}</Text>
            <Text style={styles.meta}>Role: {user._app_role ?? user.role ?? 'member'}</Text>
            <PrimaryButton label="Load Base44 tracks" onPress={loadTracks} disabled={busy} />
            <SecondaryButton label="Use sample tracks" onPress={useSamples} disabled={busy} />
            <SecondaryButton label="Sign out" onPress={signOut} disabled={busy} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="member@example.com"
              placeholderTextColor={colors.textFaint}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={signIn}
            />
            <PrimaryButton label="Sign in" onPress={signIn} disabled={busy || !email || !password} />
            <Text style={styles.meta}>Email accounts only for now. Google and Facebook sign-in arrive with the full login in Milestone 4.</Text>
          </View>
        )}

        {busy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        {message && <Text style={styles.message}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </Modal>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.btnWrap}>
      <Gradient style={[styles.btn, disabled && styles.disabled]} radius={radius.sm}>
        <Text style={styles.btnText}>{label}</Text>
      </Gradient>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btnWrap, styles.btnSecondary, disabled && styles.disabled]}>
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.textFaint, fontSize: 12, marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 8 },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 10 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  btnWrap: { marginTop: 12 },
  btn: { paddingVertical: 12, alignItems: 'center' },
  btnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
  btnSecondary: { paddingVertical: 11, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder },
  btnSecondaryText: { color: colors.textSecondary, fontWeight: '500', fontSize: 15 },
  disabled: { opacity: 0.4 },
  spinner: { marginTop: 20 },
  message: { color: colors.primaryLight, marginTop: 16, fontSize: 14 },
  error: { color: colors.danger, marginTop: 16, fontSize: 14 },
});
