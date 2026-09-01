from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
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


def _make_producteur_data(**overrides):
    """Payload minimal valide pour créer un producteur."""
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
    return data


class ProducteurCrudApiTests(TestCase):
    """CRUD producteur : création, lecture, modification, soft delete, restauration."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(username='basic', password='BasicPass123!')
        self.producteur = Producteur.objects.create(
            code='P001',
            nom='Test',
            prenom='Prod',
            commune='Commune A',
            village='Village A',
            sexe='M',
            actif=True
        )

    def test_create_producteur(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/producteurs/', _make_producteur_data())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['code'], 'PX01')
        self.assertEqual(Producteur.objects.filter(code='PX01').count(), 1)

    def test_create_producteur_with_duplicate_code_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/producteurs/', _make_producteur_data(code='P001'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_create_producteur_missing_required_field(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/producteurs/', _make_producteur_data(nom=''))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_producteur_detail(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/producteurs/{self.producteur.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'P001')
        self.assertEqual(response.data['nom'], 'Test')

    def test_update_producteur(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/producteurs/{self.producteur.id}/', {'nom': 'NouveauNom'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.producteur.refresh_from_db()
        self.assertEqual(self.producteur.nom, 'NouveauNom')

    def test_update_cannot_steal_existing_code(self):
        Producteur.objects.create(
            code='P002', nom='Autre', commune='Commune B', sexe='F', actif=True
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/producteurs/{self.producteur.id}/', {'code': 'P002'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_delete_is_soft_delete(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(
            f'/api/producteurs/{self.producteur.id}/', {'raison': 'Test'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Toujours en base, mais inactif
        self.assertTrue(Producteur.objects.filter(id=self.producteur.id).exists())
        self.producteur.refresh_from_db()
        self.assertFalse(self.producteur.actif)
        self.assertEqual(self.producteur.desactive_par, self.admin)
        self.assertEqual(self.producteur.raison_desactivation, 'Test')

    def test_delete_already_inactive_returns_400(self):
        self.producteur.soft_delete(user=self.admin, raison='Déjà inactif')
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/producteurs/{self.producteur.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_restaurer_reactivates_inactive_producteur(self):
        self.producteur.soft_delete(user=self.admin, raison='Inactif')
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/producteurs/{self.producteur.id}/restaurer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.producteur.refresh_from_db()
        self.assertTrue(self.producteur.actif)
        self.assertIsNone(self.producteur.raison_desactivation)

    def test_restaurer_active_producteur_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/producteurs/{self.producteur.id}/restaurer/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verifier_marks_profile_verified(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/producteurs/{self.producteur.id}/verifier/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.producteur.refresh_from_db()
        self.assertTrue(self.producteur.verifie)
        self.assertEqual(self.producteur.verifie_par, self.admin)

    def test_verifier_already_verified_returns_400(self):
        self.producteur.verifier(user=self.admin)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/producteurs/{self.producteur.id}/verifier/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProducteurPermissionsApiTests(TestCase):
    """IsAdminOrReadOnly : lecture pour tous, écriture pour admin."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(username='basic', password='BasicPass123!')
        self.producteur = Producteur.objects.create(
            code='P001', nom='Test', commune='Commune A', sexe='M', actif=True
        )

    def test_anonymous_cannot_list(self):
        response = self.client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_can_read(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_create(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/producteurs/', _make_producteur_data())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_update(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/producteurs/{self.producteur.id}/', {'nom': 'Hack'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.producteur.refresh_from_db()
        self.assertEqual(self.producteur.nom, 'Test')


class ProducteurFilterApiTests(TestCase):
    """Filtres de la liste : actif, sexe, village, recherche, femmes leaders."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        Producteur.objects.create(
            code='F001', nom='Ravao', commune='Commune A', village='Andapa',
            sexe='F', femme_leader=True, actif=True
        )
        Producteur.objects.create(
            code='H001', nom='Rakoto', commune='Commune A', village='Sambava',
            sexe='M', femme_leader=False, actif=True
        )
        Producteur.objects.create(
            code='H002', nom='Rasamy', commune='Commune B', village='Andapa',
            sexe='M', femme_leader=False, actif=False
        )

    def _codes(self, response):
        return sorted(p['code'] for p in response.data['results'])

    def test_list_returns_all_producteurs(self):
        response = self.client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['F001', 'H001', 'H002'])

    def test_filter_actif_false(self):
        response = self.client.get('/api/producteurs/', {'actif': 'false'})
        self.assertEqual(self._codes(response), ['H002'])

    def test_filter_sexe_f(self):
        response = self.client.get('/api/producteurs/', {'sexe': 'F'})
        self.assertEqual(self._codes(response), ['F001'])

    def test_filter_femme_leader(self):
        response = self.client.get('/api/producteurs/', {'femme_leader': 'true'})
        self.assertEqual(self._codes(response), ['F001'])

    def test_filter_village(self):
        response = self.client.get('/api/producteurs/', {'village': 'Andapa'})
        self.assertEqual(self._codes(response), ['F001', 'H002'])

    def test_search_by_code(self):
        response = self.client.get('/api/producteurs/', {'search': 'H001'})
        self.assertEqual(self._codes(response), ['H001'])

    def test_search_by_nom(self):
        response = self.client.get('/api/producteurs/', {'search': 'rakoto'})
        self.assertEqual(self._codes(response), ['H001'])


class ProducteurSchoolingStatsTests(TestCase):
    """Le save() recalcule la scolarisation depuis les années de naissance."""

    def test_schooling_rate_computed_from_birth_years(self):
        producteur = Producteur.objects.create(
            code='S001', nom='Parent', commune='Commune A', sexe='M',
            annee_stat_scolarisation=2026,
            annee_naissance_enfant_1=2020,  # 6 ans en 2026 → scolarisable
            annee_naissance_enfant_2=2015,  # 11 ans en 2026 → scolarisable
            continue_ecole_enfant_1=True,
            continue_ecole_enfant_2=False,   # a quitté l'école
        )
        self.assertEqual(producteur.nb_enfants_scolarises, 1)
        self.assertEqual(producteur.nb_enfants_non_scolarises, 1)
        self.assertEqual(float(producteur.taux_scolarisation), 50.0)

    def test_child_out_of_school_age_not_counted(self):
        producteur = Producteur.objects.create(
            code='S002', nom='Parent2', commune='Commune A', sexe='F',
            annee_stat_scolarisation=2026,
            annee_naissance_enfant_1=2000,  # 26 ans → hors [3, 18]
            continue_ecole_enfant_1=True,
        )
        self.assertEqual(producteur.nb_enfants_scolarises, 0)
        self.assertEqual(producteur.nb_enfants_non_scolarises, 0)
        self.assertEqual(float(producteur.taux_scolarisation), 0.0)


class ProducteurStatistiquesApiTests(TestCase):
    """Endpoint /api/producteurs/statistiques/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        Producteur.objects.create(
            code='A001', nom='Actif1', commune='Andapa', village='V1', sexe='M', actif=True
        )
        Producteur.objects.create(
            code='A002', nom='Actif2', commune='Andapa', village='V1', sexe='F',
            actif=True, femme_leader=True
        )
        Producteur.objects.create(
            code='I001', nom='Inactif', commune='Sambava', village='V2', sexe='M', actif=False
        )

    def test_statistics_counts(self):
        response = self.client.get('/api/producteurs/statistiques/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(response.data['actifs'], 2)
        self.assertEqual(response.data['inactifs'], 1)
        self.assertEqual(response.data['femmes_leaders'], 1)

    def test_statistics_par_commune_only_counts_actifs(self):
        response = self.client.get('/api/producteurs/statistiques/')
        par_commune = {row['commune']: row['total'] for row in response.data['par_commune']}
        self.assertEqual(par_commune.get('Andapa'), 2)
        self.assertNotIn('Sambava', par_commune)
