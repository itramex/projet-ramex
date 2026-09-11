import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { parcelleService } from '../../src/services/parcelleService';
import { colors, spacing } from '../../src/constants/theme';
import { Parcelle } from '../../src/types/parcelle';

const PAGE_SIZE = 50;

function formatHa(value: number | null): string {
  return value != null ? `${value} ha` : '—';
}

export default function ParcellesList() {
  const router = useRouter();
  const [items, setItems] = useState<Parcelle[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  // Recherche avec anti-rebond (400 ms) pour limiter les requêtes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      const currentRequest = ++requestId.current;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        const response = await parcelleService.list({
          page: targetPage,
          page_size: PAGE_SIZE,
          search: debouncedSearch,
        });
        if (currentRequest !== requestId.current) return; // réponse périmée
        const data = response.data;
        // Défensif : garantit un tableau même si le serveur renvoie un shape inattendu
        const results = Array.isArray(data.results) ? data.results : [];
        setCount(data.count ?? results.length);
        setPage(targetPage);
        setHasMore(Boolean(data.next));
        setItems((prev) => (replace ? results : [...prev, ...results]));
      } catch {
        if (currentRequest === requestId.current) {
          setError('Impossible de charger les parcelles. Vérifiez votre connexion.');
        }
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearch]
  );

  // Recharge la page 1 à chaque nouvelle recherche
  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    fetchPage(page + 1, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPage(1, true);
  };

  const renderItem = ({ item }: { item: Parcelle }) => {
    if (!item || !item.id) return null;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/parcelle/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.code_parcelle}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.producteur_nom} · {item.village || item.producteur_commune}
            </Text>
            <Text style={[styles.cardSub, { fontStyle: 'italic' }]} numberOfLines={1}>
              {item.type_vanille_display} · {formatHa(item.dimension_ha)} · {item.nombre_pieds ?? '±'} pieds
            </Text>
          </View>
        </View>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, item.active ? styles.badgeOk : styles.badgeOff]}>
            <Text style={styles.badgeText}>{item.active ? 'Active' : 'Inactive'}</Text>
          </View>
          {item.certifiee ? (
            <View style={styles.badgeCert}>
              <Text style={styles.badgeText}>Certifiée</Text>
            </View>
          ) : null}
          {item.age_parcelle != null ? (
            <View style={styles.badgeAge}>
              <Text style={styles.badgeText}>{item.age_parcelle} ans</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Parcelles</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/parcelle/form')}
          >
            <Text style={styles.addBtnText}>+ Ajouter</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{count} enregistrée{count === 1 ? '' : 's'}</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un code, un producteur, un lieu..."
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          item && item.id != null ? String(item.id) : `key-${index}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              {debouncedSearch
                ? 'Aucune parcelle trouvée pour cette recherche.'
                : 'Aucune parcelle enregistrée.'}
            </Text>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    elevation: 2,
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: colors.dark },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { backgroundColor: '#FFFBEA' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.dark },
  cardMain: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  badgeCert: { backgroundColor: '#FEF3C7' },
  badgeAge: { backgroundColor: '#DBEAFE' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  errorBox: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: colors.danger, fontSize: 13 },
  loader: { marginTop: spacing.xl },
  footerLoader: { paddingVertical: spacing.md },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});