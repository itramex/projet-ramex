import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { Cooperative } from '../../src/types/api';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.textSecondary} />
      <View style={styles.infoMain}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CooperativeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coop, setCoop] = useState<Cooperative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await cooperativeService.detail(id);
      setCoop(response.data);
    } catch {
      setError('Impossible de charger cette coopérative.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: coop?.sigle || coop?.nom || 'Coopérative',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : error || !coop ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || 'Coopérative introuvable.'}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* En-tête */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(coop.sigle || coop.nom || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{coop.nom}</Text>
            <View style={styles.badgesRow}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{coop.code}</Text>
              </View>
              <View style={[styles.badge, coop.active ? styles.badgeOk : styles.badgeOff]}>
                <Text style={styles.badgeText}>{coop.active ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            {coop.sigle ? <Text style={styles.sigle}>Sigle : {coop.sigle}</Text> : null}
          </View>

          {/* Statistiques */}
          <View style={styles.statsRow}>
            <StatCard icon="people" label="Producteurs" value={String(coop.nombre_producteurs ?? 0)} />
            <StatCard icon="home" label="Membres" value={String(coop.nombre_membres ?? 0)} />
            <StatCard icon="resize" label="Superficie (Ha)" value={String(coop.superficie_totale_ha ?? 0)} />
          </View>
          {(coop.nombre_hommes ?? 0) + (coop.nombre_femmes ?? 0) > 0 ? (
            <View style={styles.genderRow}>
              <Text style={styles.genderText}>
                Hommes : {coop.nombre_hommes ?? 0} · Femmes : {coop.nombre_femmes ?? 0}
              </Text>
            </View>
          ) : null}

          {/* Identification */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identification</Text>
            <InfoRow icon="location" label="Région" value={coop.region_ref_nom || coop.region} />
            <InfoRow icon="map" label="District" value={coop.district_ref_nom || coop.district} />
            <InfoRow icon="navigate" label="Commune" value={coop.commune_ref_nom || coop.commune} />
            <InfoRow icon="git-branch" label="Fokontany" value={coop.fokontany_ref_nom} />
            <InfoRow icon="home" label="Village" value={coop.village_ref_nom || coop.village} />
            <InfoRow icon="business" label="Agence" value={coop.agence_nom} />
            <InfoRow icon="calendar" label="Année de création" value={coop.annee_creation} />
            <InfoRow icon="call" label="Téléphone" value={coop.telephone} />
            <InfoRow icon="mail" label="Email" value={coop.email} />
          </View>

          {/* Villages couverts */}
          {coop.villages && coop.villages.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Villages couverts ({coop.villages.length})</Text>
              <View style={styles.chipsWrap}>
                {coop.villages.map((v) => (
                  <View key={v} style={styles.chip}>
                    <Text style={styles.chipText}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl },
  errorBox: { alignItems: 'center', padding: spacing.xl },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 14,
  },
  retryText: { color: colors.card, fontWeight: '600' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: colors.primary },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgesRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  codeBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  codeBadgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  badge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeOk: { backgroundColor: colors.success + '22' },
  badgeOff: { backgroundColor: colors.border },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  sigle: { marginTop: spacing.xs, fontSize: 13, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  genderRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
  },
  genderText: { fontSize: 13, color: colors.textSecondary },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  infoMain: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.textSecondary },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});

