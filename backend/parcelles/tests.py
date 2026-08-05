from django.contrib.auth.models import User
from django.test import TestCase
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
