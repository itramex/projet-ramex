import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { agrService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import {
  AGR_TYPES,
  AGR_UTILISATIONS,
  AGRPayload,
  AGRType,
  AGRUtilisation,
} from '../../src/types/api';

/** Convertit une saisie chaîne en nombre nullable (vide → null) */
function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

export default function AgrForm() {
  const { producteur, id } = useLocalSearchParams<{ producteur?: string; id?: string }>();
  const router = useRouter();
  const isEdit = Boolean(id);

  const [typeAgr, setTypeAgr] = useState<AGRType>(AGR_TYPES[0].value);
  const [ordre, setOrdre] = useState('1');
  const [intrantsRecus, setIntrantsRecus] = useState(false);
  const [quantiteIntrants, setQuantiteIntrants] = useState('');
  const [utilisation, setUtilisation] = useState<AGRUtilisation | ''>('');
  const [quantiteConsommee, setQuantiteConsommee] = useState('');
  const [quantiteVendue, setQuantiteVendue] = useState('');
  const [uniteMesure, setUniteMesure] = useState('kg');
  const [prixVente, setPrixVente] = useState('');
  const [nombreBassins, setNombreBassins] = useState('');
  const [nombreVolailles, setNombreVolailles] = useState('');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Préremplissage en mode édition
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await agrService.detail(id);
        if (cancelled) return;
        const agr = res.data;
        setTypeAgr(agr.type_agr);
        setOrdre(String(agr.ordre));
        setIntrantsRecus(Boolean(agr.intrants_recus));
        setQuantiteIntrants(agr.quantite_intrants != null ? String(agr.quantite_intrants) : '');
        setUtilisation(agr.utilisation || '');
        setQuantiteConsommee(
          agr.quantite_consommee_annuelle != null ? String(agr.quantite_consommee_annuelle) : ''
        );
        setQuantiteVendue(
          agr.quantite_vendue_annuelle != null ? String(agr.quantite_vendue_annuelle) : ''
        );
        setUniteMesure(agr.unite_mesure || 'kg');
        setPrixVente(agr.prix_vente_unitaire != null ? String(agr.prix_vente_unitaire) : '');
        setNombreBassins(agr.nombre_bassins != null ? String(agr.nombre_bassins) : '');
        setNombreVolailles(agr.nombre_volailles != null ? String(agr.nombre_volailles) : '');
        setActive(Boolean(agr.active));
      } catch {
        if (!cancelled) setError('Impossible de charger cette AGR.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Aperçu du revenu (calcul identique au backend : vendue × prix)
  const revenuPreview = (parseFloat(quantiteVendue) || 0) * (parseFloat(prixVente) || 0);

  const handleSave = async () => {
    setError('');
    setFieldErrors({});

    if (!producteur) {
      setError('Producteur requis pour enregistrer une AGR.');
      return;
    }

    const ordreNum = parseInt(ordre, 10);
    const errors: Record<string, string> = {};
    if (isNaN(ordreNum) || ordreNum < 1) {
      errors.ordre = "L'ordre doit être un entier ≥ 1.";
    }
    if (utilisation === 'consommation' || utilisation === 'les_deux') {
      const q = parseFloat(quantiteConsommee);
      if (isNaN(q) || q <= 0) {
        errors.quantite_consommee_annuelle = 'Quantité consommée requise et positive.';
      }
    }
    if (utilisation === 'vente' || utilisation === 'les_deux') {
      const q = parseFloat(quantiteVendue);
      if (isNaN(q) || q <= 0) {
        errors.quantite_vendue_annuelle = 'Quantité vendue requise et positive.';
      }
    }
    for (const [key, value] of [
      ['quantite_intrants', quantiteIntrants],
      ['prix_vente_unitaire', prixVente],
      ['nombre_bassins', nombreBassins],
      ['nombre_volailles', nombreVolailles],
    ] as const) {
      if (value.trim() !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        errors[key] = 'La valeur doit être un nombre positif.';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload: AGRPayload = {
      producteur: parseInt(producteur, 10),
      type_agr: typeAgr,
      ordre: ordreNum,
      intrants_recus: intrantsRecus,
      quantite_intrants: numOrNull(quantiteIntrants),
      utilisation,
      quantite_consommee_annuelle: numOrNull(quantiteConsommee),
      quantite_vendue_annuelle: numOrNull(quantiteVendue),
      unite_mesure: uniteMesure,
      prix_vente_unitaire: numOrNull(prixVente),
      nombre_bassins: nombreBassins.trim() === '' ? null : parseInt(nombreBassins, 10),
      nombre_volailles: nombreVolailles.trim() === '' ? null : parseInt(nombreVolailles, 10),
      active,
    };

    setSaving(true);
    try {
      if (isEdit && id) await agrService.update(id, payload);
      else await agrService.create(payload);
      router.replace({ pathname: '/producteur/agrs', params: { id: producteur } });
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === 'object') {
        const formatted: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) formatted[key] = String(value[0]);
          else if (typeof value === 'string') formatted[key] = value;
        }
        if (Object.keys(formatted).length > 0) {
          setFieldErrors(formatted);
        } else {
          setError('Enregistrement impossible. Réessayez.');
        }
      } else {
        setError('Serveur injoignable. Vérifiez votre connexion.');
      }
    } finally {
      setSaving(false);
    }
  };

  const otherErrors = Object.entries(fieldErrors)
    .filter(
      ([key]) =>
        ![
          'ordre',
          'quantite_consommee_annuelle',
          'quantite_vendue_annuelle',
          'quantite_intrants',
          'prix_vente_unitaire',
          'nombre_bassins',
          'nombre_volailles',
        ].includes(key)
    )
    .map(([, value]) => value)
    .join(' ');

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'AGR',
            headerStyle: { backgroundColor: colors.dark },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      </View>
    );
  }

  const showConsommation = utilisation === 'consommation' || utilisation === 'les_deux';
  const showVente = utilisation === 'vente' || utilisation === 'les_deux';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEdit ? "Modifier l'AGR" : 'Nouvelle AGR',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Type d'AGR *</Text>
          <View style={styles.choiceRowWrap}>
            {AGR_TYPES.map((option) => {
              const activeChip = option.value === typeAgr;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.choiceButton, activeChip && styles.choiceButtonActive]}
                  onPress={() => setTypeAgr(option.value)}
                >
                  <Text style={activeChip ? styles.choiceTextActive : styles.choiceText}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.type_agr ? (
            <Text style={styles.fieldError}>{fieldErrors.type_agr}</Text>
          ) : null}

          <Text style={styles.label}>Ordre (1, 2, 3…) *</Text>
          <TextInput
            style={styles.input}
            value={ordre}
            onChangeText={setOrdre}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.ordre ? <Text style={styles.fieldError}>{fieldErrors.ordre}</Text> : null}

          <View style={styles.switchRow}>
            <Text style={styles.label}>Intrants reçus</Text>
            <Switch
              value={intrantsRecus}
              onValueChange={setIntrantsRecus}
              trackColor={{ true: colors.primary, false: '#D1D5DB' }}
            />
          </View>
          {intrantsRecus ? (
            <>
              <Text style={styles.label}>Quantité d'intrants reçus</Text>
              <TextInput
                style={styles.input}
                value={quantiteIntrants}
                onChangeText={setQuantiteIntrants}
                keyboardType="number-pad"
                placeholder="Ex : 1000 alevins"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldErrors.quantite_intrants ? (
                <Text style={styles.fieldError}>{fieldErrors.quantite_intrants}</Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.section}>Utilisation de la production</Text>
          <View style={styles.choiceRowWrap}>
            {AGR_UTILISATIONS.map((option) => {
              const activeChip = option.value === utilisation;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.choiceButton, activeChip && styles.choiceButtonActive]}
                  onPress={() => setUtilisation(activeChip ? '' : option.value)}
                >
                  <Text style={activeChip ? styles.choiceTextActive : styles.choiceText}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showConsommation ? (
            <>
              <Text style={styles.label}>Quantité consommée par an *</Text>
              <TextInput
                style={styles.input}
                value={quantiteConsommee}
                onChangeText={setQuantiteConsommee}
                keyboardType="decimal-pad"
                placeholder="Ex : 120"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldErrors.quantite_consommee_annuelle ? (
                <Text style={styles.fieldError}>{fieldErrors.quantite_consommee_annuelle}</Text>
              ) : null}
            </>
          ) : null}

          {showVente ? (
            <>
              <Text style={styles.label}>Quantité vendue par an *</Text>
              <TextInput
                style={styles.input}
                value={quantiteVendue}
                onChangeText={setQuantiteVendue}
                keyboardType="decimal-pad"
                placeholder="Ex : 500"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldErrors.quantite_vendue_annuelle ? (
                <Text style={styles.fieldError}>{fieldErrors.quantite_vendue_annuelle}</Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.section}>Unité de mesure</Text>
          <View style={styles.choiceRowWrap}>
            {['kg', 'nombre'].map((unite) => {
              const activeChip = unite === uniteMesure;
              return (
                <Pressable
                  key={unite}
                  style={[styles.choiceButton, activeChip && styles.choiceButtonActive]}
                  onPress={() => setUniteMesure(unite)}
                >
                  <Text style={activeChip ? styles.choiceTextActive : styles.choiceText}>{unite}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Prix de vente unitaire (Ar)</Text>
          <TextInput
            style={styles.input}
            value={prixVente}
            onChangeText={setPrixVente}
            keyboardType="decimal-pad"
            placeholder="Ex : 2000"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.prix_vente_unitaire ? (
            <Text style={styles.fieldError}>{fieldErrors.prix_vente_unitaire}</Text>
          ) : null}

          {revenuPreview > 0 ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Revenu annuel estimé</Text>
              <Text style={styles.previewValue}>
                {Math.round(revenuPreview).toLocaleString('fr-FR')} Ar
              </Text>
            </View>
          ) : null}

          {typeAgr === 'pisciculture' ? (
            <>
              <Text style={styles.label}>Nombre de bassins</Text>
              <TextInput
                style={styles.input}
                value={nombreBassins}
                onChangeText={setNombreBassins}
                keyboardType="number-pad"
                placeholder="Ex : 3"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldErrors.nombre_bassins ? (
                <Text style={styles.fieldError}>{fieldErrors.nombre_bassins}</Text>
              ) : null}
            </>
          ) : null}

          {typeAgr === 'aviculture' ? (
            <>
              <Text style={styles.label}>Nombre de volailles</Text>
              <TextInput
                style={styles.input}
                value={nombreVolailles}
                onChangeText={setNombreVolailles}
                keyboardType="number-pad"
                placeholder="Ex : 50"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldErrors.nombre_volailles ? (
                <Text style={styles.fieldError}>{fieldErrors.nombre_volailles}</Text>
              ) : null}
            </>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.label}>AGR active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ true: colors.primary, false: '#D1D5DB' }}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {otherErrors ? <Text style={styles.fieldError}>{otherErrors}</Text> : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl * 2 },
  keyboard: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
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
});

