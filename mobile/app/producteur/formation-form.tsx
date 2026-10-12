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
import { formationService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { FormationPayload, TypeFormation } from '../../src/types/api';

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function FormationForm() {
  const { producteur, id } = useLocalSearchParams<{ producteur?: string; id?: string }>();
  const router = useRouter();
  const isEdit = Boolean(id);

  const [types, setTypes] = useState<TypeFormation[]>([]);
  const [typeFormation, setTypeFormation] = useState<number | null>(null);
  const [dateFormation, setDateFormation] = useState('');
  const [lieu, setLieu] = useState('');
  const [organisme, setOrganisme] = useState('');
  const [certificatObtenu, setCertificatObtenu] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Charger le catalogue de types + préremplissage en édition
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tRes = await formationService.typesFormations();
        if (cancelled) return;
        const rows = rowsOf<TypeFormation>(tRes.data);
        setTypes(rows);
        if (!isEdit && rows.length > 0) setTypeFormation(rows[0].id);
      } catch {
        if (!cancelled) setError('Impossible de charger les types de formations.');
      }
      if (id) {
        try {
          const fRes = await formationService.detail(id);
          if (cancelled) return;
          const f = fRes.data;
          setTypeFormation(f.type_formation);
          setDateFormation(f.date_formation || '');
          setLieu(f.lieu || '');
          setOrganisme(f.organisme || '');
          setCertificatObtenu(Boolean(f.certificat_obtenu));
          setNotes(f.notes || '');
        } catch {
          if (!cancelled) setError('Impossible de charger cette formation.');
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!typeFormation) errs.type_formation = 'Sélectionnez un type de formation.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFormation.trim()))
      errs.date_formation = 'Date attendue au format AAAA-MM-JJ';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !producteur) return;

    setSaving(true);
    try {
      const payload: FormationPayload = {
        producteur: Number(producteur),
        type_formation: typeFormation!,
        date_formation: dateFormation.trim(),
        lieu: lieu.trim() || undefined,
        organisme: organisme.trim() || undefined,
        certificat_obtenu: certificatObtenu,
        notes: notes.trim() || undefined,
      };
      if (isEdit && id) await formationService.update(id, payload);
      else await formationService.create(payload);
      router.back();
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: Record<string, unknown> } })?.response;
      const data = resp?.data;
      const next: Record<string, string> = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v) && v.length > 0) next[k] = String(v[0]);
          else if (typeof v === 'string') next[k] = v;
        }
      }
      setFieldErrors(next);
      setError(
        Object.keys(next).length === 0 ? 'Impossible d’enregistrer. Réessayez.' : ''
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: isEdit ? 'Modifier la formation' : 'Inscrire à une formation',
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
          title: isEdit ? 'Modifier la formation' : 'Inscrire à une formation',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.section}>Formation</Text>

          <Text style={styles.label}>Type de formation *</Text>
          <View style={styles.choiceRowWrap}>
            {types.map((t) => {
              const active = t.id === typeFormation;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.choiceButton, active && styles.choiceButtonActive]}
                  onPress={() => setTypeFormation(t.id)}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                    {t.nom}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.type_formation ? (
            <Text style={styles.fieldError}>{fieldErrors.type_formation}</Text>
          ) : null}

          <Text style={styles.label}>Date de la formation * (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={dateFormation}
            onChangeText={setDateFormation}
            placeholder="2025-06-15"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          {fieldErrors.date_formation ? (
            <Text style={styles.fieldError}>{fieldErrors.date_formation}</Text>
          ) : null}

          <Text style={styles.label}>Lieu</Text>
          <TextInput
            style={styles.input}
            value={lieu}
            onChangeText={setLieu}
            placeholder="Salle de formation, village…"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Organisme formateur</Text>
          <TextInput
            style={styles.input}
            value={organisme}
            onChangeText={setOrganisme}
            placeholder="Ex : FOFIFA, GRET…"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Certificat obtenu</Text>
            <Switch
              value={certificatObtenu}
              onValueChange={setCertificatObtenu}
              trackColor={{ true: colors.primaryDim, false: colors.border }}
              thumbColor={certificatObtenu ? colors.primary : '#f4f3f4'}
            />
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observations, thématiques abordées…"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

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
  textArea: { minHeight: 90 },
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

