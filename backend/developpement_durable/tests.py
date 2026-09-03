from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from developpement_durable.models import PartenaireDD, ActiviteDD
from cooperatives.models import Cooperative
from producteurs.models import Producteur


class DDPermissionsApiTests(TestCase):
    """CanManageCertificationDD : admin, animateur et superviseur uniquement."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        # Rôle par défaut via signal : animateur → accès autorisé
        self.animateur = User.objects.create_user(
            username='anim', password='AnimPass123!'
        )
        # Agent collecte → accès refusé
        self.agent = User.objects.create_user(
            username='agent', password='AgentPass123!'
        )
        self.agent.profile.role = 'agent_collecte'
        self.agent.profile.save()

    def test_anonymous_cannot_list_partenaires(self):
        response = self.client.get('/api/developpement-durable/partenaires/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_animateur_can_list_partenaires(self):
        self.client.force_authenticate(user=self.animateur)
        response = self.client.get('/api/developpement-durable/partenaires/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_list_partenaires(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/developpement-durable/partenaires/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_agent_collecte_cannot_list_partenaires(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.get('/api/developpement-durable/partenaires/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_agent_collecte_cannot_create_activite(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.post('/api/developpement-durable/activites/', {
            'type_activite': 'reboisement',
            'date': '2026-06-15',
            'description': 'Plantation 500 arbres',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PartenaireDDApiTests(TestCase):
    """CRUD partenaires DD : création, filtres type/actif, recherche."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.client.force_authenticate(user=self.admin)

        self.ong = PartenaireDD.objects.create(
            nom='ONG Bio Sava', type='ong', contact='Rakoto', actif=True
        )
        self.autorite = PartenaireDD.objects.create(
            nom='Commune Sambava', type='autorite_locale', actif=True
        )
        self.inactif = PartenaireDD.objects.create(
            nom='Ancien partenaire', type='partenaire_technique', actif=False
        )

    def test_list_partenaires(self):
        response = self.client.get('/api/developpement-durable/partenaires/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 3)

    def test_create_partenaire(self):
        response = self.client.post('/api/developpement-durable/partenaires/', {
            'nom': 'Partenaire Technique X',
            'type': 'partenaire_technique',
            'contact': 'Jean Dupont',
            'telephone': '+261341234567',
            'email': 'contact@partenaire.mg',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_invalid_type_rejected(self):
        response = self.client.post('/api/developpement-durable/partenaires/', {
            'nom': 'Partenaire Inconnu',
            'type': 'type_invalide',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_type(self):
        response = self.client.get(
            '/api/developpement-durable/partenaires/', {'type': 'ong'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom'], 'ONG Bio Sava')

    def test_filter_actif_false(self):
        response = self.client.get(
            '/api/developpement-durable/partenaires/', {'actif': 'false'}
        )
        data = response.data.get('results', response.data)
        noms = [p['nom'] for p in data]
        self.assertEqual(noms, ['Ancien partenaire'])

    def test_search_by_contact(self):
        response = self.client.get(
            '/api/developpement-durable/partenaires/', {'search': 'Rakoto'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_update_partenaire(self):
        response = self.client.patch(
            f'/api/developpement-durable/partenaires/{self.ong.id}/',
            {'contact': 'Nouveau contact'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.ong.refresh_from_db()
        self.assertEqual(self.ong.contact, 'Nouveau contact')

    def test_delete_partenaire(self):
        response = self.client.delete(
            f'/api/developpement-durable/partenaires/{self.inactif.id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PartenaireDD.objects.filter(id=self.inactif.id).exists())


class ActiviteDDApiTests(TestCase):
    """CRUD activités DD : création avec relations, filtres, recherche."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.client.force_authenticate(user=self.admin)

        self.coop = Cooperative.objects.create(
            code='COOP001', nom='Coop Sava', commune='Sambava'
        )
        self.prod = Producteur.objects.create(
            code='P001', nom='Rakoto', commune='Sambava', sexe='M', actif=True
        )
        self.partenaire = PartenaireDD.objects.create(
            nom='ONG Bio Sava', type='ong'
        )

        self.reboisement = ActiviteDD.objects.create(
            type_activite='reboisement',
            date=date(2026, 6, 15),
            cooperative=self.coop,
            partenaire=self.partenaire,
            objectif_client='biodiversite',
            description='Plantation de 500 arbres endémiques',
            nombre_participants=25,
        )
        self.sensibilisation = ActiviteDD.objects.create(
            type_activite='sensibilisation',
            date=date(2026, 7, 1),
            producteur=self.prod,
            objectif_client='droits_humains',
            description='Sensibilisation travail des enfants',
            nombre_participants=40,
        )

    def _payload(self, **overrides):
        data = {
            'type_activite': 'formation',
            'date': '2026-08-10',
            'cooperative': self.coop.id,
            'objectif_client': 'autonomisation_femmes',
            'description': 'Formation compostage pour 15 femmes',
            'nombre_participants': 15,
        }
        data.update(overrides)
        return data

    def test_create_activite(self):
        response = self.client.post(
            '/api/developpement-durable/activites/', self._payload()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_create_activite_sans_description_rejected(self):
        payload = self._payload(description='')
        response = self.client.post('/api/developpement-durable/activites/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_ordered_by_date_desc(self):
        response = self.client.get('/api/developpement-durable/activites/')
        data = response.data.get('results', response.data)
        dates = [a['date'] for a in data]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_filter_by_type_activite(self):
        response = self.client.get(
            '/api/developpement-durable/activites/', {'type_activite': 'reboisement'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['type_activite'], 'reboisement')

    def test_filter_by_objectif_client(self):
        response = self.client.get(
            '/api/developpement-durable/activites/',
            {'objectif_client': 'droits_humains'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['description'], 'Sensibilisation travail des enfants')

    def test_filter_by_cooperative(self):
        response = self.client.get(
            '/api/developpement-durable/activites/', {'cooperative': self.coop.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['type_activite'], 'reboisement')

    def test_filter_by_partenaire(self):
        response = self.client.get(
            '/api/developpement-durable/activites/', {'partenaire': self.partenaire.id}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_search_by_description(self):
        response = self.client.get(
            '/api/developpement-durable/activites/', {'search': 'endémiques'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_update_resultat(self):
        response = self.client.patch(
            f'/api/developpement-durable/activites/{self.reboisement.id}/',
            {'resultat': '480 plants survivants sur 500'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.reboisement.refresh_from_db()
        self.assertIn('480', self.reboisement.resultat)
