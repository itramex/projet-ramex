from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from formations.models import (
    TypeFormation, Formation, TypeCertification, Certification,
    AuditCertification, NonConformite, ActiviteCertification,
)
from producteurs.models import Producteur
from cooperatives.models import Cooperative


class FormationsBaseTestCase(TestCase):
    """Données communes : utilisateur habilité (animateur par défaut), producteur, catalogue."""

    def setUp(self):
        self.client = APIClient()
        # Rôle par défaut via signal : animateur → CanManageCertificationDD OK
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.producteur = Producteur.objects.create(
            code='FP01', nom='Rakoto', commune='Sambava', sexe='M', actif=True
        )
        self.coop = Cooperative.objects.create(
            code='FCOOP1', nom='Coop Sava', commune='Sambava'
        )
        self.type_formation = TypeFormation.objects.create(
            nom='Formation Récolte Durable', duree_jours=2
        )
        self.type_cert = TypeCertification.objects.create(
            nom='Rainforest Alliance', code='RA', niveau='rainforest',
            duree_validite_ans=3,
        )


class TypeFormationApiTests(FormationsBaseTestCase):
    def test_list_only_actif(self):
        TypeFormation.objects.create(nom='Ancienne formation', actif=False)
        response = self.client.get('/api/formations/types-formations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        noms = [t['nom'] for t in data]
        self.assertEqual(len(data), 1)
        self.assertNotIn('Ancienne formation', noms)

    def test_create_type_formation(self):
        response = self.client.post('/api/formations/types-formations/', {
            'nom': 'Formation Compostage', 'duree_jours': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_duplicate_nom_rejected(self):
        response = self.client.post('/api/formations/types-formations/', {
            'nom': 'Formation Récolte Durable',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FormationApiTests(FormationsBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'type_formation': self.type_formation.id,
            'date_formation': '2026-05-10',
            'lieu': 'Sambava',
            'organisme': 'RAMEX',
            'certificat_obtenu': True,
        }
        data.update(overrides)
        return data

    def test_create_formation(self):
        response = self.client.post('/api/formations/formations/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(Formation.objects.filter(producteur=self.producteur).exists())

    def test_filter_by_producteur_and_certificat(self):
        self.client.post('/api/formations/formations/', self._payload())
        self.client.post(
            '/api/formations/formations/',
            self._payload(date_formation='2026-05-20', certificat_obtenu=False)
        )

        response = self.client.get('/api/formations/formations/', {
            'producteur': self.producteur.id, 'certificat_obtenu': 'true',
        })
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertTrue(data[0]['certificat_obtenu'])

    def test_filter_by_date_range(self):
        self.client.post('/api/formations/formations/', self._payload())
        self.client.post(
            '/api/formations/formations/',
            self._payload(date_formation='2026-05-20')
        )
        response = self.client.get('/api/formations/formations/', {
            'date_formation__gte': '2026-05-15',
            'date_formation__lte': '2026-05-31',
        })
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['date_formation'], '2026-05-20')

    def test_statistiques(self):
        self.client.post('/api/formations/formations/', self._payload())
        response = self.client.get('/api/formations/formations/statistiques/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_formations'], 1)
        self.assertEqual(response.data['producteurs_formes'], 1)
        self.assertEqual(response.data['avec_certificat'], 1)

    def test_par_producteur_requires_param(self):
        response = self.client.get('/api/formations/formations/par_producteur/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_par_producteur_returns_only_his_formations(self):
        self.client.post('/api/formations/formations/', self._payload())
        other = Producteur.objects.create(
            code='FP02', nom='Ravao', commune='Andapa', sexe='F', actif=True
        )
        response = self.client.get(
            '/api/formations/formations/par_producteur/',
            {'producteur_id': other.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class CertificationApiTests(FormationsBaseTestCase):
    def _payload(self, **overrides):
        data = {
            'producteur': self.producteur.id,
            'type_certification': self.type_cert.id,
            'numero_certificat': 'RA-2026-001',
            'date_obtention': '2026-01-15',
            'date_expiration': '2028-01-15',
            'statut': 'valide',
        }
        data.update(overrides)
        return data

    def test_create_certification_for_producteur(self):
        response = self.client.post('/api/formations/certifications/', self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(
            Certification.objects.filter(producteur=self.producteur).exists()
        )

    def test_create_without_producteur_and_cooperative_rejected(self):
        payload = self._payload()
        del payload['producteur']
        response = self.client.post('/api/formations/certifications/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_for_cooperative_only(self):
        payload = self._payload()
        del payload['producteur']
        payload['cooperative'] = self.coop.id
        response = self.client.post('/api/formations/certifications/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_expired_certification_auto_updates_statut(self):
        # Date d'expiration passée + statut 'valide' → save() force 'expire'
        response = self.client.post('/api/formations/certifications/', self._payload(
            date_obtention='2023-01-15',
            date_expiration='2024-01-15',
        ))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        cert = Certification.objects.get(numero_certificat='RA-2026-001')
        self.assertEqual(cert.statut, 'expire')

    def test_filter_by_statut(self):
        self.client.post('/api/formations/certifications/', self._payload())
        response = self.client.get(
            '/api/formations/certifications/', {'statut': 'valide'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)

    def test_statistiques(self):
        self.client.post('/api/formations/certifications/', self._payload())
        self.client.post('/api/formations/certifications/', self._payload(
            numero_certificat='RA-2026-002',
            date_obtention='2023-01-15', date_expiration='2024-01-15',
        ))
        response = self.client.get('/api/formations/certifications/statistiques/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_certifications'], 2)
        self.assertEqual(response.data['valides'], 1)
        self.assertEqual(response.data['expirees'], 1)
        self.assertEqual(response.data['producteurs_certifies'], 1)


class AuditNonConformiteApiTests(FormationsBaseTestCase):
    def setUp(self):
        super().setUp()
        self.audit = AuditCertification.objects.create(
            type_certification=self.type_cert,
            date_audit=date(2026, 3, 1),
            organisme='Control Union',
            resultat='non_conforme',
            resume='Constat de non-conformité majeure',
        )

    def test_create_audit(self):
        response = self.client.post('/api/formations/audits/', {
            'type_certification': self.type_cert.id,
            'date_audit': '2026-06-01',
            'resultat': 'conforme',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_audit_lists_its_nonconformites(self):
        NonConformite.objects.create(
            audit=self.audit,
            producteur=self.producteur,
            type='majeure',
            description='Traçabilité incomplète sur 3 lots',
        )
        response = self.client.get(
            f'/api/formations/audits/{self.audit.id}/nonconformites/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['type'], 'majeure')

    def test_create_nonconformite(self):
        response = self.client.post('/api/formations/nonconformites/', {
            'audit': self.audit.id,
            'producteur': self.producteur.id,
            'type': 'critique',
            'description': 'Usage de produits interdits',
            'date_limite': '2026-09-30',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_resoudre_updates_statut_and_date(self):
        nc = NonConformite.objects.create(
            audit=self.audit, type='mineure',
            description='Registre incomplet',
        )
        self.assertEqual(nc.statut, 'ouverte')

        response = self.client.post(f'/api/formations/nonconformites/{nc.id}/resoudre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nc.refresh_from_db()
        self.assertEqual(nc.statut, 'resolue')
        self.assertIsNotNone(nc.date_resolution)

    def test_filter_nonconformites_by_statut(self):
        NonConformite.objects.create(
            audit=self.audit, type='mineure', description='NC ouverte'
        )
        NonConformite.objects.create(
            audit=self.audit, type='majeure', description='NC résolue',
            statut='resolue', date_resolution=date(2026, 3, 15),
        )
        response = self.client.get(
            '/api/formations/nonconformites/', {'statut': 'ouverte'}
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['description'], 'NC ouverte')


class ActiviteCertificationApiTests(FormationsBaseTestCase):
    def test_create_sets_responsable_automatically(self):
        response = self.client.post('/api/formations/activites-certifications/', {
            'type_activite': 'audit_interne',
            'date': '2026-04-15',
            'type_certification': self.type_cert.id,
            'cooperative': self.coop.id,
            'description': 'Audit interne annuel',
            'nombre_participants': 12,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        activite = ActiviteCertification.objects.get(
            type_activite='audit_interne'
        )
        # perform_create renseigne responsable = utilisateur courant
        self.assertEqual(activite.responsable, self.user)

    def test_filter_by_type_activite(self):
        ActiviteCertification.objects.create(
            type_activite='sensibilisation',
            date=date(2026, 2, 1),
            description='Sensibilisation collective',
        )
        ActiviteCertification.objects.create(
            type_activite='formation',
            date=date(2026, 3, 1),
            description='Formation producteurs',
        )
        response = self.client.get(
            '/api/formations/activites-certifications/',
            {'type_activite': 'formation'},
        )
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['type_activite'], 'formation')

    def test_statistiques(self):
        ActiviteCertification.objects.create(
            type_activite='sensibilisation', date=date(2026, 2, 1),
        )
        ActiviteCertification.objects.create(
            type_activite='formation', date=date(2026, 3, 1),
        )
        response = self.client.get(
            '/api/formations/activites-certifications/statistiques/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        par_type = {row['type_activite']: row['count'] for row in response.data['par_type']}
        self.assertEqual(par_type['sensibilisation'], 1)
        self.assertEqual(par_type['formation'], 1)
