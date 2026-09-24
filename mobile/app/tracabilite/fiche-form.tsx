import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  bonCollecteService,
  campagneService,
  cooperativeService,
  ficheCollecteService,
} from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import {
  BON_COLLECTE_CERTIFICATIONS,
  BonCollecte,
  Campagne,
  Cooperative,
  FicheCollectePayload,
} from '../../src/types/api';

/** Normalise la réponse : DRF paginé {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Montant en Ariary (parité web : Intl.NumberFormat('fr-MG')) */
function formatAr(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!num || isNaN(num)) return '0 Ar';
  return `${Math.round(num).toLocaleString('fr-FR')} Ar`;
}

/** Poids numérique → « 123.5 kg » */
function formatKg(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!num || isNaN(num)) return '0 kg';
  return `${num.toLocaleString('fr-FR')} kg`;
}

/** Option du sélecteur en modal */
interface PickerOption {
  id: number;
  label: string;
  sub?: string;
}

export default function FicheCollecteForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = Boolean(id);

  const [numeroFc, setNumeroFc] = useState('');
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [cooperativeId, setCooperativeId] = useState<number | null>(null);
  const [certification, setCertification] = useState('bio');
  const [dateMarche, setDateMarche] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [agentRe, setAgentRe] = useState('');
  const [nombreProducteurs, setNombreProducteurs] = useState('0');
  const [poidsTotalNet, setPoidsTotalNet] = useState('0');
  const [montantTotal, setMontantTotal] = useState('0');

  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [bons, setBons] = useState<BonCollecte[]>([]);
  const [selectedBons, setSelectedBons] = useState<number[]>([]);
  const [bonSearch, setBonSearch] = useState('');

  const [picker, setPicker] = useState<'campagne' | 'cooperative' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Référentiels + FABC disponibles pour le regroupement
  useEffect(() => {
    (async () => {
      try {
        const [campRes, coopRes, bonsRes] = await Promise.all([
          campagneService.list(),
          cooperativeService.list(),
          bonCollecteService.list({ page_size: 500 }),
        ]);
        setCampagnes(rowsOf(campRes.data));
        setCooperatives(rowsOf(coopRes.data));
        setBons(rowsOf(bonsRes.data));
      } catch {
        setError('Référentiels indisponibles (campagnes / coopératives / FABC).');
      }
    })();
  }, []);

  // Préremplissage en mode édition
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await ficheCollecteService.detail(id);
        if (cancelled) return;
        const fiche = res.data;
        setNumeroFc(fiche.numero_fc);
        setCampagneId(fiche.campagne);
        setCooperativeId(fiche.cooperative);
        setCertification(fiche.certification || 'bio');
        setDateMarche(fiche.date_marche);
        setFokontany(fiche.fokontany);
        setAgentRe(fiche.agent_re);
        setNombreProducteurs(String(fiche.nombre_producteurs ?? 0));
        setPoidsTotalNet(String(fiche.poids_total_net ?? 0));
        setMontantTotal(String(fiche.montant_total ?? 0));
        setSelectedBons(fiche.bons_collecte ?? []);
      } catch {
        if (!cancelled) setError('Impossible de charger cette fiche de collecte.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const campagneOptions: PickerOption[] = useMemo(
    () =>
      campagnes.map((c) => ({ id: c.id, label: c.code, sub: `${c.annee_debut}–${c.annee_fin}` })),
    [campagnes]
  );

  const cooperativeOptions: PickerOption[] = useMemo(
    () =>
      cooperatives.map((c) => ({
        id: c.id,
        label: c.nom,
        sub: [c.code, c.commune].filter(Boolean).join(' · '),
      })),
    [cooperatives]
  );

  const filteredOptions: PickerOption[] = useMemo(() => {
    const options = picker === 'campagne' ? campagneOptions : cooperativeOptions;
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(term) || (o.sub ?? '').toLowerCase().includes(term)
    );
  }, [picker, pickerSearch, campagneOptions, cooperativeOptions]);

  const onPick = (option: PickerOption) => {
    if (picker === 'campagne') {
      setCampagneId(option.id);
      setFieldErrors((prev) => ({ ...prev, campagne: '' }));
    } else {
      setCooperativeId(option.id);
    }
    setPicker(null);
    setPickerSearch('');
  };

  const campagneLabel = campagnes.find((c) => c.id === campagneId)?.code ?? 'Choisir…';
  const cooperativeLabel = cooperativeId
    ? cooperatives.find((c) => c.id === cooperativeId)?.nom ?? '—'
    : 'Aucune';

  // FABC affichés (recherche locale : N° FABC, producteur, village)
  const filteredBons = useMemo(() => {
    const term = bonSearch.trim().toLowerCase();
    if (!term) return bons;
    return bons.filter((b) =>
      [b.numero_fabc, b.producteur_nom ?? '', b.producteur_code ?? '', b.village_marche]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [bons, bonSearch]);

  const selectedCount = selectedBons.length;
  const selectionHint =
    selectedCount === 0
      ? 'Aucun FABC sélectionné — les totaux sont saisis manuellement.'
      : `${selectedCount} FABC — totaux recalculés automatiquement.`;

  /** Coche/décoche un FABC et recalcule les totaux de la fiche */
  const toggleBon = (bonId: number) => {
    const next = selectedBons.includes(bonId)
      ? selectedBons.filter((x) => x !== bonId)
      : [...selectedBons, bonId];
    setSelectedBons(next);
    const chosen = bons.filter((b) => next.includes(b.id));
    if (chosen.length > 0) {
      setNombreProducteurs(String(new Set(chosen.map((b) => b.producteur)).size));
      setPoidsTotalNet(
        String(chosen.reduce((sum, b) => sum + (parseFloat(String(b.poids_accepte)) || 0), 0))
      );
      setMontantTotal(
        String(
          chosen.reduce((sum, b) => sum + (parseFloat(String(b.montant_total_achat)) || 0), 0)
        )
      );
    }
  };
  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!numeroFc.trim()) errs.numero_fc = 'Numéro FC requis';
    if (!campagneId) errs.campagne = 'Campagne requise';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateMarche.trim()))
      errs.date_marche = 'Date attendue au format AAAA-MM-JJ';
    if (!fokontany.trim()) errs.fokontany = 'Fokontany requis';
    if (!agentRe.trim()) errs.agent_re = "Nom de l'agent requis";
    if (isNaN(parseInt(nombreProducteurs, 10)) || parseInt(nombreProducteurs, 10) < 0)
      errs.nombre_producteurs = 'Nombre de producteurs invalide';
    if (isNaN(parseFloat(poidsTotalNet)) || parseFloat(poidsTotalNet) < 0)
      errs.poids_total_net = 'Poids invalide';
    if (isNaN(parseFloat(montantTotal)) || parseFloat(montantTotal) < 0)
      errs.montant_total = 'Montant invalide';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Veuillez corriger les champs en rouge.');
      return;
    }
    setError('');

    const payload: FicheCollectePayload = {
      numero_fc: numeroFc.trim(),
      campagne: campagneId as number,
      cooperative: cooperativeId,
      certification: certification.trim() || 'bio',
      date_marche: dateMarche.trim(),
      fokontany: fokontany.trim(),
      nombre_producteurs: parseInt(nombreProducteurs, 10) || 0,
      poids_total_net: parseFloat(poidsTotalNet) || 0,
      montant_total: parseFloat(montantTotal) || 0,
      agent_re: agentRe.trim(),
      bons_collecte: selectedBons,
    };

    setSaving(true);
    try {
      if (isEdit && id) await ficheCollecteService.update(id, payload);
      else await ficheCollecteService.create(payload);
      router.back();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === 'object') {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          mapped[key] = Array.isArray(value) ? String(value[0]) : String(value);
        }
        setFieldErrors(mapped);
        setError(Object.values(mapped).join(' ') || "Erreur lors de l'enregistrement.");
      } else {
        setError('Serveur injoignable — enregistrement impossible.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <Stack.Screen
          options={{ title: isEdit ? 'Modifier la FC' : 'Nouvelle FC', headerShown: true }}
        />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: isEdit ? 'Modifier la FC' : 'Nouvelle FC', headerShown: true }}
      />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Identification */}
          <Text style={styles.section}>Identification</Text>

          <Text style={styles.label}>N° FC *</Text>
          <TextInput
            style={styles.input}
            value={numeroFc}
            onChangeText={setNumeroFc}
            placeholder="Ex : FC-0001"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
          {fieldErrors.numero_fc ? (
            <Text style={styles.fieldError}>{fieldErrors.numero_fc}</Text>
          ) : null}

          <Text style={styles.label}>Campagne *</Text>
          <Pressable style={styles.pickerButton} onPress={() => setPicker('campagne')}>
            <Text style={[styles.pickerText, campagneId ? undefined : styles.pickerPlaceholder]}>
              {campagneLabel}
            </Text>
          </Pressable>
          {fieldErrors.campagne ? (
            <Text style={styles.fieldError}>{fieldErrors.campagne}</Text>
          ) : null}

          <Text style={styles.label}>Coopérative</Text>
          <Pressable style={styles.pickerButton} onPress={() => setPicker('cooperative')}>
            <Text style={styles.pickerText}>{cooperativeLabel}</Text>
          </Pressable>

          <Text style={styles.label}>Certification</Text>
          <View style={styles.choiceRowWrap}>
            {BON_COLLECTE_CERTIFICATIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.choiceButton,
                  certification === opt.value && styles.choiceButtonActive,
                ]}
                onPress={() => setCertification(opt.value)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    certification === opt.value && styles.choiceTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Date du marché * (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={dateMarche}
            onChangeText={setDateMarche}
            placeholder="2025-07-15"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
          />
          {fieldErrors.date_marche ? (
            <Text style={styles.fieldError}>{fieldErrors.date_marche}</Text>
          ) : null}

          <Text style={styles.label}>Fokontany *</Text>
          <TextInput
            style={styles.input}
            value={fokontany}
            onChangeText={setFokontany}
            placeholder="Fokontany"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.fokontany ? (
            <Text style={styles.fieldError}>{fieldErrors.fokontany}</Text>
          ) : null}

          <Text style={styles.label}>Agent RE *</Text>
          <TextInput
            style={styles.input}
            value={agentRe}
            onChangeText={setAgentRe}
            placeholder="Nom de l'agent"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.agent_re ? (
            <Text style={styles.fieldError}>{fieldErrors.agent_re}</Text>
          ) : null}
          {/* Totaux */}
          <Text style={styles.section}>Totaux</Text>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{selectionHint}</Text>
          </View>

          <Text style={styles.label}>Nombre de producteurs</Text>
          <TextInput
            style={styles.input}
            value={nombreProducteurs}
            onChangeText={setNombreProducteurs}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.nombre_producteurs ? (
            <Text style={styles.fieldError}>{fieldErrors.nombre_producteurs}</Text>
          ) : null}

          <Text style={styles.label}>Poids total net (kg)</Text>
          <TextInput
            style={styles.input}
            value={poidsTotalNet}
            onChangeText={setPoidsTotalNet}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.poids_total_net ? (
            <Text style={styles.fieldError}>{fieldErrors.poids_total_net}</Text>
          ) : null}

          <Text style={styles.label}>Montant total (Ar)</Text>
          <TextInput
            style={styles.input}
            value={montantTotal}
            onChangeText={setMontantTotal}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.montant_total ? (
            <Text style={styles.fieldError}>{fieldErrors.montant_total}</Text>
          ) : null}

          {/* FABC regroupés */}
          <Text style={styles.section}>FABC regroupés</Text>

          <TextInput
            style={styles.listSearch}
            placeholder="Filtrer (N° FABC, producteur, village…)"
            placeholderTextColor={colors.textSecondary}
            value={bonSearch}
            onChangeText={setBonSearch}
            autoCapitalize="none"
          />
          <Text style={styles.counterText}>
            {selectedBons.length} sélectionné(s) — {filteredBons.length} FABC affiché(s)
          </Text>
          <View style={styles.listBox}>
            {filteredBons.length === 0 ? (
              <Text style={styles.hintText}>Aucun FABC disponible pour le moment.</Text>
            ) : (
              filteredBons.map((bon) => {
                const checked = selectedBons.includes(bon.id);
                return (
                  <Pressable
                    key={bon.id}
                    style={[styles.bonRow, checked && styles.bonRowActive]}
                    onPress={() => toggleBon(bon.id)}
                  >
                    <View style={styles.bonInfo}>
                      <Text style={styles.bonLabel}>{bon.numero_fabc}</Text>
                      <Text style={styles.bonSub}>
                        {bon.producteur_nom || `Producteur #${bon.producteur}`} ·{' '}
                        {String(bon.poids_accepte)} kg · {formatAr(bon.montant_total_achat)}
                      </Text>
                    </View>
                    <Text style={styles.checkMark}>{checked ? '✓' : ''}</Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.dark} />
              ) : (
                <Text style={styles.saveText}>{isEdit ? 'Modifier' : 'Enregistrer'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sélecteur campagne / coopérative */}
      <Modal visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {picker === 'campagne' ? 'Campagne' : 'Coopérative'}
            </Text>
            <Pressable onPress={() => setPicker(null)}>
              <Text style={styles.modalClose}>Fermer</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.modalSearch}
            placeholder="Rechercher…"
            placeholderTextColor={colors.textSecondary}
            value={pickerSearch}
            onChangeText={setPickerSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const checked =
                (picker === 'campagne' && campagneId === item.id) ||
                (picker === 'cooperative' && cooperativeId === item.id);
              return (
                <Pressable style={styles.optionRow} onPress={() => onPick(item)}>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    {item.sub ? <Text style={styles.optionSub}>{item.sub}</Text> : null}
                  </View>
                  <Text style={styles.optionCheck}>{checked ? '✓' : ''}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keyboard: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: 4 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
  },
  pickerButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: 4,
  },
  pickerText: { fontSize: 15, color: colors.text },
  pickerPlaceholder: { color: colors.textSecondary },
  choiceRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 6 },
  choiceButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 14, color: colors.text },
  choiceTextActive: { fontSize: 14, color: colors.dark, fontWeight: '700' },
  hintBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: 6,
  },
  hintText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  listSearch: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginTop: 6,
  },
  counterText: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  listBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 6,
  },
  bonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  bonRowActive: { backgroundColor: colors.primaryDim },
  bonInfo: { flex: 1 },
  bonLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  bonSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkMark: { fontSize: 16, fontWeight: '800', color: colors.primary },
  previewBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  previewLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  previewValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  errorText: { fontSize: 13, color: '#DC2626', marginTop: spacing.md, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.75 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 14, fontWeight: '700', color: colors.primary },
  modalSearch: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  optionCheck: { fontSize: 16, fontWeight: '800', color: colors.primary, marginLeft: spacing.sm },
});