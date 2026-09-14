import React, { useCallback, useEffect, useState } from 'react';
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
import { DOTATION_TYPES } from '../../src/types/api';

export default function DotationForm() {
  const { producteur } = useLocalSearchParams<{ producteur?: string }>();
  const router = useRouter();

  const [typeDotation, setTypeDotation] = useState(DOTATION_TYPES[0].value);
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