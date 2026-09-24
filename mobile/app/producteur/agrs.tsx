import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { agrService, producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { AGR, AGR_TYPES, AGR_UTILISATIONS } from '../../src/types/api';

/** Libellé lisible pour un type d'AGR (fallback : valeur brute) */
function typeLabel(type: string): string {
  const found = AGR_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

/** Libellé d'utilisation (fallback : valeur brute ou tiret) */
function utilisationLabel(utilisation: string): string {
  if (!utilisation) return '';
  const found = AGR_UTILISATIONS.find((u) => u.value === utilisation);
  return found ? found.label : utilisation;
}

/** Montant en Ariary (parité web : Intl.NumberFormat('fr-MG')) */
function formatAr(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!num || isNaN(num)) return '0 Ar';
  return `${Math.round(num).toLocaleString('fr-FR')} Ar`;
}

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf(data: AGR[] | { results?: AGR[] }): AGR[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function ProducteurAgrs() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [producteurNom, setProducteurNom] = useState('');
  const [agrs, setAgrs] = useState<AGR[]>([]);
  const [revenuTotal, setRevenuTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await agrService.listByProducteur(id);
      const rows = rowsOf(response.data);
      setAgrs(rows);
      setRevenuTotal(
        rows.reduce((sum, agr) => sum + (parseFloat(String(agr.revenu_annuel_estime ?? 0)) || 0), 0)
      );
      // Nom du producteur pour le titre (facultatif)
      try {
        const p = await producteurService.detail(id);
        setProducteurNom(p.data.nom_complet || p.data.nom);
      } catch {
        // nom facultatif
      }
    } catch {
      setError('Impossible de charger les AGR de ce producteur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goAdd = () => {
    router.push({ pathname: '/producteur/agr-form', params: { producteur: String(id) } });
  };

  const goEdit = (agr: AGR) => {
    router.push({
      pathname: '/producteur/agr-form',
      params: { producteur: String(id), id: String(agr.id) },
    });
  };

  const confirmDelete = (agr: AGR) => {
    Alert.alert(
      'Supprimer cette AGR ?',
      `« ${typeLabel(agr.type_agr)} » (ordre ${agr.ordre}) sera supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await agrService.remove(agr.id);
              load();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette AGR. Réessayez.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `AGR — ${producteurNom || 'producteur'}`,
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cumulCard}>
            <Text style={styles.cumulLabel}>Revenu annuel estimé total</Text>
            <Text style={styles.cumulValue}>{formatAr(revenuTotal)}</Text>
            <Text style={styles.cumulSub}>
              {agrs.length} activité{agrs.length > 1 ? 's' : ''} active
              {agrs.length > 1 ? 's' : ''}
            </Text>
          </View>

          <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]} onPress={goAdd}>
            <Text style={styles.addText}>+ Ajouter une AGR</Text>
          </Pressable>

          {agrs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucune AGR enregistrée pour ce producteur. Ajoutez une activité génératrice de
                revenus (pisciculture, aviculture…).
              </Text>
            </View>
          ) : (
            agrs.map((agr) => (
              <Pressable key={agr.id} style={styles.card} onPress={() => goEdit(agr)}>
                <View style={styles.cardHeader}>
                  <View style={styles.ordreBadge}>
                    <Text style={styles.ordreText}>AGR {agr.ordre}</Text>
                  </View>
                  <Text style={styles.cardTitle}>
                    {agr.type_agr_display || typeLabel(agr.type_agr)}
                  </Text>
                  <View style={[styles.statusBadge, !agr.active && styles.statusOff]}>
                    <Text style={styles.statusText}>{agr.active ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>

                <Text style={styles.revenuValue}>{formatAr(agr.revenu_annuel_estime)}</Text>
                <Text style={styles.revenuLabel}>Revenu annuel estimé</Text>

                <View style={styles.chipsRow}>
                  {agr.intrants_recus ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        Intrants reçus
                        {agr.quantite_intrants != null ? ` (${agr.quantite_intrants})` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {utilisationLabel(agr.utilisation) ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{utilisationLabel(agr.utilisation)}</Text>
                    </View>
                  ) : null}
                  {agr.type_agr === 'pisciculture' && agr.nombre_bassins != null ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{agr.nombre_bassins} bassin(s)</Text>
                    </View>
                  ) : null}
                  {agr.type_agr === 'aviculture' && agr.nombre_volailles != null ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{agr.nombre_volailles} volaille(s)</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.figuresRow}>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>
                      {agr.quantite_vendue_annuelle != null
                        ? `${agr.quantite_vendue_annuelle} ${agr.unite_mesure}`
                        : '—'}
                    </Text>
                    <Text style={styles.figureLabel}>Vendu / an</Text>
                  </View>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>
                      {agr.quantite_consommee_annuelle != null
                        ? `${agr.quantite_consommee_annuelle} ${agr.unite_mesure}`
                        : '—'}
                    </Text>
                    <Text style={styles.figureLabel}>Consommé / an</Text>
                  </View>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>
                      {agr.prix_vente_unitaire != null ? formatAr(agr.prix_vente_unitaire) : '—'}
                    </Text>
                    <Text style={styles.figureLabel}>Prix unitaire</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable style={styles.editLink} onPress={() => goEdit(agr)}>
                    <Text style={styles.editLinkText}>Modifier</Text>
                  </Pressable>
                  <Pressable style={styles.deleteLink} onPress={() => confirmDelete(agr)}>
                    <Text style={styles.deleteLinkText}>Supprimer</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl * 2 },
  errorBox: {
    margin: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  errorText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  retryText: { fontWeight: '700', color: colors.dark },
  content: { padding: spacing.lg, gap: spacing.md },
  cumulCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cumulLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cumulValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 4 },
  cumulSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPressed: { backgroundColor: colors.primaryDim },
  addText: { color: colors.dark, fontWeight: '700', fontSize: 15 },
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ordreBadge: {
    backgroundColor: colors.primaryDim,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ordreText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
  },
  statusOff: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.text },
  revenuValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  revenuLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: colors.text },
  figuresRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  figure: { flex: 1 },
  figureValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  figureLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  editLink: {
    flex: 1,
    backgroundColor: colors.primaryDim,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editLinkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  deleteLink: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteLinkText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
});
