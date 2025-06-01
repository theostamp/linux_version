from django.urls import reverse  # type: ignore  # type: ignore  # type: ignore
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model  # type: ignore  # type: ignore  # type: ignore

User = get_user_model()

class UserAuthTests(APITestCase):

    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.me_url = reverse('me')

        self.user_data = {
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123',
        }

    def test_register(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], self.user_data['email'])

    def test_login_logout_me_flow(self):
        # Register
        self.client.post(self.register_url, self.user_data)

        # Login
        login_response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        # Me
        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['email'], self.user_data['email'])

        # Logout
        logout_response = self.client.post(self.logout_url)
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        # Me after logout
        me_after_logout = self.client.get(self.me_url)
        self.assertEqual(me_after_logout.status_code, status.HTTP_403_FORBIDDEN)
