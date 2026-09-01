from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from tracabilite.models import (
    Campagne, BonCollecte, BonTransport, FicheStock, EstimationProduction,
)
from producteurs.models import Producteur


class TracabilitePermissionsApiTests(TestCase):
    """CanManageTracabilite : lecture et écriture réservées admin/agent_collecte."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.basic = User.objects.create_user(username='basic', password='BasicPass123!')
        # Rôle par défaut via signal : animateur (accès refusé)
        self.agent = User.objects.create_user(
            username='agent', password='AgentPass123!'
        )
        self.agent.profile.role = 'agent_collecte'
        self.agent.profile.save()

    def test_anonymous_cannot_list_campagnes(self):
        response = self.client.get('/api/tracabilite/campagnes/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_basic_user_cannot_list_campagnes(self):
        self.client.force_authenticate(user=self.basic)
        response = self.client.get('/api/tracabilite/campagnes/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_collecte_can_list_campagnes(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.get('/api/tracabilite/campagnes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_list_campagnes(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/tracabilite/campagnes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TracabiliteBaseTestCase(TestCase):
    """Données communes : admin, agent, campagne, producteur."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.client.force_authenticate(user=self.admin)
        self.campagne = Campagne.objects.create(
            code='2025-2026',
            annee_debut=2025,
            annee_fin=2026,
            date_debut=date(2025, 6, 1),
            date_fin=date(2026, 5, 31),
            type='vanille_verte',
        )
        self.producteur = Producteur.objects.create(
            code='TP01', nom='Trace', commune='Andapa', village='Marovovonana',
            sexe='M', actif=True
        )


class BonCollecteApiTests(TracabiliteBaseTestCase):
    """Bons de collecte (FABC) : création, calcul montant, filtres."""

    def _payload(self, **overrides):
        data = {
            'numero_fabc': 'FABC-0001',
            'campagne': self.campagne.id,
            'producteur': self.producteur.id,
            'date_marche': '2025-07-15',
            'village_marche': 'Marovovonana',
            'commune': 'Andapa',
            'fokontany': 'Fokontany A',
            'type_produit': 'vanille_verte',
            'poids_total_livre': 100,
            'poids_accepte': 95,
            'poids_retour': 5,
            'prix_unitaire_marche': 100000,
            'mode_paiement': 'especes',
        }
        data.update(overrides)
        return data

    def test_create_bon_collecte(self):
        response = self.client.post('/api/tracabilite/bons-collecte/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_montant_total_computed_automatically(self):
        # 95 kg × 100000 Ar + premium 50000 = 9550000
        response = self.client.post(
            '/api/tracabilite/bons-collecte/',
            self._payload(montant_premium=50000)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        bon = BonCollecte.objects.get(numero_fabc='FABC-0001')
        self.assertEqual(float(bon.montant_total_achat), 9550000.0)

    def test_duplicate_numero_fabc_rejected(self):
        self.client.post('/api/tracabilite/bons-collecte/', self._payload())
        response = self.client.post(
            '/api/tracabilite/bons-collecte/',
            self._payload(numero_fabc='FABC-0002')
        )
        # OK : numéro différent
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        # Doublon du même numéro → 400
        response = self.client.post(
            '/api/tracabilite/bons-collecte/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('numero_fabc', response.data)

    def test_negative_poids_rejected(self):
        response = self.client.post(
            '/api/tracabilite/bons-collecte/', self._payload(poids_accepte=-5)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_producteur(self):
        self.client.post('/api/tracabilite/bons-collecte/', self._payload())
        response = self.client.get(
            '/api/tracabilite/bons-collecte/', {'producteur': self.producteur.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['numero_fabc'], 'FABC-0001')

        other = Producteur.objects.create(
            code='TP02', nom='Autre', commune='Sambava', sexe='F', actif=True
        )
        response = self.client.get(
            '/api/tracabilite/bons-collecte/', {'producteur': other.id}
        )
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_filter_by_campagne(self):
        self.client.post('/api/tracabilite/bons-collecte/', self._payload())
        response = self.client.get(
            '/api/tracabilite/bons-collecte/', {'campagne': self.campagne.id}
        )
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)


class BonTransportApiTests(TracabiliteBaseTestCase):
    """Bons de transport : création et action marquer-recu."""

    def setUp(self):
        super().setUp()
        self.bon = BonCollecte.objects.create(
            numero_fabc='FABC-0001',
            campagne=self.campagne,
            producteur=self.producteur,
            date_marche=date(2025, 7, 15),
            village_marche='Marovovonana',
            commune='Andapa',
            fokontany='Fokontany A',
            type_produit='vanille_verte',
            poids_total_livre=100,
            poids_accepte=95,
            prix_unitaire_marche=100000,
            mode_paiement='especes',
        )
        # FicheCollecte requise pour un BonTransport (FK PROTECT)
        from tracabilite.models import FicheCollecte
        self.fiche = FicheCollecte.objects.create(
            numero_fc='FC-0001',
            campagne=self.campagne,
            certification='bio',
            date_marche=date(2025, 7, 16),
            fokontany='Fokontany A',
            agent_re='Agent RE',
        )
        self.fiche.bons_collecte.add(self.bon)

    def _payload(self, **overrides):
        data = {
            'numero_bt': 'BT-1001',
            'campagne': self.campagne.id,
            'fiche_collecte': self.fiche.id,
            'lieu_depart': 'Andapa',
            'fokontany_depart': 'Fokontany A',
            'lieu_destination': 'Sambava',
            'type_logistique': 'vehicule',
            'numero_vehicule': '1234 TBC',
            'date_chargement': '2025-07-17',
            'poids_total_depart': 95,
            'agent_convoyeur': 'Convoyeur X',
        }
        data.update(overrides)
        return data

    def test_create_bon_transport(self):
        response = self.client.post('/api/tracabilite/bons-transport/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['statut'], 'en_transit')

    def test_marquer_recu_updates_status(self):
        response = self.client.post('/api/tracabilite/bons-transport/', self._payload())
        bon_id = response.data['id']

        response = self.client.post(
            f'/api/tracabilite/bons-transport/{bon_id}/marquer-recu/',
            {
                'date_arrivee': '2025-07-18',
                'poids_total_arrivee': 94.5,
                'agent_receptionnaire': 'Jean Dupont',
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        bon = BonTransport.objects.get(id=bon_id)
        self.assertEqual(bon.statut, 'recu')
        self.assertEqual(float(bon.poids_total_arrivee), 94.5)

    def test_filter_by_statut(self):
        self.client.post('/api/tracabilite/bons-transport/', self._payload())
        response = self.client.get(
            '/api/tracabilite/bons-transport/', {'statut': 'en_transit'}
        )
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

        response = self.client.get(
            '/api/tracabilite/bons-transport/', {'statut': 'recu'}
        )
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)


class LotTraitementModelTests(TracabiliteBaseTestCase):
    """save() : perte de poids et taux calculés automatiquement."""

    def test_perte_poids_computed(self):
        from tracabilite.models import LotTraitement
        lot = LotTraitement.objects.create(
            numero_lot='LOT-001',
            campagne=self.campagne,
            type_traitement='sechage',
            date_debut=date(2025, 8, 1),
            poids_entree=100,
            poids_sortie=80,
            responsable_traitement='Responsable Y',
            site_traitement='Site Sambava',
        )
        self.assertEqual(float(lot.perte_poids), 20)
        self.assertEqual(float(lot.taux_perte), 20.0)


class FicheStockModelTests(TracabiliteBaseTestCase):
    """save() : solde cumulé par magasin/produit."""

    def setUp(self):
        super().setUp()
        from tracabilite.models import Magasin
        self.magasin = Magasin.objects.create(nom='Magasin Sambava', code='MAG01')

    def _fiche(self, entree=0, sortie=0, ref='MOV'):
        from tracabilite.models import FicheStock
        return FicheStock.objects.create(
            magasin=self.magasin,
            produit='vanille_preparee',
            date=date(2025, 8, 1),
            reference=ref,
            quantite_entree=entree,
            quantite_sortie=sortie,
        )

    def test_solde_cumulated(self):
        self.assertEqual(float(self._fiche(entree=100, ref='E1').solde), 100)
        self.assertEqual(float(self._fiche(sortie=30, ref='S1').solde), 70)
        self.assertEqual(float(self._fiche(entree=50, ref='E2').solde), 120)

    def test_stock_actuel_property(self):
        self._fiche(entree=100, ref='E1')
        self._fiche(sortie=30, ref='S1')
        self.assertEqual(float(self.magasin.stock_actuel), 70)


class EstimationProductionApiTests(TracabiliteBaseTestCase):
    """Estimations de production : unicité producteur/campagne/type."""

    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'campagne': self.campagne.id,
            'quantite_estimee': 150.5,
            'type_vanille': 'verte',
            'date_estimation': '2025-06-10',
        }
        data.update(overrides)
        return data

    def test_create_estimation(self):
        response = self.client.post(
            '/api/tracabilite/estimations-production/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_unique_together_producteur_campagne_type(self):
        self.client.post('/api/tracabilite/estimations-production/', self._payload())
        # Même triplet → 400
        response = self.client.post(
            '/api/tracabilite/estimations-production/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Type différent → OK
        response = self.client.post(
            '/api/tracabilite/estimations-production/',
            self._payload(type_vanille='preparee'),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_negative_quantite_rejected(self):
        response = self.client.post(
            '/api/tracabilite/estimations-production/',
            self._payload(quantite_estimee=-10),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
