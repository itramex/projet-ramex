from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from geographie.models import (
    Region, District, Commune, Fokontany, Village, Agence,
    StructureIntermediaire,
)


class GeoTestCaseBase(TestCase):
    """Données géographiques hiérarchiques communes."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.region = Region.objects.create(nom='SAVA', code='SAV')
        self.district = District.objects.create(
            region=self.region, nom='Sambava', code='SMB'
        )
        self.district_andapa = District.objects.create(
            region=self.region, nom='Andapa', code='AND'
        )
        self.commune = Commune.objects.create(
            district=self.district, nom='Ambodivona', code='AMB'
        )
        self.fokontany = Fokontany.objects.create(
            commune=self.commune, nom='Marovovonana', code='MRV'
        )
        self.village = Village.objects.create(
            fokontany=self.fokontany, nom='Antsahabe', code='ANT'
        )
        self.agence = Agence.objects.create(
            nom='Agence Sambava', code='AG-SMB', district=self.district
        )


class RegionApiTests(GeoTestCaseBase):
    def test_list_regions(self):
        response = self.client.get('/api/geographie/regions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom'], 'SAVA')

    def test_create_region(self):
        response = self.client.post(
            '/api/geographie/regions/', {'nom': 'DIANA', 'code': 'DIA'}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_create_duplicate_nom_rejected(self):
        response = self.client.post(
            '/api/geographie/regions/', {'nom': 'SAVA', 'code': 'NEW'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anonymous_cannot_list_regions(self):
        client = APIClient()
        response = client.get('/api/geographie/regions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_region(self):
        response = self.client.get('/api/geographie/regions/', {'search': 'SAV'})
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)


class DistrictApiTests(GeoTestCaseBase):
    def test_filter_districts_by_region(self):
        response = self.client.get(
            '/api/geographie/districts/', {'region': self.region.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 2)

    def test_create_district(self):
        response = self.client.post(
            '/api/geographie/districts/',
            {'region': self.region.id, 'nom': 'Vohemar', 'code': 'VOH'}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_duplicate_district_in_same_region_rejected(self):
        response = self.client.post(
            '/api/geographie/districts/',
            {'region': self.region.id, 'nom': 'Sambava', 'code': 'XX1'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_district_name_allowed_in_different_regions(self):
        other_region = Region.objects.create(nom='DIANA', code='DIA')
        response = self.client.post(
            '/api/geographie/districts/',
            {'region': other_region.id, 'nom': 'Sambava', 'code': 'XX2'}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class CommuneApiTests(GeoTestCaseBase):
    def test_filter_communes_by_district(self):
        response = self.client.get(
            '/api/geographie/communes/', {'district': self.district.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom'], 'Ambodivona')

    def test_filter_communes_empty_for_other_district(self):
        response = self.client.get(
            '/api/geographie/communes/', {'district': self.district_andapa.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)


class VillageApiTests(GeoTestCaseBase):
    def test_filter_villages_by_fokontany(self):
        response = self.client.get(
            '/api/geographie/villages/', {'fokontany': self.fokontany.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom'], 'Antsahabe')


class AgenceApiTests(GeoTestCaseBase):
    def test_filter_agences_by_district(self):
        response = self.client.get(
            '/api/geographie/agences/', {'district': self.district.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_create_agence(self):
        response = self.client.post('/api/geographie/agences/', {
            'nom': 'Agence Andapa',
            'code': 'AG-AND',
            'district': self.district_andapa.id,
            'telephone': '+261341234567',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class StructureIntermediaireApiTests(GeoTestCaseBase):
    def setUp(self):
        super().setUp()
        self.structure = StructureIntermediaire.objects.create(
            fokontany=self.fokontany,
            nom='Representant Marovovonana',
            telephone='+261329876543',
        )

    def test_filter_by_fokontany(self):
        response = self.client.get(
            '/api/geographie/structures-intermediaires/',
            {'fokontany': self.fokontany.id},
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom'], 'Representant Marovovonana')

    def test_filter_actif_false_excludes_active(self):
        response = self.client.get(
            '/api/geographie/structures-intermediaires/', {'actif': 'false'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)

    def test_search_by_nom(self):
        response = self.client.get(
            '/api/geographie/structures-intermediaires/', {'search': 'Marovovonana'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
