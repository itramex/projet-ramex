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


class ChatbotApiTests(TestCase):
    """Tests de l'endpoint /api/chatbot/ (chemin classique, Ollama simulé indisponible)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)
        _make_producteur(code='PX01', nom='Rakoto', prenom='Jean', village='Village A', actif=True)
        _make_producteur(code='PX02', nom='Randria', prenom='Marie', village='Village B', actif=False)

    def _post(self, message):
        # Désactive Ollama pour que la vue utilise l'analyse classique de façon déterministe
        with patch('chatbot.views.OllamaService') as mock_ollama:
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


