import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { certificationService, formationService, producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { Certification, Formation } from '../../src/types/api';
import { formatProducteurName } from '../../src/utils/format';

/** Date ISO (YYYY-MM-DD) → jj/mm/aaaa (fallback : chaîne brute) */
function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parts = String(value).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return String(value);
}

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Couleur du badge de certification selon le statut */
function statutColor(statut: string): { bg: string; text: string } {
  switch (statut) {
    case 'valide':
      return { bg: '#DCFCE7', text: '#166534' };
    case 'expire':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'en_cours':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'suspendu':
      return { bg: '#F3F4F6', text: '#374151' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
}

export default function ProducteurFormations() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [producteurNom, setProducteurNom] = useState('');
  const [producteurCode, setProducteurCode] = useState('');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const [fRes, cRes] = await Promise.all([
        formationService.listByProducteur(id),
        certificationService.listByProducteur(id).catch(() => null),
      ]);
      setFormations(rowsOf<Formation>(fRes.data));
      setCertifications(cRes ? rowsOf<Certification>(cRes.data) : []);
      try {
        const p = await producteurService.detail(id);
        setProducteurNom(formatProducteurName(p.data));
        setProducteurCode(p.data.code);
      } catch {
        // nom facultatif
      }
    } catch {
      setError('Impossible de charger les formations de ce producteur.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goAdd = () => {
    router.push({ pathname: '/producteur/formation-form', params: { producteur: String(id) } });
  };

  const goEdit = (f: Formation) => {
    router.push({
      pathname: '/producteur/formation-form',
      params: { producteur: String(id), id: String(f.id) },
    });
  };

  const confirmDelete = (f: Formation) =>
    Alert.alert(
      'Supprimer cette formation ?',
      `${f.type_formation_nom ?? 'Formation'} du ${formatDate(f.date_formation)} sera supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await formationService.remove(f.id);
              setFormations((prev) => prev.filter((x) => x.id !== f.id));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette formation. Réessayez.');
            }
          },
        },
      ]
    );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Formations',
            headerStyle: { backgroundColor: colors.dark },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Formations & Certifs',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(producteurNom || producteurCode) && (
          <View style={styles.identityCard}>
            {producteurCode ? <Text style={styles.identityCode}>{producteurCode}</Text> : null}
            {producteurNom ? <Text style={styles.identityName}>{producteurNom}</Text> : null}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.cumulRow}>
          <View style={styles.cumulCard}>
            <Text style={styles.cumulLabel}>Formations</Text>
            <Text style={styles.cumulValue}>{formations.length}</Text>
          </View>
          <View style={styles.cumulCard}>
            <Text style={styles.cumulLabel}>Certifications</Text>
            <Text style={styles.cumulValue}>{certifications.length}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
          onPress={goAdd}
        >
          <Text style={styles.addText}>+ Inscrire à une formation</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Formations suivies</Text>
        {formations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucune formation enregistrée pour ce producteur.</Text>
          </View>
        ) : (
          formations.map((f) => (
            <View key={f.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{f.type_formation_nom ?? 'Formation'}</Text>
                {f.certificat_obtenu ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Certificat</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardMeta}>📅 {formatDate(f.date_formation)}</Text>
              {f.lieu ? <Text style={styles.cardMeta}>📍 {f.lieu}</Text> : null}
              {f.organisme ? <Text style={styles.cardMeta}>🏛 {f.organisme}</Text> : null}
              <View style={styles.cardActions}>
                <Pressable
                  style={({ pressed }) => [styles.editLink, pressed && styles.pressed]}
                  onPress={() => goEdit(f)}
                >
                  <Text style={styles.editLinkText}>Modifier</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
                  onPress={() => confirmDelete(f)}
                >
                  <Text style={styles.deleteLinkText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Certifications</Text>
        {certifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucune certification pour ce producteur.</Text>
          </View>
        ) : (
          certifications.map((c) => {
            const sc = statutColor(c.statut);
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{c.type_certification_nom ?? 'Certification'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {c.statut_display ?? c.statut}
                    </Text>
                  </View>
                </View>
                {c.numero_certificat ? <Text style={styles.cardMeta}>N° {c.numero_certificat}</Text> : null}
                <View style={styles.figuresRow}>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>{formatDate(c.date_obtention)}</Text>
                    <Text style={styles.figureLabel}>Obtention</Text>
                  </View>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>{formatDate(c.date_expiration)}</Text>
                    <Text style={styles.figureLabel}>Expiration</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl * 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  identityCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  identityCode: { fontSize: 13, fontWeight: '700', color: colors.primary },
  identityName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginTop: spacing.sm },
  cumulRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cumulCard: {
    flex: 1,
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addPressed: { backgroundColor: colors.primaryDim },
  addText: { color: colors.dark, fontWeight: '700', fontSize: 15 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
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
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#166534' },
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
  pressed: { opacity: 0.75 },
});
