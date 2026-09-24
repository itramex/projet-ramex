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
import { bonCollecteService, campagneService, producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import {
  BonCollecteCertification,
  BonCollectePayload,
  BonCollecteTypeProduit,
  BON_COLLECTE_CERTIFICATIONS,
  BON_COLLECTE_TYPES_PRODUIT,
  Campagne,
  ModePaiement,
  MODES_PAIEMENT,
  Producteur,
} from '../../src/types/api';

/** Normalise la réponse : DRF paginé {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Libellé d'un choix (fallback : valeur brute) */
function labelOf(
  list: readonly { value: string; label: string }[],
  value: string
): string {
  const found = list.find((o) => o.value === value);
  return found ? found.label : value;
}

/** Option du sélecteur en modal */
interface PickerOption {
  id: number;
  label: string;
  sub?: string;
}

export default function BonCollecteForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = Boolean(id);

  const [numeroFabc, setNumeroFabc] = useState('');
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [producteurId, setProducteurId] = useState<number | null>(null);
  const [dateMarche, setDateMarche] = useState('');
  const [villageMarche, setVillageMarche] = useState('');
  const [commune, setCommune] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [typeProduit, setTypeProduit] = useState<BonCollecteTypeProduit>('vanille_verte');
  const [certification, setCertification] = useState<BonCollecteCertification | ''>('g4g');
  const [poidsLivre, setPoidsLivre] = useState('');
  const [poidsAccepte, setPoidsAccepte] = useState('');
  const [poidsRetour, setPoidsRetour] = useState('0');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [montantPremium, setMontantPremium] = useState('0');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('especes');

  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [producteurs, setProducteurs] = useState<Producteur[]>([]);

  const [picker, setPicker] = useState<'campagne' | 'producteur' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Référentiels (campagnes + producteurs actifs pour le sélecteur terrain)
  useEffect(() => {
    (async () => {
      try {
        const [campRes, prodRes] = await Promise.all([
          campagneService.list(),
          producteurService.list({ page_size: 500, actif: 'true' }),
        ]);
        setCampagnes(rowsOf(campRes.data));
        setProducteurs(rowsOf(prodRes.data));
      } catch {
        setError('Référentiels indisponibles (campagnes / producteurs).');
      }
    })();
  }, []);

  // Préremplissage en mode édition
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await bonCollecteService.detail(id);
        if (cancelled) return;
        const bon = res.data;
        setNumeroFabc(bon.numero_fabc);
        setCampagneId(bon.campagne);
        setProducteurId(bon.producteur);
        setDateMarche(bon.date_marche);
        setVillageMarche(bon.village_marche);
        setCommune(bon.commune);
        setFokontany(bon.fokontany);
        setTypeProduit(bon.type_produit);
        setCertification((bon.certification as BonCollecteCertification) || 'g4g');
        setPoidsLivre(String(bon.poids_total_livre));
        setPoidsAccepte(String(bon.poids_accepte));
        setPoidsRetour(String(bon.poids_retour ?? 0));
        setPrixUnitaire(String(bon.prix_unitaire_marche));
        setMontantPremium(String(bon.montant_premium ?? 0));
        setModePaiement(bon.mode_paiement);
      } catch {
        if (!cancelled) setError('Impossible de charger ce bon de collecte.');
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

  const producteurOptions: PickerOption[] = useMemo(
    () =>
      producteurs.map((p) => ({
        id: p.id,
        label: p.nom_complet || `${p.prenom} ${p.nom}`.trim() || p.nom,
        sub: [p.code, p.village, p.commune].filter(Boolean).join(' · '),
      })),
    [producteurs]
  );

  const filteredOptions: PickerOption[] = useMemo(() => {
    const options = picker === 'campagne' ? campagneOptions : producteurOptions;
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(term) || (o.sub ?? '').toLowerCase().includes(term)
    );
  }, [picker, pickerSearch, campagneOptions, producteurOptions]);

  const onPick = (option: PickerOption) => {
    if (picker === 'campagne') {
      setCampagneId(option.id);
      setFieldErrors((prev) => ({ ...prev, campagne: '' }));
    } else if (picker === 'producteur') {
      setProducteurId(option.id);
      const p = producteurs.find((x) => x.id === option.id);
      if (p) {
        // Auto-localisation (parité web : village/commune/fokontany du producteur)
        if (p.village) setVillageMarche(p.village);
        if (p.commune) setCommune(p.commune);
        if (p.fokontany) setFokontany(p.fokontany);
      }
      setFieldErrors((prev) => ({ ...prev, producteur: '' }));
    }
    setPicker(null);
    setPickerSearch('');
  };

  const campagneLabel = campagnes.find((c) => c.id === campagneId)?.code ?? 'Choisir…';
  const producteur = producteurs.find((p) => p.id === producteurId);
  const producteurLabel = producteur
    ? `${producteur.nom_complet || producteur.nom} (${producteur.code})`
    : 'Choisir…';

  // Aperçu du montant (calcul identique au backend : accepté × prix + premium)
  const montantPreview =
    (parseFloat(poidsAccepte) || 0) * (parseFloat(prixUnitaire) || 0) +
    (parseFloat(montantPremium) || 0);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!numeroFabc.trim()) errs.numero_fabc = 'Numéro FABC requis';
    if (!campagneId) errs.campagne = 'Campagne requise';
    if (!producteurId) errs.producteur = 'Producteur requis';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateMarche.trim()))
      errs.date_marche = 'Date attendue au format AAAA-MM-JJ';
    if (!villageMarche.trim()) errs.village_marche = 'Village requis';
    if (!commune.trim()) errs.commune = 'Commune requise';
    if (!fokontany.trim()) errs.fokontany = 'Fokontany requis';
    if (isNaN(parseFloat(poidsLivre)) || parseFloat(poidsLivre) < 0)
      errs.poids_total_livre = 'Poids livré invalide';
    if (isNaN(parseFloat(poidsAccepte)) || parseFloat(poidsAccepte) < 0)
      errs.poids_accepte = 'Poids accepté invalide';
    if (isNaN(parseFloat(prixUnitaire)) || parseFloat(prixUnitaire) <= 0)
      errs.prix_unitaire_marche = 'Prix unitaire invalide';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Veuillez corriger les champs en rouge.');
      return;
    }
    setError('');

    const payload: BonCollectePayload = {
      numero_fabc: numeroFabc.trim(),
      campagne: campagneId as number,
      producteur: producteurId as number,
      date_marche: dateMarche.trim(),
      village_marche: villageMarche.trim(),
      commune: commune.trim(),
      fokontany: fokontany.trim(),
      type_produit: typeProduit,
      certification: certification || undefined,
      poids_total_livre: parseFloat(poidsLivre) || 0,
      poids_accepte: parseFloat(poidsAccepte) || 0,
      poids_retour: parseFloat(poidsRetour) || 0,
      prix_unitaire_marche: parseFloat(prixUnitaire) || 0,
      montant_premium: parseFloat(montantPremium) || 0,
      mode_paiement: modePaiement,
    };

    setSaving(true);
    try {
      if (isEdit && id) await bonCollecteService.update(id, payload);
      else await bonCollecteService.create(payload);
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
          options={{ title: isEdit ? 'Modifier le FABC' : 'Nouveau FABC', headerShown: true }}
        />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: isEdit ? 'Modifier le FABC' : 'Nouveau FABC', headerShown: true }}
      />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Identification */}
          <Text style={styles.section}>Identification</Text>

          <Text style={styles.label}>N° FABC *</Text>
          <TextInput
            style={styles.input}
            value={numeroFabc}
            onChangeText={setNumeroFabc}
            placeholder="Ex : FABC-0001"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
          {fieldErrors.numero_fabc ? (
            <Text style={styles.fieldError}>{fieldErrors.numero_fabc}</Text>
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

          <Text style={styles.label}>Producteur *</Text>
          <Pressable style={styles.pickerButton} onPress={() => setPicker('producteur')}>
            <Text
              style={[styles.pickerText, producteurId ? undefined : styles.pickerPlaceholder]}
            >
              {producteurLabel}
            </Text>
          </Pressable>
          {fieldErrors.producteur ? (
            <Text style={styles.fieldError}>{fieldErrors.producteur}</Text>
          ) : null}

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

          {/* Lieu */}
          <Text style={styles.section}>Lieu du marché</Text>

          <Text style={styles.label}>Village *</Text>
          <TextInput
            style={styles.input}
            value={villageMarche}
            onChangeText={setVillageMarche}
            placeholder="Village"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.village_marche ? (
            <Text style={styles.fieldError}>{fieldErrors.village_marche}</Text>
          ) : null}

          <Text style={styles.label}>Commune *</Text>
          <TextInput
            style={styles.input}
            value={commune}
            onChangeText={setCommune}
            placeholder="Commune"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.commune ? (
            <Text style={styles.fieldError}>{fieldErrors.commune}</Text>
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
          {/* Produit */}
          <Text style={styles.section}>Produit</Text>

          <Text style={styles.label}>Type de produit</Text>
          <View style={styles.choiceRowWrap}>
            {BON_COLLECTE_TYPES_PRODUIT.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.choiceButton, typeProduit === opt.value && styles.choiceButtonActive]}
                onPress={() => setTypeProduit(opt.value)}
              >
                <Text
                  style={[styles.choiceText, typeProduit === opt.value && styles.choiceTextActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Certification</Text>
          <View style={styles.choiceRowWrap}>
            <Pressable
              style={[styles.choiceButton, certification === '' && styles.choiceButtonActive]}
              onPress={() => setCertification('')}
            >
              <Text style={[styles.choiceText, certification === '' && styles.choiceTextActive]}>
                Aucune
              </Text>
            </Pressable>
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

          {/* Poids */}
          <Text style={styles.section}>Poids (kg)</Text>

          <Text style={styles.label}>Poids total livré *</Text>
          <TextInput
            style={styles.input}
            value={poidsLivre}
            onChangeText={setPoidsLivre}
            placeholder="Ex : 100"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.poids_total_livre ? (
            <Text style={styles.fieldError}>{fieldErrors.poids_total_livre}</Text>
          ) : null}

          <Text style={styles.label}>Poids accepté *</Text>
          <TextInput
            style={styles.input}
            value={poidsAccepte}
            onChangeText={setPoidsAccepte}
            placeholder="Ex : 95"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.poids_accepte ? (
            <Text style={styles.fieldError}>{fieldErrors.poids_accepte}</Text>
          ) : null}

          <Text style={styles.label}>Poids retour</Text>
          <TextInput
            style={styles.input}
            value={poidsRetour}
            onChangeText={setPoidsRetour}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {/* Finances */}
          <Text style={styles.section}>Finances</Text>

          <Text style={styles.label}>Prix unitaire marché (Ar/kg) *</Text>
          <TextInput
            style={styles.input}
            value={prixUnitaire}
            onChangeText={setPrixUnitaire}
            placeholder="Ex : 100000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          {fieldErrors.prix_unitaire_marche ? (
            <Text style={styles.fieldError}>{fieldErrors.prix_unitaire_marche}</Text>
          ) : null}

          <Text style={styles.label}>Montant premium (Ar)</Text>
          <TextInput
            style={styles.input}
            value={montantPremium}
            onChangeText={setMontantPremium}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Mode de paiement</Text>
          <View style={styles.choiceRowWrap}>
            {MODES_PAIEMENT.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.choiceButton,
                  modePaiement === opt.value && styles.choiceButtonActive,
                ]}
                onPress={() => setModePaiement(opt.value)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    modePaiement === opt.value && styles.choiceTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Montant total estimé (Ar)</Text>
            <Text style={styles.previewValue}>
              {Math.round(montantPreview).toLocaleString('fr-FR')} Ar
            </Text>
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

      {/* Sélecteur campagne / producteur */}
      <Modal visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {picker === 'campagne' ? 'Campagne' : 'Producteur'}
            </Text>
            <Pressable onPress={() => setPicker(null)}>
              <Text style={styles.modalClose}>Fermer</Text>
            </Pressable>
          </View>
          {picker === 'producteur' ? (
            <TextInput
              style={styles.modalSearch}
              placeholder="Rechercher (nom, code, village…)"
              placeholderTextColor={colors.textSecondary}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoCapitalize="none"
            />
          ) : null}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const checked =
                (picker === 'campagne' && campagneId === item.id) ||
                (picker === 'producteur' && producteurId === item.id);
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