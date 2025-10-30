# backend/tenants/tests_utils.py
"""
Unit tests for tenant utilities
"""
from django.test import TestCase
from tenants.utils import generate_schema_name_from_email, generate_unique_schema_name
from tenants.models import Client
from django.utils import timezone
from datetime import timedelta


class TenantUtilsTestCase(TestCase):
    """Test tenant utility functions"""
    
    def test_generate_schema_name_from_email_simple(self):
        """Test simple email to schema name conversion"""
        result = generate_schema_name_from_email('etherm2021@gmail.com')
        self.assertEqual(result, 'etherm2021')
    
    def test_generate_schema_name_from_email_with_dots(self):
        """Test email with dots gets converted to hyphens"""
        result = generate_schema_name_from_email('john.doe@company.com')
        self.assertEqual(result, 'john-doe')
    
    def test_generate_schema_name_from_email_with_underscore(self):
        """Test email with underscores gets converted to hyphens"""
        result = generate_schema_name_from_email('test_user@test.com')
        self.assertEqual(result, 'test-user')
    
    def test_generate_schema_name_from_email_special_chars(self):
        """Test email with special characters gets cleaned"""
        result = generate_schema_name_from_email('special!@#$char@test.com')
        # slugify removes special chars
        self.assertIn('special', result)
        self.assertNotIn('!', result)
        self.assertNotIn('@', result)
        self.assertNotIn('#', result)
    
    def test_generate_schema_name_length_limit(self):
        """Test that schema names are limited to 63 characters"""
        long_email = 'a' * 100 + '@example.com'
        result = generate_schema_name_from_email(long_email)
        self.assertLessEqual(len(result), 63)
    
    def test_generate_unique_schema_name_when_available(self):
        """Test that unique name is returned when base name is available"""
        result = generate_unique_schema_name('uniquename123')
        self.assertEqual(result, 'uniquename123')
    
    def test_generate_unique_schema_name_with_collision(self):
        """Test that counter is added when name is taken"""
        # Create a tenant with the base name
        Client.objects.create(
            schema_name='testuser',
            name='Test User',
            paid_until=timezone.now().date() + timedelta(days=30)
        )
        
        # Try to generate another with same base name
        result = generate_unique_schema_name('testuser')
        self.assertEqual(result, 'testuser-1')
    
    def test_generate_unique_schema_name_with_multiple_collisions(self):
        """Test that counter increments correctly with multiple collisions"""
        # Create multiple tenants
        for i in range(3):
            if i == 0:
                schema = 'commonname'
            else:
                schema = f'commonname-{i}'
            Client.objects.create(
                schema_name=schema,
                name=f'Common Name {i}',
                paid_until=timezone.now().date() + timedelta(days=30)
            )
        
        # The next one should be commonname-3
        result = generate_unique_schema_name('commonname')
        self.assertEqual(result, 'commonname-3')
    
    def test_generate_unique_schema_name_random_fallback(self):
        """Test that random suffix is used when max attempts reached"""
        # This test would be slow with real max_attempts=9999
        # So we test with a small number
        result = generate_unique_schema_name('test', max_attempts=0)
        
        # Should have format: test-{6hex}
        self.assertTrue(result.startswith('test-'))
        self.assertGreater(len(result), len('test-'))
        
        # Extract the suffix and verify it's hex
        suffix = result.split('-')[1]
        self.assertEqual(len(suffix), 6)
        # Should be valid hex
        try:
            int(suffix, 16)
            is_hex = True
        except ValueError:
            is_hex = False
        self.assertTrue(is_hex)


class TenantNamingIntegrationTestCase(TestCase):
    """Integration tests for the complete naming flow"""
    
    def test_full_flow_unique_email(self):
        """Test complete flow from email to unique schema name"""
        email = 'uniqueuser@example.com'
        
        # Generate schema name from email
        base_name = generate_schema_name_from_email(email)
        self.assertEqual(base_name, 'uniqueuser')
        
        # Make it unique
        unique_name = generate_unique_schema_name(base_name)
        self.assertEqual(unique_name, 'uniqueuser')
    
    def test_full_flow_duplicate_email_prefix(self):
        """Test flow when email prefix is already taken"""
        # Create first tenant
        Client.objects.create(
            schema_name='john',
            name='John Doe',
            paid_until=timezone.now().date() + timedelta(days=30)
        )
        
        # New user with same prefix
        email = 'john@differentdomain.com'
        base_name = generate_schema_name_from_email(email)
        unique_name = generate_unique_schema_name(base_name)
        
        self.assertEqual(base_name, 'john')
        self.assertEqual(unique_name, 'john-1')
    
    def test_case_insensitive_collision(self):
        """Test that schema names are case-insensitive for collision detection"""
        # Create tenant with lowercase
        Client.objects.create(
            schema_name='testcase',
            name='Test Case',
            paid_until=timezone.now().date() + timedelta(days=30)
        )
        
        # Try to create with uppercase in email (slugify will lowercase it)
        email = 'TestCase@example.com'
        base_name = generate_schema_name_from_email(email)
        unique_name = generate_unique_schema_name(base_name)
        
        # Should get testcase-1 because testcase exists
        self.assertEqual(unique_name, 'testcase-1')





