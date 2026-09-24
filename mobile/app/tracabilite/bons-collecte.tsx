import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { bonCollecteService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { BonCollecte } from '../../src/types/api';

/** Normalise la réponse : DRF paginé {results} ou tableau brut */
function rowsOf(data: BonCollecte[] | { results?: BonCollecte[] }): BonCollecte[] {
  return Array.isArray(data) ? data : (data.results ?? []);
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

export default function BonsCollecteList() {
  const router = useRouter();
  const [bons, setBons] = useState<BonCollecte[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await bonCollecteService.list(term ? { search: term } : {});
      const data = response.data;
      const rows = rowsOf(data);
      setBons(rows);
      setCount(!Array.isArray(data) && typeof data.count === 'number' ? data.count : rows.length);
    } catch {
      setError('Impossible de charger les bons de collecte.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const onSearchChange = (term: string) => {
    setSearch(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(term), 400);
  };

  const goAdd = () => router.push('/tracabilite/bon-form');

  const goEdit = (bon: BonCollecte) =>
    router.push({ pathname: '/tracabilite/bon-form', params: { id: String(bon.id) } });

  const confirmDelete = (bon: BonCollecte) => {
    Alert.alert(
      'Supprimer ce bon ?',
      `Le FABC ${bon.numero_fabc} sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await bonCollecteService.remove(bon.id);
              load(search);
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
      <Stack.Screen options={{ title: 'Bons de collecte', headerShown: true }} />

      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher (N° FABC, producteur…)"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={onSearchChange}
          autoCapitalize="none"
        />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
          onPress={goAdd}
        >
          <Text style={styles.addText}>+ Nouveau FABC</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : bons.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Aucun bon de collecte{search ? ` pour « ${search} »` : ''}. Créez le premier FABC
              avec le bouton ci-dessus.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>{count} bon(s) au total</Text>
            {bons.map((bon) => (
              <View key={bon.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{bon.numero_fabc}</Text>
                  <Text style={styles.cardDate}>{frDate(bon.date_marche)}</Text>
                </View>
                <Text style={styles.cardProducteur}>
                  {bon.producteur_nom || `Producteur #${bon.producteur}`}
                  {bon.producteur_code ? ` (${bon.producteur_code})` : ''}
                </Text>
                <View style={styles.figuresRow}>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>{String(bon.poids_accepte)} kg</Text>
                    <Text style={styles.figureLabel}>Poids accepté</Text>
                  </View>
                  <View style={styles.figure}>
                    <Text style={[styles.figureValue, styles.amount]}>
                      {formatAr(bon.montant_total_achat)}
                    </Text>
                    <Text style={styles.figureLabel}>Total achat</Text>
                  </View>
                </View>
                <View style={styles.chipsRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {bon.type_produit_display || bon.type_produit}
                    </Text>
                  </View>
                  {bon.certification ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {bon.certification_display || bon.certification}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{bon.village_marche}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.actionButton, styles.editLink]}
                    onPress={() => goEdit(bon)}
                  >
                    <Text style={styles.editLinkText}>Modifier</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteLink]}
                    onPress={() => confirmDelete(bon)}
                  >
                    <Text style={styles.deleteLinkText}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPressed: { backgroundColor: colors.primaryDim },
  addText: { color: colors.dark, fontWeight: '700', fontSize: 15 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  countText: { fontSize: 12, color: colors.textSecondary },
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
  cardProducteur: { fontSize: 14, color: colors.text },
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