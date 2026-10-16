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
import { Ionicons } from '@expo/vector-icons';
import { geographieService } from '../src/services/api';
import type { DistrictGeo, CommuneGeo, VillageGeo, AgenceGeo } from '../src/types/api';
import { colors, spacing } from '../src/constants/theme';

/** M-18 — Géographie / Villages de référence : consultation seule du référentiel */
type Segment = 'districts' | 'communes' | 'villages' | 'agences';

const SEGMENTS: Array<{ key: Segment; label: string }> = [
  { key: 'districts', label: 'Districts' },
  { key: 'communes', label: 'Communes' },
  { key: 'villages', label: 'Villages' },
  { key: 'agences', label: 'Agences' },
];

/** Ligne d'affichage uniforme pour les 4 listes */
interface GeoRow {
  id: number;
  nom: string;
  sous: string;
  extra: string | null;
  actif: boolean;
}

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function GeographieScreen() {
  const [segment, setSegment] = useState<Segment>('districts');
  const [districts, setDistricts] = useState<DistrictGeo[]>([]);
  const [communes, setCommunes] = useState<CommuneGeo[]>([]);
  const [villages, setVillages] = useState<VillageGeo[]>([]);
  const [agences, setAgences] = useState<AgenceGeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // 4 sources indépendantes : une panne d'une liste n'efface pas les autres.
    const [d, c, v, a] = await Promise.allSettled([
      geographieService.districts(),
      geographieService.communes(),
      geographieService.villages(),
      geographieService.agences(),
    ]);
    if (d.status === 'fulfilled') setDistricts(rowsOf(d.value.data));
    if (c.status === 'fulfilled') setCommunes(rowsOf(c.value.data));
    if (v.status === 'fulfilled') setVillages(rowsOf(v.value.data));
    if (a.status === 'fulfilled') setAgences(rowsOf(a.value.data));
    if (
      d.status === 'rejected' &&
      c.status === 'rejected' &&
      v.status === 'rejected' &&
      a.status === 'rejected'
    ) {
      setError('Référentiel géographique indisponible. Vérifiez votre connexion au serveur.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();

  const items = useMemo<GeoRow[]>(() => {
    const filterRows = (rows: GeoRow[]) =>
      !term
        ? rows
        : rows.filter(
            (x) => x.nom.toLowerCase().includes(term) || x.sous.toLowerCase().includes(term)
          );
    switch (segment) {
      case 'districts':
        return filterRows(
          districts.map((x) => ({
            id: x.id,
            nom: x.nom,
            sous: [x.code, x.region_nom].filter(Boolean).join(' · '),
            extra: null,
            actif: x.actif !== false,
          }))
        );
      case 'communes':
        return filterRows(
          communes.map((x) => ({
            id: x.id,
            nom: x.nom,
            sous: [x.code, x.district_nom].filter(Boolean).join(' · '),
            extra: null,
            actif: x.actif !== false,
          }))
        );
      case 'villages':
        return filterRows(
          villages.map((x) => ({
            id: x.id,
            nom: x.nom,
            sous: [x.code, x.fokontany_nom].filter(Boolean).join(' · '),
            extra: null,
            actif: x.actif !== false,
          }))
        );
      case 'agences':
        return filterRows(
          agences.map((x) => ({
            id: x.id,
            nom: x.nom,
            sous: [x.code, x.district_nom].filter(Boolean).join(' · '),
            extra:
              [x.adresse, x.telephone, x.email].filter(Boolean).join(' · ') ||
              `${x.nb_cooperatives ?? 0} coop. · ${x.nb_utilisateurs ?? 0} util.`,
            actif: x.actif !== false,
          }))
        );
    }
  }, [segment, districts, communes, villages, agences, term]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Stack.Screen options={{ title: 'Géographie' }} />

      <Text style={styles.subtitle}>
        Référentiel officiel — districts, communes, villages et agences RAMEX.
      </Text>

      <View style={styles.segments}>
        {SEGMENTS.map((s) => (
          <Text
            key={s.key}
            onPress={() => setSegment(s.key)}
            style={[styles.segment, segment === s.key && styles.segmentActive]}
          >
            {s.label}
          </Text>
        ))}
      </View>

      <TextInput
        style={styles.search}
        placeholder="Rechercher (nom, code…)"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            Aucun élément dans ce référentiel. L'ajout et l'import se font depuis la version web.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={`${segment}-${item.id}`} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowNom}>{item.nom}</Text>
              {item.sous ? <Text style={styles.rowSous}>{item.sous}</Text> : null}
              {item.extra ? <Text style={styles.rowExtra}>{item.extra}</Text> : null}
            </View>
            {!item.actif ? (
              <View style={styles.badgeOff}>
                <Text style={styles.badgeOffText}>Inactif</Text>
              </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLeft: { flex: 1, marginRight: spacing.sm },
  rowNom: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSous: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowExtra: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badgeOff: {
    backgroundColor: colors.danger + '22',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeOffText: { fontSize: 11, fontWeight: '700', color: colors.danger },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  errorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  errorText: { color: colors.textSecondary, fontSize: 13 },
});

