import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { cooperativeService } from '../../src/services/api';
import type { Cooperative } from '../../src/types/api';
import { colors, spacing } from '../../src/constants/theme';

function CoopCard({ item, onPress }: { item: Cooperative; onPress: () => void }) {
  const membres = item.nombre_membres ?? 0;
  const resp = [item.president, item.secretaire, item.tresorier]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>{item.code}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nom}</Text>
      </View>
      <Text style={styles.cardLocation} numberOfLines={1}>
        {item.commune}{item.village ? ` · ${item.village}` : ''}
        {membres > 0 ? ` · ${membres} membres` : ''}
      </Text>
      {resp !== '' && <Text style={styles.cardResp} numberOfLines={1}>{resp}</Text>}
    </Pressable>
  );
}

export default function CoopérativesScreen() {
  const [items, setItems] = useState<Cooperative[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await cooperativeService.list(q ? { search: q } : {});
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Impossible de charger les coopératives');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSubmitSearch = () => load(search.trim() || undefined);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSubmitSearch}
          placeholder="Rechercher (code, nom, commune...)"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={onSubmitSearch}>
          <Text style={styles.searchBtnText}>OK</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(search.trim() || undefined)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CoopCard
              item={item}
              onPress={() => router.push({ pathname: '/cooperative/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucune coopérative trouvée</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    backgroundColor: colors.card,
  },
  searchBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.card, fontWeight: '700' },
  loader: { marginTop: spacing.xl },
  center: { alignItems: 'center', padding: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  codeBadgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  cardLocation: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  cardResp: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  emptyText: { color: colors.textSecondary },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 14,
  },
  retryText: { color: colors.card, fontWeight: '600' },
});
