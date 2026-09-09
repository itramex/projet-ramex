"""Tests du module chatbot : calculatrice, analyse d'intentions, requêtes DB et API."""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from chatbot.calculator_service import CalculatorService
from chatbot.database_service import DatabaseService
from chatbot.intent_analyzer import IntentAnalyzer
from producteurs.models import Producteur


def _make_producteur(**overrides):
    """Crée un producteur avec des valeurs par défaut réalistes."""
    data = {
        'code': 'PX01',
        'nom': 'Rakoto',
        'prenom': 'Jean',
        'commune': 'Commune A',
        'village': 'Village A',
        'sexe': 'M',
        'actif': True,
    }
    data.update(overrides)
    return Producteur.objects.create(**data)


class CalculatorServiceTests(TestCase):
    def test_calculate_simple_expression(self):
        result = CalculatorService.calculate('5 + 3')
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 8)

    def test_calculate_ignores_non_math_characters(self):
        result = CalculatorService.calculate('2 * 4 ?')
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 8)

    def test_calculate_invalid_expression_fails(self):
        result = CalculatorService.calculate('abc')
        self.assertFalse(result['success'])

    def test_calculate_blocks_code_injection(self):
        # Le nettoyage retire tout caractère non arithmétique : l'injection échoue
        result = CalculatorService.calculate("__import__('os').system('dir')")
        self.assertFalse(result['success'])

    def test_calculate_from_words_addition(self):
        result = CalculatorService.calculate_from_words('addition 2 et 3', [2.0, 3.0])
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 5)

    def test_calculate_from_words_multiplication(self):
        result = CalculatorService.calculate_from_words('multiplie 4 fois 5', [4.0, 5.0])
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 20)

    def test_calculate_from_words_division_by_zero(self):
        result = CalculatorService.calculate_from_words('division 8 par 0', [8.0, 0.0])
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 'Erreur')

    def test_calculate_from_words_needs_two_numbers(self):
        result = CalculatorService.calculate_from_words('addition 5', [5.0])
        self.assertFalse(result['success'])

    def test_calculate_with_explicit_operators(self):
        # Régression : "Combien fait 5 + 3 ?" doit évaluer l'expression
        result = CalculatorService.calculate_from_words('Combien fait 5 + 3 ?', [5.0, 3.0])
        self.assertTrue(result['success'])
        self.assertEqual(result['result'], 8)

    def test_calculate_from_words_without_operator_fails(self):
        result = CalculatorService.calculate_from_words('5 et 3', [5.0, 3.0])
        self.assertFalse(result['success'])


class IntentAnalyzerTests(TestCase):
    def setUp(self):
        # use_ollama=False : analyse par patterns, sans dépendance réseau
        self.analyzer = IntentAnalyzer(use_ollama=False)

    def test_detect_count_producteurs(self):
        result = self.analyzer.detect_intent('Combien de producteurs sont enregistrés ?')
        self.assertEqual(result['intent'], 'count_producteurs')
        self.assertGreater(result['confidence'], 0)

    def test_detect_count_actifs(self):
        result = self.analyzer.detect_intent('quels producteurs sont actifs ?')
        self.assertEqual(result['intent'], 'count_producteurs_actifs')

    def test_detect_count_inactifs(self):
        # Régression : "inactifs" était capturé par le pattern "actif"
        result = self.analyzer.detect_intent("Combien d'inactifs ?")
        self.assertEqual(result['intent'], 'count_producteurs_inactifs')

    def test_detect_femmes(self):
        result = self.analyzer.detect_intent('Combien de femmes productrices ?')
        self.assertEqual(result['intent'], 'count_producteurs_femmes')

    def test_detect_hommes(self):
        result = self.analyzer.detect_intent("Combien d'hommes producteurs ?")
        self.assertEqual(result['intent'], 'count_producteurs_hommes')

    def test_detect_count_village(self):
        result = self.analyzer.detect_intent('Combien de producteurs a Ambanja ?')
        self.assertEqual(result['intent'], 'count_producteurs_village')

    def test_detect_list_producteurs_village(self):
        result = self.analyzer.detect_intent('Liste des producteurs de Sambava')
        self.assertEqual(result['intent'], 'list_producteurs_village')

    def test_detect_list_producteurs(self):
        result = self.analyzer.detect_intent('Liste des producteurs')
        self.assertEqual(result['intent'], 'list_producteurs')

    def test_detect_greeting(self):
        result = self.analyzer.detect_intent('Bonjour')
        self.assertEqual(result['intent'], 'greeting')

    def test_detect_help(self):
        result = self.analyzer.detect_intent('aide')
        self.assertEqual(result['intent'], 'help')

    def test_detect_calculate_with_operators(self):
        result = self.analyzer.detect_intent('Combien fait 5 + 3 ?')
        self.assertEqual(result['intent'], 'calculate')

    def test_detect_list_villages(self):
        result = self.analyzer.detect_intent('Liste des villages')
        self.assertEqual(result['intent'], 'list_villages')

    def test_detect_statistics(self):
        result = self.analyzer.detect_intent('Donne-moi les statistiques')
        self.assertEqual(result['intent'], 'get_statistics')

    def test_detect_calculate(self):
        result = self.analyzer.detect_intent('Combien fait 5 plus 3 ?')
        self.assertEqual(result['intent'], 'calculate')

    def test_detect_unknown_intent(self):
        result = self.analyzer.detect_intent('Bonjour, quelle heure est-il ?')
        self.assertEqual(result['intent'], 'unknown')
        self.assertEqual(result['confidence'], 0.0)

    def test_extract_numbers(self):
        self.assertEqual(self.analyzer.extract_numbers('5 + 3.5 = 8.5'), [5.0, 3.5, 8.5])

    def test_extract_name_returns_first_capitalized_word(self):
        self.assertEqual(self.analyzer.extract_name('cherche le producteur Rakoto'), 'Rakoto')

    def test_extract_name_empty_without_capitalized_word(self):
        self.assertEqual(self.analyzer.extract_name('cherche un producteur'), '')

    def test_extract_name_ignores_verb(self):
        # Régression : "Cherche" (verbe) était retourné au lieu du nom
        self.assertEqual(self.analyzer.extract_name('Cherche le producteur Rakoto'), 'Rakoto')

    def test_extract_name_after_nomme(self):
        self.assertEqual(self.analyzer.extract_name('cherche un producteur nommé Rakoto'), 'Rakoto')

    def test_extract_village(self):
        self.assertEqual(self.analyzer.extract_village('Combien de producteurs a Ambanja ?'), 'Ambanja')

    def test_extract_village_after_du_village(self):
        self.assertEqual(self.analyzer.extract_village('producteurs du village Marovovonana'), 'Marovovonana')

    def test_extract_village_empty(self):
        self.assertEqual(self.analyzer.extract_village('Combien de producteurs ?'), '')


class DatabaseServiceTests(TestCase):
    def test_count_producteurs_actifs_inactifs(self):
        _make_producteur(code='PX01', actif=True)
        _make_producteur(code='PX02', actif=False)
        self.assertEqual(DatabaseService.count_producteurs(), 2)
        self.assertEqual(DatabaseService.count_producteurs_actifs(), 1)
        self.assertEqual(DatabaseService.count_producteurs_inactifs(), 1)

    def test_list_villages_returns_unique_values(self):
        _make_producteur(code='PX01', village='Village A')
        _make_producteur(code='PX02', village='Village A')
        _make_producteur(code='PX03', village='Village B')
        villages = DatabaseService.list_villages()
        self.assertEqual(sorted(villages), ['Village A', 'Village B'])

    def test_search_producteur_by_nom(self):
        prod = _make_producteur(code='PX01', nom='Rakoto', prenom='Jean')
        _make_producteur(code='PX02', nom='Randria', prenom='Marie')
        results = DatabaseService.search_producteur_by_name('rako')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['code'], prod.code)
        self.assertEqual(results[0]['nom'], 'Rakoto')

    def test_search_producteur_by_prenom(self):
        _make_producteur(code='PX02', nom='Randria', prenom='Marie')
        results = DatabaseService.search_producteur_by_name('marie')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['prenom'], 'Marie')

    def test_search_producteur_no_result(self):
        _make_producteur(code='PX01', nom='Rakoto')
        self.assertEqual(DatabaseService.search_producteur_by_name('inexistant'), [])

    def test_get_statistics(self):
        _make_producteur(code='PX01', village='Village A', actif=True)
        _make_producteur(code='PX02', village='Village A', actif=False)
        _make_producteur(code='PX03', village='Village B', actif=True)
        stats = DatabaseService.get_statistics()
        self.assertEqual(stats['total_producteurs'], 3)
        self.assertEqual(stats['producteurs_actifs'], 2)
        self.assertEqual(stats['producteurs_inactifs'], 1)
        self.assertEqual(stats['pourcentage_actifs'], 66.67)
        self.assertEqual(stats['top_villages'][0]['village'], 'Village A')
        self.assertEqual(stats['top_villages'][0]['count'], 2)

    def test_get_statistics_empty_db(self):
        stats = DatabaseService.get_statistics()
        self.assertEqual(stats['total_producteurs'], 0)
        self.assertEqual(stats['pourcentage_actifs'], 0)
        self.assertEqual(stats['top_villages'], [])

    def test_count_producteurs_par_village(self):
        _make_producteur(code='PX01', village='Village A')
        _make_producteur(code='PX02', village='Village A')
        _make_producteur(code='PX03', village='Village B')
        self.assertEqual(DatabaseService.count_producteurs_par_village('Village A'), 2)
        self.assertEqual(DatabaseService.count_producteurs_par_village('village a'), 2)
        self.assertEqual(DatabaseService.count_producteurs_par_village('Inexistant'), 0)
        self.assertEqual(DatabaseService.count_producteurs_par_village(''), 0)

    def test_count_producteurs_par_sexe(self):
        _make_producteur(code='PX01', sexe='F')
        _make_producteur(code='PX02', sexe='F')
        _make_producteur(code='PX03', sexe='M')
        self.assertEqual(DatabaseService.count_producteurs_par_sexe('F'), 2)
        self.assertEqual(DatabaseService.count_producteurs_par_sexe('M'), 1)

    def test_list_producteurs_par_village(self):
        _make_producteur(code='PX01', village='Village A')
        _make_producteur(code='PX02', village='Village B')
        results = DatabaseService.list_producteurs_par_village('Village A')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['code'], 'PX01')
        self.assertIn('village', results[0])

    def test_list_producteurs(self):
        _make_producteur(code='PX01')
        _make_producteur(code='PX02')
        results = DatabaseService.list_producteurs()
        self.assertEqual(len(results), 2)
        # Le Meta.ordering du modèle trie par date d'adhésion DESC :
        # on vérifie le contenu, pas l'ordre
        codes = [result['code'] for result in results]
        self.assertEqual(sorted(codes), ['PX01', 'PX02'])


class ChatbotApiTests(TestCase):
    """Tests de l'endpoint /api/chatbot/ (chemin classique, Ollama simulé indisponible)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)
        _make_producteur(code='PX01', nom='Rakoto', prenom='Jean', village='Village A', actif=True)
        _make_producteur(code='PX02', nom='Randria', prenom='Marie', village='Village B', actif=False)

    def _post(self, message):
        # Force le mode classique : CHATBOT_USE_OLLAMA=False quelle que soit
        # la configuration locale, et OllamaService jamais instancié.
        with patch('chatbot.views.config', return_value=False), \
                patch('chatbot.views.OllamaService') as mock_ollama:
            mock_ollama.return_value.is_available.return_value = False
            return self.client.post('/api/chatbot/', {'message': message}, format='json')

    def test_requires_authentication(self):
        anonymous = APIClient()
        response = anonymous.post('/api/chatbot/', {'message': 'combien de producteurs'}, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_empty_message_rejected(self):
        response = self._post('   ')
        self.assertFalse(response.data['success'])
        self.assertIn('Veuillez poser une question', response.data['response'])

    def test_count_producteurs_intent(self):
        response = self._post('Combien de producteurs sont enregistrés ?')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'count_producteurs')
        self.assertFalse(response.data['ai_mode'])
        self.assertIn('2 producteur(s)', response.data['response'])

    def test_list_villages_intent(self):
        response = self._post('Liste des villages')
        self.assertTrue(response.data['success'])
        self.assertIn('Village A', response.data['response'])
        self.assertIn('Village B', response.data['response'])

    def test_search_producteur_intent(self):
        # Premier mot en minuscule pour que extract_name() retourne bien 'Rakoto'
        response = self._post('cherche un producteur nommé Rakoto')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'search_producteur')
        self.assertIn('Rakoto', response.data['response'])
        self.assertIn('PX01', response.data['response'])

    def test_statistics_intent(self):
        response = self._post('Donne-moi les statistiques')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'get_statistics')
        self.assertIn('Total: 2', response.data['response'])

    def test_calculate_intent(self):
        response = self._post('Combien fait 5 plus 3 ?')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'calculate')
        self.assertIn('8', response.data['response'])

    def test_count_inactifs_intent(self):
        # Régression : "inactifs" renvoyait le nombre d'actifs
        response = self._post("Combien d'inactifs ?")
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'count_producteurs_inactifs')
        self.assertIn('1 producteur(s) inactif(s)', response.data['response'])

    def test_femmes_intent(self):
        _make_producteur(code='PX03', nom='Soa', prenom='Marie', sexe='F')
        response = self._post('Combien de femmes productrices ?')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'count_producteurs_femmes')
        self.assertIn('1 femme(s) productrice(s)', response.data['response'])

    def test_count_village_intent(self):
        response = self._post('Combien de producteurs a Village A ?')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'count_producteurs_village')
        self.assertIn("1 producteur(s) au village 'Village A'", response.data['response'])

    def test_count_village_intent_unknown_village(self):
        response = self._post('Combien de producteurs a Inconnu ?')
        self.assertTrue(response.data['success'])
        self.assertIn("Aucun producteur trouvé pour le village 'Inconnu'", response.data['response'])

    def test_list_producteurs_intent(self):
        response = self._post('Liste des producteurs')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'list_producteurs')
        self.assertIn('Rakoto', response.data['response'])

    def test_greeting_intent(self):
        response = self._post('Bonjour')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'greeting')

    def test_help_intent(self):
        response = self._post('aide')
        self.assertTrue(response.data['success'])
        self.assertIn('Je peux vous aider', response.data['response'])

    def test_calculate_with_operators(self):
        # Régression : "Combien fait 5 + 3 ?" échouait avant la correction
        response = self._post('Combien fait 5 + 3 ?')
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['intent'], 'calculate')
        self.assertIn('8', response.data['response'])

    def test_search_producteur_capitalized_verb(self):
        # Régression : "Cherche" était extrait comme nom au lieu de "Rakoto"
        response = self._post('Cherche le producteur Rakoto')
        self.assertTrue(response.data['success'])
        self.assertIn('PX01', response.data['response'])


