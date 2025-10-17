# tests/test_authentication_comprehensive.py

import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserInvitation, PasswordResetToken, UserLoginAttempt
from core.permissions import IsManager

User = get_user_model()


class AuthenticationAPITestCase(APITestCase):
    """
    Comprehensive tests για το authentication system
    """
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        
        # Create test users
        self.manager = User.objects.create_user(
            email='manager@test.com',
            password='TestPassword123!',
            first_name='Manager',
            last_name='User',
            is_active=True,
            email_verified=True
        )
        
        self.resident = User.objects.create_user(
            email='resident@test.com',
            password='TestPassword123!',
            first_name='Resident',
            last_name='User',
            is_active=True,
            email_verified=True
        )
        
        # Add users to groups
        from django.contrib.auth.models import Group
        manager_group, _ = Group.objects.get_or_create(name='Manager')
        resident_group, _ = Group.objects.get_or_create(name='Resident')
        
        self.manager.groups.add(manager_group)
        self.resident.groups.add(resident_group)
    
    def test_user_registration(self):
        """Test user registration flow"""
        url = reverse('user-register')
        data = {
            'email': 'newuser@test.com',
            'password': 'TestPassword123!',
            'password_confirm': 'TestPassword123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        
        # Verify user was created but not active
        user = User.objects.get(email='newuser@test.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)
    
    def test_email_verification(self):
        """Test email verification flow"""
        # Create user with verification token
        user = User.objects.create_user(
            email='verify@test.com',
            password='TestPassword123!',
            first_name='Verify',
            last_name='User',
            is_active=False,
            email_verified=False,
            email_verification_token='test-token-123'
        )
        
        url = reverse('user-verify-email')
        data = {'token': 'test-token-123'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is now active and verified
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verified)
    
    def test_user_login_success(self):
        """Test successful user login"""
        url = reverse('token_obtain_pair')
        data = {
            'email': self.resident.email,
            'password': 'TestPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        
        # Verify login attempt was tracked
        login_attempt = UserLoginAttempt.objects.filter(
            user=self.resident,
            success=True
        ).first()
        self.assertIsNotNone(login_attempt)
    
    def test_user_login_failure(self):
        """Test failed user login"""
        url = reverse('token_obtain_pair')
        data = {
            'email': self.resident.email,
            'password': 'WrongPassword'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify login attempt was tracked
        login_attempt = UserLoginAttempt.objects.filter(
            user=self.resident,
            success=False,
            failure_reason='Invalid credentials'
        ).first()
        self.assertIsNotNone(login_attempt)
        
        # Verify failed login attempts counter increased
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.failed_login_attempts, 1)
    
    def test_account_lockout(self):
        """Test account lockout after failed attempts"""
        url = reverse('token_obtain_pair')
        data = {
            'email': self.resident.email,
            'password': 'WrongPassword'
        }
        
        # Make 5 failed attempts
        for i in range(5):
            response = self.client.post(url, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 6th attempt should show account locked
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Account locked', str(response.data))
        
        # Verify account is locked
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.is_locked)
    
    def test_rate_limiting(self):
        """Test rate limiting on login endpoint"""
        url = reverse('token_obtain_pair')
        data = {
            'email': 'nonexistent@test.com',
            'password': 'WrongPassword'
        }
        
        # Make multiple requests quickly
        responses = []
        for i in range(7):  # Try 7 times (limit is 5/min)
            response = self.client.post(url, data, format='json')
            responses.append(response.status_code)
        
        # Should get 429 (Too Many Requests) at some point
        self.assertIn(429, responses)
    
    def test_password_reset_request(self):
        """Test password reset request"""
        url = reverse('password-reset-request')
        data = {'email': self.resident.email}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify reset token was created
        reset_token = PasswordResetToken.objects.filter(
            user=self.resident
        ).first()
        self.assertIsNotNone(reset_token)
    
    def test_password_reset_confirm(self):
        """Test password reset confirmation"""
        # Create reset token
        reset_token = PasswordResetToken.objects.create(
            user=self.resident,
            token='test-reset-token-123'
        )
        
        url = reverse('password-reset-confirm')
        data = {
            'token': 'test-reset-token-123',
            'new_password': 'NewPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password('NewPassword123!'))
        
        # Verify token was marked as used
        reset_token.refresh_from_db()
        self.assertTrue(reset_token.used)
    
    def test_user_invitation_creation(self):
        """Test user invitation creation by manager"""
        # Login as manager
        self.client.force_authenticate(user=self.manager)
        
        url = reverse('create-invitation')
        data = {
            'email': 'invited@test.com',
            'first_name': 'Invited',
            'last_name': 'User',
            'invitation_type': 'resident'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify invitation was created
        invitation = UserInvitation.objects.filter(
            email='invited@test.com'
        ).first()
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation.invited_by, self.manager)
    
    def test_invitation_acceptance(self):
        """Test invitation acceptance flow"""
        # Create invitation
        invitation = UserInvitation.objects.create(
            email='accept@test.com',
            first_name='Accept',
            last_name='User',
            invitation_type='resident',
            invited_by=self.manager,
            token='test-invitation-token-123'
        )
        
        url = reverse('accept-invitation')
        data = {
            'token': 'test-invitation-token-123',
            'password': 'TestPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user was created
        user = User.objects.get(email='accept@test.com')
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verified)
        
        # Verify invitation was accepted
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, invitation.InvitationStatus.ACCEPTED)
    
    def test_user_profile_access(self):
        """Test user profile access"""
        # Login as resident
        self.client.force_authenticate(user=self.resident)
        
        url = reverse('user-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.resident.email)
    
    def test_user_profile_update(self):
        """Test user profile update"""
        # Login as resident
        self.client.force_authenticate(user=self.resident)
        
        url = reverse('user-profile')
        data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'email_notifications_enabled': False
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify profile was updated
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.first_name, 'Updated')
        self.assertFalse(self.resident.email_notifications_enabled)
    
    def test_password_change(self):
        """Test password change for authenticated user"""
        # Login as resident
        self.client.force_authenticate(user=self.resident)
        
        url = reverse('change-password')
        data = {
            'current_password': 'TestPassword123!',
            'new_password': 'NewPassword123!',
            'new_password_confirm': 'NewPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password('NewPassword123!'))


class SecurityTestCase(APITestCase):
    """
    Tests για τα security features
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='security@test.com',
            password='TestPassword123!',
            first_name='Security',
            last_name='User',
            is_active=True,
            email_verified=True
        )
    
    def test_login_tracking_fields(self):
        """Test that login tracking fields are properly set"""
        url = reverse('token_obtain_pair')
        data = {
            'email': self.user.email,
            'password': 'TestPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify login attempt was tracked
        login_attempt = UserLoginAttempt.objects.filter(
            user=self.user,
            success=True
        ).first()
        
        self.assertIsNotNone(login_attempt)
        self.assertEqual(login_attempt.email, self.user.email)
        self.assertTrue(login_attempt.success)
        self.assertIsNotNone(login_attempt.ip_address)
        self.assertIsNotNone(login_attempt.user_agent)
    
    def test_failed_login_tracking(self):
        """Test failed login tracking"""
        url = reverse('token_obtain_pair')
        data = {
            'email': self.user.email,
            'password': 'WrongPassword'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify failed login attempt was tracked
        login_attempt = UserLoginAttempt.objects.filter(
            user=self.user,
            success=False
        ).first()
        
        self.assertIsNotNone(login_attempt)
        self.assertEqual(login_attempt.failure_reason, 'Invalid credentials')
    
    def test_account_lockout_properties(self):
        """Test account lockout properties and methods"""
        # Initially not locked
        self.assertFalse(self.user.is_locked)
        self.assertEqual(self.user.failed_login_attempts, 0)
        
        # Lock account
        self.user.lock_account(duration_minutes=30)
        self.assertTrue(self.user.is_locked)
        
        # Unlock account
        self.user.unlock_account()
        self.assertFalse(self.user.is_locked)
        self.assertEqual(self.user.failed_login_attempts, 0)
    
    def test_failed_login_increment(self):
        """Test failed login increment"""
        initial_attempts = self.user.failed_login_attempts
        
        # Increment failed login
        self.user.increment_failed_login()
        
        self.assertEqual(self.user.failed_login_attempts, initial_attempts + 1)
        self.assertIsNotNone(self.user.last_failed_login)
    
    def test_reset_failed_login(self):
        """Test reset failed login attempts"""
        # Set some failed attempts
        self.user.failed_login_attempts = 3
        self.user.last_failed_login = timezone.now()
        self.user.save()
        
        # Reset failed login attempts
        self.user.reset_failed_login()
        
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.last_failed_login)


