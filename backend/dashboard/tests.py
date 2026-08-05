from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from producteurs.models import Producteur
from datetime import datetime, timedelta


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)
        
        # Créer des producteurs de test avec différents âges
        today = datetime.now().date()
        
        # Producteurs de moins de 25 ans
        birth_date_20 = today - timedelta(days=20*365)
        Producteur.objects.create(
            code='P001',
            nom='Jean', 
            prenom='Dupont', 
            sexe='M',
            date_naissance=birth_date_20,
            actif=True,
            village='Village1',
            commune='Commune1'
        )
        Producteur.objects.create(
            code='P002',
            nom='Marie', 
            prenom='Martin', 
            sexe='F',
            date_naissance=birth_date_20,
            actif=True,
            village='Village1',
            commune='Commune1'
        )
        
        # Producteurs de 25-34 ans
        birth_date_30 = today - timedelta(days=30*365)
        Producteur.objects.create(
            code='P003',
            nom='Pierre', 
            prenom='Durand', 
            sexe='M',
            date_naissance=birth_date_30,
            actif=True,
            village='Village2',
            commune='Commune2'
        )
        
        # Producteurs de 35-44 ans
        birth_date_40 = today - timedelta(days=40*365)
        Producteur.objects.create(
            code='P004',
            nom='Sophie', 
            prenom='Leroy', 
            sexe='F',
            date_naissance=birth_date_40,
            actif=True,
            village='Village3',
            commune='Commune3'
        )
        
        # Producteurs de plus de 45 ans
        birth_date_50 = today - timedelta(days=50*365)
        Producteur.objects.create(
            code='P005',
            nom='Michel', 
            prenom='Bernard', 
            sexe='M',
            date_naissance=birth_date_50,
            actif=True,
            village='Village4',
            commune='Commune4'
        )

    def test_age_distribution_shows_absolute_numbers(self):
        """Test que la répartition par âge retourne bien les nombres absolus"""
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        age_distribution = data['demographics']['age_distribution']
        
        # Vérifier que chaque groupe d'âge a les champs absolus
        for age_group in age_distribution:
            self.assertIn('hommes_abs', age_group)
            self.assertIn('femmes_abs', age_group)
            self.assertIn('hommes', age_group)
            self.assertIn('femmes', age_group)
            
            # Vérifier que les nombres absolus correspondent aux données de test
            if age_group['groupe'] == '<25':
                self.assertEqual(age_group['hommes_abs'], 1)  # Jean
                self.assertEqual(age_group['femmes_abs'], 1)  # Marie
                self.assertEqual(age_group['hommes'], 1)
                self.assertEqual(age_group['femmes'], 1)
            elif age_group['groupe'] == '25-34':
                self.assertEqual(age_group['hommes_abs'], 1)  # Pierre
                self.assertEqual(age_group['femmes_abs'], 0)
            elif age_group['groupe'] == '35-44':
                self.assertEqual(age_group['hommes_abs'], 0)
                self.assertEqual(age_group['femmes_abs'], 1)  # Sophie
            elif age_group['groupe'] == '45+':
                self.assertEqual(age_group['hommes_abs'], 1)  # Michel
                self.assertEqual(age_group['femmes_abs'], 0)

    def test_age_distribution_with_filters(self):
        """Test que la répartition par âge fonctionne avec des filtres"""
        response = self.client.get('/api/dashboard/?village=Village1&commune=Commune1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        age_distribution = data['demographics']['age_distribution']
        
        # Avec le filtre, on ne devrait avoir que les producteurs de Village1/Commune1
        # Donc seulement Jean et Marie (tous deux <25 ans)
        under_25 = next(group for group in age_distribution if group['groupe'] == '<25')
        self.assertEqual(under_25['hommes_abs'], 1)
        self.assertEqual(under_25['femmes_abs'], 1)
        
        # Les autres groupes devraient être vides
        for group in age_distribution:
            if group['groupe'] != '<25':
                self.assertEqual(group['hommes_abs'], 0)
                self.assertEqual(group['femmes_abs'], 0)
