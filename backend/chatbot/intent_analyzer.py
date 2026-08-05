import re
from typing import Dict, Any, List
from .ollama_service import OllamaService

class IntentAnalyzer:
    """Analyse les intentions des utilisateurs avec support Ollama"""
    
    def __init__(self, use_ollama: bool = True):
        self.use_ollama = use_ollama
        if use_ollama:
            self.ollama_service = OllamaService()
            self.use_ollama = self.ollama_service.is_available()
    
    # Patterns pour identifier les intentions
    PATTERNS = {
        'count': {
            'regex': [
                r'combien.*producteur',
                r'nombre.*producteur',
                r'total.*producteur',
                r'compter.*producteur',
            ],
            'intent': 'count_producteurs'
        },
        'count_actif': {
            'regex': [
                r'combien.*actif',
                r'nombre.*actif',
                r'producteur.*actif',
            ],
            'intent': 'count_producteurs_actifs'
        },
        'count_inactif': {
            'regex': [
                r'combien.*inactif',
                r'nombre.*inactif',
                r'producteur.*inactif',
            ],
            'intent': 'count_producteurs_inactifs'
        },
        'list_village': {
            'regex': [
                r'liste.*village',
                r'villages?',
                r'quels? villages?',
            ],
            'intent': 'list_villages'
        },
        'search_by_name': {
            'regex': [
                r'recherche.*nom',
                r'trouve.*producteur.*nom',
                r'cherche.*producteur',
            ],
            'intent': 'search_producteur'
        },
        'stats': {
            'regex': [
                r'statistique',
                r'stats',
                r'résumé',
                r'rapport',
            ],
            'intent': 'get_statistics'
        },
        'calculate': {
            'regex': [
                r'calcul.*',
                r'combien fait',
                r'addition',
                r'soustraction',
                r'multiplication',
                r'division',
            ],
            'intent': 'calculate'
        },
    }
    
    def detect_intent(self, message: str) -> Dict[str, Any]:
        """Détecte l'intention à partir du message"""
        
        # Si Ollama est disponible, utilise l'IA pour l'analyse
        if self.use_ollama:
            try:
                ollama_result = self.ollama_service.analyze_intent(message)
                if ollama_result.get('confidence', 0) > 0.7:
                    return ollama_result
            except Exception as e:
                # Fallback sur l'analyse classique
                pass
        
        # Fallback sur l'analyse classique par patterns
        message_lower = message.lower().strip()
        
        for pattern_group in self.PATTERNS.values():
            for regex in pattern_group['regex']:
                if re.search(regex, message_lower):
                    return {
                        'intent': pattern_group['intent'],
                        'message': message,
                        'confidence': 0.95
                    }
        
        return {
            'intent': 'unknown',
            'message': message,
            'confidence': 0.0
        }
    
    def extract_numbers(self, message: str) -> List[float]:
        """Extrait les nombres d'un message"""
        numbers = re.findall(r'-?\d+\.?\d*', message)
        return [float(num) for num in numbers]
    
    def extract_name(self, message: str) -> str:
        """Extrait un nom d'un message"""
        # Cherche des mots capitalisés (probablement des noms)
        words = message.split()
        for word in words:
            if word[0].isupper() and len(word) > 2:
                return word
        return ""
