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
import { Ionicons } from '@expo/vector-icons';
import { dotationService, producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { Dotation, DOTATION_TYPES } from '../../src/types/api';

/** Libellé lisible pour un type de dotation */
function typeLabel(type: string): string {
  const found = DOTATION_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

export default function ProducteurDotations() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [producteurNom, setProducteurNom] = useState('');
  const [dotations, setDotations] = useState<Dotation[]>([]);
  const [cumulTotal, setCumulTotal] = useState(0);
  const [cumulParType, setCumulParType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await dotationService.listByProducteur(id);
      setDotations(response.data.results || []);
      setCumulTotal(response.data.cumul_total || 0);
      setCumulParType(response.data.cumul_par_type || {});
      // Nom du producteur pour le titre (facultatif)
      try {
        const p = await producteurService.detail(id);
        setProducteurNom(p.data.nom_complet || p.data.nom);
      } catch {
        // nom facultatif
      }
    } catch {
      setError('Impossible de charger les dotations de ce producteur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goAdd = () => {
    router.push({ pathname: '/producteur/dotation-form', params: { producteur: String(id) } });
  };

  const confirmDelete = (dotation: Dotation) => {
    Alert.alert(
      'Supprimer cette dotation ?',
      `${typeLabel(dotation.type_dotation)} (${dotation.annee}) sera supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dotationService.remove(dotation.id);
              load();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette dotation. Réessayez.');
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
          title: `Dotations — ${producteurNom || 'producteur'}`,
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
            <Text style={styles.cumulLabel}>Total reçu</Text>
            <Text style={styles.cumulValue}>{cumulTotal}</Text>
          </View>

          {Object.keys(cumulParType).length > 0 ? (
            <View style={styles.cumulRow}>
              {Object.entries(cumulParType).map(([type, qte]) => (
                <View key={type} style={styles.cumulTypeCard}>
                  <Text style={styles.cumulTypeValue}>{qte}</Text>
                  <Text style={styles.cumulTypeLabel}>{typeLabel(type)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={styles.addButton} onPress={goAdd}>
            <Ionicons name="add" size={18} color={colors.dark} />
            <Text style={styles.addText}>Ajouter une dotation</Text>
          </Pressable>

          {dotations.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Aucune dotation enregistrée pour ce producteur.</Text>
            </View>
          ) : (
            dotations.map((dotation) => (
              <View key={dotation.id} style={styles.dotationCard}>
                <View style={styles.dotationHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{typeLabel(dotation.type_dotation)}</Text>
                  </View>
                  <Text style={styles.dotationYear}>{dotation.annee}</Text>
                </View>
                <View style={styles.dotationRow}>
                  <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.dotationQte}>Quantité : {dotation.quantite}</Text>
                </View>
                {dotation.details ? (
                  <Text style={styles.dotationDetails}>Détails : {dotation.details}</Text>
                ) : null}
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
                  onPress={() => confirmDelete(dotation)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteBtnText}>Supprimer</Text>
                </Pressable>
              </View>
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
  content: { padding: spacing.lg },
  cumulCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cumulLabel: { color: colors.dark, fontSize: 13, fontWeight: '700' },
  cumulValue: { color: colors.dark, fontSize: 26, fontWeight: '800' },
  cumulRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  cumulTypeCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 90,
  },
  cumulTypeValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  cumulTypeLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  addButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
  emptyBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  dotationCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  dotationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeBadge: { backgroundColor: colors.primaryDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  dotationYear: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  dotationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  dotationQte: { fontSize: 14, color: colors.text },
  dotationDetails: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
  },
  deleteBtnPressed: { opacity: 0.6 },
  deleteBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});