from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from producteurs.models import Producteur, Dotation, AGR


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

class UpdatedSinceSyncApiTests(TestCase):
    """M-23 : filtre `?updated_since=` pour la synchro incrémentale mobile."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='sync', password='pass')
        self.client.force_authenticate(user=self.user)

        self.old = Producteur.objects.create(
            code='Y001', nom='Ancien', commune='Andapa', village='V1', sexe='F', actif=True
        )
        self.recent = Producteur.objects.create(
            code='Y002', nom='Recent', commune='Andapa', village='V1', sexe='M', actif=True
        )
        # auto_now : on vieillit explicitement via update() pour contourner save()
        Producteur.objects.filter(pk=self.old.pk).update(
            date_modification=timezone.now() - timedelta(days=10)
        )

    def _codes(self, response):
        return sorted(row['code'] for row in response.data['results'])

    def test_without_param_returns_all(self):
        response = self.client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['Y001', 'Y002'])

    def test_updated_since_returns_only_recent_changes(self):
        response = self.client.get('/api/producteurs/', {
            'updated_since': (timezone.now() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['Y002'])

    def test_depuis_alias_returns_only_recent_changes(self):
        response = self.client.get('/api/producteurs/', {
            'depuis': (timezone.now() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['Y002'])

    def test_invalid_updated_since_returns_400(self):
        response = self.client.get('/api/producteurs/', {'updated_since': 'pas-une-date'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DotationUpdatedSinceSyncApiTests(TestCase):
    """M-23 : filtre `?updated_since=` sur les dotations."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='sync2', password='pass')
        self.client.force_authenticate(user=self.user)

        self.producteur = Producteur.objects.create(
            code='Y010', nom='Sync', commune='Andapa', village='V1', sexe='M', actif=True
        )
        self.old = Dotation.objects.create(
            producteur=self.producteur, type_dotation='poisson', annee=2023, quantite=1
        )
        self.recent = Dotation.objects.create(
            producteur=self.producteur, type_dotation='volaille', annee=2024, quantite=2
        )
        Dotation.objects.filter(pk=self.old.pk).update(
            date_modification=timezone.now() - timedelta(days=10)
        )

    def test_updated_since_returns_only_modified_dotations(self):
        response = self.client.get('/api/dotations/', {
            'producteur': self.producteur.id,
            'updated_since': (timezone.now() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['id'] for row in response.data['results']]
        self.assertEqual(ids, [self.recent.id])

    def test_without_param_returns_all(self):
        response = self.client.get('/api/dotations/', {
            'producteur': self.producteur.id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = sorted(row['id'] for row in response.data['results'])
        self.assertEqual(ids, sorted([self.old.id, self.recent.id]))


class AGRUpdatedSinceSyncApiTests(TestCase):
    """M-23 : filtre `?updated_since=` sur les AGR."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='sync3', password='pass')
        self.client.force_authenticate(user=self.user)

        self.producteur = Producteur.objects.create(
            code='Y020', nom='Sync AGR', commune='Andapa', village='V1', sexe='F', actif=True
        )
        self.old = AGR.objects.create(
            producteur=self.producteur, type_agr='pisciculture', ordre=1
        )
        self.recent = AGR.objects.create(
            producteur=self.producteur, type_agr='aviculture', ordre=2
        )
        AGR.objects.filter(pk=self.old.pk).update(
            date_modification=timezone.now() - timedelta(days=10)
        )

    def test_updated_since_returns_only_modified_agr(self):
        response = self.client.get('/api/agr/', {
            'updated_since': (timezone.now() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [row['id'] for row in data]
        self.assertEqual(ids, [self.recent.id])



class ProducteurNomCompletTests(TestCase):
    """nom_complet et __str__ ne doivent jamais contenir « None » (prenom nul)."""

    def _make(self, **kwargs):
        data = dict(
            code='PN01', nom='Rakoto', commune='Andapa',
            village='V1', sexe='M', actif=True,
        )
        data.update(kwargs)
        return Producteur.objects.create(**data)

    def test_nom_and_prenom(self):
        p = self._make(nom='Rakoto', prenom='Jean')
        self.assertEqual(p.nom_complet, 'Rakoto Jean')

    def test_prenom_none_omitted(self):
        p = self._make(nom='Rakoto', prenom=None)
        self.assertEqual(p.nom_complet, 'Rakoto')
        self.assertNotIn('None', p.nom_complet)

    def test_nom_blank_keeps_prenom(self):
        p = self._make(code='PN02', nom='', prenom='Jean')
        self.assertEqual(p.nom_complet, 'Jean')
        self.assertNotIn('None', p.nom_complet)

    def test_str_without_none(self):
        p = self._make(nom='Rakoto', prenom=None)
        self.assertNotIn('None', str(p))

    def test_api_list_serialization_without_none(self):
        self._make(nom='Rakoto', prenom=None)
        client = APIClient()
        user = User.objects.create_user(username='nc1', password='pass')
        client.force_authenticate(user=user)
        response = client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['results'] if isinstance(response.data, dict) else response.data
        row = next(r for r in data if r['code'] == 'PN01')
        self.assertEqual(row['nom_complet'], 'Rakoto')
        self.assertNotIn('None', row['nom_complet'])


class AGRListFilterApiTests(TestCase):
    """?producteur= / ?active= / ?type_agr= sur /api/agr/.

    Ces filtres sont appliqués manuellement dans get_queryset : le ViewSet
    redéclare filter_backends sans DjangoFilterBackend, donc filterset_fields
    serait ignoré (le mobile affichait alors la liste globale des AGR)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='agrflt', password='pass')
        self.client.force_authenticate(user=self.user)
        self.p1 = Producteur.objects.create(
            code='AF01', nom='Uno', commune='Andapa', village='V1', sexe='M', actif=True
        )
        self.p2 = Producteur.objects.create(
            code='AF02', nom='Duo', commune='Andapa', village='V2', sexe='F', actif=True
        )
        self.a1 = AGR.objects.create(producteur=self.p1, type_agr='pisciculture', ordre=1)
        self.a2 = AGR.objects.create(producteur=self.p2, type_agr='aviculture', ordre=1)
        AGR.objects.filter(pk=self.a2.pk).update(active=False)

    def _rows(self, response):
        return response.data['results'] if isinstance(response.data, dict) else response.data

    def test_filter_by_producteur_returns_only_his_agr(self):
        response = self.client.get('/api/agr/', {'producteur': self.p1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([r['id'] for r in self._rows(response)], [self.a1.id])

    def test_filter_by_active_excludes_inactive(self):
        response = self.client.get('/api/agr/', {'active': 'true'})
        ids = [r['id'] for r in self._rows(response)]
        self.assertIn(self.a1.id, ids)
        self.assertNotIn(self.a2.id, ids)

    def test_filter_by_type_agr(self):
        response = self.client.get('/api/agr/', {'type_agr': 'aviculture'})
        ids = [r['id'] for r in self._rows(response)]
        self.assertIn(self.a2.id, ids)
        self.assertNotIn(self.a1.id, ids)


class ProducteurAgenceFilterApiTests(TestCase):
    """?agence=<id | id,id | none> — filtre d'agence héritée (Option A, P1).

    L'agence n'est pas portée par le producteur mais par sa coopérative
    (producteur.cooperative.agence) : le filtre traverse la FK coopérative.
    `none` = orphelins (sans coopérative, ou coopérative sans agence).
    scope_par_agence (#29) s'applique AVANT ce filtre → intersection.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='agflt', password='pass')
        self.client.force_authenticate(user=self.user)

        from cooperatives.models import Cooperative
        from geographie.models import Agence, District, Region

        region = Region.objects.create(nom='SAVA', code='SAV')
        district = District.objects.create(region=region, nom='Andapa', code='AND')
        self.agence_1 = Agence.objects.create(nom='Agence Nord', district=district, code='AN')
        self.agence_2 = Agence.objects.create(nom='Agence Sud', district=district, code='AS')

        coop_1 = Cooperative.objects.create(
            code='CA1', nom='Coop A', commune='Andapa', agence=self.agence_1
        )
        coop_2 = Cooperative.objects.create(
            code='CB2', nom='Coop B', commune='Andapa', agence=self.agence_2
        )
        coop_3 = Cooperative.objects.create(
            code='CC3', nom='Coop C', commune='Andapa'
        )

        self.p1 = Producteur.objects.create(
            code='AG01', nom='Un', commune='Andapa', village='V1', sexe='M',
            actif=True, cooperative=coop_1,
        )
        self.p2 = Producteur.objects.create(
            code='AG02', nom='Deux', commune='Andapa', village='V2', sexe='F',
            actif=True, cooperative=coop_1,
        )
        self.p3 = Producteur.objects.create(
            code='AG03', nom='Trois', commune='Andapa', village='V1', sexe='M',
            actif=True, cooperative=coop_2,
        )
        self.p4 = Producteur.objects.create(
            code='AG04', nom='Quatre', commune='Andapa', village='V3', sexe='F',
            actif=True, cooperative=coop_3,
        )
        self.p5 = Producteur.objects.create(
            code='AG05', nom='Cinq', commune='Andapa', village='V3', sexe='M',
            actif=True,
        )

    def _codes(self, response):
        rows = response.data['results'] if isinstance(response.data, dict) else response.data
        return sorted(r['code'] for r in rows)

    def test_filter_by_agence_id(self):
        response = self.client.get('/api/producteurs/', {'agence': self.agence_1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['AG01', 'AG02'])

    def test_filter_by_none_returns_orphans(self):
        response = self.client.get('/api/producteurs/', {'agence': 'none'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['AG04', 'AG05'])

    def test_filter_by_multiple_agences(self):
        response = self.client.get(
            '/api/producteurs/',
            {'agence': f'{self.agence_1.id},{self.agence_2.id}'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['AG01', 'AG02', 'AG03'])

    def test_agence_filter_cumulates_with_village(self):
        response = self.client.get(
            '/api/producteurs/', {'agence': self.agence_1.id, 'village': 'V2'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['AG02'])

    def test_list_exposes_inherited_agence(self):
        response = self.client.get('/api/producteurs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data['results'] if isinstance(response.data, dict) else response.data
        by_code = {r['code']: r for r in rows}
        self.assertEqual(by_code['AG01']['agence'], self.agence_1.id)
        self.assertEqual(by_code['AG01']['agence_nom'], 'Agence Nord')
        self.assertIsNone(by_code['AG04']['agence_nom'])  # coop sans agence
        self.assertIsNone(by_code['AG05']['agence_nom'])  # sans coop

    def test_invalid_agence_value_returns_no_rows(self):
        response = self.client.get('/api/producteurs/', {'agence': 'abc'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), [])

    def test_export_csv_contains_agence_column(self):
        response = self.client.get('/api/producteurs/export/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8')
        header = content.splitlines()[0].split(';')
        self.assertIn('Agence', header)
        self.assertIn('Agence Nord', content)

    def test_agence_filter_intersects_scoping(self):
        # A-11 — un compte scopé sur l'agence 1 qui demande l'agence 2
        # reçoit une liste VIDE : le paramètre n'élargit jamais le scoping.
        scoped = User.objects.create_user(username='scoped1', password='pass')
        scoped.profile.agence = self.agence_1
        scoped.profile.save()
        self.client.force_authenticate(user=scoped)

        response = self.client.get('/api/producteurs/', {'agence': self.agence_2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), [])

        response = self.client.get('/api/producteurs/', {'agence': self.agence_1.id})
        self.assertEqual(self._codes(response), ['AG01', 'AG02'])

        # `none` intersecté au scoping : orphelins hors agence exclus
        response = self.client.get('/api/producteurs/', {'agence': 'none'})
        self.assertEqual(self._codes(response), [])


class ProducteurResilienceApiTests(TestCase):
    """GET /api/producteurs/{id}/resilience/ — part vendue, dernière année."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='res1', password='pass')
        self.client.force_authenticate(user=self.user)
        self.p = Producteur.objects.create(
            code='RS01', nom='Res', commune='Andapa', village='V1', sexe='F', actif=True
        )

    def _agr(self, annee, vendue=0, consommee=0, produite=0):
        from history.models import AGRHistory
        return AGRHistory.objects.create(
            producteur=self.p, annee=annee, type_agr='pisciculture', ordre=1,
            quantite_vendue=vendue, quantite_consommee=consommee,
            quantite_produite=produite, revenu_annuel=0,
        )

    def test_resilient_when_majority_sold(self):
        self._agr(2025, vendue=80, consommee=20)
        response = self.client.get(f'/api/producteurs/{self.p.id}/resilience/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['resilient'])
        self.assertEqual(response.data['annee_reference'], 2025)
        self.assertEqual(response.data['taux_vente_reference'], 80.0)

    def test_not_resilient_when_mostly_consumed(self):
        self._agr(2025, vendue=20, consommee=80)
        response = self.client.get(f'/api/producteurs/{self.p.id}/resilience/')
        self.assertFalse(response.data['resilient'])

    def test_latest_year_is_the_reference(self):
        self._agr(2024, vendue=10, consommee=90)   # taux 10 %
        self._agr(2025, vendue=90, consommee=10)   # taux 90 %
        response = self.client.get(f'/api/producteurs/{self.p.id}/resilience/')
        self.assertEqual(response.data['annee_reference'], 2025)
        self.assertTrue(response.data['resilient'])
        self.assertEqual(len(response.data['par_annee']), 2)

    def test_custom_seuil(self):
        self._agr(2025, vendue=80, consommee=20)   # taux 80 %
        response = self.client.get(
            f'/api/producteurs/{self.p.id}/resilience/', {'seuil': 90}
        )
        self.assertFalse(response.data['resilient'])
        self.assertEqual(response.data['seuil'], 90.0)

    def test_no_history_returns_null(self):
        response = self.client.get(f'/api/producteurs/{self.p.id}/resilience/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['resilient'])
        self.assertIsNone(response.data['annee_reference'])

