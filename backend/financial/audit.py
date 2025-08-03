# backend/financial/audit.py

import json
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder


class FinancialAuditLog(models.Model):
    """
    Audit log για όλες τις οικονομικές κινήσεις
    
    Καταγράφει:
    - Ποιος έκανε την ενέργεια
    - Τι έκανε
    - Πότε έγινε
    - Σε ποια πολυκατοικία
    - Τι άλλαξε
    """
    
    ACTION_CHOICES = [
        ('CREATE', 'Δημιουργία'),
        ('UPDATE', 'Ενημέρωση'),
        ('DELETE', 'Διαγραφή'),
        ('ISSUE', 'Έκδοση'),
        ('PAYMENT', 'Πληρωμή'),
        ('CALCULATE', 'Υπολογισμός'),
        ('EXPORT', 'Εξαγωγή'),
        ('LOGIN', 'Σύνδεση'),
        ('LOGOUT', 'Αποσύνδεση'),
        ('VIEW', 'Προβολή'),
    ]
    
    # Βασικά πεδία
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία/Ώρα")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, verbose_name="Χρήστης")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name="Ενέργεια")
    description = models.TextField(verbose_name="Περιγραφή")
    
    # Building reference
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE, null=True, blank=True, verbose_name="Πολυκατοικία")
    
    # Generic foreign key για οποιοδήποτε model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # IP address και user agent
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP Διεύθυνση")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    
    # Request details
    request_method = models.CharField(max_length=10, blank=True, verbose_name="HTTP Μέθοδος")
    request_path = models.CharField(max_length=255, blank=True, verbose_name="Request Path")
    
    # Changes (JSON field)
    changes = models.JSONField(default=dict, blank=True, verbose_name="Αλλαγές")
    
    # Metadata
    session_id = models.CharField(max_length=100, blank=True, verbose_name="Session ID")
    
    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['building']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.get_action_display()} - {self.description}"
    
    @classmethod
    def log_action(cls, user, action, description, building=None, content_object=None, 
                   ip_address=None, user_agent=None, request_method=None, request_path=None,
                   changes=None, session_id=None):
        """
        Εύκολη μέθοδος για καταγραφή ενέργειας
        """
        try:
            audit_log = cls.objects.create(
                user=user,
                action=action,
                description=description,
                building=building,
                content_type=ContentType.objects.get_for_model(content_object) if content_object else None,
                object_id=content_object.id if content_object else None,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                changes=changes or {},
                session_id=session_id
            )
            return audit_log
        except Exception as e:
            # Σε περίπτωση σφάλματος, καταγράφουμε το σφάλμα αλλά δεν σταματάμε την εφαρμογή
            print(f"Error logging audit: {e}")
            return None
    
    @classmethod
    def log_expense_action(cls, user, action, expense, request=None, changes=None):
        """Ειδική μέθοδος για καταγραφή ενεργειών δαπανών"""
        description = f"{cls.get_action_display(action)} δαπάνης: {expense.title} (€{expense.amount})"
        
        return cls.log_action(
            user=user,
            action=action,
            description=description,
            building=expense.building,
            content_object=expense,
            ip_address=getattr(request, 'META', {}).get('REMOTE_ADDR'),
            user_agent=getattr(request, 'META', {}).get('HTTP_USER_AGENT', ''),
            request_method=getattr(request, 'method', ''),
            request_path=getattr(request, 'path', ''),
            changes=changes,
            session_id=getattr(request, 'session', {}).get('session_key', '')
        )
    
    @classmethod
    def log_payment_action(cls, user, action, payment, request=None, changes=None):
        """Ειδική μέθοδος για καταγραφή ενεργειών πληρωμών"""
        description = f"{cls.get_action_display(action)} πληρωμής: €{payment.amount} για διαμέρισμα {payment.apartment.number}"
        
        return cls.log_action(
            user=user,
            action=action,
            description=description,
            building=payment.apartment.building,
            content_object=payment,
            ip_address=getattr(request, 'META', {}).get('REMOTE_ADDR'),
            user_agent=getattr(request, 'META', {}).get('HTTP_USER_AGENT', ''),
            request_method=getattr(request, 'method', ''),
            request_path=getattr(request, 'path', ''),
            changes=changes,
            session_id=getattr(request, 'session', {}).get('session_key', '')
        )
    
    @classmethod
    def log_transaction_action(cls, user, action, transaction, request=None, changes=None):
        """Ειδική μέθοδος για καταγραφή ενεργειών κινήσεων"""
        description = f"{cls.get_action_display(action)} κίνησης: {transaction.get_type_display()} - €{transaction.amount}"
        
        return cls.log_action(
            user=user,
            action=action,
            description=description,
            building=transaction.building,
            content_object=transaction,
            ip_address=getattr(request, 'META', {}).get('REMOTE_ADDR'),
            user_agent=getattr(request, 'META', {}).get('HTTP_USER_AGENT', ''),
            request_method=getattr(request, 'method', ''),
            request_path=getattr(request, 'path', ''),
            changes=changes,
            session_id=getattr(request, 'session', {}).get('session_key', '')
        )
    
    @classmethod
    def get_action_display(cls, action):
        """Επιστρέφει την ελληνική περιγραφή της ενέργειας"""
        action_dict = dict(cls.ACTION_CHOICES)
        return action_dict.get(action, action)


class AuditMiddleware:
    """
    Middleware για αυτόματη καταγραφή των οικονομικών ενεργειών
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Προεπεξεργασία του request
        response = self.get_response(request)
        
        # Καταγραφή μετά την επεξεργασία
        self.log_request(request, response)
        
        return response
    
    def log_request(self, request, response):
        """Καταγραφή του request αν είναι οικονομικό"""
        
        # Έλεγχος αν είναι οικονομικό endpoint
        if not self.is_financial_endpoint(request.path):
            return
        
        # Έλεγχος αν ο χρήστης είναι αυθεντικοποιημένος
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        
        # Έλεγχος αν είναι GET request (μόνο για προβολές)
        if request.method == 'GET':
            action = 'VIEW'
        elif request.method == 'POST':
            action = 'CREATE'
        elif request.method == 'PUT' or request.method == 'PATCH':
            action = 'UPDATE'
        elif request.method == 'DELETE':
            action = 'DELETE'
        else:
            return
        
        # Καταγραφή της ενέργειας
        FinancialAuditLog.log_action(
            user=request.user,
            action=action,
            description=f"{request.method} {request.path}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_method=request.method,
            request_path=request.path,
            session_id=request.session.session_key if request.session else None
        )
    
    def is_financial_endpoint(self, path):
        """Έλεγχος αν το endpoint είναι οικονομικό"""
        financial_paths = [
            '/api/financial/',
            '/api/expenses/',
            '/api/payments/',
            '/api/transactions/',
            '/api/common-expenses/',
            '/api/meter-readings/',
            '/api/reports/',
        ]
        
        return any(path.startswith(fp) for fp in financial_paths)
    
    def get_client_ip(self, request):
        """Λήψη της IP διεύθυνσης του client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip 