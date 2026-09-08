from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from history.models import (
    ProductionHistory, AGRHistory, SocialIndicatorHistory, AnnualSnapshot,
)
from producteurs.models import Producteur
from parcelles.models import Parcelle


class HistoryBaseTestCase(TestCase):
    """Données communes : producteur, parcelle, utilisateur."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(username='tester', password='pass')
        # Authentifie un admin (staff) : le RBAC autorise admin + superviseur pour
        # l'écriture des historiques. Le profil du user simple : animateur (lecture).
        self.client.force_authenticate(user=self.admin)

        self.producteur = Producteur.objects.create(
            code='HP01', nom='Rakoto', commune='Sambava', village='Marovovonana',
            sexe='M', actif=True
        )
        Producteur.objects.create(
            code='HP02', nom='Ravao', commune='Andapa', village='Antsahabe',
            sexe='F', actif=True
        )
        self.parcelle = Parcelle.objects.create(
            producteur=self.producteur, numero_parcelle=1,
            code_parcelle='HP01-P1', dimension_ha=1.5,
        )


class ProductionHistoryApiTests(HistoryBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'parcelle': self.parcelle.id,
            'annee': 2024,
            'culture': 'vanille',
            'quantite_kg': 100,
            'prix_vente_kg': 5000,
        }
        data.update(overrides)
        return data

    def test_create_production(self):
        response = self.client.post(
            '/api/history/production-history/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_revenu_total_computed_automatically(self):
        # 100 kg × 5000 Ar = 500000 Ar
        response = self.client.post(
            '/api/history/production-history/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(float(response.data['revenu_total']), 500000.0)

    def test_duplicate_parcelle_annee_culture_rejected(self):
        self.client.post('/api/history/production-history/', self._payload())
        response = self.client.post('/api/history/production-history/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_culture_different_year_allowed(self):
        self.client.post('/api/history/production-history/', self._payload())
        response = self.client.post(
            '/api/history/production-history/', self._payload(annee=2023)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_negative_quantite_rejected(self):
        response = self.client.post(
            '/api/history/production-history/', self._payload(quantite_kg=-5)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_by_parcelle_returns_only_that_parcelle(self):
        self.client.post('/api/history/production-history/', self._payload())
        other_parcelle = Parcelle.objects.create(
            producteur=self.producteur, numero_parcelle=2,
            code_parcelle='HP01-P2', dimension_ha=0.5,
        )
        self.client.post(
            '/api/history/production-history/',
            self._payload(parcelle=other_parcelle.id, annee=2023, culture='cafe'),
        )

        response = self.client.get(
            '/api/history/production-history/by_parcelle/',
            {'parcelle_id': self.parcelle.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data  # by_* renvoie une liste directe
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['annee'], 2024)


class AGRHistoryApiTests(HistoryBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'annee': 2024,
            'type_agr': 'pisciculture',
            'ordre': 1,
            'quantite_vendue': 50,
            'prix_vente_unitaire': 2000,
        }
        data.update(overrides)
        return data

    def test_create_agr_history(self):
        response = self.client.post('/api/history/agr-history/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_revenu_annuel_computed_when_missing(self):
        # 50 vendus × 2000 Ar = 100000 Ar — calculé au save() si non fourni
        response = self.client.post('/api/history/agr-history/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(float(response.data['revenu_annuel']), 100000.0)

    def test_duplicate_producteur_annee_type_ordre_rejected(self):
        self.client.post('/api/history/agr-history/', self._payload())
        response = self.client.post('/api/history/agr-history/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_different_ordre_allowed(self):
        self.client.post('/api/history/agr-history/', self._payload())
        response = self.client.post(
            '/api/history/agr-history/', self._payload(ordre=2)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_by_producteur_returns_only_his_agr(self):
        self.client.post('/api/history/agr-history/', self._payload())
        other = Producteur.objects.get(code='HP02')
        self.client.post(
            '/api/history/agr-history/',
            self._payload(producteur=other.id, annee=2023),
        )
        response = self.client.get(
            '/api/history/agr-history/by_producteur/',
            {'producteur_id': self.producteur.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data  # by_* renvoie une liste directe
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['annee'], 2024)

    def test_total_by_year(self):
        self.client.post('/api/history/agr-history/', self._payload())
        self.client.post(
            '/api/history/agr-history/',
            self._payload(ordre=2, quantite_vendue=30, prix_vente_unitaire=1000),
        )
        response = self.client.get('/api/history/agr-history/total_by_year/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Structure agrégée : au moins une année présente
        self.assertTrue(len(response.data) >= 1)


class SocialIndicatorHistoryApiTests(HistoryBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'annee': 2024,
            'type_indicateur': 'scolarisation',
            'valeur_numerique': 75.0,
        }
        data.update(overrides)
        return data

    def test_create_numeric_indicator(self):
        response = self.client.post(
            '/api/history/social-indicator-history/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_duplicate_producteur_annee_type_rejected(self):
        self.client.post(
            '/api/history/social-indicator-history/', self._payload()
        )
        response = self.client.post(
            '/api/history/social-indicator-history/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_different_type_allowed_same_year(self):
        self.client.post(
            '/api/history/social-indicator-history/', self._payload()
        )
        # Envoi d'un payload booléen (sans valeur_numerique) : un indicateur
        # ne peut porter qu'une seule valeur.
        response = self.client.post(
            '/api/history/social-indicator-history/',
            {
                'producteur': self.producteur.id,
                'annee': 2024,
                'type_indicateur': 'eau_potable',
                'valeur_booleen': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_by_producteur(self):
        self.client.post(
            '/api/history/social-indicator-history/', self._payload()
        )
        response = self.client.get(
            '/api/history/social-indicator-history/by_producteur/',
            {'producteur_id': self.producteur.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data  # by_* renvoie une liste directe
        self.assertEqual(len(data), 1)


class TrendAnalysisApiTests(HistoryBaseTestCase):
    """Vue globalisée des tendances (/api/history/trends/...)."""

    def test_production_trends(self):
        self.client.post('/api/history/production-history/', {
            'parcelle': self.parcelle.id, 'annee': 2024,
            'culture': 'vanille', 'quantite_kg': 100, 'prix_vente_kg': 5000,
        })
        response = self.client.get('/api/history/trends/production_trends/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_production_trends_filtered_by_parcelle(self):
        self.client.post('/api/history/production-history/', {
            'parcelle': self.parcelle.id, 'annee': 2024,
            'culture': 'vanille', 'quantite_kg': 100, 'prix_vente_kg': 5000,
        })
        response = self.client.get(
            '/api/history/trends/production_trends/',
            {'parcelle_id': self.parcelle.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_agr_trends(self):
        self.client.post('/api/history/agr-history/', {
            'producteur': self.producteur.id, 'annee': 2024,
            'type_agr': 'pisciculture', 'ordre': 1,
            'quantite_vendue': 50, 'prix_vente_unitaire': 2000,
        })
        response = self.client.get('/api/history/trends/agr_trends/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_social_trends(self):
        self.client.post('/api/history/social-indicator-history/', {
            'producteur': self.producteur.id, 'annee': 2024,
            'type_indicateur': 'scolarisation', 'valeur_numerique': 75.0,
        })
        response = self.client.get(
            '/api/history/trends/social_trends/',
            {'type_indicateur': 'scolarisation'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AnnualSnapshotApiTests(HistoryBaseTestCase):
    """Snapshots annuels : création, verrouillage, comparaison, immutabilité."""

    def setUp(self):
        super().setUp()
        # IsAdminOrManagerOrReadOnly : la création exige admin/superviseur
        self.client.force_authenticate(user=self.admin)

    def _snapshot_payload(self, annee, **overrides):
        data = {
            'annee': annee,
            'nb_producteurs': 2,
            'nb_parcelles': 1,
            'production_totale_kg': 500,
            'revenu_total_agr': 100000,
        }
        data.update(overrides)
        return data

    def test_create_snapshot(self):
        response = self.client.post(
            '/api/history/snapshots/', self._snapshot_payload(2024)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['annee'], 2024)

    def test_non_admin_cannot_create_snapshot(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/history/snapshots/', self._snapshot_payload(2024)
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_for_year(self):
        response = self.client.post(
            '/api/history/snapshots/create_for_year/', {'annee': 2024}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['annee'], 2024)
        self.assertTrue(AnnualSnapshot.objects.filter(annee=2024).exists())

    def test_create_for_year_missing_annee(self):
        response = self.client.post('/api/history/snapshots/create_for_year/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lock_makes_snapshot_immutable(self):
        response = self.client.post(
            '/api/history/snapshots/', self._snapshot_payload(2024)
        )
        snapshot_id = response.data['id']

        lock_response = self.client.post(f'/api/history/snapshots/{snapshot_id}/lock/')
        self.assertEqual(lock_response.status_code, status.HTTP_200_OK)
        self.assertTrue(lock_response.data['verrouille'])

        # Deuxième verrouillage : idempotent
        lock_again = self.client.post(f'/api/history/snapshots/{snapshot_id}/lock/')
        self.assertEqual(lock_again.status_code, status.HTTP_200_OK)

        # PUT/PATCH/DELETE interdits par http_method_names
        patch_response = self.client.patch(
            f'/api/history/snapshots/{snapshot_id}/', {'nb_producteurs': 99}
        )
        self.assertEqual(patch_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        delete_response = self.client.delete(f'/api/history/snapshots/{snapshot_id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_compare_two_snapshots(self):
        self.client.post('/api/history/snapshots/', self._snapshot_payload(2023))
        self.client.post(
            '/api/history/snapshots/',
            self._snapshot_payload(2024, production_totale_kg=750),
        )
        response = self.client.get(
            '/api/history/snapshots/compare/', {'annee1': 2023, 'annee2': 2024}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_compare_missing_params(self):
        response = self.client.get('/api/history/snapshots/compare/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_compare_unknown_years_returns_400(self):
        response = self.client.get(
            '/api/history/snapshots/compare/', {'annee1': 1901, 'annee2': 1902}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
