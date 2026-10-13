import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { historyService, producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { AGRHistoryItem, ProductionHistory, SocialHistoryItem } from '../../src/types/api';
import { formatProducteurName } from '../../src/utils/format';

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Chaîne décimale → nombre (null/undefined/vide → 0) */
function toNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(n) ? 0 : n;
}

/** Montant en Ariary compact (parité web : fr-FR) */
function formatAr(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} Ar`;
}

/** Production agrégée par année */
interface ProdByYear {
  annee: number;
  kg: number;
  revenu: number;
  cultures: string;
}

function aggregateProductions(rows: ProductionHistory[]): ProdByYear[] {
  const map = new Map<number, ProdByYear>();
  for (const r of rows) {
    const e = map.get(r.annee) ?? { annee: r.annee, kg: 0, revenu: 0, cultures: '' };
    e.kg += toNum(r.quantite_kg);
    e.revenu += toNum(r.revenu_total ?? r.revenu_calcule);
    if (r.culture && !e.cultures.split(', ').includes(r.culture)) {
      e.cultures = e.cultures ? `${e.cultures}, ${r.culture}` : r.culture;
    }
    map.set(r.annee, e);
  }
  return [...map.values()].sort((a, b) => b.annee - a.annee);
}

/** Revenus AGR agrégés par année */
function aggregateAgr(rows: AGRHistoryItem[]): ProdByYear[] {
  const map = new Map<number, ProdByYear>();
  for (const r of rows) {
    const e = map.get(r.annee) ?? { annee: r.annee, kg: 0, revenu: 0, cultures: '' };
    e.revenu += toNum(r.revenu_annuel ?? r.revenu_calcule);
    const label = r.type_agr_display ?? r.type_agr;
    if (label && !e.cultures.split(', ').includes(label)) {
      e.cultures = e.cultures ? `${e.cultures}, ${label}` : label;
    }
    map.set(r.annee, e);
  }
  return [...map.values()].sort((a, b) => b.annee - a.annee);
}

/** Affichage lisible d'une valeur sociale (booléen → Oui/Non, sinon numérique/texte) */
function socialValue(item: SocialHistoryItem): string {
  if (item.valeur_booleen !== null && item.valeur_booleen !== undefined) {
    return item.valeur_booleen ? 'Oui' : 'Non';
  }
  if (item.valeur_numerique !== null && item.valeur_numerique !== undefined) {
    return String(item.valeur_numerique);
  }
  if (item.valeur_texte) return item.valeur_texte;
  return '—';
}

export default function ProducteurEvolution() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [producteurNom, setProducteurNom] = useState('');
  const [producteurCode, setProducteurCode] = useState('');
  const [productions, setProductions] = useState<ProdByYear[]>([]);
  const [agrs, setAgrs] = useState<ProdByYear[]>([]);
  const [socials, setSocials] = useState<SocialHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    // 3 sources indépendantes : une panne d'une source ne bloque pas les autres
    const [prod, agr, soc] = await Promise.allSettled([
      historyService.productionsByProducteur(id),
      historyService.agrByProducteur(id),
      historyService.socialByProducteur(id),
    ]);
    if (prod.status === 'fulfilled') {
      setProductions(aggregateProductions(rowsOf<ProductionHistory>(prod.value.data)));
    }
    if (agr.status === 'fulfilled') setAgrs(aggregateAgr(agr.value.data));
    if (soc.status === 'fulfilled') setSocials(soc.value.data);
    if (prod.status === 'rejected' && agr.status === 'rejected' && soc.status === 'rejected') {
      setError('Impossible de charger l’historique de ce producteur.');
    }
    try {
      const p = await producteurService.detail(id);
      setProducteurNom(formatProducteurName(p.data));
      setProducteurCode(p.data.code);
    } catch {
      // nom facultatif
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Évolution',
            headerStyle: { backgroundColor: colors.dark },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      </View>
    );
  }

  const maxProdKg = Math.max(1, ...productions.map((p) => p.kg));
  const maxAgr = Math.max(1, ...agrs.map((a) => a.revenu));

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Évolution annuelle',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(producteurNom || producteurCode) && (
          <View style={styles.identityCard}>
            {producteurCode ? <Text style={styles.identityCode}>{producteurCode}</Text> : null}
            {producteurNom ? <Text style={styles.identityName}>{producteurNom}</Text> : null}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Production par année */}
        <Text style={styles.sectionTitle}>Production (kg)</Text>
        {productions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun historique de production pour ce producteur.</Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              {productions.map((p) => (
                <View key={p.annee} style={styles.barRow}>
                  <Text style={styles.barLabel}>{p.annee}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(3, (p.kg / maxProdKg) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{Math.round(p.kg)} kg</Text>
                </View>
              ))}
            </View>
            <View style={styles.tableCard}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.cellYear, styles.headText]}>Année</Text>
                <Text style={[styles.cellCult, styles.headText]}>Cultures</Text>
                <Text style={[styles.cellNum, styles.headText]}>Revenu</Text>
              </View>
              {productions.map((p) => (
                <View key={p.annee} style={styles.tableRow}>
                  <Text style={styles.cellYear}>{p.annee}</Text>
                  <Text style={styles.cellCult}>{p.cultures || '—'}</Text>
                  <Text style={styles.cellNum}>{p.revenu > 0 ? formatAr(p.revenu) : '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* AGR par année */}
        <Text style={styles.sectionTitle}>Revenus AGR</Text>
        {agrs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun historique AGR pour ce producteur.</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            {agrs.map((a) => (
              <View key={a.annee} style={styles.barRow}>
                <Text style={styles.barLabel}>{a.annee}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      styles.barFillAlt,
                      { width: `${Math.max(3, (a.revenu / maxAgr) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{formatAr(a.revenu)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Indicateurs sociaux par année */}
        <Text style={styles.sectionTitle}>Indicateurs sociaux</Text>
        {socials.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun indicateur social pour ce producteur.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {socials.map((s) => (
              <View key={s.id} style={styles.tableRow}>
                <Text style={styles.cellYear}>{s.annee}</Text>
                <Text style={styles.cellCult}>{s.type_indicateur_display ?? s.type_indicateur}</Text>
                <Text style={styles.cellNum}>{socialValue(s)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl * 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  identityCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  identityCode: { fontSize: 13, fontWeight: '700', color: colors.primary },
  identityName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 44, fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: colors.background,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  barFillAlt: { backgroundColor: '#16A34A' },
  barValue: { width: 84, fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'right' },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHead: { borderBottomWidth: 1, borderBottomColor: colors.border },
  headText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  cellYear: { width: 56, fontSize: 13, fontWeight: '700', color: colors.text },
  cellCult: { flex: 1, fontSize: 13, color: colors.text },
  cellNum: { width: 96, fontSize: 13, color: colors.text, textAlign: 'right', fontWeight: '600' },
});

