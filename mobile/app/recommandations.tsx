import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { recommendationService } from '../src/services/api';
import type {
  Recommendation,
  RecommendationStats,
  StatutRecommendation,
} from '../src/types/api';
import { STATUTS_RECOMMANDATION } from '../src/types/api';
import { colors, spacing } from '../src/constants/theme';

/** M-21 — Recommandations agricoles : consultation seule (liste + statistiques) */

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Libellé d'un statut (fallback : valeur brute) */
function statutLabel(value: string): string {
  const found = STATUTS_RECOMMANDATION.find((s) => s.value === value);
  return found ? found.label : value;
}

/** Couleur du badge selon le statut */
function statutColor(statut: string): string {
  if (statut === 'executed') return colors.success;
  if (statut === 'rejected') return colors.danger;
  return colors.primary;
}

/** Date lisible depuis ISO */
function formatDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

export default function RecommandationsScreen() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statutFiltre, setStatutFiltre] = useState<StatutRecommendation | 'tous'>('tous');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // 2 sources indépendantes : une panne n'efface pas l'autre.
    const [list, st] = await Promise.allSettled([
      recommendationService.list(),
      recommendationService.stats(),
    ]);
    if (list.status === 'fulfilled') setRecommendations(rowsOf(list.value.data));
    if (st.status === 'fulfilled') setStats(st.value.data);
    if (list.status === 'rejected' && st.status === 'rejected') {
      setError('Recommandations indisponibles. Vérifiez votre connexion au serveur.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();

  const filtrees = useMemo(() => {
    return recommendations.filter((r) => {
      if (statutFiltre !== 'tous' && r.statut !== statutFiltre) return false;
      if (!term) return true;
      return (
        r.type_activite.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        (r.producteur_info?.nom_complet ?? '').toLowerCase().includes(term)
      );
    });
  }, [recommendations, statutFiltre, term]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Stack.Screen options={{ title: 'Recommandations' }} />

      <Text style={styles.subtitle}>
        Conseils agricoles générés par le moteur d'IA à partir des pratiques des producteurs.
      </Text>

      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_recommendations}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.pending_count}
            </Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.executed_count}
            </Text>
            <Text style={styles.statLabel}>Exécutées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              {stats.rejected_count}
            </Text>
            <Text style={styles.statLabel}>Rejetées</Text>
          </View>
        </View>
      ) : null}

      <TextInput
        style={styles.search}
        placeholder="Rechercher (type, producteur…)"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      <View style={styles.segments}>
        <Text
          onPress={() => setStatutFiltre('tous')}
          style={[styles.segment, statutFiltre === 'tous' && styles.segmentActive]}
        >
          Toutes
        </Text>
        {STATUTS_RECOMMANDATION.map((s) => (
          <Text
            key={s.value}
            onPress={() => setStatutFiltre(s.value)}
            style={[styles.segment, statutFiltre === s.value && styles.segmentActive]}
          >
            {s.label}
          </Text>
        ))}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && recommendations.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : filtrees.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Aucune recommandation. Elles apparaissent après génération par le moteur d'IA (depuis
            la version web).
          </Text>
        </View>
      ) : (
        filtrees.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardType}>{r.type_activite}</Text>
              <View style={[styles.badge, { backgroundColor: statutColor(r.statut) + '22' }]}>
                <Text style={[styles.badgeText, { color: statutColor(r.statut) }]}>
                  {r.status_display ?? statutLabel(r.statut)}
                </Text>
              </View>
            </View>

            <Text style={styles.cardMeta}>
              {r.producteur_info?.nom_complet
                ? `${r.producteur_info.nom_complet}${r.producteur_info.code ? ` (${r.producteur_info.code})` : ''} · `
                : ''}
              {formatDate(r.date_generation) ? `générée le ${formatDate(r.date_generation)} · ` : ''}
              score {(r.score_display ?? Math.round(r.score_pertinence * 10))}/10
            </Text>

            <Text style={styles.cardDesc}>{r.description}</Text>

            {r.explication ? <Text style={styles.cardExplication}>{r.explication}</Text> : null}

            {Array.isArray(r.sources) && r.sources.length > 0 ? (
              <Text style={styles.cardSources}>
                Inspirée de {r.sources.length} producteur(s) similaire(s)
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  segment: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  segmentActive: { backgroundColor: colors.dark, borderColor: colors.dark, color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  badge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  cardDesc: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 19 },
  cardExplication: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  cardSources: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.xl,
  },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  errorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.textSecondary, fontSize: 13 },
});
