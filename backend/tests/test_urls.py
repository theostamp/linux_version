# tests/test_urls.py

from django.test import TestCase
from django.urls import reverse, resolve
from users.views import (
    register_view, verify_email_view, create_invitation_view,
    list_invitations_view, accept_invitation_view,
    request_password_reset_view, confirm_password_reset_view,
    change_password_view, user_profile_view
)


class AuthenticationURLTestCase(TestCase):
    """
    Tests για τα authentication URL patterns
    """
    
    def test_register_url(self):
        """Test register URL"""
        url = reverse('user-register')
        self.assertEqual(url, '/api/users/register/')
        self.assertEqual(resolve(url).func, register_view)
    
    def test_verify_email_url(self):
        """Test verify email URL"""
        url = reverse('user-verify-email')
        self.assertEqual(url, '/api/users/verify-email/')
        self.assertEqual(resolve(url).func, verify_email_view)
    
    def test_create_invitation_url(self):
        """Test create invitation URL"""
        url = reverse('create-invitation')
        self.assertEqual(url, '/api/users/invite/')
        self.assertEqual(resolve(url).func, create_invitation_view)
    
    def test_list_invitations_url(self):
        """Test list invitations URL"""
        url = reverse('list-invitations')
        self.assertEqual(url, '/api/users/invitations/')
        self.assertEqual(resolve(url).func, list_invitations_view)
    
    def test_accept_invitation_url(self):
        """Test accept invitation URL"""
        url = reverse('accept-invitation')
        self.assertEqual(url, '/api/users/accept-invitation/')
        self.assertEqual(resolve(url).func, accept_invitation_view)
    
    def test_password_reset_request_url(self):
        """Test password reset request URL"""
        url = reverse('password-reset-request')
        self.assertEqual(url, '/api/users/password-reset/')
        self.assertEqual(resolve(url).func, request_password_reset_view)
    
    def test_password_reset_confirm_url(self):
        """Test password reset confirm URL"""
        url = reverse('password-reset-confirm')
        self.assertEqual(url, '/api/users/password-reset-confirm/')
        self.assertEqual(resolve(url).func, confirm_password_reset_view)
    
    def test_change_password_url(self):
        """Test change password URL"""
        url = reverse('change-password')
        self.assertEqual(url, '/api/users/change-password/')
        self.assertEqual(resolve(url).func, change_password_view)
    
    def test_user_profile_url(self):
        """Test user profile URL"""
        url = reverse('user-profile')
        self.assertEqual(url, '/api/users/profile/')
        self.assertEqual(resolve(url).func, user_profile_view)


