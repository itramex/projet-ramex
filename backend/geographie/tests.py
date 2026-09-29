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


class AgenceGouvernanceTests(GeoTestCaseBase):
    """P3 — G-3 → G-5 : suppression protégée (désactivation plutôt que
    suppression), fusion d'agences et code auto-généré (limite 8)."""

    def setUp(self):
        super().setUp()
        from cooperatives.models import Cooperative

        self.coop = Cooperative.objects.create(
            code='C-GOV', nom='Coop Gov', commune='Andapa', agence=self.agence
        )

    # ---- G-3a : suppression protégée -------------------------------
    def test_destroy_refused_when_cooperative_rattachee(self):
        response = self.client.delete(f'/api/geographie/agences/{self.agence.id}/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('Désactivez', response.data['detail'])
        self.assertTrue(Agence.objects.filter(pk=self.agence.id).exists())
        # Le rattachement est intact (pas de SET_NULL silencieux)
        self.coop.refresh_from_db()
        self.assertEqual(self.coop.agence_id, self.agence.id)

    def test_destroy_refused_when_utilisateur_rattache(self):
        agence_libre = Agence.objects.create(
            nom='Agence Vide', code='AG-VDE', district=self.district
        )
        user = User.objects.create_user(username='ag29', password='pass')
        user.profile.agence = agence_libre
        user.profile.save()

        response = self.client.delete(f'/api/geographie/agences/{agence_libre.id}/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Agence.objects.filter(pk=agence_libre.id).exists())

    def test_destroy_allowed_when_unused(self):
        agence_libre = Agence.objects.create(
            nom='Agence Inutilisée', code='AG-INS', district=self.district
        )
        response = self.client.delete(f'/api/geographie/agences/{agence_libre.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Agence.objects.filter(pk=agence_libre.id).exists())

    # ---- G-5 : code obligatoire + généré --------------------------
    def test_code_auto_generé_si_vide(self):
        response = self.client.post('/api/geographie/agences/', {
            'nom': 'Agence Auto', 'district': self.district_andapa.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        code = response.data['code']
        self.assertTrue(code)
        self.assertTrue(code.startswith('AG-'))
        self.assertLessEqual(len(code), 20)

    def test_deuxieme_agence_sans_code_ne_cause_pas_de_doublon(self):
        # Limite 8 : deux '' uniques → IntegrityError. Le code auto-généré
        # garantit deux codes distincts.
        for nom in ('Agence A', 'Agence B'):
            response = self.client.post('/api/geographie/agences/', {
                'nom': nom, 'district': self.district.id,
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        codes = set(
            Agence.objects.filter(nom__in=['Agence A', 'Agence B'])
            .values_list('code', flat=True)
        )
        self.assertEqual(len(codes), 2)
        self.assertNotIn('', codes)

    def test_code_fourni_est_conserve(self):
        response = self.client.post('/api/geographie/agences/', {
            'nom': 'Agence Manuelle', 'code': 'MON-CODE',
            'district': self.district.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'MON-CODE')

    # ---- G-4 : fusion ---------------------------------------------
    def _admin_client(self):
        admin = User.objects.create_user(
            username='geoadmin', password='pass', is_staff=True
        )
        self.client.force_authenticate(user=admin)

    def test_fusion_deplace_cooperatives_et_desactive_source(self):
        cible = Agence.objects.create(
            nom='Agence Cible', code='AG-CLI', district=self.district
        )
        self._admin_client()

        response = self.client.post(
            f'/api/geographie/agences/{self.agence.id}/fusionner/',
            {'cible': cible.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['coop_reaffectees'], 1)

        self.coop.refresh_from_db()
        self.assertEqual(self.coop.agence_id, cible.id)
        self.agence.refresh_from_db()
        self.assertFalse(self.agence.actif)

    def test_fusion_interdite_aux_non_admins(self):
        cible = Agence.objects.create(
            nom='Agence Cible 2', code='AG-CL2', district=self.district
        )
        # self.user (tester) n'est ni staff ni admin
        response = self.client.post(
            f'/api/geographie/agences/{self.agence.id}/fusionner/',
            {'cible': cible.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.coop.refresh_from_db()
        self.assertEqual(self.coop.agence_id, self.agence.id)

    def test_fusion_cible_manquante_ou_identique_rejetee(self):
        self._admin_client()
        response = self.client.post(
            f'/api/geographie/agences/{self.agence.id}/fusionner/', {}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            f'/api/geographie/agences/{self.agence.id}/fusionner/',
            {'cible': self.agence.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- Compteurs G-3b -------------------------------------------
    def test_compteurs_rattachements_exposes(self):
        response = self.client.get('/api/geographie/agences/')
        data = response.data.get('results', response.data)
        agence = next(a for a in data if a['id'] == self.agence.id)
        self.assertEqual(agence['nb_cooperatives'], 1)
        self.assertEqual(agence['nb_utilisateurs'], 0)
