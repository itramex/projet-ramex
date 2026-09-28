/**
 * Utilitaires d'affichage — jamais de « None »/« null » dans les noms.
 */

/** Nettoie une partie de nom : artefacts de sérialisation Python inclus. */
function cleanPart(value?: string | null): string {
  const text = (value ?? '').trim();
  if (text === 'None' || text === 'null' || text === 'undefined') return '';
  return text;
}

/**
 * Construit un nom d'affichage « Nom Prénom » en filtrant les parties
 * manquantes (renom/prenom nuls) au lieu de les stringify en « None ».
 *
 * Reconstruit depuis les champs bruts `nom`/`prenom` (source fiable) et
 * ne retombe sur `nom_complet` nettoyé que si les deux sont vides.
 */
export function formatProducteurName(p: {
  nom?: string | null;
  prenom?: string | null;
  nom_complet?: string | null;
}): string {
  const built = [cleanPart(p.nom), cleanPart(p.prenom)]
    .filter(Boolean)
    .join(' ');
  if (built) return built;
  return (p.nom_complet ?? '')
    .split(/\s+/)
    .filter((part) => cleanPart(part) !== '')
    .join(' ');
}
