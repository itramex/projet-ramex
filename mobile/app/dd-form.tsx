import React, { useEffect, useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { ddService } from '../src/services/api';
import type {
  ActiviteDDPayload,
  ObjectifClientDD,
  PartenaireDD,
  TypeActiviteDD,
} from '../src/types/api';
import { OBJECTIFS_CLIENT_DD, TYPES_ACTIVITE_DD } from '../src/types/api';
import { colors, spacing } from '../src/constants/theme';

/** Normalise la réponse : DRF paginée {results} ou tableau brut */
function rowsOf<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** M-20 — Saisie d'une activité de Développement durable */
export default function DdForm() {
  const router = useRouter();

  const [typeActivite, setTypeActivite] = useState<TypeActiviteDD>('reboisement');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [objectifClient, setObjectifClient] = useState<ObjectifClientDD>('autre');
  const [participants, setParticipants] = useState('0');
  const [partenaire, setPartenaire] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [resultat, setResultat] = useState('');
  const [notes, setNotes] = useState('');

  const [partenaires, setPartenaires] = useState<PartenaireDD[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Charger les partenaires (liste courte, best-effort)
  useEffect(() => {
    let cancelled = false;
    ddService
      .partenaires()
      .then((res) => {
        if (!cancelled) setPartenaires(rowsOf<PartenaireDD>(res.data));
      })
      .catch(() => {
        if (!cancelled) setPartenaires([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()))
      errs.date = 'Date attendue au format AAAA-MM-JJ';
    if (!description.trim()) errs.description = 'Description obligatoire.';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: ActiviteDDPayload = {
        type_activite: typeActivite,
        date: date.trim(),
        objectif_client: objectifClient,
        description: description.trim(),
        nombre_participants: Number(participants.replace(',', '.')) || 0,
        partenaire: partenaire,
        resultat: resultat.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await ddService.createActivite(payload);
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
        Object.keys(next).length === 0
          ? "Impossible d'enregistrer. Vos droits (admin / animateur / superviseur) sont peut-être insuffisants."
          : ''
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
            title: 'Nouvelle activité DD',
            headerStyle: { backgroundColor: colors.dark },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nouvelle activité DD',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Type d'activité</Text>
        <View style={styles.chips}>
          {TYPES_ACTIVITE_DD.map((t) => (
            <Text
              key={t.value}
              onPress={() => setTypeActivite(t.value)}
              style={[styles.chip, typeActivite === t.value && styles.chipActive]}
            >
              {t.label}
            </Text>
          ))}
        </View>

        <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
        <TextInput
          style={[styles.input, fieldErrors.date && styles.inputError]}
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        {fieldErrors.date ? <Text style={styles.err}>{fieldErrors.date}</Text> : null}

        <Text style={styles.label}>Objectif client</Text>
        <View style={styles.chips}>
          {OBJECTIFS_CLIENT_DD.map((o) => (
            <Text
              key={o.value}
              onPress={() => setObjectifClient(o.value)}
              style={[styles.chip, objectifClient === o.value && styles.chipActive]}
            >
              {o.label}
            </Text>
          ))}
        </View>

        <Text style={styles.label}>Nombre de participants</Text>
        <TextInput
          style={styles.input}
          value={participants}
          onChangeText={setParticipants}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Partenaire impliqué (optionnel)</Text>
        <View style={styles.chips}>
          <Text
            onPress={() => setPartenaire(null)}
            style={[styles.chip, partenaire === null && styles.chipActive]}
          >
            Aucun
          </Text>
          {partenaires.map((p) => (
            <Text
              key={p.id}
              onPress={() => setPartenaire(p.id)}
              style={[styles.chip, partenaire === p.id && styles.chipActive]}
            >
              {p.nom}
            </Text>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textarea, fieldErrors.description && styles.inputError]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez l'activité réalisée…"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        {fieldErrors.description ? <Text style={styles.err}>{fieldErrors.description}</Text> : null}

        <Text style={styles.label}>Résultat obtenu (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={resultat}
          onChangeText={setResultat}
          placeholder="Résultat constaté…"
          placeholderTextColor={colors.textSecondary}
          multiline
        />

        <Text style={styles.label}>Notes (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes complémentaires…"
          placeholderTextColor={colors.textSecondary}
          multiline
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || saving) && styles.savePressed,
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>Enregistrer</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl * 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.dark, borderColor: colors.dark, color: colors.primary },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  inputError: { borderColor: colors.danger },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  err: { color: colors.danger, fontSize: 12, marginTop: 4 },
  saveButton: {
    backgroundColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  savePressed: { opacity: 0.85 },
  saveText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
