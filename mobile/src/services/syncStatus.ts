/**
 * M-23b — État de synchronisation observable (collecte terrain) :
 * - `connectivity` : estimé à partir des réponses réseau réelles (pas de
 *   dépendance externe type NetInfo — le serveur étant la seule source de vérité),
 * - `pending` : nombre de mutations en attente dans `sync_queue`.
 *
 * Les écrans s'abonnent via `subscribe()` pour afficher un badge en temps réel
 * (« Hors ligne · 3 en attente »).
 */
export type ConnectivityState = 'unknown' | 'online' | 'offline';

export interface SyncSnapshot {
  connectivity: ConnectivityState;
  pending: number;
}

let snapshot: SyncSnapshot = { connectivity: 'unknown', pending: 0 };
const listeners = new Set<(s: SyncSnapshot) => void>();

function emit(): void {
  for (const listener of listeners) listener(snapshot);
}

export const syncStatus = {
  /** Instantané courant (lecture synchrone pour le premier rendu). */
  get(): SyncSnapshot {
    return snapshot;
  },

  /**
   * S'abonne aux changements ; l'abonné reçoit immédiatement l'instantané.
   * Retourne la fonction de désabonnement.
   */
  subscribe(listener: (s: SyncSnapshot) => void): () => void {
    listeners.add(listener);
    listener(snapshot);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Une requête réseau a abouti (2xx réel, hors réponses servies du cache). */
  markOnline(): void {
    if (snapshot.connectivity !== 'online') {
      snapshot = { ...snapshot, connectivity: 'online' };
      emit();
    }
  },

  /** Une requête a échoué sans réponse serveur (réseau KO). */
  markOffline(): void {
    if (snapshot.connectivity !== 'offline') {
      snapshot = { ...snapshot, connectivity: 'offline' };
      emit();
    }
  },

  /** Remplace le compteur de mutations en attente. */
  setPending(count: number): void {
    if (snapshot.pending !== count) {
      snapshot = { ...snapshot, pending: count };
      emit();
    }
  },
};

/** Libellé court pour les badges UI. */
export function connectivityLabel(state: ConnectivityState): string {
  if (state === 'online') return 'En ligne';
  if (state === 'offline') return 'Hors ligne';
  return 'Connexion inconnue';
}
