import re
import unicodedata
from typing import Dict, Any, List
from .ollama_service import OllamaService


def _strip_accents(text: str) -> str:
    """Retire les accents (é -> e) pour une comparaison souple des intentions."""
    return ''.join(
        char for char in unicodedata.normalize('NFD', text)
        if unicodedata.category(char) != 'Mn'
    )


class IntentAnalyzer:
    """Analyse les intentions des utilisateurs avec support Ollama"""
    
    def __init__(self, use_ollama: bool = True):
        self.use_ollama = use_ollama
        if use_ollama:
            self.ollama_service = OllamaService()
            self.use_ollama = self.ollama_service.is_available()
    
    # Mots à ignorer lors de l'extraction d'un nom propre
    NAME_STOPWORDS = {
        'cherche', 'trouve', 'recherche', 'producteur', 'productrice',
        'producteurs', 'productrices', 'le', 'la', 'les', 'un', 'une',
        'des', 'du', 'de', 'monsieur', 'madame', 'nomme', 'appele',
        'village', 'commune', 'fokontany', 'liste', 'montre', 'affiche',
        'donne', 'moi', 'qui', 'est', 'combien', 'inactifs', 'actifs',
    }

    # Village = nom propre (majuscule) qui suit une préposition locative.
    # Les variantes longues ("du village de X") sont testées avant les courtes.
    # La continuation accepte un mot d'une seule lettre ("Village A").
    VILLAGE_PATTERN = re.compile(
        r'\b(?:dans\s+(?:le\s+)?village(?:\s+d)?|au\s+village(?:\s+d)?'
        r'|du\s+village(?:\s+d)?|dans\s+le|dans|au|aux|a|à|du|de|des)\s+'
        r'([A-ZÀ-Þ][\w\-]+(?:\s+[A-ZÀ-Þ][\w\-]*)*)'
    )

    def detect_intent(self, message: str) -> Dict[str, Any]:
        """Détecte l'intention à partir du message (du plus spécifique
        au plus général, l'ordre des tests est significatif)"""

        # Si Ollama est disponible, utilise l'IA pour l'analyse
        if self.use_ollama:
            try:
                ollama_result = self.ollama_service.analyze_intent(message)
                if ollama_result.get('confidence', 0) > 0.7:
                    return ollama_result
            except Exception:
                # Fallback sur l'analyse classique
                pass

        # Analyse classique : minuscules + sans accents (resume == résumé)
        msg = _strip_accents(message.lower().strip())

        def matched(*patterns):
            return any(re.search(pattern, msg) for pattern in patterns)

        # 1. Salutations (message court uniquement, pour laisser passer
        #    "Bonjour, combien de producteurs ?")
        if len(msg.split()) <= 2 and re.match(r'^(bonjour|bonsoir|salut|hello|coucou|hi)\b', msg):
            return self._intent(message, 'greeting')

        # 2. Demande d'aide
        if matched(r'\b(aide|help|assistance)\b', r'que (sais|savez|peux|pouvez)',
                   r'(quelles?|que) (sont|est) (tes|vos) (capacites?|fonctionnalites?)'):
            return self._intent(message, 'help')

        # 3. Calculs : opérateurs explicites ("5 + 3") ou verbes de calcul
        if matched(r'\d+\s*[+\-*/x×÷]\s*\d+',
                   r'\b(calcule|calculer|calcul|combien fait|additionne?|soustrait?|multiplie?|divise?)\b'):
            return self._intent(message, 'calculate')

        # 4. Statistiques
        if matched(r'\bstatistiques?\b', r'\bstats\b', r'\b(resume|rapport|synthese)\b'):
            return self._intent(message, 'get_statistics')

        # 5. Recherche par nom (verbe de recherche explicite)
        if matched(r'\b(cherche|trouve|recherche)\b'):
            return self._intent(message, 'search_producteur')

        # 6. Comptages par statut/genre (avec ou sans le mot "producteur")
        if matched(r'\binactifs?\b'):
            return self._intent(message, 'count_producteurs_inactifs')
        if matched(r'\b(femmes?|productrices?|filles?)\b'):
            return self._intent(message, 'count_producteurs_femmes')
        if matched(r'\b(hommes?|garcons?|gars)\b'):
            return self._intent(message, 'count_producteurs_hommes')

        # 7. Famille "producteurs" : village, actifs, liste, comptage général
        if matched(r'\bproducteurs?\b|\bproductrices?\b'):
            village = self.extract_village(message)
            if village:
                if matched(r'\b(listes?|montre|affiche|quels?|quelles?|qui)\b'):
                    return self._intent(message, 'list_producteurs_village')
                return self._intent(message, 'count_producteurs_village')
            if matched(r'\bactifs?\b'):
                return self._intent(message, 'count_producteurs_actifs')
            if matched(r'\b(listes?|montre|affiche|quels?|quelles?|qui)\b'):
                return self._intent(message, 'list_producteurs')
            if matched(r'\b(combien|nombre|total|compter|compte)\b'):
                return self._intent(message, 'count_producteurs')

        # 8. Liste des villages
        if matched(r'\b(listes?|quels?|quelles?)\b.*\bvillages?\b', r'^villages?$'):
            return self._intent(message, 'list_villages')

        return {
            'intent': 'unknown',
            'message': message,
            'confidence': 0.0
        }

    @staticmethod
    def _intent(message: str, intent: str) -> Dict[str, Any]:
        """Construit le résultat de détection avec la confiance par défaut"""
        return {'intent': intent, 'message': message, 'confidence': 0.95}
    
    def extract_numbers(self, message: str) -> List[float]:
        """Extrait les nombres d'un message"""
        numbers = re.findall(r'-?\d+\.?\d*', message)
        return [float(num) for num in numbers]
    
    def extract_name(self, message: str) -> str:
        """Extrait un nom propre d'un message (hors mots courants).
        Préfère le mot qui suit "nommé" / "appelé"."""
        words = re.findall(r"[A-Za-zÀ-ÿ\-']+", message)
        for index, word in enumerate(words[:-1]):
            if _strip_accents(word.lower()) in ('nomme', 'appele'):
                return words[index + 1]
        for word in words:
            if len(word) > 2 and word[0].isupper() \
                    and _strip_accents(word.lower()) not in self.NAME_STOPWORDS:
                return word
        return ""

    def extract_village(self, message: str) -> str:
        """Extrait un village mentionné après une préposition locative
        (ex: "a Ambanja", "du village Marovovonana").
        Le village est un nom propre : il commence par une majuscule
        dans le message original."""
        match = self.VILLAGE_PATTERN.search(message)
        if match:
            return match.group(1).strip()
        return ""
