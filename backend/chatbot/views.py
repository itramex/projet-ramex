from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from decouple import config
from .intent_analyzer import IntentAnalyzer
from .database_service import DatabaseService
from .calculator_service import CalculatorService
from .ollama_service import OllamaService
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.intent_analyzer = IntentAnalyzer(use_ollama=False)
        self.db_service = DatabaseService()
        self.calculator = CalculatorService()
        # Ollama est optionnel : activé uniquement via CHATBOT_USE_OLLAMA=True
        # dans le .env. Par défaut, aucune connexion réseau n'est tentée et
        # l'analyse locale par patterns répond instantanément.
        self.ollama_service = None
        self.use_ollama = False
        if config('CHATBOT_USE_OLLAMA', default=False, cast=bool):
            self.ollama_service = OllamaService()
            self.use_ollama = self.ollama_service.is_available()
    
    def post(self, request):
        message = request.data.get('message', '').strip()
        
        if not message:
            return Response({
                'response': 'Veuillez poser une question.',
                'success': False
            })
        
        # Si Ollama est disponible, utilise l'IA pour le traitement
        if self.use_ollama:
            try:
                response_text = self._process_with_ollama(message)
                return Response({
                    'response': response_text,
                    'intent': 'ai_processed',
                    'success': True,
                    'ai_mode': True
                })
            except Exception as e:
                logger.error(f"Erreur Ollama: {str(e)}")
                # Fallback sur le système classique
                pass
        
        # Fallback sur le système classique
        intent_data = self.intent_analyzer.detect_intent(message)
        intent = intent_data['intent']
        
        # Traite selon l'intention
        try:
            response_text = self._process_intent(intent, message)
            return Response({
                'response': response_text,
                'intent': intent,
                'success': True,
                'ai_mode': False
            })
        except Exception as e:
            return Response({
                'response': f"Désolé, je n'ai pas pu traiter votre demande: {str(e)}",
                'success': False
            }, status=500)
    
    def _process_intent(self, intent: str, message: str) -> str:
        """Traite l'intention et retourne une réponse"""
        
        if intent == 'count_producteurs':
            count = self.db_service.count_producteurs()
            return f"Il y a actuellement {count} producteur(s) dans la base de données."
        
        elif intent == 'count_producteurs_actifs':
            count = self.db_service.count_producteurs_actifs()
            return f"Il y a {count} producteur(s) actif(s)."
        
        elif intent == 'count_producteurs_inactifs':
            count = self.db_service.count_producteurs_inactifs()
            return f"Il y a {count} producteur(s) inactif(s)."
        
        elif intent == 'count_producteurs_femmes':
            count = self.db_service.count_producteurs_par_sexe('F')
            return f"Il y a {count} femme(s) productrice(s)."
        
        elif intent == 'count_producteurs_hommes':
            count = self.db_service.count_producteurs_par_sexe('M')
            return f"Il y a {count} homme(s) producteur(s)."
        
        elif intent == 'count_producteurs_village':
            village = self.intent_analyzer.extract_village(message)
            count = self.db_service.count_producteurs_par_village(village)
            if count == 0:
                return f"Aucun producteur trouvé pour le village '{village}'."
            return f"Il y a {count} producteur(s) au village '{village}'."
        
        elif intent == 'list_producteurs_village':
            village = self.intent_analyzer.extract_village(message)
            producteurs = self.db_service.list_producteurs_par_village(village)
            if not producteurs:
                return f"Aucun producteur trouvé pour le village '{village}'."
            lines = [f"Producteurs du village '{village}' ({len(producteurs)}):"]
            for prod in producteurs:
                lines.append(f"- {prod['nom']} {prod['prenom']} ({prod['code']}) - {prod['village']}")
            return '\n'.join(lines)
        
        elif intent == 'list_producteurs':
            producteurs = self.db_service.list_producteurs()
            if not producteurs:
                return "Aucun producteur enregistré."
            lines = [f"Voici les {len(producteurs)} premier(s) producteur(s):"]
            for prod in producteurs:
                lines.append(f"- {prod['nom']} {prod['prenom']} ({prod['code']}) - {prod['village']}")
            return '\n'.join(lines)
        
        elif intent == 'greeting':
            return "Bonjour ! Je suis Assistant Vanille. Posez-moi une question sur les producteurs et les villages, ou tapez 'aide' pour voir ce que je sais faire."
        
        elif intent == 'list_villages':
            villages = self.db_service.list_villages()
            if villages:
                villages_text = ', '.join(villages)
                return f"Voici les villages: {villages_text}"
            return "Aucun village enregistré."
        
        elif intent == 'search_producteur':
            name = self.intent_analyzer.extract_name(message)
            if name:
                results = self.db_service.search_producteur_by_name(name)
                if results:
                    response = f"J'ai trouvé {len(results)} producteur(s):\n"
                    for prod in results[:5]:  # Limite à 5 résultats
                        response += f"- {prod['nom']} {prod['prenom']} ({prod['code']}) - {prod['village']}\n"
                    return response
                return f"Aucun producteur trouvé avec le nom '{name}'."
            return "Veuillez préciser un nom à rechercher."
        
        elif intent == 'get_statistics':
            stats = self.db_service.get_statistics()
            response = f"""📊 Statistiques des Producteurs:
            
Total: {stats['total_producteurs']}
Actifs: {stats['producteurs_actifs']} ({stats['pourcentage_actifs']}%)
Inactifs: {stats['producteurs_inactifs']}

Top 5 Villages:"""
            for village in stats['top_villages']:
                response += f"\n- {village['village']}: {village['count']} producteur(s)"
            return response
        
        elif intent == 'calculate':
            numbers = self.intent_analyzer.extract_numbers(message)
            
            # Essaie d'abord le calcul à partir de mots
            if numbers:
                calc_result = self.calculator.calculate_from_words(message, numbers)
            else:
                # Essaie le calcul direct
                calc_result = self.calculator.calculate(message)
            
            if calc_result['success']:
                return f"{calc_result['expression']} = {calc_result['result']}"
            return "Je n'ai pas pu effectuer ce calcul. Exemple: 'Combien fait 5 + 3 ?'"
        
        else:
            return """Je peux vous aider avec:
- Compter les producteurs (ex: "Combien de producteurs ?")
- Producteurs actifs / inactifs (ex: "Combien d'inactifs ?")
- Par genre (ex: "Combien de femmes productrices ?")
- Par village (ex: "Combien de producteurs a Ambanja ?")
- Lister les producteurs (ex: "Liste des producteurs")
- Lister les villages (ex: "Liste des villages")
- Rechercher un producteur (ex: "Cherche le producteur Rakoto")
- Afficher des statistiques (ex: "Statistiques")
- Faire des calculs (ex: "Combien fait 5 + 3 ?")"""
    
    def _process_with_ollama(self, message: str) -> str:
        """Traite le message avec Ollama pour une compréhension avancée"""
        
        # Analyse l'intention avec Ollama
        intent_analysis = self.ollama_service.analyze_intent(message)
        intent = intent_analysis.get('intent', 'unknown')
        entities = intent_analysis.get('entities', [])
        
        logger.info(f"Ollama intent analysis: {intent_analysis}")
        
        # Si c'est une question de type statistique ou comptage
        if intent in ['count_producteurs', 'statistics', 'search_producteur', 'list_villages', 'list_producteurs']:
            # Génère une requête SQL avec Ollama
            available_tables = ['producteurs', 'cooperatives', 'parcelles', 'lots_vanille']
            sql_query = self.ollama_service.generate_database_query(message, available_tables)
            
            if sql_query:
                try:
                    # Exécute la requête SQL
                    with connection.cursor() as cursor:
                        cursor.execute(sql_query)
                        results = cursor.fetchall()
                        
                        # Obtient les noms des colonnes
                        columns = [col[0] for col in cursor.description]
                        
                        # Formate les données
                        if len(results) == 1 and len(columns) == 1:
                            # Résultat unique (ex: comptage)
                            data = results[0][0]
                        else:
                            # Résultats multiples
                            data = [dict(zip(columns, row)) for row in results]
                        
                        # Formate la réponse avec Ollama
                        formatted_response = self.ollama_service.format_data_response(data, message)
                        return formatted_response
                        
                except Exception as e:
                    logger.error(f"Erreur SQL execution: {str(e)}")
                    # Fallback sur les méthodes classiques
                    return self._process_intent(intent, message)
        
        # Pour les calculs ou autres intentions
        elif intent == 'calculate':
            numbers = [float(e) for e in entities if str(e).replace('.', '').isdigit()]
            if numbers:
                calc_result = self.calculator.calculate_from_words(message, numbers)
                if calc_result['success']:
                    return f"{calc_result['expression']} = {calc_result['result']}"
        
        # Pour les questions générales, utilise Ollama pour générer une réponse
        context = """
        Tu es un assistant intelligent pour une application de gestion des producteurs de vanille à Madagascar.
        Tu peux aider avec des questions sur les producteurs, les coopératives, les parcelles, et les statistiques.
        Sois concis et utile.
        """
        
        return self.ollama_service.generate_response(message, context)
