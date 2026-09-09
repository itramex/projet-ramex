import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing } from '../../src/constants/theme';

export default function Profil() {
  const { user, signOut } = useAuth();

  // Session terminée (ou expirée) -> retour au login
  if (!user) {
    return <Redirect href="/login" />;
  }

  const confirmSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const nomComplet = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{nomComplet.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{nomComplet}</Text>
        <Text style={styles.role}>{user.role_display}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <View style={styles.infoMain}>
            <Text style={styles.infoLabel}>Identifiant</Text>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>
        </View>
        {user.telephone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <View style={styles.infoMain}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user.telephone}</Text>
            </View>
          </View>
        ) : null}
        {user.cooperative ? (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
            <View style={styles.infoMain}>
              <Text style={styles.infoLabel}>Coopérative</Text>
              <Text style={styles.infoValue}>
                {user.cooperative.nom} ({user.cooperative.code})
              </Text>
            </View>
          </View>
        ) : null}
        {user.agence ? (
          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
            <View style={styles.infoMain}>
              <Text style={styles.infoLabel}>Agence</Text>
              <Text style={styles.infoValue}>{user.agence.nom}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Pressable style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]} onPress={confirmSignOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>RAMEX Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.lg },
  hero: { alignItems: 'center', marginVertical: spacing.xl },
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
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  role: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  card: {
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
  logoutButton: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: spacing.xl },
});
