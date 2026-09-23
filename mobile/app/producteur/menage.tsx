import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { producteurService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { MenagePayload } from '../../src/types/api';

/**
 * M-11 — Ménage : composition du foyer d'un producteur.
 * Mêmes noms de champs que le backend (ProducteurCreateUpdateSerializer)
 * pour un PATCH partiel. Le taux de scolarisation est recalculé côté serveur.
 */
function NumField({
  label,
  value,
  onChange,
  fieldError,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fieldError?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
      />
      {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
    </View>
  );
}

export default function MenageForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [producteurNom, setProducteurNom] = useState('');
  const [adultes, setAdultes] = useState('');
  const [hommes, setHommes] = useState('');
  const [femmes, setFemmes] = useState('');
  const [garcons, setGarcons] = useState('');
  const [filles, setFilles] = useState('');
  const [autresGarcons, setAutresGarcons] = useState('');
  const [autresFilles, setAutresFilles] = useState('');
  const [scolarises, setScolarises] = useState('');
  const [nonScolarises, setNonScolarises] = useState('');
  const [handicap, setHandicap] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const parseNum = (v: string): number | undefined | null => {
    const t = v.trim();
    if (t === '') return undefined; // champ vide = inchangé
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0 || n > 20) return null; // invalide
    return n;
  };

  const loadExisting = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await producteurService.detail(id);
      const p = response.data as unknown as Record<string, unknown>;
      setProducteurNom(
        (p.nom_complet as string) || `${p.nom ?? ''} ${p.prenom ?? ''}`.trim(),
      );
      const str = (k: string) =>
        p[k] === null || p[k] === undefined ? '' : String(p[k]);
      setAdultes(str('nb_adultes_plus_18'));
      setHommes(str('nb_hommes_adultes'));
      setFemmes(str('nb_femmes_adultes'));
      setGarcons(str('nb_enfants_garcons'));
      setFilles(str('nb_enfants_filles'));
      setAutresGarcons(str('nb_autres_garcons'));
      setAutresFilles(str('nb_autres_filles'));
      setScolarises(str('nb_enfants_scolarises'));
      setNonScolarises(str('nb_enfants_non_scolarises'));
      setHandicap(Boolean(p.personne_handicap_foyer));
    } catch {
      setError('Impossible de charger ce producteur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const handleSave = async () => {
    setError('');
    setFieldErrors({});
    if (!id) return;

    const entries: Array<[string, string]> = [
      ['nb_adultes_plus_18', adultes],
      ['nb_hommes_adultes', hommes],
      ['nb_femmes_adultes', femmes],
      ['nb_enfants_garcons', garcons],
      ['nb_enfants_filles', filles],
      ['nb_autres_garcons', autresGarcons],
      ['nb_autres_filles', autresFilles],
      ['nb_enfants_scolarises', scolarises],
      ['nb_enfants_non_scolarises', nonScolarises],
    ];
    const payload: MenagePayload = { personne_handicap_foyer: handicap };
    const formatted: Record<string, string> = {};
    for (const [key, raw] of entries) {
      const parsed = parseNum(raw);
      if (parsed === undefined) continue;
      if (parsed === null) {
        formatted[key] = 'Entier entre 0 et 20 attendu.';
        continue;
      }
      (payload as Record<string, number>)[key] = parsed;
    }
    if (Object.keys(formatted).length > 0) {
      setFieldErrors(formatted);
      return;
    }

    setSaving(true);
    try {
      await producteurService.patch(id, payload);
      router.push(`/producteur/${id}`);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      if (data && typeof data === 'object') {
        const ferr: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) ferr[key] = String(value[0]);
          else if (typeof value === 'string') ferr[key] = value;
        }
        if (Object.keys(ferr).length > 0) setFieldErrors(ferr);
        else setError('Enregistrement impossible. Reessayez.');
      } else {
        setError('Serveur injoignable. Verifiez votre connexion.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Menage — ${producteurNom || 'producteur'}`,
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.section}>Adultes (18 ans et +)</Text>
            <NumField label="Personnes de 18 ans et +" value={adultes} onChange={setAdultes} fieldError={fieldErrors.nb_adultes_plus_18} />
            <NumField label="Hommes adultes" value={hommes} onChange={setHommes} fieldError={fieldErrors.nb_hommes_adultes} />
            <NumField label="Femmes adultes" value={femmes} onChange={setFemmes} fieldError={fieldErrors.nb_femmes_adultes} />

            <Text style={styles.section}>Enfants du foyer</Text>
            <NumField label="Garcons" value={garcons} onChange={setGarcons} fieldError={fieldErrors.nb_enfants_garcons} />
            <NumField label="Filles" value={filles} onChange={setFilles} fieldError={fieldErrors.nb_enfants_filles} />
            <NumField label="Autres garcons" value={autresGarcons} onChange={setAutresGarcons} fieldError={fieldErrors.nb_autres_garcons} />
            <NumField label="Autres filles" value={autresFilles} onChange={setAutresFilles} fieldError={fieldErrors.nb_autres_filles} />

            <Text style={styles.section}>Scolarisation</Text>
            <NumField label="Enfants scolarises" value={scolarises} onChange={setScolarises} fieldError={fieldErrors.nb_enfants_scolarises} />
            <NumField label="Enfants non scolarises" value={nonScolarises} onChange={setNonScolarises} fieldError={fieldErrors.nb_enfants_non_scolarises} />
            <Text style={styles.hint}>
              Le taux de scolarisation est recalcule automatiquement par le serveur.
            </Text>

            <Pressable style={styles.toggleRow} onPress={() => setHandicap(!handicap)}>
              <View style={[styles.toggleDot, handicap && styles.toggleDotOn]}>
                {handicap ? <Text style={styles.toggleCheck}>V</Text> : null}
              </View>
              <Text style={styles.toggleText}>Personne en situation de handicap dans le foyer</Text>
            </Pressable>

            <View style={styles.buttonsRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(`/producteur/${id}`)}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.savePressed,
                  saving && styles.saveDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.dark} />
                ) : (
                  <Text style={styles.saveText}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  loader: { marginTop: spacing.xl * 2 },
  content: { padding: spacing.lg },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  toggleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotOn: { backgroundColor: colors.success, borderColor: colors.success },
  toggleCheck: { color: colors.textOnDark, fontSize: 14, fontWeight: '800' },
  toggleText: { fontSize: 14, color: colors.text, flex: 1 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  buttonsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  savePressed: { backgroundColor: colors.primaryDim },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
});
