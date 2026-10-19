import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { flushSyncQueue } from '../src/services/api';
import { offlineStore, QueuedWrite } from '../src/services/offlineStore';
import { connectivityLabel, syncStatus, SyncSnapshot } from '../src/services/syncStatus';
import { colors, spacing } from '../src/constants/theme';

/**
 * M-23b — Écran « Synchronisation » (collecte terrain) :
 * statut de connexion, file d'écriture en attente, purge manuelle,
 * dernier succès réseau par endpoint.
 */

/** Endpoints dont on affiche la date de dernier succès. */
const ENDPOINTS: Array<{ label: string; path: string }> = [
  { label: 'Bons de collecte (FABC)', path: '/tracabilite/bons-collecte/' },
  { label: 'Fiches de collecte (FC)', path: '/tracabilite/fiches-collecte/' },
  { label: 'Campagnes', path: '/tracabilite/campagnes/' },
  { label: 'Producteurs', path: '/producteurs/' },
  { label: 'Parcelles', path: '/parcelles/' },
  { label: 'Coopératives', path: '/cooperatives/' },
];

/** Date ISO → « jj/mm/aaaa hh:mm » */
function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR');
}

/** Aperçu compact du corps JSON d'une mutation en file. */
function bodyPreview(body: string | null): string {
  if (!body) return '';
  try {
    const obj = JSON.parse(body) as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 4).join(', ');
    return keys ? `{ ${keys}… }` : '';
  } catch {
    return body.slice(0, 60);
  }
}

export default function SyncScreen() {
  const [snap, setSnap] = useState<SyncSnapshot>(syncStatus.get());
  const [queue, setQueue] = useState<QueuedWrite[]>([]);
  const [lastSyncs, setLastSyncs] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);

  // Abonnement temps réel (mis à jour par les interceptors de api.ts).
  useEffect(() => syncStatus.subscribe(setSnap), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, dates] = await Promise.allSettled([
      offlineStore.queueList(),
      Promise.all(ENDPOINTS.map((e) => offlineStore.lastSyncGet(e.path))),
    ]);
    if (q.status === 'fulfilled') {
      setQueue(q.value);
      syncStatus.setPending(q.value.length);
    }
    if (dates.status === 'fulfilled') {
      const map: Record<string, string | null> = {};
      ENDPOINTS.forEach((e, i) => {
        map[e.path] = dates.value[i];
      });
      setLastSyncs(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFlush = async () => {
    if (queue.length === 0) return;
    setFlushing(true);
    try {
      await flushSyncQueue();
      const rest = await offlineStore.queueList();
      setQueue(rest);
      syncStatus.setPending(rest.length);
      if (rest.length === 0) {
        Alert.alert('Synchronisation', 'Toutes les opérations en attente ont été envoyées.');
      } else {
        Alert.alert(
          'Synchronisation partielle',
          `${rest.length} opération(s) restent en attente : vérifiez la connexion puis réessayez.`
        );
      }
    } finally {
      setFlushing(false);
    }
  };

  const online = snap.connectivity === 'online';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Stack.Screen options={{ title: 'Synchronisation' }} />

      {/* --- Bandeau statut --- */}
      <View style={[styles.statusCard, { borderColor: online ? colors.success : colors.danger }]}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  snap.connectivity === 'unknown' ? colors.textSecondary : online ? colors.success : colors.danger,
              },
            ]}
          />
          <Text style={styles.statusText}>{connectivityLabel(snap.connectivity)}</Text>
        </View>
        <Text style={styles.statusSub}>
          {snap.pending === 0
            ? "Aucune opération en attente : tout est envoyé au serveur."
            : `${snap.pending} opération(s) en attente d'envoi (file locale SQLite).`}
        </Text>
        {snap.pending > 0 ? (
          <Pressable
            style={({ pressed }) => [
              styles.flushButton,
              (pressed || flushing) && { opacity: 0.7 },
              flushing && { opacity: 0.6 },
            ]}
            onPress={handleFlush}
            disabled={flushing}
          >
            {flushing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.flushText}>Synchroniser maintenant</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {/* --- File d'attente --- */}
      <Text style={styles.sectionTitle}>File d'attente ({queue.length})</Text>
      {queue.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Rien à synchroniser. Les saisies hors ligne apparaîtront ici automatiquement.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.queueHeader}>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>{item.method}</Text>
              </View>
              <Text style={styles.queuePath}>{item.path}</Text>
            </View>
            {bodyPreview(item.body) ? (
              <Text style={styles.queueBody}>{bodyPreview(item.body)}</Text>
            ) : null}
            <Text style={styles.queueDate}>enfilee le {formatDate(item.createdAt)}</Text>
          </View>
        ))
      )}

      {/* --- Dernier envoi par endpoint --- */}
      <Text style={styles.sectionTitle}>Dernière réception de données</Text>
      {ENDPOINTS.map((e) => (
        <View key={e.path} style={styles.syncRow}>
          <Text style={styles.syncLabel}>{e.label}</Text>
          <Text style={styles.syncDate}>
            {lastSyncs[e.path] ? formatDate(lastSyncs[e.path]) : 'jamais'}
          </Text>
        </View>
      ))}

      <Text style={styles.hint}>
        Les données affichées peuvent provenir du cache local. Les écritures sont conservées sur
        l'appareil (SQLite) et envoyées automatiquement au premier retour du réseau.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  statusCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '800', color: colors.text },
  statusSub: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
  flushButton: {
    backgroundColor: colors.dark,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  flushText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  methodBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodText: { fontSize: 11, fontWeight: '800', color: colors.text },
  queuePath: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  queueBody: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  queueDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  syncLabel: { fontSize: 13, color: colors.text, flexShrink: 1 },
  syncDate: { fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
