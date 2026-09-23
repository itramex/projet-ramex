import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { dotationService } from '../../src/services/api';
import { colors, spacing } from '../../src/constants/theme';
import { DOTATION_TYPES, DotationType } from '../../src/types/api';

export default function DotationForm() {
  const { producteur } = useLocalSearchParams<{ producteur?: string }>();
  const router = useRouter();

  const [typeDotation, setTypeDotation] = useState<DotationType>(DOTATION_TYPES[0].value);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [quantite, setQuantite] = useState('1');
  const [details, setDetails] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentYear = new Date().getFullYear();

  const handleSave = async () => {
    setError('');
    setFieldErrors({});

    if (!producteur) {
      setError('Producteur requis pour enregistrer une dotation.');
      return;
    }

    const anneeNum = parseInt(annee, 10);
    if (isNaN(anneeNum) || anneeNum < 2000 || anneeNum > currentYear + 1) {
      setFieldErrors({ annee: `L'année doit être comprise entre 2000 et ${currentYear + 1}.` });
      return;
    }
    const quantiteNum = parseInt(quantite, 10);
    if (isNaN(quantiteNum) || quantiteNum < 1) {
      setFieldErrors({ quantite: 'La quantité doit être un nombre positif.' });
      return;
    }

    const payload = {
      producteur: parseInt(producteur, 10),
      type_dotation: typeDotation,
      annee: anneeNum,
      quantite: quantiteNum,
      details: details.trim(),
    };

    setSaving(true);
    try {
      await dotationService.create(payload);
      router.push({ pathname: '/producteur/dotations', params: { id: producteur } });
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

  // Erreurs renvoyées par l'API sur d'autres champs que ceux affichés ci-dessous
  const otherErrors = Object.entries(fieldErrors)
    .filter(([key]) => !['type_dotation', 'annee', 'quantite', 'details'].includes(key))
    .map(([, value]) => value)
    .join(' ');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nouvelle dotation',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Type de dotation *</Text>
          <View style={styles.choiceRowWrap}>
            {DOTATION_TYPES.map((option) => {
              const active = option.value === typeDotation;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.choiceButton, active && styles.choiceButtonActive]}
                  onPress={() => setTypeDotation(option.value)}
                >
                  <Text style={active ? styles.choiceTextActive : styles.choiceText}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.type_dotation ? (
            <Text style={styles.fieldError}>{fieldErrors.type_dotation}</Text>
          ) : null}

          <Text style={styles.label}>Année *</Text>
          <TextInput
            style={styles.input}
            value={annee}
            onChangeText={setAnnee}
            keyboardType="number-pad"
            placeholder={String(currentYear)}
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.annee ? <Text style={styles.fieldError}>{fieldErrors.annee}</Text> : null}

          <Text style={styles.label}>Quantité *</Text>
          <TextInput
            style={styles.input}
            value={quantite}
            onChangeText={setQuantite}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.textSecondary}
          />
          {fieldErrors.quantite ? (
            <Text style={styles.fieldError}>{fieldErrors.quantite}</Text>
          ) : null}

          <Text style={styles.label}>Détails</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder="Précisions (facultatif)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          {fieldErrors.details ? <Text style={styles.fieldError}>{fieldErrors.details}</Text> : null}

          {error || otherErrors ? (
            <Text style={styles.errorText}>{error || otherErrors}</Text>
          ) : null}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.dark} />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldError: { color: colors.danger, fontSize: 12, marginBottom: spacing.xs },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  choiceRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  choiceButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  choiceTextActive: { color: colors.dark, fontWeight: '800', fontSize: 13 },
  saveButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
});
