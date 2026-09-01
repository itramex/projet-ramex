from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from cooperatives.models import Cooperative
from producteurs.models import Producteur
from parcelles.models import Parcelle


def _make_coop_data(**overrides):
    """Payload minimal valide pour créer une coopérative."""
    data = {
        'code': 'COOP001',
        'nom': 'Coopérative Vanille Andapa',
        'commune': 'Andapa',
        'region': 'Sava',
    }
    data.update(overrides)
    return data


class CooperativeCrudApiTests(TestCase):
    """CRUD coopérative : création, unicité du code, validation téléphone."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(username='basic', password='BasicPass123!')
        self.coop = Cooperative.objects.create(
            code='COOP001', nom='Coop Test', commune='Andapa', region='Sava'
        )

    def test_create_cooperative(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/cooperatives/', _make_coop_data(code='COOP999')
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['code'], 'COOP999')

    def test_create_duplicate_code_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/cooperatives/', _make_coop_data())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_create_invalid_telephone_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/cooperatives/', _make_coop_data(telephone='0123456')
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('telephone', response.data)

    def test_create_valid_telephone_accepted(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/cooperatives/',
            _make_coop_data(code='COOP998', telephone='+261341234567')
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_update_cooperative(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/cooperatives/{self.coop.id}/', {'sigle': 'CTA'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.coop.refresh_from_db()
        self.assertEqual(self.coop.sigle, 'CTA')

    def test_non_admin_cannot_create(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cooperatives/', _make_coop_data())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_can_read(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/cooperatives/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CooperativeModelSaveTests(TestCase):
    """save() : nombre_membres calculé automatiquement."""

    def test_nombre_membres_computed_from_hommes_femmes(self):
        coop = Cooperative.objects.create(
            code='COOP010', nom='Coop Membres', commune='Sambava',
            nombre_hommes=3, nombre_femmes=2
        )
        self.assertEqual(coop.nombre_membres, 5)

    def test_nombre_membres_zero_when_no_breakdown(self):
        coop = Cooperative.objects.create(
            code='COOP011', nom='Coop Vide', commune='Sambava'
        )
        self.assertEqual(coop.nombre_membres, 0)


class CooperativeListApiTests(TestCase):
    """Liste : non paginée, agrégats par annotate, filtres."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.coop_a = Cooperative.objects.create(
            code='COOP001', nom='Coop Andapa', commune='Andapa',
            region='Sava', active=True
        )
        self.coop_b = Cooperative.objects.create(
            code='COOP002', nom='Coop Sambava', commune='Sambava',
            region='Sava', active=False
        )

        self.prod_h = Producteur.objects.create(
            code='M001', nom='Homme', commune='Andapa', village='V1',
            sexe='M', actif=True, cooperative=self.coop_a
        )
        self.prod_f = Producteur.objects.create(
            code='F001', nom='Femme', commune='Andapa', village='V2',
            sexe='F', actif=True, cooperative=self.coop_a
        )
        Producteur.objects.create(
            code='I001', nom='Inactif', commune='Andapa', village='V1',
            sexe='M', actif=False, cooperative=self.coop_a
        )
        Parcelle.objects.create(
            producteur=self.prod_h, numero_parcelle=1,
            code_parcelle='M001-P1', dimension_ha=1.5
        )
        Parcelle.objects.create(
            producteur=self.prod_f, numero_parcelle=1,
            code_parcelle='F001-P1', dimension_ha=0.5
        )

    def _get_coop(self, response, code):
        return next(c for c in response.data if c['code'] == code)

    def test_list_is_not_paginated(self):
        response = self.client.get('/api/cooperatives/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)

    def test_list_counts_only_active_producteurs(self):
        response = self.client.get('/api/cooperatives/')
        coop_a = self._get_coop(response, 'COOP001')
        self.assertEqual(coop_a['nombre_membres'], 2)
        self.assertEqual(coop_a['nombre_hommes'], 1)
        self.assertEqual(coop_a['nombre_femmes'], 1)

    def test_list_superficie_sums_active_producteur_parcelles(self):
        response = self.client.get('/api/cooperatives/')
        coop_a = self._get_coop(response, 'COOP001')
        self.assertEqual(float(coop_a['superficie_totale_ha']), 2.0)

    def test_filter_active_false(self):
        response = self.client.get('/api/cooperatives/', {'active': 'false'})
        codes = [c['code'] for c in response.data]
        self.assertEqual(codes, ['COOP002'])

    def test_filter_commune(self):
        response = self.client.get('/api/cooperatives/', {'commune': 'andapa'})
        codes = [c['code'] for c in response.data]
        self.assertEqual(codes, ['COOP001'])

    def test_search_by_nom(self):
        response = self.client.get('/api/cooperatives/', {'search': 'Sambava'})
        codes = [c['code'] for c in response.data]
        self.assertEqual(codes, ['COOP002'])


class CooperativeStatistiquesApiTests(TestCase):
    """Endpoint /api/cooperatives/statistiques/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        coop_a = Cooperative.objects.create(
            code='COOP001', nom='Coop A', commune='Andapa',
            region='Sava', active=True
        )
        # Coopérative inactive : ses producteurs ne comptent pas
        Cooperative.objects.create(
            code='COOP002', nom='Coop B', commune='Sambava',
            region='Sava', active=False
        )
        Producteur.objects.create(
            code='P001', nom='Actif', commune='Andapa', sexe='M',
            actif=True, cooperative=coop_a
        )
        prod_inactif = Producteur.objects.create(
            code='P002', nom='Inactif', commune='Andapa', sexe='F',
            actif=False, cooperative=coop_a
        )
        Parcelle.objects.create(
            producteur=prod_inactif, numero_parcelle=1,
            code_parcelle='P002-P1', dimension_ha=10.0
        )

    def test_statistics_counts(self):
        response = self.client.get('/api/cooperatives/statistiques/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['actives'], 1)
        self.assertEqual(response.data['total_producteurs'], 1)
        # La parcelle du producteur inactif n'est pas comptée
        self.assertEqual(float(response.data['superficie_totale_ha']), 0.0)
