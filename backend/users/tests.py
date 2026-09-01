from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.models import ActivityLog


class AuthTokenApiTests(TestCase):
    """Tests de l'authentification JWT : login, refresh, blacklist."""

    def setUp(self):
        self.client = APIClient()
        # Le middleware limite /api/token/ à 5 req/min : on réinitialise le compteur
        cache.clear()
        self.user = User.objects.create_user(
            username='authuser',
            password='SecretPass123!',
            email='auth@example.com'
        )

    def _login(self, username='authuser', password='SecretPass123!'):
        return self.client.post(
            '/api/token/', {'username': username, 'password': password}
        )

    def test_login_returns_tokens(self):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        response = self._login(password='WrongPass123!')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_creates_activity_log(self):
        self._login()
        self.assertTrue(
            ActivityLog.objects.filter(user=self.user, action='login').exists()
        )

    def test_refresh_token_returns_new_access(self):
        tokens = self._login().data
        response = self.client.post('/api/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_blacklisted_refresh_token_cannot_be_refreshed(self):
        tokens = self._login().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.post('/api/token/blacklist/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post('/api/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_validate_token_returns_expiry(self):
        tokens = self._login().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.post('/api/validate-token/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertIn('expires_in', response.data)
        self.assertEqual(int(response.data['user_id']), self.user.id)


class UserApiTests(TestCase):
    """Tests de gestion des utilisateurs : permissions, CRUD, mots de passe."""

    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(
            username='basic', password='BasicPass123!'
        )

    def test_anonymous_cannot_list_users(self):
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_users(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_list_users_search_filters_by_username(self):
        User.objects.create_user(username='marcel', password='MarcelPass123!')
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/', {'search': 'marc'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data['results']]
        self.assertEqual(usernames, ['marcel'])

    def test_non_admin_cannot_create_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'password': 'NewUserPass123!',
            'password_confirm': 'NewUserPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user_with_profile(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'NewUserPass123!',
            'password_confirm': 'NewUserPass123!',
            'role': 'superviseur'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='newuser')
        self.assertEqual(user.profile.role, 'superviseur')
        # Le mot de passe est bien hashé, pas stocké en clair
        self.assertNotEqual(user.password, 'NewUserPass123!')

    def test_create_user_password_mismatch(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'password': 'NewUserPass123!',
            'password_confirm': 'Different123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newuser').exists())

    def test_create_user_short_password_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'password': 'abc',
            'password_confirm': 'abc'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_delete_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/users/{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_user(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/users/{self.user.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=self.user.id).exists())

    def test_toggle_active_by_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/users/{self.user.id}/toggle_active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_toggle_active_forbidden_for_non_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/users/{self.admin.id}/toggle_active/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserPasswordApiTests(TestCase):
    """Tests de changement et réinitialisation de mot de passe."""

    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.admin = User.objects.create_user(
            username='admin', password='AdminPass123!', is_staff=True
        )
        self.user = User.objects.create_user(
            username='basic', password='BasicPass123!'
        )

    def test_change_own_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/users/{self.user.id}/change_password/', {
            'old_password': 'BasicPass123!',
            'new_password': 'NewBasicPass456!',
            'new_password_confirm': 'NewBasicPass456!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        # L'ancien mot de passe ne fonctionne plus, le nouveau oui
        old_login = self.client.post(
            '/api/token/', {'username': 'basic', 'password': 'BasicPass123!'}
        )
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)
        new_login = self.client.post(
            '/api/token/', {'username': 'basic', 'password': 'NewBasicPass456!'}
        )
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_change_password_with_wrong_old_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/users/{self.user.id}/change_password/', {
            'old_password': 'WrongOld123!',
            'new_password': 'NewBasicPass456!',
            'new_password_confirm': 'NewBasicPass456!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_of_another_user_forbidden(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/users/{self.admin.id}/change_password/', {
            'old_password': 'AdminPass123!',
            'new_password': 'HackedPass456!',
            'new_password_confirm': 'HackedPass456!'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_password_by_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/users/{self.user.id}/reset_password/', {
            'new_password': 'ResetByAdmin789!',
            'new_password_confirm': 'ResetByAdmin789!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        login = self.client.post(
            '/api/token/', {'username': 'basic', 'password': 'ResetByAdmin789!'}
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_reset_password_forbidden_for_non_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/users/{self.admin.id}/reset_password/', {
            'new_password': 'HackedPass456!',
            'new_password_confirm': 'HackedPass456!'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserStatisticsApiTests(TestCase):
    """Tests de l'endpoint statistics des utilisateurs."""

    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = User.objects.create_user(
            username='statuser', password='StatUserPass123!'
        )
        User.objects.create_user(
            username='inactive', password='Inactive123!', is_active=False
        )

    def test_statistics_returns_counts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/statistics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_users'], 2)
        self.assertEqual(response.data['active_users'], 1)
        self.assertEqual(response.data['inactive_users'], 1)

    def test_statistics_requires_authentication(self):
        response = self.client.get('/api/users/statistics/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
