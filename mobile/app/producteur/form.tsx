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

export default function ProducteurForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const router = useRouter();

  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [commune, setCommune] = useState('');
  const [village, setVillage] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [sexe, setSexe] = useState<'M' | 'F'>('M');
  const [telephone, setTelephone] = useState('');
  const [actif, setActif] = useState(true);

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const goBackAfterSave = () => {
    // Navigation explicite : vers le détail (édition) ou la liste (création)
    router.push(editing ? `/producteur/${id}` : '/(tabs)/producteurs');
  };

  // En mode édition : pré-remplir avec les données existantes
  const loadExisting = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await producteurService.detail(id);
      const p = response.data;
      setCode(p.code);
      setNom(p.nom);
      setPrenom(p.prenom ?? '');
      setCommune(p.commune ?? '');
      setVillage(p.village ?? '');
      setFokontany(p.fokontany ?? '');
      setSexe(p.sexe);
      setTelephone(p.telephone ?? '');
      setActif(p.actif);
    } catch {
      setError('Impossible de charger ce producteur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (editing) loadExisting();
  }, [editing, loadExisting]);

  const handleSave = async () => {
    setError('');
    setFieldErrors({});

    if (editing && !id) return;
    if (!code.trim() || !nom.trim()) {
      setError('Le code et le nom sont obligatoires.');
      return;
    }

    const payload = {
      code: code.trim(),
      nom: nom.trim(),
      prenom: prenom.trim(),
      commune: commune.trim(),
      village: village.trim(),
      fokontany: fokontany.trim(),
      sexe,
      telephone: telephone.trim(),
      actif,
    };

    setSaving(true);
    try {
      if (editing) {
        // La garde ci-dessus garantit que id est défini en mode édition
        await producteurService.update(id as string, payload);
      } else {
        await producteurService.create(payload);
      }
      goBackAfterSave();
    } catch (err) {
      // DRF renvoie { field: [messages], non_field_errors: [...] }
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === 'object') {
        const formatted: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) formatted[key] = String(value[0]);
          else formatted[key] = String(value);
        }
        if (formatted.non_field_errors) {
          setError(formatted.non_field_errors);
          delete formatted.non_field_errors;
        }
        setFieldErrors(formatted);
        if (Object.keys(formatted).length === 0) {
          setError('Impossible de sauvegarder. Vérifiez votre connexion.');
        }
      } else {
        setError('Impossible de sauvegarder. Vérifiez votre connexion.');
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
          title: editing ? 'Modifier producteur' : 'Nouveau producteur',
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
            <Text style={styles.section}>Identité</Text>

            <Text style={styles.label}>Code *</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Ex: PROD001"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />
            {fieldErrors.code ? <Text style={styles.fieldError}>{fieldErrors.code}</Text> : null}

            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom de famille"
              placeholderTextColor={colors.textSecondary}
            />
            {fieldErrors.nom ? <Text style={styles.fieldError}>{fieldErrors.nom}</Text> : null}

            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Prénom"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Sexe</Text>
            <View style={styles.sexeRow}>
              {(['M', 'F'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={({ pressed }) => [
                    styles.sexeButton,
                    sexe === value && styles.sexeButtonActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSexe(value)}
                >
                  <Text style={[styles.sexeText, sexe === value && styles.sexeTextActive]}>
                    {value === 'M' ? 'Homme' : 'Femme'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Localisation</Text>

            <Text style={styles.label}>Commune</Text>
            <TextInput
              style={styles.input}
              value={commune}
              onChangeText={setCommune}
              placeholder="Commune"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Village</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="Village"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Fokontany</Text>
            <TextInput
              style={styles.input}
              value={fokontany}
              onChangeText={setFokontany}
              placeholder="Fokontany"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.section}>Contact & statut</Text>

            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="N° de téléphone"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <Pressable
              style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.8 }]}
              onPress={() => setActif(!actif)}
            >
              <View style={[styles.toggleDot, actif && styles.toggleDotOn]}>
                {actif ? <Text style={styles.toggleCheck}>✓</Text> : null}
              </View>
              <Text style={[styles.toggleText, actif && { fontWeight: '700' }]}>
                {actif ? 'Producteur actif' : 'Producteur inactif'}
              </Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {fieldErrors.non_field_errors ? (
              <Text style={styles.fieldError}>{fieldErrors.non_field_errors}</Text>
            ) : null}

            <View style={styles.buttonsRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(editing ? `/producteur/${id}` : '/(tabs)/producteurs')}
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
                  <Text style={styles.saveText}>{editing ? 'Enregistrer' : 'Créer'}</Text>
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
  sexeRow: { flexDirection: 'row', gap: spacing.sm },
  sexeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sexeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sexeText: { color: colors.textSecondary, fontWeight: '600' },
  sexeTextActive: { color: colors.dark, fontWeight: '800' },
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
  toggleText: { fontSize: 15, color: colors.text, textAlign: 'center' },
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