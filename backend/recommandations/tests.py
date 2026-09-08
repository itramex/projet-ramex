from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from recommandations.models import Recommendation, Activite, MahavelonaArchive
from producteurs.models import Producteur
from parcelles.models import Parcelle


class RecommandationsBaseTestCase(TestCase):
    """Données communes : utilisateur, producteur, recommandation."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.producteur = Producteur.objects.create(
            code='RP01', nom='Rakoto', commune='Sambava', village='Marovovonana',
            sexe='M', actif=True
        )
        self.reco = Recommendation.objects.create(
            producteur=self.producteur,
            type_activite='formation_compostage',
            description='Former ce producteur au compostage',
            score_pertinence=0.85,
            statut='pending',
        )


class RecommendationCrudApiTests(RecommandationsBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'type_activite': 'formation_taille',
            'description': 'Former à la taille de la vanille',
            'score_pertinence': 0.6,
        }
        data.update(overrides)
        return data

    def test_create_recommendation(self):
        response = self.client.post('/api/recommendations/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_list_recommendations(self):
        response = self.client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_filter_by_producteur(self):
        other = Producteur.objects.create(
            code='RP02', nom='Ravao', commune='Andapa', sexe='F', actif=True
        )
        response = self.client.get(
            '/api/recommendations/', {'producteur': other.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)

        response = self.client.get(
            '/api/recommendations/', {'producteur': self.producteur.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_filter_by_statut(self):
        response = self.client.get(
            '/api/recommendations/', {'statut': 'pending'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_execute_updates_statut(self):
        response = self.client.post(f'/api/recommendations/{self.reco.id}/execute/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.reco.refresh_from_db()
        self.assertEqual(self.reco.statut, 'executed')
        self.assertIsNotNone(self.reco.date_execution)

    def test_reject_updates_statut(self):
        response = self.client.post(f'/api/recommendations/{self.reco.id}/reject/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.reco.refresh_from_db()
        self.assertEqual(self.reco.statut, 'rejected')

    def test_statistics(self):
        Recommendation.objects.create(
            producteur=self.producteur, type_activite='reboisement',
            description='Reboiser', score_pertinence=0.9, statut='executed',
        )
        response = self.client.get('/api/recommendations/statistics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_recommendations'], 2)
        self.assertEqual(response.data['pending_count'], 1)
        self.assertEqual(response.data['executed_count'], 1)
        self.assertEqual(response.data['rejected_count'], 0)

    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ValidateProducteurApiTests(RecommandationsBaseTestCase):
    """validate-producteur : contrôle du niveau de données du producteur."""

    def _make_complete_producteur(self):
        producteur = Producteur.objects.create(
            code='RV01', nom='Complet', commune='Sambava', sexe='M', actif=True,
            date_adhesion_cooperative=date(2020, 1, 15),
        )
        Parcelle.objects.create(
            producteur=producteur, numero_parcelle=1,
            code_parcelle='RV01-P1', dimension_ha=1.5,
            nombre_pieds=400, estimation_production_kg=120,
            annee_plantation=2018, certifiee=True,
            cultures_pratiquees=['vanille'],
        )
        return producteur

    def test_missing_producteur_id(self):
        response = self.client.post('/api/recommendations/validate-producteur/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_producteur(self):
        response = self.client.post(
            '/api/recommendations/validate-producteur/', {'producteur_id': 999999}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_producteur_invalid(self):
        inactive = Producteur.objects.create(
            code='RI01', nom='Inactif', commune='Sambava', sexe='M', actif=False
        )
        response = self.client.post(
            '/api/recommendations/validate-producteur/', {'producteur_id': inactive.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        self.assertEqual(response.data['reason'], 'inactive')

    def test_producteur_without_parcelle_invalid(self):
        response = self.client.post(
            '/api/recommendations/validate-producteur/',
            {'producteur_id': self.producteur.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        # Le blocage vient de l'absence de parcelle active
        fields = [m['field'] for m in response.data['missing_data']]
        self.assertIn('parcelles', fields)

    def test_complete_producteur_valid(self):
        producteur = self._make_complete_producteur()
        response = self.client.post(
            '/api/recommendations/validate-producteur/',
            {'producteur_id': producteur.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['existing_data']['parcelles']['count'], 1)

    def test_incomplete_parcelle_flags_missing_data(self):
        producteur = Producteur.objects.create(
            code='RP02', nom='ParcelleVide', commune='Sambava', sexe='F', actif=True
        )
        # Parcelle sans pieds ni superficie
        Parcelle.objects.create(
            producteur=producteur, numero_parcelle=1,
            code_parcelle='RP02-P1', dimension_ha=0,
        )
        response = self.client.post(
            '/api/recommendations/validate-producteur/',
            {'producteur_id': producteur.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        fields = [m['field'] for m in response.data['missing_data']]
        self.assertIn('parcelles_data', fields)


class GenerateForProducteurApiTests(RecommandationsBaseTestCase):
    def test_missing_producteur_id(self):
        response = self.client.post('/api/recommendations/generate-for-producteur/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_returns_response(self):
        # Le moteur de similarité exige au moins 2 producteurs
        other = Producteur.objects.create(
            code='RP02', nom='Ravao', commune='Andapa', village='Antsahabe',
            sexe='F', actif=True,
        )
        # Producteur avec données complètes : le moteur doit répondre sans erreur
        Parcelle.objects.create(
            producteur=self.producteur, numero_parcelle=1,
            code_parcelle='RP01-P1', dimension_ha=1.5,
            nombre_pieds=400, estimation_production_kg=120,
            annee_plantation=2018, cultures_pratiquees=['vanille'],
        )
        Parcelle.objects.create(
            producteur=other, numero_parcelle=1,
            code_parcelle='RP02-P1', dimension_ha=2.0,
            nombre_pieds=300, estimation_production_kg=80,
            annee_plantation=2015, cultures_pratiquees=['vanille'],
        )
        response = self.client.post(
            '/api/recommendations/generate-for-producteur/',
            {'producteur_id': self.producteur.id, 'top_n': 3},
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED),
            response.data,
        )


class MahavelonaArchiveApiTests(RecommandationsBaseTestCase):
    def test_list_archives_empty(self):
        response = self.client.get('/api/recommendations/mahavelona/archives/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_create_archive(self):
        response = self.client.post('/api/recommendations/mahavelona/archives/', {
            'annee_reference': 2025,
            'criteres_version': 'v1.0',
            'archive_json': {'nb_membres': 42},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(
            MahavelonaArchive.objects.filter(annee_reference=2025).exists()
        )

    def test_filter_by_annee(self):
        MahavelonaArchive.objects.create(
            annee_reference=2024, criteres_version='v1.0'
        )
        MahavelonaArchive.objects.create(
            annee_reference=2025, criteres_version='v1.0'
        )
        response = self.client.get(
            '/api/recommendations/mahavelona/archives/', {'annee': 2025}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['annee_reference'], 2025)

    def test_snapshot_creates_archive_for_year(self):
        response = self.client.post(
            '/api/recommendations/mahavelona/archives/snapshot/', {'annee': 2025}
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED),
            response.data,
        )
        self.assertTrue(
            MahavelonaArchive.objects.filter(annee_reference=2025).exists()
        )

    def test_snapshot_invalid_annee(self):
        response = self.client.post(
            '/api/recommendations/mahavelona/archives/snapshot/', {'annee': 'abc'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ActiviteApiTests(RecommandationsBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'type': 'formation',
            'description': 'Formation compostage',
            'date': '2026-03-15',
            'impact_score': 7.5,
        }
        data.update(overrides)
        return data

    def test_create_activite(self):
        response = self.client.post('/api/activites/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_filter_by_producteur(self):
        self.client.post('/api/activites/', self._payload())
        other = Producteur.objects.create(
            code='RP03', nom='Autre', commune='Andapa', sexe='F', actif=True
        )
        response = self.client.get('/api/activites/', {'producteur': other.id})
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)

        response = self.client.get(
            '/api/activites/', {'producteur': self.producteur.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_types_action(self):
        self.client.post('/api/activites/', self._payload())
        self.client.post(
            '/api/activites/', self._payload(type='collecte', date='2026-06-01')
        )
        response = self.client.get('/api/activites/types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(sorted(response.data['types']), ['collecte', 'formation'])
