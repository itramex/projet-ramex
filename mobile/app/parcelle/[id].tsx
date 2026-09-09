import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parcelleService } from '../../src/services/parcelleService';
import { colors, spacing } from '../../src/constants/theme';
import { Parcelle } from '../../src/types/parcelle';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.textSecondary} />
      <View style={styles.infoMain}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

export default function ParcelleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await parcelleService.detail(id);
      setParcelle(response.data);
    } catch {
      setError('Impossible de charger cette parcelle.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: parcelle?.code_parcelle || 'Détail parcelle',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : error || !parcelle ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || 'Parcelle introuvable.'}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>P</Text>
            </View>
            <Text style={styles.name}>{parcelle.code_parcelle}</Text>
            <Text style={styles.owner}>{parcelle.producteur_nom} ({parcelle.producteur_code})</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, parcelle.active ? styles.badgeOk : styles.badgeOff]}>
                <Text style={styles.badgeText}>{parcelle.active ? 'Active' : 'Inactive'}</Text>
              </View>
              {parcelle.certifiee ? (
                <View style={styles.badgeCert}>
                  <Text style={styles.badgeText}>Certifiée</Text>
                </View>
              ) : null}
              <View style={styles.badgeAge}>
                <Text style={styles.badgeText}>
                  {parcelle.age_parcelle != null ? `${parcelle.age_parcelle} ans` : 'Âge inconnu'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="golf-outline" label="Type de vanille" value={parcelle.type_vanille_display} />
            <InfoRow icon="leaf-outline" label="Culture principale" value={parcelle.culture_principale_display} />
            <InfoRow icon="resize-outline" label="Superficie" value={parcelle.dimension_ha != null ? `${parcelle.dimension_ha} ha` : null} />
            <InfoRow icon="bar-chart-outline" label="Nombre de pieds" value={parcelle.nombre_pieds} />
            <InfoRow icon="pulse-outline" label="Estimation production" value={parcelle.estimation_production_kg != null ? `${parcelle.estimation_production_kg} kg` : null} />
            <InfoRow icon="home-outline" label="Localisation" value={parcelle.localisation} />
            <InfoRow icon="lock-closed-outline" label="Type de propriété" value={parcelle.type_propriete_display} />
            <InfoRow icon="map-outline" label="Profil de parcelle" value={parcelle.profil_parcelle_display} />
            <InfoRow icon="clock-outline" label="Distance habitation" value={parcelle.distance_habitation_display} />
            <InfoRow icon="location-outline" label="Latitude" value={parcelle.latitude} />
            <InfoRow icon="location-outline" label="Longitude" value={parcelle.longitude} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.producteurButton, pressed && styles.producteurPressed]}
            onPress={() => router.push(`/producteur/${parcelle.producteur}`)}
          >
            <Ionicons name="person-outline" size={18} color={colors.dark} />
            <Text style={styles.producteurText}>Voir le producteur</Text>
          </Pressable>
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
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.dark },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  owner: { fontSize: 13, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  badgesRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  badgeCert: { backgroundColor: '#FEF3C7' },
  badgeAge: { backgroundColor: '#DBEAFE' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.text },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  producteurButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  producteurPressed: { backgroundColor: colors.primaryDim },
  producteurText: { color: colors.dark, fontWeight: '700', fontSize: 15 },
});