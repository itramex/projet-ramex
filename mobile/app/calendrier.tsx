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
import { campagneService, cycleService } from '../src/services/api';
import type {
  CalendrierResponse,
  Campagne,
  PhaseAgricole,
  PhasePilier,
  RapportCampagne,
} from '../src/types/api';
import { colors, spacing } from '../src/constants/theme';

/** M-19 — Cycle annuel / Calendrier agricole : consultation seule */
type Segment = 'calendrier' | 'phases' | 'rapport';

const SEGMENTS: Array<{ key: Segment; label: string }> = [
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'phases', label: 'Phases' },
  { key: 'rapport', label: 'Rapport' },
];

const PILIERS: Array<{ key: PhasePilier | 'tous'; label: string }> = [
  { key: 'tous', label: 'Tous' },
  { key: 'tracabilite', label: 'Traçabilité' },
  { key: 'certification', label: 'Certification' },
  { key: 'developpement_durable', label: 'Dév. durable' },
];

/** Libellé d'un pilier (fallback : valeur brute) */
function pilierLabel(pilier: string | undefined): string {
  const found = PILIERS.find((p) => p.key === pilier);
  return found && found.key !== 'tous' ? found.label : pilier ?? '';
}

/** Montant en Ariary (parité web) */
function formatAr(value: number | null | undefined): string {
  const num = value ?? 0;
  return `${Math.round(num).toLocaleString('fr-FR')} Ar`;
}

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function CalendrierScreen() {
  const [segment, setSegment] = useState<Segment>('calendrier');
  const [calendrier, setCalendrier] = useState<CalendrierResponse | null>(null);
  const [phases, setPhases] = useState<PhaseAgricole[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pilierFiltre, setPilierFiltre] = useState<PhasePilier | 'tous'>('tous');
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [rapport, setRapport] = useState<RapportCampagne | null>(null);
  const [rapportLoading, setRapportLoading] = useState(false);
  const [rapportError, setRapportError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // 3 sources indépendantes : une panne d'une source n'efface pas les autres.
    const [cal, ph, cam] = await Promise.allSettled([
      cycleService.calendrier(),
      cycleService.phases(),
      campagneService.list(),
    ]);
    if (cal.status === 'fulfilled') setCalendrier(cal.value.data);
    if (ph.status === 'fulfilled') setPhases(rowsOf(ph.value.data));
    if (cam.status === 'fulfilled') setCampagnes(rowsOf(cam.value.data));
    if (cal.status === 'rejected' && ph.status === 'rejected') {
      setError('Calendrier agricole indisponible. Vérifiez votre connexion au serveur.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadRapport = useCallback(async (id: number) => {
    setRapportLoading(true);
    setRapportError('');
    setRapport(null);
    try {
      const response = await cycleService.rapport(id);
      setRapport(response.data);
    } catch {
      setRapportError('Rapport indisponible pour cette campagne.');
    } finally {
      setRapportLoading(false);
    }
  }, []);

  const term = search.trim().toLowerCase();

  const phasesFiltrees = useMemo(() => {
    return phases.filter((p) => {
      if (pilierFiltre !== 'tous' && p.pilier !== pilierFiltre) return false;
      if (!term) return true;
      return (
        p.nom.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (pilierLabel(p.pilier).toLowerCase().includes(term))
      );
    });
  }, [phases, pilierFiltre, term]);

  const moisCourant = new Date().getMonth() + 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Stack.Screen options={{ title: 'Calendrier agricole' }} />

      <Text style={styles.subtitle}>
        Cycle annuel RAMEx — {calendrier ? `${calendrier.total} phase(s) actives` : 'phases du calendrier'}.
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

      {segment !== 'rapport' ? (
        <TextInput
          style={styles.search}
          placeholder="Rechercher (nom, code…)"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && !calendrier && !phases.length ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : null}

      {/* --- Vue Calendrier : les 12 mois --- */}
      {segment === 'calendrier' && calendrier ? (
        <>
          <View style={styles.piliersRow}>
            {PILIERS.filter((p) => p.key !== 'tous').map((p) => (
              <View key={p.key} style={styles.pilierCard}>
                <Text style={styles.pilierValue}>
                  {calendrier.par_pilier[p.key as PhasePilier]}
                </Text>
                <Text style={styles.pilierLabel}>{p.label}</Text>
              </View>
            ))}
          </View>

          {calendrier.mois.map((m) => (
            <View
              key={m.numero}
              style={[styles.moisCard, m.numero === moisCourant && styles.moisCardNow]}
            >
              <View style={styles.moisHeader}>
                <Text style={styles.moisNom}>
                  {m.nom}
                  {m.numero === moisCourant ? '  ·  en cours' : ''}
                </Text>
                <Text style={styles.moisCount}>{m.phases.length}</Text>
              </View>
              {m.phases.length === 0 ? (
                <Text style={styles.moisVide}>Aucune phase active</Text>
              ) : (
                m.phases.map((ph) => (
                  <View key={`${m.numero}-${ph.id}`} style={styles.phaseRow}>
                    <View style={[styles.dot, { backgroundColor: ph.couleur }]} />
                    <View style={styles.phaseLeft}>
                      <Text style={styles.phaseNom}>{ph.nom}</Text>
                      <Text style={styles.phaseMeta}>
                        {pilierLabel(ph.pilier)}
                        {ph.toute_annee ? ' · toute l\u2019année' : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ))}
        </>
      ) : null}

      {/* --- Vue Phases : référentiel filtrable --- */}
      {segment === 'phases' ? (
        <>
          <View style={styles.segments}>
            {PILIERS.map((p) => (
              <Text
                key={p.key}
                onPress={() => setPilierFiltre(p.key)}
                style={[styles.segment, pilierFiltre === p.key && styles.segmentActive]}
              >
                {p.label}
              </Text>
            ))}
          </View>

          {phasesFiltrees.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune phase ne correspond à cette recherche.</Text>
            </View>
          ) : (
            phasesFiltrees.map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={[styles.couleurBar, { backgroundColor: p.couleur }]} />
                <View style={styles.rowLeft}>
                  <Text style={styles.rowNom}>{p.nom}</Text>
                  <Text style={styles.rowSous}>
                    {pilierLabel(p.pilier)} · {p.type_phase_display ?? p.type_phase} ·{' '}
                    {p.toute_annee
                      ? 'toute l\u2019année'
                      : `mois ${p.mois_debut}\u2013${p.mois_fin}`}
                  </Text>
                  {p.description ? <Text style={styles.rowDesc}>{p.description}</Text> : null}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}

      {/* --- Vue Rapport --- */}
      {segment === 'rapport' ? (
        <>
          {campagnes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Aucune campagne disponible : le rapport consolidé se construit à partir des
                campagnes de traçabilité saisies sur le web ou le terrain.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Campagne</Text>
              <View style={styles.segments}>
                {campagnes.map((c) => (
                  <Text
                    key={c.id}
                    onPress={() => {
                      setCampagneId(c.id);
                      loadRapport(c.id);
                    }}
                    style={[styles.segment, campagneId === c.id && styles.segmentActive]}
                  >
                    {c.code}
                  </Text>
                ))}
              </View>

              {rapportLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
              ) : rapportError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{rapportError}</Text>
                </View>
              ) : rapport ? (
                <>
                  <View style={styles.rapportCard}>
                    <Text style={styles.rapportTitle}>
                      Campagne {rapport.campagne.code}
                      {rapport.campagne.annee_debut
                        ? ` · ${rapport.campagne.annee_debut}${rapport.campagne.annee_fin ? `\u2013${rapport.campagne.annee_fin}` : ''}`
                        : ''}
                    </Text>
                    <Text style={styles.rapportSub}>Traçabilité</Text>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Bons de collecte</Text>
                      <Text style={styles.kvValue}>{rapport.tracabilite.bons_collecte}</Text>
                    </View>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Poids total</Text>
                      <Text style={styles.kvValue}>
                        {rapport.tracabilite.poids_total_kg.toLocaleString('fr-FR')} kg
                      </Text>
                    </View>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Montant achats</Text>
                      <Text style={styles.kvValue}>
                        {formatAr(rapport.tracabilite.montant_total_ar)}
                      </Text>
                    </View>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Commandes export</Text>
                      <Text style={styles.kvValue}>
                        {rapport.tracabilite.commandes_export} (
                        {rapport.tracabilite.poids_export_kg.toLocaleString('fr-FR')} kg)
                      </Text>
                    </View>

                    <Text style={styles.rapportSub}>Certification</Text>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Objectifs (cible / réalisé)</Text>
                      <Text style={styles.kvValue}>
                        {rapport.certification.cible_objectif} /{' '}
                        {rapport.certification.realise_objectif}
                      </Text>
                    </View>

                    <Text style={styles.rapportSub}>Développement durable</Text>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Objectifs (cible / réalisé)</Text>
                      <Text style={styles.kvValue}>
                        {rapport.developpement_durable.cible_objectif} /{' '}
                        {rapport.developpement_durable.realise_objectif}
                      </Text>
                    </View>

                    <Text style={styles.rapportSub}>Phases de la campagne</Text>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Planifiées / en cours / terminées</Text>
                      <Text style={styles.kvValue}>
                        {rapport.phases.planifiees} / {rapport.phases.en_cours} /{' '}
                        {rapport.phases.terminees}
                      </Text>
                    </View>
                  </View>

                  {rapport.indicateurs.length > 0 ? (
                    <>
                      <Text style={styles.sectionTitle}>
                        Indicateurs ({rapport.indicateurs.length})
                      </Text>
                      {rapport.indicateurs.map((i) => (
                        <View key={i.id} style={styles.row}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.rowNom}>{i.libelle}</Text>
                            <Text style={styles.rowSous}>
                              {pilierLabel(i.pilier)} · {i.type_display ?? i.type} ·{' '}
                              {i.taux_realisation != null
                                ? `${Math.round(i.taux_realisation)} %`
                                : '—'}
                            </Text>
                          </View>
                          <Text style={styles.kvValue}>
                            {i.realise ?? 0} / {i.objectif ?? 0}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : null}
                </>
              ) : campagneId === null ? (
                <Text style={styles.hint}>Choisissez une campagne pour afficher le rapport.</Text>
              ) : null}
            </>
          )}
        </>
      ) : null}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  piliersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pilierCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
  },
  pilierValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  pilierLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  moisCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  moisCardNow: { borderColor: colors.primary },
  moisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moisNom: { fontSize: 15, fontWeight: '700', color: colors.text },
  moisCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  moisVide: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  phaseLeft: { flex: 1 },
  phaseNom: { fontSize: 14, color: colors.text, fontWeight: '600' },
  phaseMeta: { fontSize: 12, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  couleurBar: { width: 6, height: '70%', borderRadius: 3, marginRight: spacing.md },
  rowLeft: { flex: 1 },
  rowNom: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSous: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  rapportCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  rapportTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  rapportSub: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: spacing.sm,
  },
  kvLabel: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
  kvValue: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm },
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

