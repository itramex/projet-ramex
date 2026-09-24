import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, spacing } from '../../src/constants/theme';

interface HubItem {
  route: '/tracabilite/bons-collecte' | '/tracabilite/fiches-collecte';
  emoji: string;
  title: string;
  subtitle: string;
}

const ITEMS: HubItem[] = [
  {
    route: '/tracabilite/bons-collecte',
    emoji: '🧾',
    title: 'Bons de collecte (FABC)',
    subtitle: 'Saisir un bon sur le marché : producteur, poids, prix unitaire.',
  },
  {
    route: '/tracabilite/fiches-collecte',
    emoji: '📄',
    title: 'Fiches de collecte (FC)',
    subtitle: "Regrouper les FABC d'un marché : totaux et producteurs.",
  },
];

export default function TracabiliteHub() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Traçabilité terrain', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Saisie terrain de la traçabilité : enregistrez les bons de collecte (FABC) puis
          regroupez-les dans les fiches de collecte (FC) du marché.
        </Text>

        {ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(item.route)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  intro: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardPressed: { opacity: 0.85 },
  emoji: { fontSize: 26 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  chevron: { fontSize: 24, color: colors.textSecondary, fontWeight: '700' },
});