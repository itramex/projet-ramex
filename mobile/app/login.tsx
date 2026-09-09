import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors, spacing } from '../src/constants/theme';

export default function Login() {
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Déjà connecté (ou connexion juste réussie) -> accueil
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(username.trim(), password);
      // La redirection est déclenchée par le bloc ci-dessus (user non null)
    } catch (err) {
      // Distingue les causes : 401 = mauvais identifiants,
      // réponse réseau présente mais refusée = config serveur, sinon = injoignable
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        setError('Identifiants invalides.');
      } else if (status === 400) {
        setError(
          "Le serveur refuse la requete (Host). Ajoutez l'IP du PC a ALLOWED_HOSTS dans backend/.env et relancez Django."
        );
      } else {
        setError(
          'Serveur injoignable. Lancez Django avec: python manage.py runserver 0.0.0.0:8000 (et autorisez le port 8000 dans le pare-feu Windows).'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoBlock}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>R</Text>
        </View>
        <Text style={styles.title}>RAMEX</Text>
        <Text style={styles.subtitle}>Gestion de la production de vanille</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Identifiant</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Votre identifiant"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Votre mot de passe"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.dark} />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          Utilisez les mêmes identifiants que sur l'application web.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.dark,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textOnDark,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDim,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
