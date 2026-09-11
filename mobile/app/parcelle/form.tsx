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
import { parcelleService } from '../../src/services/parcelleService';
import { colors, spacing } from '../../src/constants/theme';

// Choix alignés sur backend/parcelles/models.py
const TYPE_VANILLE = ['planifolia', 'tahitensis', 'pompona'];
const CULTURES = ['vanille', 'cafe', 'girofle', 'autre'];
const CERTIFICATIONS = ['g4g', 'ra', 'uebt', 'ffl', 'ft', 'bio', 'pact'];

export default function ParcelleForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const router = useRouter();

  const [producteurId, setProducteurId] = useState('');
  const [numeroParcelle, setNumeroParcelle] = useState('1');
  const [localisation, setLocalisation] = useState('');
  const [typeVanille, setTypeVanille] = useState('planifolia');
  const [culturePrincipale, setCulturePrincipale] = useState('vanille');
  const [dimensionHa, setDimensionHa] = useState('');
  const [nombrePieds, setNombrePieds] = useState('');
  const [certifiee, setCertifiee] = useState(false);
  const [typeCertification, setTypeCertification] = useState('');
  const [active, setActive] = useState(true);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const goBackAfterSave = () => {
    router.push(editing ? `/parcelle/${id}` : '/(tabs)/parcelles');
  };

  const loadExisting = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await parcelleService.detail(id);
      const p = response.data;
      setProducteurId(String(p.producteur));
      setNumeroParcelle(String(p.numero_parcelle));
      setLocalisation(p.localisation ?? '');
      setTypeVanille(p.type_vanille ?? 'planifolia');
      setCulturePrincipale(p.culture_principale ?? 'vanille');
      setDimensionHa(p.dimension_ha != null ? String(p.dimension_ha) : '');
      setNombrePieds(p.nombre_pieds != null ? String(p.nombre_pieds) : '');
      setCertifiee(Boolean(p.certifiee));
      setTypeCertification(p.type_certification ?? '');
      setActive(p.active ?? true);
      setLatitude(p.latitude != null ? String(p.latitude) : '');
      setLongitude(p.longitude != null ? String(p.longitude) : '');
    } catch {
      setError('Impossible de charger cette parcelle.');
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

    const prodId = Number(producteurId);
    if (!Number.isInteger(prodId) || prodId <= 0) {
      setFieldErrors({ producteur: 'ID producteur invalide (entier > 0).' });
      return;
    }
    const num = Number(numeroParcelle);
    if (!Number.isInteger(num) || num <= 0) {
      setFieldErrors({ numero_parcelle: 'Numéro invalide (entier > 0).' });
      return;
    }

    const payload: Record<string, unknown> = {
      producteur: prodId,
      numero_parcelle: num,
      localisation: localisation.trim() || 'Non renseigné',
      type_vanille: typeVanille,
      culture_principale: culturePrincipale,
      certifiee,
      active,
    };
    if (dimensionHa.trim()) {
      const d = Number(dimensionHa.replace(',', '.'));
      if (Number.isNaN(d) || d < 0) {
        setFieldErrors({ dimension_ha: 'Dimension invalide (nombre ≥ 0).' });
        return;
      }
      payload.dimension_ha = d;
    }
    if (nombrePieds.trim()) {
      const n = Number(nombrePieds);
      if (!Number.isInteger(n) || n < 0) {
        setFieldErrors({ nombre_pieds: 'Nombre de pieds invalide (entier ≥ 0).' });
        return;
      }
      payload.nombre_pieds = n;
    }
    payload.type_certification = certifiee ? typeCertification : '';
    if (latitude.trim() || longitude.trim()) {
      const lat = Number(latitude.replace(',', '.'));
      const lon = Number(longitude.replace(',', '.'));
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        setFieldErrors({ latitude: 'Coordonnées GPS invalides.' });
        return;
      }
      payload.latitude = lat;
      payload.longitude = lon;
    }

    setSaving(true);
    try {
      if (editing) {
        await parcelleService.update(id as string, payload);
      } else {
        await parcelleService.create(payload);
      }
      goBackAfterSave();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === 'object') {
        const formatted: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          formatted[key] = Array.isArray(value) ? String(value[0]) : String(value);
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
          title: editing ? 'Modifier parcelle' : 'Nouvelle parcelle',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
        }}
      />
      {loading ? <ActivityIndicator style={styles.loader} /> : (
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.section}>Producteur</Text>
            <Text style={styles.label}>ID producteur *</Text>
            <TextInput
              style={styles.input}
              value={producteurId}
              onChangeText={setProducteurId}
              keyboardType="number-pad"
              placeholder="Ex: 12"
            />
            {fieldErrors.producteur ? (
              <Text style={styles.fieldError}>{fieldErrors.producteur}</Text>
            ) : null}
            <Text style={styles.section}>Identification</Text>
            <Text style={styles.label}>Numéro de parcelle *</Text>
            <TextInput
              style={styles.input}
              value={numeroParcelle}
              onChangeText={setNumeroParcelle}
              keyboardType="number-pad"
              placeholder="1"
            />
            {fieldErrors.numero_parcelle ? (
              <Text style={styles.fieldError}>{fieldErrors.numero_parcelle}</Text>
            ) : null}
            <Text style={styles.label}>Localisation</Text>
            <TextInput
              style={styles.input}
              value={localisation}
              onChangeText={setLocalisation}
              placeholder="Non renseigné"
            />
            <Text style={styles.section}>Culture</Text>
            <Text style={styles.label}>Type de vanille</Text>
            <View style={styles.choiceRow}>
              {TYPE_VANILLE.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.choiceButton, typeVanille === t && styles.choiceButtonActive]}
                  onPress={() => setTypeVanille(t)}
                >
                  <Text style={typeVanille === t ? styles.choiceTextActive : styles.choiceText}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Culture principale</Text>
            <View style={styles.choiceRow}>
              {CULTURES.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.choiceButton,
                    culturePrincipale === c && styles.choiceButtonActive,
                  ]}
                  onPress={() => setCulturePrincipale(c)}
                >
                  <Text
                    style={
                      culturePrincipale === c ? styles.choiceTextActive : styles.choiceText
                    }
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Dimension (ha, optionnel)</Text>
            <TextInput
              style={styles.input}
              value={dimensionHa}
              onChangeText={setDimensionHa}
              keyboardType="numeric"
              placeholder="0.5"
            />
            {fieldErrors.dimension_ha ? (
              <Text style={styles.fieldError}>{fieldErrors.dimension_ha}</Text>
            ) : null}
            <Text style={styles.label}>Nombre de pieds (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={nombrePieds}
              onChangeText={setNombrePieds}
              keyboardType="number-pad"
              placeholder="100"
            />
            {fieldErrors.nombre_pieds ? (
              <Text style={styles.fieldError}>{fieldErrors.nombre_pieds}</Text>
            ) : null}
            <Text style={styles.section}>Certification & GPS</Text>
            <Pressable style={styles.toggleRow} onPress={() => setCertifiee(!certifiee)}>
              <View style={[styles.toggleDot, certifiee && styles.toggleDotOn]}>
                {certifiee ? <Text style={styles.toggleCheck}>V</Text> : null}
              </View>
              <Text style={styles.toggleText}>{certifiee ? 'Certifiée' : 'Non certifiée'}</Text>
            </Pressable>
            <Text style={styles.label}>Type de certification (si certifiée)</Text>
            <View style={styles.choiceRowWrap}>
              {CERTIFICATIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.choiceButton,
                    typeCertification === c && styles.choiceButtonActive,
                  ]}
                  onPress={() => setTypeCertification(c)}
                >
                  <Text
                    style={
                      typeCertification === c ? styles.choiceTextActive : styles.choiceText
                    }
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Latitude (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              placeholder="-14.5"
            />
            {fieldErrors.latitude ? (
              <Text style={styles.fieldError}>{fieldErrors.latitude}</Text>
            ) : null}
            <Text style={styles.label}>Longitude (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              placeholder="49.5"
            />
            {fieldErrors.longitude ? (
              <Text style={styles.fieldError}>{fieldErrors.longitude}</Text>
            ) : null}
            <Pressable style={styles.toggleRow} onPress={() => setActive(!active)}>
              <View style={[styles.toggleDot, active && styles.toggleDotOn]}>
                {active ? <Text style={styles.toggleCheck}>V</Text> : null}
              </View>
              <Text style={styles.toggleText}>{active ? 'Parcelle active' : 'Inactive'}</Text>
            </Pressable>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.dark} />
              ) : (
                <Text style={styles.saveText}>{editing ? 'Enregistrer' : 'Créer'}</Text>
              )}
            </Pressable>
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
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  choiceRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
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
  toggleText: { fontSize: 15, color: colors.text },
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