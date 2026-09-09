import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

/** Route d'entrée : redirige vers les onglets si connecté, sinon vers le login */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
