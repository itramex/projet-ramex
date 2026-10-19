import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ddService } from '../src/services/api';
import type { ActiviteDD, PartenaireDD, TypeActiviteDD } from '../src/types/api';
import { TYPES_ACTIVITE_DD, TYPES_PARTENAIRE_DD } from '../src/types/api';
import { colors, spacing } from '../src/constants/theme';

/** M-20 — Développement durable : activités (liste + création + suppression) et partenaires */
type Segment = 'activites' | 'partenaires';

const SEGMENTS: Array<{ key: Segment; label: string }> = [
  { key: 'activites', label: 'Activités' },
  { key: 'partenaires', label: 'Partenaires' },
];

/** Libellé d'un type d'activité (fallback : valeur brute) */
function typeActiviteLabel(value: string): string {
  const found = TYPES_ACTIVITE_DD.find((t) => t.value === value);
  return found ? found.label : value;
}

/** Libellé d'un partenaire (fallback : valeur brute) */
function typePartenaireLabel(value: string): string {
  const found = TYPES_PARTENAIRE_DD.find((t) => t.value === value);
  return found ? found.label : value;
}

/** Date lisible depuis ISO AAAA-MM-JJ… */
function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function DeveloppementDurableScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('activites');
  const [activites, setActivites] = useState<ActiviteDD[]>([]);
  const [partenaires, setPartenaires] = useState<PartenaireDD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFiltre, setTypeFiltre] = useState<TypeActiviteDD | 'tous'>('tous');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // 2 sources indépendantes : une panne d'une liste n'efface pas l'autre.
    const [a, p] = await Promise.allSettled([ddService.activites(), ddService.partenaires()]);
    if (a.status === 'fulfilled') setActivites(rowsOf(a.value.data));
    if (p.status === 'fulfilled') setPartenaires(rowsOf(p.value.data));
    if (a.status === 'rejected' && p.status === 'rejected') {
      setError('Développement durable indisponible : vérifiez votre connexion ou vos droits.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = (a: ActiviteDD) => {
    Alert.alert('Supprimer', `Supprimer l'activité du ${formatDate(a.date)} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await ddService.removeActivite(a.id);
            setActivites((prev) => prev.filter((x) => x.id !== a.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const term = search.trim().toLowerCase();

  const activitesFiltrees = useMemo(() => {
    return activites.filter((a) => {
      if (typeFiltre !== 'tous' && a.type_activite !== typeFiltre) return false;
      if (!term) return true;
      return (
        a.description.toLowerCase().includes(term) ||
        (a.resultat ?? '').toLowerCase().includes(term) ||
        typeActiviteLabel(a.type_activite).toLowerCase().includes(term)
      );
    });
  }, [activites, typeFiltre, term]);

  const partenairesFiltrees = useMemo(() => {
    if (!term) return partenaires;
    return partenaires.filter(
      (p) =>
        p.nom.toLowerCase().includes(term) ||
        (p.contact ?? '').toLowerCase().includes(term) ||
        typePartenaireLabel(p.type).toLowerCase().includes(term)
    );
  }, [partenaires, term]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Stack.Screen options={{ title: 'Développement durable' }} />

      <Text style={styles.subtitle}>
        Activités DD (saisie terrain) et partenaires de mise en œuvre.
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
        placeholder="Rechercher…"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && activites.length === 0 && partenaires.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : null}

      {/* --- Activités --- */}
      {segment === 'activites' ? (
        <>
          <View style={styles.segments}>
            <Text
              onPress={() => setTypeFiltre('tous')}
              style={[styles.segment, typeFiltre === 'tous' && styles.segmentActive]}
            >
              Tous
            </Text>
            {TYPES_ACTIVITE_DD.map((t) => (
              <Text
                key={t.value}
                onPress={() => setTypeFiltre(t.value)}
                style={[styles.segment, typeFiltre === t.value && styles.segmentActive]}
              >
                {t.label}
              </Text>
            ))}
          </View>

          {activitesFiltrees.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="leaf-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                Aucune activité de développement durable. Saisissez la première avec le bouton
                ci-dessous.
              </Text>
            </View>
          ) : (
            activitesFiltrees.map((a) => (
              <Pressable
                key={a.id}
                onLongPress={() => confirmDelete(a)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowNom}>
                    {typeActiviteLabel(a.type_activite)} · {formatDate(a.date)}
                  </Text>
                  <Text style={styles.rowDesc} numberOfLines={3}>
                    {a.description}
                  </Text>
                  <Text style={styles.rowSous}>
                    {(a.objectif_client_display ?? a.objectif_client) +
                      ' · ' +
                      (a.nombre_participants ?? 0) +
                      ' participant(s)'}
                    {a.responsable_nom ? ` · ${a.responsable_nom}` : ''}
                  </Text>
                  {a.cooperative_nom ? (
                    <Text style={styles.rowSous}>Coopérative : {a.cooperative_nom}</Text>
                  ) : null}
                  {a.partenaire_nom ? (
                    <Text style={styles.rowSous}>Partenaire : {a.partenaire_nom}</Text>
                  ) : null}
                  {a.resultat ? (
                    <Text style={styles.rowResultat}>Résultat : {a.resultat}</Text>
                  ) : null}
                </View>
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            ))
          )}

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            onPress={() => router.push('/dd-form')}
          >
            <Text style={styles.actionText}>Ajouter une activité</Text>
          </Pressable>
        </>
      ) : null}

      {/* --- Partenaires --- */}
      {segment === 'partenaires' ? (
        partenairesFiltrees.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Aucun partenaire DD enregistré. Les partenaires se créent depuis la version web.
            </Text>
          </View>
        ) : (
          partenairesFiltrees.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowNom}>{p.nom}</Text>
                <Text style={styles.rowSous}>
                  {typePartenaireLabel(p.type)}
                  {p.contact ? ` · ${p.contact}` : ''}
                  {p.telephone ? ` · ${p.telephone}` : ''}
                </Text>
                {p.email ? <Text style={styles.rowSous}>{p.email}</Text> : null}
              </View>
              {p.actif === false ? (
                <View style={styles.badgeOff}>
                  <Text style={styles.badgeOffText}>Inactif</Text>
                </View>
              ) : null}
            </View>
          ))
        )
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
  rowPressed: { opacity: 0.7 },
  rowLeft: { flex: 1, marginRight: spacing.sm },
  rowNom: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowDesc: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18 },
  rowSous: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  rowResultat: { fontSize: 12, color: colors.success, marginTop: 3, fontStyle: 'italic' },
  badgeOff: {
    backgroundColor: colors.danger + '22',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeOffText: { fontSize: 11, fontWeight: '700', color: colors.danger },
  actionButton: {
    backgroundColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  actionPressed: { opacity: 0.85 },
  actionText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
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
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.textSecondary, fontSize: 13 },
});
