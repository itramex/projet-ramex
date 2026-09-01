from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from producteurs.models import Producteur
from parcelles.models import Parcelle


class ParcelleFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        prod_a = Producteur.objects.create(
            code='PA01',
            nom='ProdA',
            commune='Commune A',
            village='Village A',
            sexe='M',
            actif=True
        )
        prod_b = Producteur.objects.create(
            code='PB01',
            nom='ProdB',
            commune='Commune B',
            village='Village B',
            sexe='F',
            actif=True
        )

        Parcelle.objects.create(
            producteur=prod_a,
            numero_parcelle=1,
            code_parcelle='PA01-P1',
            dimension_ha=1.2,
            type_vanille='planifolia',
            certifiee=True,
            cultures_pratiquees=['vanille', 'cafe']
        )
        Parcelle.objects.create(
            producteur=prod_b,
            numero_parcelle=1,
            code_parcelle='PB01-P1',
            dimension_ha=0.8,
            type_vanille='tahitensis',
            certifiee=False,
            cultures_pratiquees=['girofle']
        )

    def test_filter_by_village_and_multi_cultures(self):
        response = self.client.get('/api/parcelles/', {'village': 'Village A', 'cultures_pratiquees': 'vanille,cafe'})
        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['code_parcelle'], 'PA01-P1')


def _make_parcelle_payload(producteur_id, **overrides):
    """Payload minimal valide pour créer une parcelle."""
    data = {
        'producteur': producteur_id,
        'numero_parcelle': 1,
        'dimension_ha': 1.5,
    }
    data.update(overrides)
    return data


class ParcelleCrudApiTests(TestCase):
    """CRUD parcelle : création, code auto-généré, GPS, unicité par producteur."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.producteur = Producteur.objects.create(
            code='PA01', nom='ProdA', commune='Commune A', sexe='M', actif=True
        )

    def test_create_parcelle_generates_code_automatically(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/parcelles/', _make_parcelle_payload(self.producteur.id)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        parcelle = Parcelle.objects.get(id=response.data['id'])
        self.assertEqual(parcelle.code_parcelle, 'PA01-P1')

    def test_create_parcelle_with_gps_creates_point(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/parcelles/',
            _make_parcelle_payload(
                self.producteur.id, latitude=-13.5432, longitude=50.1234
            )
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        parcelle = Parcelle.objects.get(id=response.data['id'])
        self.assertIsNotNone(parcelle.point)
        self.assertAlmostEqual(parcelle.point.y, -13.5432, places=4)
        self.assertAlmostEqual(parcelle.point.x, 50.1234, places=4)

    def test_create_duplicate_numero_for_same_producteur_rejected(self):
        Parcelle.objects.create(
            producteur=self.producteur,
            numero_parcelle=1,
            code_parcelle='PA01-P1',
            dimension_ha=1.0,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/parcelles/', _make_parcelle_payload(self.producteur.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # UniqueTogetherValidator → non_field_errors
        self.assertIn('non_field_errors', response.data)

    def test_same_numero_allowed_for_different_producteurs(self):
        other = Producteur.objects.create(
            code='PB01', nom='ProdB', commune='Commune B', sexe='F', actif=True
        )
        Parcelle.objects.create(
            producteur=self.producteur,
            numero_parcelle=1,
            code_parcelle='PA01-P1',
            dimension_ha=1.0,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/parcelles/', _make_parcelle_payload(other.id)
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_create_parcelle_negative_dimension_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/parcelles/',
            _make_parcelle_payload(self.producteur.id, dimension_ha=-2)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_dimension(self):
        parcelle = Parcelle.objects.create(
            producteur=self.producteur,
            numero_parcelle=1,
            code_parcelle='PA01-P1',
            dimension_ha=1.0,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/parcelles/{parcelle.id}/', {'dimension_ha': 3.2}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        parcelle.refresh_from_db()
        self.assertEqual(float(parcelle.dimension_ha), 3.2)

    def test_non_admin_cannot_create(self):
        user = User.objects.create_user(username='basic', password='BasicPass123!')
        self.client.force_authenticate(user=user)
        response = self.client.post(
            '/api/parcelles/', _make_parcelle_payload(self.producteur.id)
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ParcelleFilterApiTests(TestCase):
    """Filtres parcelles : certification, type vanille, GPS manquant."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.prod_a = Producteur.objects.create(
            code='PA01', nom='ProdA', commune='Commune A', village='Village A',
            sexe='M', actif=True
        )
        self.prod_b = Producteur.objects.create(
            code='PB01', nom='ProdB', commune='Commune B', village='Village B',
            sexe='F', actif=True
        )

        self.parcelle_a = Parcelle.objects.create(
            producteur=self.prod_a,
            numero_parcelle=1,
            code_parcelle='PA01-P1',
            dimension_ha=1.2,
            type_vanille='planifolia',
            certifiee=True,
        )
        self.parcelle_b = Parcelle.objects.create(
            producteur=self.prod_b,
            numero_parcelle=1,
            code_parcelle='PB01-P1',
            dimension_ha=0.8,
            type_vanille='tahitensis',
            certifiee=False,
        )

    def _codes(self, response):
        data = response.data.get('results', response.data)
        return sorted(p['code_parcelle'] for p in data)

    def test_filter_certifiee_true(self):
        response = self.client.get('/api/parcelles/', {'certifiee': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._codes(response), ['PA01-P1'])

    def test_filter_type_vanille_multiple(self):
        response = self.client.get(
            '/api/parcelles/', {'type_vanille': 'planifolia,tahitensis'}
        )
        self.assertEqual(self._codes(response), ['PA01-P1', 'PB01-P1'])

    def test_filter_by_producteur_id(self):
        response = self.client.get(
            '/api/parcelles/', {'producteur': str(self.prod_b.id)}
        )
        self.assertEqual(self._codes(response), ['PB01-P1'])

    def test_filter_gps_missing(self):
        # parcelle_b n'a pas de GPS ; parcelle_a non plus → les deux
        response = self.client.get('/api/parcelles/', {'gps_missing': 'true'})
        self.assertEqual(self._codes(response), ['PA01-P1', 'PB01-P1'])

        # On ajoute un point GPS à parcelle_a via l'ancien système
        self.parcelle_a.gps_latitude = -13.5
        self.parcelle_a.gps_longitude = 50.1
        self.parcelle_a.save()
        response = self.client.get('/api/parcelles/', {'gps_missing': 'true'})
        self.assertEqual(self._codes(response), ['PB01-P1'])

    def test_search_by_producteur_name(self):
        response = self.client.get('/api/parcelles/', {'search': 'ProdB'})
        self.assertEqual(self._codes(response), ['PB01-P1'])


class ParcelleGeoApiTests(TestCase):
    """Endpoints géographiques : geojson et nearby (PostGIS)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

        self.prod = Producteur.objects.create(
            code='PG01', nom='ProdGeo', commune='Sambava', sexe='M', actif=True
        )
        # Sambava centre ≈ (-13.55, 50.0)
        self.parcelle_proche = Parcelle.objects.create(
            producteur=self.prod,
            numero_parcelle=1,
            code_parcelle='PG01-P1',
            dimension_ha=1.0,
            gps_latitude=-13.55,
            gps_longitude=50.00,
        )
        # Antalaha ≈ (-15.0, 50.28) — bien plus loin
        self.parcelle_lointaine = Parcelle.objects.create(
            producteur=self.prod,
            numero_parcelle=2,
            code_parcelle='PG01-P2',
            dimension_ha=1.0,
            gps_latitude=-15.00,
            gps_longitude=50.28,
        )

    def test_geojson_returns_only_parcelles_with_point(self):
        # Les deux parcelles ont des coordonnées GPS → points créés au save()
        response = self.client.get('/api/parcelles/geojson/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # GeoFeatureModelSerializer renvoie une FeatureCollection
        self.assertEqual(response.data['type'], 'FeatureCollection')
        codes = sorted(
            f['properties'].get('code_parcelle') for f in response.data['features']
        )
        self.assertEqual(codes, ['PG01-P1', 'PG01-P2'])

    def test_geojson_excludes_parcelle_without_point(self):
        Parcelle.objects.filter(pk=self.parcelle_proche.pk).update(
            point=None, gps_latitude=None, gps_longitude=None
        )
        response = self.client.get('/api/parcelles/geojson/')
        codes = [f['properties'].get('code_parcelle') for f in response.data['features']]
        self.assertEqual(codes, ['PG01-P2'])

    def test_nearby_requires_lat_lon(self):
        response = self.client.get('/api/parcelles/nearby/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nearby_finds_closest_parcelle_first(self):
        response = self.client.get(
            '/api/parcelles/nearby/', {'lat': '-13.55', 'lon': '50.00', 'radius': 300}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [p['code_parcelle'] for p in response.data]
        self.assertEqual(codes[0], 'PG01-P1')
        self.assertIn('PG01-P2', codes)


class ParcelleModelSaveTests(TestCase):
    """Logique du save() : auto-migration GPS → Point, calcul des productions."""

    def setUp(self):
        self.prod = Producteur.objects.create(
            code='PM01', nom='ProdModel', commune='Commune A', sexe='M', actif=True
        )

    def test_old_gps_fields_migrate_to_point_on_save(self):
        parcelle = Parcelle.objects.create(
            producteur=self.prod,
            numero_parcelle=1,
            code_parcelle='PM01-P1',
            dimension_ha=1.0,
            gps_latitude=-13.5,
            gps_longitude=50.1,
        )
        self.assertIsNotNone(parcelle.point)
        self.assertAlmostEqual(parcelle.point.x, 50.1, places=4)
        self.assertAlmostEqual(parcelle.point.y, -13.5, places=4)

    def test_productions_par_culture_updates_totals_and_cultures(self):
        parcelle = Parcelle.objects.create(
            producteur=self.prod,
            numero_parcelle=1,
            code_parcelle='PM01-P1',
            dimension_ha=1.0,
            productions_par_culture={'vanille': 150.5, 'cafe': 200.0},
        )
        self.assertEqual(float(parcelle.estimation_production_kg), 350.5)
        self.assertEqual(set(parcelle.cultures_pratiquees), {'vanille', 'cafe'})

    def test_auto_code_generated_when_missing(self):
        parcelle = Parcelle.objects.create(
            producteur=self.prod,
            numero_parcelle=3,
            dimension_ha=1.0,
        )
        self.assertEqual(parcelle.code_parcelle, 'PM01-P3')
