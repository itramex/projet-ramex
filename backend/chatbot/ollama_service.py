import ollama
import json
import logging
from typing import Dict, Any, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

class OllamaService:
    """Service d'intégration avec Ollama pour le traitement de langage naturel"""
    
    def __init__(self, model_name: str = "llama3.2"):
        self.model_name = model_name
        self.client = ollama.Client(host='http://localhost:11434')
        
    def generate_response(self, prompt: str, context: str = "", max_tokens: int = 500) -> str:
        """Génère une réponse avec Ollama"""
        try:
            full_prompt = f"{context}\n\nQuestion: {prompt}\nRéponse:"
            
            response = self.client.generate(
                model=self.model_name,
                prompt=full_prompt,
                options={
                    'temperature': 0.7,
                    'top_p': 0.9,
                    'max_tokens': max_tokens
                }
            )
            
            return response['response'].strip()
            
        except Exception as e:
            logger.error(f"Erreur Ollama generate_response: {str(e)}")
            return "Désolé, je n'ai pas pu générer une réponse."
    
    def analyze_intent(self, message: str) -> Dict[str, Any]:
        """Analyse l'intention avec Ollama"""
        try:
            prompt = f"""
            Analyse l'intention de ce message en français et retourne uniquement un JSON avec:
            - "intent": le type d'intention (parmi: count_producteurs, list_producteurs, search_producteur, statistics, list_villages, calculate, unknown).
            - "entities": une liste d'entités extraites (noms, villages, filtres comme 'femmes', 'hommes', 'actifs', 'inactifs').
            - "confidence": niveau de confiance (0.0 à 1.0).

            Exemples:
            - "Combien de producteurs ?" -> {{"intent": "count_producteurs", "entities": [], "confidence": 0.98}}
            - "Liste les producteurs du village d'Ambanja" -> {{"intent": "list_producteurs", "entities": ["Ambanja"], "confidence": 0.95}}
            - "Donne-moi la liste des productrices" -> {{"intent": "list_producteurs", "entities": ["femmes"], "confidence": 0.92}}
            - "Cherche le producteur Rakoto" -> {{"intent": "search_producteur", "entities": ["Rakoto"], "confidence": 0.95}}
            - "Qui sont les producteurs inactifs ?" -> {{"intent": "list_producteurs", "entities": ["inactifs"], "confidence": 0.93}}

            Message: "{message}"
            
            Réponse JSON uniquement:
            """
            
            response = self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={'temperature': 0.3}
            )
            
            # Essaie de parser la réponse JSON
            try:
                result = json.loads(response['response'].strip())
                return result
            except json.JSONDecodeError:
                # Si pas de JSON valide, retourne une intention par défaut
                return {
                    'intent': 'unknown',
                    'entities': [],
                    'confidence': 0.0
                }
                
        except Exception as e:
            logger.error(f"Erreur Ollama analyze_intent: {str(e)}")
            return {
                'intent': 'unknown',
                'entities': [],
                'confidence': 0.0
            }
    
    def generate_database_query(self, question: str, available_tables: List[str]) -> Optional[str]:
        """Génère une requête SQL avec Ollama"""
        try:
            tables_info = {
                'producteurs': "producteurs (code, nom, prenom, telephone, village, commune, actif, femme_leader, niveau_education, statut_matrimonial, date_naissance, sexe)",
                'cooperatives': "cooperatives (code, nom, sigle, region, district, commune, village, nombre_membres)",
                'parcelles': "parcelles (code_parcelle, nom_parcelle, dimension_ha, nombre_pieds, type_vanille, annee_plantation, producteur_id)",
                'lots_vanille': "lots_vanille (code_lot, date_recolte, poids_vert_kg, poids_prepare_kg, qualite, statut, producteur_id)"
            }
            
            schema_info = "\n".join([f"- {table}: {info}" for table, info in tables_info.items() if table in available_tables])
            
            prompt = f"""
            Tu es un assistant SQL expert. Génère une requête PostgreSQL pour répondre à cette question.
            
            Schéma disponible:
            {schema_info}
            
            Question: "{question}"
            
            Règles:
            1. Utilise uniquement les tables listées
            2. Retourne uniquement la requête SQL sans explication
            3. Utilise des noms de colonnes exacts du schéma
            4. Pour les pourcentages, arrondis à 2 décimales
            5. Pour les dates, utilise le format YYYY-MM-DD
            
            Réponse SQL uniquement:
            """
            
            response = self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={'temperature': 0.2}
            )
            
            sql_query = response['response'].strip()
            
            # Validation de sécurité basique
            forbidden_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC']
            if any(keyword in sql_query.upper() for keyword in forbidden_keywords):
                logger.warning(f"Requête SQL potentiellement dangereuse bloquée: {sql_query}")
                return None
                
            return sql_query
            
        except Exception as e:
            logger.error(f"Erreur Ollama generate_database_query: {str(e)}")
            return None
    
    def format_data_response(self, data: Any, question: str) -> str:
        """Formate les données en réponse naturelle avec Ollama"""
        try:
            prompt = f"""
            Formate ces données en réponse naturelle en français pour cette question.
            
            Question: "{question}"
            Données: {json.dumps(data, ensure_ascii=False, indent=2)}
            
            Règles:
            1. Sois concis et clair
            2. Utilise des phrases naturelles
            3. Mets en évidence les chiffres importants
            4. Si c'est un tableau, fais une liste lisible
            5. Pour les statistiques, ajoute du contexte
            
            Réponse française naturelle:
            """
            
            response = self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={'temperature': 0.5}
            )
            
            return response['response'].strip()
            
        except Exception as e:
            logger.error(f"Erreur Ollama format_data_response: {str(e)}")
            # Fallback: retourne une réponse basique
            if isinstance(data, list):
                return f"J'ai trouvé {len(data)} résultats."
            elif isinstance(data, dict):
                return f"Données disponibles: {', '.join(data.keys())}"
            else:
                return str(data)
    
    def is_available(self) -> bool:
        """Vérifie si Ollama est disponible"""
        try:
            self.client.list()
            return True
        except Exception:
            return False