import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';

interface Stats {
  total_producteurs?: number;
  producteurs_actifs?: number;
  producteurs_inactifs?: number;
}

export default function Accueil() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await producteurService.statistiques();
      setStats(response.data as Stats);
    } catch {
      setError('Statistiques indisponibles. Vérifiez votre connexion au serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const cards: Array<{ label: string; value?: number; color: string }> = [
    { label: 'Producteurs', value: stats?.total_producteurs, color: colors.dark },
    { label: 'Actifs', value: stats?.producteurs_actifs, color: colors.success },
    { label: 'Inactifs', value: stats?.producteurs_inactifs, color: colors.danger },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={colors.primary} />
      }
    >
      <Text style={styles.greeting}>
        Bonjour {user?.first_name || user?.username} 👋
      </Text>
      <Text style={styles.role}>{user?.role_display ?? ''}</Text>

      <Text style={styles.sectionTitle}>Producteurs</Text>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statsRow}>
          {cards.map((card) => (
            <View key={card.label} style={styles.statCard}>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.statValue, { color: card.color }]}>
                  {card.value ?? '—'}
                </Text>
              )}
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        onPress={() => router.push('/(tabs)/producteurs')}
      >
        <Text style={styles.actionText}>Voir les producteurs</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        onPress={() => router.push('/(tabs)/cooperatives')}
      >
        <Text style={styles.actionText}>Voir les coopératives</Text>
      </Pressable>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          Application connectée à l'API RAMEX. Les fonctionnalités hors-ligne (collecte
          terrain + synchronisation) arrivent dans une prochaine version.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greeting: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.lg },
  role: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 84,
    justifyContent: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: { color: colors.textSecondary, fontSize: 13 },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryText: { fontWeight: '700', color: colors.dark, fontSize: 13 },
  actionButton: {
    backgroundColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  actionPressed: { opacity: 0.85 },
  actionText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  footerNote: { marginTop: spacing.xl },
  footerText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
