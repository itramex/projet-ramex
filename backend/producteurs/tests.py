from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from producteurs.models import Producteur, Dotation


class DotationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)
        self.producteur = Producteur.objects.create(
            code='P001',
            nom='Test',
            prenom='Prod',
            commune='Commune A',
            village='Village A',
            sexe='M',
            actif=True
        )
        Dotation.objects.create(producteur=self.producteur, type_dotation='kit_scolaire', annee=2023, quantite=3)
        Dotation.objects.create(producteur=self.producteur, type_dotation='kit_scolaire', annee=2024, quantite=2)
        Dotation.objects.create(producteur=self.producteur, type_dotation='poisson', annee=2024, quantite=1)

    def test_dotation_list_returns_cumulative_aggregates(self):
        response = self.client.get('/api/dotations/', {'producteur': self.producteur.id, 'from_year': 2023, 'to_year': 2024})
        self.assertEqual(response.status_code, 200)
        self.assertIn('cumul_par_type', response.data)
        self.assertEqual(response.data['cumul_par_type'].get('kit_scolaire'), 5)
        self.assertEqual(response.data['cumul_total'], 6)
