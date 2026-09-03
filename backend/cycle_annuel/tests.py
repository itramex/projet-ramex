from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from cycle_annuel.models import PhaseAgricole, PhaseCampagne, IndicateurCampagne
from tracabilite.models import Campagne, BonCollecte
from producteurs.models import Producteur


class CycleAnnuelBaseTestCase(TestCase):
    """Données communes : utilisateur, campagne, phase agricole."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.campagne = Campagne.objects.create(
            code='2025-2026', annee_debut=2025, annee_fin=2026,
            date_debut=date(2025, 6, 1), date_fin=date(2026, 5, 31),
        )
        self.phase = PhaseAgricole.objects.create(
            code='RECOLTE-V', nom='Récolte vanille verte',
            pilier='tracabilite', type_phase='recolte_verte',
            mois_debut=6, mois_fin=7,
        )


class PhaseAgricoleApiTests(CycleAnnuelBaseTestCase):
    def test_create_phase(self):
        response = self.client.post('/api/cycle-annuel/phases-agricoles/', {
            'code': 'FLORAISON', 'nom': 'Floraison',
            'pilier': 'tracabilite', 'type_phase': 'floraison',
            'mois_debut': 9, 'mois_fin': 12,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_duplicate_code_rejected(self):
        response = self.client.post('/api/cycle-annuel/phases-agricoles/', {
            'code': 'RECOLTE-V', 'nom': 'Doublon',
            'pilier': 'tracabilite', 'type_phase': 'floraison',
            'mois_debut': 1, 'mois_fin': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_month_rejected(self):
        response = self.client.post('/api/cycle-annuel/phases-agricoles/', {
            'code': 'BAD-MONTH', 'nom': 'Mois invalide',
            'pilier': 'tracabilite', 'type_phase': 'floraison',
            'mois_debut': 0, 'mois_fin': 13,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_pilier(self):
        PhaseAgricole.objects.create(
            code='AUDIT', nom='Audit interne', pilier='certification',
            type_phase='audit_interne', mois_debut=3, mois_fin=4,
        )
        response = self.client.get(
            '/api/cycle-annuel/phases-agricoles/', {'pilier': 'certification'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['code'], 'AUDIT')


class CalendrierApiTests(CycleAnnuelBaseTestCase):
    """Endpoint calendrier : 12 mois, phases actives selon leur fenêtre."""

    def _codes_in_month(self, response, numero):
        mois = next(m for m in response.data['mois'] if m['numero'] == numero)
        return [p['code'] for p in mois['phases']]

    def test_calendrier_returns_12_months(self):
        response = self.client.get('/api/cycle-annuel/phases-agricoles/calendrier/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['mois']), 12)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['par_pilier']['tracabilite'], 1)

    def test_normal_window_active_only_in_range(self):
        response = self.client.get('/api/cycle-annuel/phases-agricoles/calendrier/')
        # Phase récolte verte : juin-juillet uniquement
        self.assertIn('RECOLTE-V', self._codes_in_month(response, 6))
        self.assertIn('RECOLTE-V', self._codes_in_month(response, 7))
        self.assertNotIn('RECOLTE-V', self._codes_in_month(response, 5))
        self.assertNotIn('RECOLTE-V', self._codes_in_month(response, 8))

    def test_cross_year_window_spans_december(self):
        PhaseAgricole.objects.create(
            code='FORMATION-X', nom='Formation cycle croisé',
            pilier='certification', type_phase='formation',
            mois_debut=11, mois_fin=2, cycle_croise=True,
        )
        response = self.client.get('/api/cycle-annuel/phases-agricoles/calendrier/')
        for m in (11, 12, 1, 2):
            self.assertIn('FORMATION-X', self._codes_in_month(response, m))
        self.assertNotIn('FORMATION-X', self._codes_in_month(response, 10))
        self.assertNotIn('FORMATION-X', self._codes_in_month(response, 3))

    def test_toute_annee_active_every_month(self):
        PhaseAgricole.objects.create(
            code='GEO', nom='Géoréférencement',
            pilier='tracabilite', type_phase='georeferencement',
            mois_debut=1, mois_fin=12, toute_annee=True,
        )
        response = self.client.get('/api/cycle-annuel/phases-agricoles/calendrier/')
        for m in range(1, 13):
            self.assertIn('GEO', self._codes_in_month(response, m))

    def test_inactive_phase_excluded(self):
        PhaseAgricole.objects.create(
            code='INACTIF', nom='Phase inactive', pilier='tracabilite',
            type_phase='recolte_verte', mois_debut=1, mois_fin=3, actif=False,
        )
        response = self.client.get('/api/cycle-annuel/phases-agricoles/calendrier/')
        for m in range(1, 13):
            self.assertNotIn('INACTIF', self._codes_in_month(response, m))
        self.assertEqual(response.data['total'], 1)


class PhaseCampagneApiTests(CycleAnnuelBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'campagne': self.campagne.id,
            'phase': self.phase.id,
            'date_debut': '2025-06-01',
            'date_fin': '2025-07-31',
            'statut': 'planifiee',
        }
        data.update(overrides)
        return data

    def test_create_phase_campagne(self):
        response = self.client.post(
            '/api/cycle-annuel/phases-campagne/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_taux_realisation_computed(self):
        response = self.client.post(
            '/api/cycle-annuel/phases-campagne/',
            self._payload(objectif=100, realise=25),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        # 25 / 100 × 100 = 25 %
        self.assertEqual(response.data['taux_realisation'], 25.0)

    def test_duplicate_campagne_phase_rejected(self):
        self.client.post('/api/cycle-annuel/phases-campagne/', self._payload())
        response = self.client.post('/api/cycle-annuel/phases-campagne/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_campagne(self):
        self.client.post('/api/cycle-annuel/phases-campagne/', self._payload())
        response = self.client.get(
            '/api/cycle-annuel/phases-campagne/', {'campagne': self.campagne.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

        other = Campagne.objects.create(
            code='2026-2027', annee_debut=2026, annee_fin=2027,
            date_debut=date(2026, 6, 1), date_fin=date(2027, 5, 31),
        )
        response = self.client.get(
            '/api/cycle-annuel/phases-campagne/', {'campagne': other.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)


class IndicateurCampagneApiTests(CycleAnnuelBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'campagne': self.campagne.id,
            'libelle': 'Producteurs certifiés',
            'type': 'nombre',
            'objectif': 50,
            'realise': 38,
            'pilier': 'certification',
        }
        data.update(overrides)
        return data

    def test_create_indicateur(self):
        response = self.client.post(
            '/api/cycle-annuel/indicateurs/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_filter_by_campagne_and_pilier(self):
        self.client.post('/api/cycle-annuel/indicateurs/', self._payload())
        self.client.post(
            '/api/cycle-annuel/indicateurs/',
            self._payload(libelle='Arbres replantés', pilier='developpement_durable'),
        )
        response = self.client.get('/api/cycle-annuel/indicateurs/', {
            'campagne': self.campagne.id, 'pilier': 'certification',
        })
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['libelle'], 'Producteurs certifiés')


class RapportCampagneApiTests(CycleAnnuelBaseTestCase):
    """Rapport consolidé : agrégats traçabilité + objectifs par pilier."""

    def test_requires_campagne_param(self):
        response = self.client.get('/api/cycle-annuel/rapports/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_campagne_returns_404(self):
        response = self.client.get(
            '/api/cycle-annuel/rapports/', {'campagne': 999999}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_report_aggregates_tracabilite_and_indicateurs(self):
        producteur = Producteur.objects.create(
            code='RP01', nom='Rakoto', commune='Sambava', sexe='M', actif=True
        )
        # 2 bons de collecte : 95 kg + 40 kg = 135 kg
        for i, poids in enumerate([95, 40], start=1):
            BonCollecte.objects.create(
                numero_fabc=f'FABC-RP{i}', campagne=self.campagne,
                producteur=producteur,
                date_marche=date(2025, 7, 10 + i),
                village_marche='Marovovonana', commune='Andapa',
                fokontany='Fokontany A',
                type_produit='vanille_verte',
                poids_total_livre=poids, poids_accepte=poids,
                prix_unitaire_marche=100000, mode_paiement='especes',
            )
        IndicateurCampagne.objects.create(
            campagne=self.campagne, libelle='Producteurs certifiés',
            type='nombre', objectif=10, realise=8, pilier='certification',
        )
        IndicateurCampagne.objects.create(
            campagne=self.campagne, libelle='Arbres replantés',
            type='nombre', objectif=100, realise=60, pilier='developpement_durable',
        )
        PhaseCampagne.objects.create(
            campagne=self.campagne, phase=self.phase,
            date_debut=date(2025, 6, 1), date_fin=date(2025, 7, 31),
            statut='terminee',
        )

        response = self.client.get(
            '/api/cycle-annuel/rapports/', {'campagne': self.campagne.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.assertEqual(response.data['campagne']['code'], '2025-2026')
        tracabilite = response.data['tracabilite']
        self.assertEqual(tracabilite['bons_collecte'], 2)
        self.assertEqual(float(tracabilite['poids_total_kg']), 135)
        self.assertEqual(response.data['certification']['cible_objectif'], 10)
        self.assertEqual(response.data['certification']['realise_objectif'], 8)
        self.assertEqual(response.data['developpement_durable']['cible_objectif'], 100)
        self.assertEqual(response.data['developpement_durable']['realise_objectif'], 60)
        self.assertEqual(response.data['phases']['terminees'], 1)
        self.assertEqual(len(response.data['indicateurs']), 2)
