import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { Producteur } from '../../src/types/api';

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.textSecondary} />
      <View style={styles.infoMain}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProducteurDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [producteur, setProducteur] = useState<Producteur | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await producteurService.detail(id);
      setProducteur(response.data);
    } catch {
      setError('Impossible de charger ce producteur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const nomComplet = producteur
    ? producteur.nom_complet || `${producteur.nom} ${producteur.prenom ?? ''}`.trim()
    : '';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: nomComplet || 'Détail producteur',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : error || !producteur ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || 'Producteur introuvable.'}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(producteur.nom || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{nomComplet}</Text>
            <Text style={styles.code}>{producteur.code}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, producteur.actif ? styles.badgeOk : styles.badgeOff]}>
                <Text style={styles.badgeText}>{producteur.actif ? 'Actif' : 'Inactif'}</Text>
              </View>
              <View style={styles.badgeSex}>
                <Text style={styles.badgeText}>{producteur.sexe === 'F' ? 'Femme' : 'Homme'}</Text>
              </View>
              {producteur.verifie ? (
                <View style={styles.badgeVerif}>
                  <Text style={styles.badgeText}>Vérifié</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="location-outline" label="Village" value={producteur.village} />
            <InfoRow icon="map-outline" label="Commune" value={producteur.commune} />
            <InfoRow icon="people-outline" label="Fokontany" value={producteur.fokontany} />
            <InfoRow icon="call-outline" label="Téléphone" value={producteur.telephone} />
          </View>
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
  content: { padding: spacing.lg },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.dark },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  code: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  badgeSex: { backgroundColor: '#DBEAFE' },
  badgeVerif: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.text },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoMain: { marginLeft: spacing.md, flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: colors.text, marginTop: 2 },
});
