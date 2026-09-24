import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ficheCollecteService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { FicheCollecte } from '../../src/types/api';

/** Normalise la réponse : DRF paginé {results} ou tableau brut */
function rowsOf(data: FicheCollecte[] | { results?: FicheCollecte[] }): FicheCollecte[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Poids en kg (decimal DRF → chaîne lisible) */
function formatKg(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!num || isNaN(num)) return '0 kg';
  return `${num.toLocaleString('fr-FR')} kg`;
}

/** Montant en Ariary (parité web : Intl.NumberFormat('fr-MG')) */
function formatAr(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!num || isNaN(num)) return '0 Ar';
  return `${Math.round(num).toLocaleString('fr-FR')} Ar`;
}

/** Date ISO AAAA-MM-JJ → JJ/MM/AAAA */
function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function FichesCollecteList() {
  const router = useRouter();
  const [fiches, setFiches] = useState<FicheCollecte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ficheCollecteService.list();
      setFiches(rowsOf(response.data));
    } catch {
      setError('Impossible de charger les fiches de collecte.');
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goAdd = () => router.push('/tracabilite/fiche-form');

  const goEdit = (fiche: FicheCollecte) =>
    router.push({ pathname: '/tracabilite/fiche-form', params: { id: String(fiche.id) } });

  const confirmDelete = (fiche: FicheCollecte) => {
    Alert.alert(
      'Supprimer cette fiche ?',
      `La FC ${fiche.numero_fc} sera définitivement supprimée (les FABC restent conservés).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await ficheCollecteService.remove(fiche.id);
              load();
            } catch {
              Alert.alert('Erreur', 'Suppression impossible (liens existants ?).');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Fiches de collecte', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
          onPress={goAdd}
        >
          <Text style={styles.addText}>+ Nouvelle FC</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : fiches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Aucune fiche de collecte. Regroupez les FABC d'un marché avec le bouton ci-dessus.
            </Text>
          </View>
        ) : (
          fiches.map((fiche) => (
            <View key={fiche.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{fiche.numero_fc}</Text>
                <Text style={styles.cardDate}>{frDate(fiche.date_marche)}</Text>
              </View>
              <Text style={styles.cardSub}>
                {fiche.fokontany} · {fiche.nombre_producteurs} producteur(s)
                {fiche.cooperative_nom ? ` · ${fiche.cooperative_nom}` : ''}
              </Text>
              <View style={styles.figuresRow}>
                <View style={styles.figure}>
                  <Text style={styles.figureValue}>{formatKg(fiche.poids_total_net)}</Text>
                  <Text style={styles.figureLabel}>Poids total net</Text>
                </View>
                <View style={styles.figure}>
                  <Text style={[styles.figureValue, styles.amount]}>
                    {formatAr(fiche.montant_total)}
                  </Text>
                  <Text style={styles.figureLabel}>Montant total</Text>
                </View>
              </View>
              <View style={styles.chipsRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {fiche.certification_display || fiche.certification}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Agent : {fiche.agent_re}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionButton, styles.editLink]}
                  onPress={() => goEdit(fiche)}
                >
                  <Text style={styles.editLinkText}>Modifier</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteLink]}
                  onPress={() => confirmDelete(fiche)}
                >
                  <Text style={styles.deleteLinkText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPressed: { backgroundColor: colors.primaryDim },
  addText: { color: colors.dark, fontWeight: '700', fontSize: 15 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardDate: { fontSize: 12, color: colors.textSecondary },
  cardSub: { fontSize: 13, color: colors.text },
  figuresRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 4,
  },
  figure: { flex: 1 },
  figureValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  amount: { color: colors.success },
  figureLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: colors.text },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  actionButton: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editLink: { backgroundColor: colors.primaryDim },
  editLinkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  deleteLink: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#FECACA' },
  deleteLinkText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
});